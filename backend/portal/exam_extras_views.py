"""Exam module extras that were listed in the client requirements but not yet
built: Rank List generation and Report Cards. Both are pure aggregation on
top of tables that already exist and are already populated by
teacher_views.MarksEntryView (portal_result, portal_exam_schedule) — no new
tables needed.

Kept in its own file for the same reason as facilities_views.py: easy to
find, doesn't bloat admin_views.py/views.py further.
"""
from django.db import connection
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from .admin_views import AdminMixin
from .doc_schemas import (
    DetailErrorSerializer,
    ValidationErrorSerializer,
    EXAM_SCHEDULE_ID_PARAMETER,
    CLASS_ID_PARAMETER,
    EXAM_NAME_PARAMETER,
    STUDENT_ID_PARAMETER,
)
from .roles import log_action
from .views import StudentOnlyMixin, current_class_for_student, row, rows, serialise, table_exists


def _grade_for_percent(pct):
    return "A" if pct >= 90 else "B" if pct >= 75 else "C" if pct >= 60 else "D" if pct >= 40 else "F"


# =============================================================================
# Documentation-only schemas (the portal has no DRF serializers; raw SQL only)
# =============================================================================
ExamRankListItemSerializer = inline_serializer(
    name="ExamRankListItem",
    fields={
        "id": serializers.IntegerField(help_text="Portal result record id."),
        "student_id": serializers.IntegerField(help_text="Student (auth user) id."),
        "marks_obtained": serializers.FloatField(help_text="Marks scored in this subject."),
        "grade_letter": serializers.CharField(
            required=False, allow_null=True, help_text="Letter grade for the marks."
        ),
        "rank_position": serializers.IntegerField(
            required=False, allow_null=True, help_text="Per-subject rank for this exam."
        ),
        "student_name": serializers.CharField(help_text="Full name of the student."),
        "roll_number": serializers.CharField(
            required=False, allow_null=True, help_text="Student roll number."
        ),
    },
)

ExamOverallRankItemSerializer = inline_serializer(
    name="ExamOverallRankItem",
    fields={
        "student_id": serializers.IntegerField(help_text="Student (auth user) id."),
        "student_name": serializers.CharField(help_text="Full name of the student."),
        "roll_number": serializers.CharField(
            required=False, allow_null=True, help_text="Student roll number."
        ),
        "total_marks": serializers.FloatField(help_text="Summed marks across subjects."),
        "max_total": serializers.FloatField(help_text="Summed maximum marks across subjects."),
        "overall_rank": serializers.IntegerField(help_text="Class-wide rank by total marks."),
    },
)

ExamSubjectSerializer = inline_serializer(
    name="ExamReportCardSubject",
    fields={
        "subject_name": serializers.CharField(help_text="Subject name."),
        "max_marks": serializers.FloatField(help_text="Maximum marks for the subject."),
        "marks_obtained": serializers.FloatField(help_text="Marks scored in the subject."),
        "grade_letter": serializers.CharField(help_text="Letter grade for the subject."),
        "rank_position": serializers.IntegerField(
            required=False, allow_null=True, help_text="Per-subject rank for the exam."
        ),
    },
)

ExamReportCardSerializer = inline_serializer(
    name="ExamReportCard",
    fields={
        "student_name": serializers.CharField(
            required=False, allow_null=True, help_text="Full name of the student."
        ),
        "exam_name": serializers.CharField(help_text="Exam cycle name."),
        "subjects": serializers.ListSerializer(
            child=ExamSubjectSerializer, help_text="Per-subject results."
        ),
        "total_marks": serializers.FloatField(help_text="Sum of marks obtained."),
        "max_total": serializers.FloatField(help_text="Sum of maximum marks."),
        "percentage": serializers.FloatField(help_text="Overall percentage (0-100)."),
        "overall_grade": serializers.CharField(
            required=False, allow_null=True, help_text="Overall letter grade."
        ),
        "is_complete": serializers.BooleanField(help_text="Whether all subjects are graded."),
        "expected_subject_count": serializers.IntegerField(
            required=False, allow_null=True, help_text="Subjects taught in the student's class."
        ),
    },
)


# =============================================================================
# RANK LISTS
# =============================================================================
class RankListView(AdminMixin, APIView):
    """GET ?exam_schedule_id= for a single subject's rank list (also used to
    populate portal_result.rank_position). POST recomputes and persists the
    per-subject ranks for that exam_schedule."""

    @extend_schema(
        operation_id="ExamRankList",
        summary="List a subject's rank list",
        description="Returns the per-subject rank list for an exam schedule, including each student's marks and rank position.",
        tags=["Examination"],
        parameters=[EXAM_SCHEDULE_ID_PARAMETER],
        responses={
            200: serializers.ListSerializer(child=ExamRankListItemSerializer),
            400: ValidationErrorSerializer,
        },
    )
    def get(self, request):
        exam_id = request.query_params.get("exam_schedule_id")
        if not exam_id or not table_exists("portal_result"):
            return Response([])
        return Response(serialise(rows(
            """
            SELECT r.id, r.student_id, r.marks_obtained, r.grade_letter, r.rank_position,
                   COALESCE(u.first_name || ' ' || u.last_name, u.username) AS student_name,
                   se.roll_number
            FROM portal_result r
            JOIN auth_user u ON u.id = r.student_id
            LEFT JOIN portal_exam_schedule e ON e.id = r.exam_schedule_id
            LEFT JOIN portal_student_enrollment se ON se.student_id = r.student_id AND se.class_id = e.class_id
            WHERE r.exam_schedule_id = %s
            ORDER BY r.rank_position NULLS LAST, r.marks_obtained DESC
            """,
            [exam_id],
        )))

    @extend_schema(
        operation_id="ExamRankListGenerate",
        summary="Generate and persist a subject rank list",
        description="Computes and saves per-subject ranks for an exam schedule (standard competition ranking).",
        tags=["Examination"],
        request=inline_serializer(
            name="ExamRankGenerateRequest",
            fields={"exam_schedule_id": serializers.IntegerField()},
        ),
        responses={
            200: DetailErrorSerializer,
            400: ValidationErrorSerializer,
            404: DetailErrorSerializer,
        },
    )
    def post(self, request):
        """Body: {exam_schedule_id}. Ranks all results for that exam by marks
        (ties share the same rank, standard competition ranking: 1,2,2,4)."""
        exam_id = request.data.get("exam_schedule_id")
        if not exam_id or not table_exists("portal_result"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        if not table_exists("portal_exam_schedule") or not row("SELECT 1 AS ok FROM portal_exam_schedule WHERE id=%s", [exam_id]):
            return Response({"detail": f"No exam schedule found with id {exam_id} — check the ID and try again."}, status=404)
        existing_results = row("SELECT COUNT(*)::int AS c FROM portal_result WHERE exam_schedule_id=%s", [exam_id])
        if not existing_results or existing_results["c"] == 0:
            return Response({"detail": "That exam exists, but no marks have been entered for it yet — nothing to rank."}, status=400)
        with connection.cursor() as cursor:
            cursor.execute(
                """
                WITH ranked AS (
                    SELECT id, RANK() OVER (ORDER BY marks_obtained DESC) AS rnk
                    FROM portal_result WHERE exam_schedule_id = %s
                )
                UPDATE portal_result r SET rank_position = ranked.rnk
                FROM ranked WHERE ranked.id = r.id
                """,
                [exam_id],
            )
            updated = cursor.rowcount
        log_action(request.user, "exams.rank_list.generate", "portal_exam_schedule", exam_id, {"students_ranked": updated})
        return Response({"detail": f"Rank list generated for {updated} student(s)."})


class OverallRankListView(AdminMixin, APIView):
    """Aggregate rank across every subject for one class + exam cycle name
    (e.g. all "Mid-Term" exam_schedules for class 8-A), which is what a
    school usually means by "the class rank list" rather than a single
    subject's rank."""

    @extend_schema(
        operation_id="ExamOverallRankList",
        summary="List the overall class rank list",
        description="Aggregates ranks across every subject for a class and exam round to produce the overall class ranking.",
        tags=["Examination"],
        parameters=[CLASS_ID_PARAMETER, EXAM_NAME_PARAMETER],
        responses={
            200: serializers.ListSerializer(child=ExamOverallRankItemSerializer),
            400: ValidationErrorSerializer,
        },
    )
    def get(self, request):
        class_id = request.query_params.get("class_id")
        exam_name = request.query_params.get("exam_name")
        if not class_id or not exam_name or not table_exists("portal_result"):
            return Response([])
        return Response(serialise(rows(
            """
            SELECT r.student_id,
                   COALESCE(u.first_name || ' ' || u.last_name, u.username) AS student_name,
                   se.roll_number,
                   SUM(r.marks_obtained) AS total_marks,
                   SUM(e.max_marks) AS max_total,
                   RANK() OVER (ORDER BY SUM(r.marks_obtained) DESC) AS overall_rank
            FROM portal_result r
            JOIN portal_exam_schedule e ON e.id = r.exam_schedule_id
            JOIN auth_user u ON u.id = r.student_id
            LEFT JOIN portal_student_enrollment se ON se.student_id = r.student_id AND se.class_id = e.class_id
            WHERE e.class_id = %s AND e.exam_name = %s
            GROUP BY r.student_id, u.first_name, u.last_name, u.username, se.roll_number
            ORDER BY overall_rank
            """,
            [class_id, exam_name],
        )))


# =============================================================================
# REPORT CARDS
# =============================================================================
def _report_card_data(student_id, exam_name):
    if not table_exists("portal_result"):
        return None
    subjects = rows(
        """
        SELECT s.name AS subject_name, e.max_marks, r.marks_obtained, r.grade_letter, r.rank_position
        FROM portal_result r
        JOIN portal_exam_schedule e ON e.id = r.exam_schedule_id
        JOIN portal_subject s ON s.id = e.subject_id
        WHERE r.student_id = %s AND e.exam_name = %s
        ORDER BY s.name
        """,
        [student_id, exam_name],
    )
    if not subjects:
        return {"subjects": [], "total_marks": 0, "max_total": 0, "percentage": 0, "overall_grade": None}
    total = sum(float(s["marks_obtained"]) for s in subjects)
    max_total = sum(float(s["max_marks"]) for s in subjects)
    pct = round((total / max_total) * 100, 2) if max_total else 0
    student = row("SELECT first_name, last_name, username FROM auth_user WHERE id=%s", [student_id])
    name = f"{student['first_name']} {student['last_name']}".strip() or student["username"] if student else None

    # Completeness check: compare how many subjects this student has a result
    # for against how many subjects are actually taught in their class. A
    # free-text exam_name typo elsewhere, or a teacher who simply hasn't
    # entered marks yet, would otherwise produce a confident-looking report
    # card that's silently missing subjects.
    is_complete = True
    expected_subject_count = None
    cls = current_class_for_student(student_id)
    if cls and table_exists("portal_academic_allocation"):
        expected = row("SELECT COUNT(DISTINCT subject_id)::int AS c FROM portal_academic_allocation WHERE class_id=%s", [cls["class_id"]])
        expected_subject_count = expected["c"] if expected else None
        if expected_subject_count and len(subjects) < expected_subject_count:
            is_complete = False

    return {
        "student_name": name,
        "exam_name": exam_name,
        "subjects": subjects,
        "total_marks": total,
        "max_total": max_total,
        "percentage": pct,
        "overall_grade": _grade_for_percent(pct),
        "is_complete": is_complete,
        "expected_subject_count": expected_subject_count,
    }


class ReportCardView(AdminMixin, APIView):
    """Admin-facing: ?student_id=&exam_name= — generate any student's report card."""

    @extend_schema(
        operation_id="ExamAdminReportCard",
        summary="Generate an admin report card",
        description="Generates a report card for any student for a given exam round (admin-facing).",
        tags=["Examination"],
        parameters=[STUDENT_ID_PARAMETER, EXAM_NAME_PARAMETER],
        responses={
            200: ExamReportCardSerializer,
            400: ValidationErrorSerializer,
            404: DetailErrorSerializer,
        },
    )
    def get(self, request):
        student_id = request.query_params.get("student_id")
        exam_name = request.query_params.get("exam_name")
        if not student_id or not exam_name:
            return Response({"detail": "student_id and exam_name are required."}, status=400)
        data = _report_card_data(student_id, exam_name)
        return Response(serialise(data))


class StudentReportCardView(StudentOnlyMixin, APIView):
    """Student-facing: ?exam_name= — a student's own report card only."""

    @extend_schema(
        operation_id="ExamStudentReportCard",
        summary="Get the student's own report card",
        description="Returns the authenticated student's own report card for a given exam round.",
        tags=["Examination"],
        parameters=[EXAM_NAME_PARAMETER],
        responses={
            200: ExamReportCardSerializer,
            400: ValidationErrorSerializer,
        },
    )
    def get(self, request):
        exam_name = request.query_params.get("exam_name")
        if not exam_name:
            return Response({"detail": "exam_name is required."}, status=400)
        data = _report_card_data(request.user.id, exam_name)
        return Response(serialise(data))
