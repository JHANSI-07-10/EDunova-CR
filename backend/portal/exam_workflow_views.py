"""Admin portal — Exam Workflow (Examinations planning + Exam Results).

Backs the admin Examinations and Exam Results pages:
  exam-workflow/types/          exam types CRUD
  exam-workflow/subjects/       per-schedule subject configuration CRUD
  exam-workflow/seating/        list / auto-generate seating arrangements
  exam-workflow/invigilators/   invigilator allocation CRUD
  exam-workflow/hall-tickets/generate/  generate hall tickets for a schedule
  exam-workflow/verify-marks/   list unverified results / verify
  exam-workflow/grade-config/   grade band CRUD
  exam-workflow/process-results/  compute results for a schedule
  exam-workflow/notifications/  create / list / send exam notifications
  exam-workflow/reports/        per-type exam reports
  exam-workflow/analytics/      dashboard stats

Same conventions as the rest of the portal: raw SQL against portal_* tables,
role resolved server-side, every admin write logged via log_action().
"""
from datetime import date

from django.db import connection
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from .admin_views import AdminMixin
from .doc_schemas import DetailErrorSerializer, ERROR_RESPONSES
from .roles import log_action
from .views import row, rows, serialise, table_exists


def _grade_for_pct(pct):
    """Grade band from portal_grade_config when populated, else fixed defaults."""
    if table_exists("portal_grade_config"):
        cfg = row(
            "SELECT grade_letter, grade_points FROM portal_grade_config "
            "WHERE min_percentage <= %s AND %s <= max_percentage ORDER BY min_percentage DESC LIMIT 1",
            [pct, pct],
        )
        if cfg:
            return cfg["grade_letter"], cfg["grade_points"]
    return "A" if pct >= 90 else "B" if pct >= 75 else "C" if pct >= 60 else "D" if pct >= 40 else "F", None


# =============================================================================
# Exam types
# =============================================================================
class ExamWorkflowTypesView(AdminMixin, APIView):
    @extend_schema(
        operation_id="AdminExamWorkflowTypesList", summary="List exam types", tags=["Examinations"],
        responses={200: serializers.ListSerializer(child=serializers.JSONField()), **ERROR_RESPONSES},
    )
    def get(self, request):
        if not table_exists("portal_exam_type"):
            return Response([])
        return Response(serialise(rows("SELECT * FROM portal_exam_type ORDER BY sort_order, name")))

    @extend_schema(
        operation_id="AdminExamWorkflowTypeCreate", summary="Create an exam type", tags=["Examinations"],
        request=OpenApiTypes.OBJECT, responses={201: DetailErrorSerializer, **ERROR_RESPONSES},
    )
    def post(self, request):
        if not table_exists("portal_exam_type"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        d = request.data
        if not (d.get("name") or "").strip():
            return Response({"detail": "Exam type name is required."}, status=400)
        with connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO portal_exam_type (name, description, sort_order, is_active) VALUES (%s,%s,%s,%s) RETURNING id",
                [d.get("name"), d.get("description") or "", d.get("sort_order") or 0, d.get("is_active", True)],
            )
            new_id = cursor.fetchone()[0]
        log_action(request.user, "exam.type.create", "portal_exam_type", new_id, {"name": d.get("name")})
        return Response({"id": new_id, "detail": "Exam type created."}, status=201)

    @extend_schema(
        operation_id="AdminExamWorkflowTypeUpdate", summary="Update an exam type", tags=["Examinations"],
        request=OpenApiTypes.OBJECT, responses={200: DetailErrorSerializer, **ERROR_RESPONSES},
    )
    def patch(self, request):
        if not table_exists("portal_exam_type"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        d = request.data
        rid = d.get("id")
        if rid in (None, ""):
            return Response({"detail": "The 'id' field is required for updates."}, status=400)
        fields = {}
        for col in ("name", "description", "sort_order", "is_active"):
            if col in d and d[col] not in (None, ""):
                fields[col] = d[col]
        if not fields:
            return Response({"detail": "No updatable fields were provided."}, status=400)
        cols = list(fields)
        with connection.cursor() as cursor:
            cursor.execute(
                f"UPDATE portal_exam_type SET {', '.join(f'{c}=%s' for c in cols)} WHERE id=%s",
                [fields[c] for c in cols] + [rid],
            )
        log_action(request.user, "exam.type.update", "portal_exam_type", rid, dict(fields))
        return Response({"id": rid, "detail": "Exam type updated."})

    @extend_schema(
        operation_id="AdminExamWorkflowTypeDelete", summary="Delete an exam type", tags=["Examinations"],
        responses={200: DetailErrorSerializer, **ERROR_RESPONSES},
    )
    def delete(self, request):
        if not table_exists("portal_exam_type"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        try:
            rid = int(request.query_params.get("id", ""))
        except (TypeError, ValueError):
            return Response({"detail": "The 'id' query parameter is required."}, status=400)
        with connection.cursor() as cursor:
            cursor.execute("DELETE FROM portal_exam_type WHERE id=%s", [rid])
        log_action(request.user, "exam.type.delete", "portal_exam_type", rid)
        return Response({"detail": "Exam type deleted."})


# =============================================================================
# Exam schedule subjects
# =============================================================================
class ExamWorkflowSubjectsView(AdminMixin, APIView):
    @extend_schema(
        operation_id="AdminExamWorkflowSubjectsList", summary="List exam subject configs", tags=["Examinations"],
        responses={200: serializers.ListSerializer(child=serializers.JSONField()), **ERROR_RESPONSES},
    )
    def get(self, request):
        if not table_exists("portal_exam_subject"):
            return Response([])
        data = rows(
            """
            SELECT es.id, es.exam_schedule_id, es.subject_id, es.exam_date, es.start_time,
                   es.duration_minutes, es.max_marks, es.passing_marks,
                   s.name AS subject_name, e.exam_name
            FROM portal_exam_subject es
            LEFT JOIN portal_subject s ON s.id = es.subject_id
            LEFT JOIN portal_exam_schedule e ON e.id = es.exam_schedule_id
            ORDER BY es.id
            """
        )
        return Response(serialise(data))

    @extend_schema(
        operation_id="AdminExamWorkflowSubjectCreate", summary="Add an exam subject config", tags=["Examinations"],
        request=OpenApiTypes.OBJECT, responses={201: DetailErrorSerializer, **ERROR_RESPONSES},
    )
    def post(self, request):
        if not table_exists("portal_exam_subject"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        d = request.data
        if not d.get("exam_schedule_id") or not d.get("subject_id"):
            return Response({"detail": "exam_schedule_id and subject_id are required."}, status=400)
        with connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO portal_exam_subject (exam_schedule_id, subject_id, exam_date, start_time, duration_minutes, max_marks, passing_marks) "
                "VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING id",
                [d.get("exam_schedule_id"), d.get("subject_id"), d.get("exam_date"),
                 d.get("start_time"), d.get("duration") or d.get("duration_minutes") or 60,
                 d.get("max_marks") or 100, d.get("passing_marks") or 40],
            )
            new_id = cursor.fetchone()[0]
        log_action(request.user, "exam.subject.create", "portal_exam_subject", new_id, dict(d))
        return Response({"id": new_id, "detail": "Subject configuration created."}, status=201)

    @extend_schema(
        operation_id="AdminExamWorkflowSubjectUpdate", summary="Update an exam subject config", tags=["Examinations"],
        request=OpenApiTypes.OBJECT, responses={200: DetailErrorSerializer, **ERROR_RESPONSES},
    )
    def patch(self, request):
        if not table_exists("portal_exam_subject"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        d = request.data
        rid = d.get("id")
        if rid in (None, ""):
            return Response({"detail": "The 'id' field is required for updates."}, status=400)
        fields = {}
        for col in ("exam_schedule_id", "subject_id", "exam_date", "start_time", "duration_minutes", "max_marks", "passing_marks"):
            if col in d and d[col] not in (None, ""):
                fields[col] = d[col]
        if d.get("duration") and "duration_minutes" not in fields:
            fields["duration_minutes"] = d["duration"]
        if not fields:
            return Response({"detail": "No updatable fields were provided."}, status=400)
        cols = list(fields)
        with connection.cursor() as cursor:
            cursor.execute(
                f"UPDATE portal_exam_subject SET {', '.join(f'{c}=%s' for c in cols)} WHERE id=%s",
                [fields[c] for c in cols] + [rid],
            )
        log_action(request.user, "exam.subject.update", "portal_exam_subject", rid, dict(fields))
        return Response({"id": rid, "detail": "Subject configuration updated."})

    @extend_schema(
        operation_id="AdminExamWorkflowSubjectDelete", summary="Delete an exam subject config", tags=["Examinations"],
        responses={200: DetailErrorSerializer, **ERROR_RESPONSES},
    )
    def delete(self, request):
        if not table_exists("portal_exam_subject"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        try:
            rid = int(request.query_params.get("id", ""))
        except (TypeError, ValueError):
            return Response({"detail": "The 'id' query parameter is required."}, status=400)
        with connection.cursor() as cursor:
            cursor.execute("DELETE FROM portal_exam_subject WHERE id=%s", [rid])
        log_action(request.user, "exam.subject.delete", "portal_exam_subject", rid)
        return Response({"detail": "Subject configuration deleted."})


# =============================================================================
# Seating arrangement
# =============================================================================
class ExamWorkflowSeatingView(AdminMixin, APIView):
    @extend_schema(
        operation_id="AdminExamWorkflowSeatingList", summary="List seating arrangements", tags=["Examinations"],
        responses={200: serializers.ListSerializer(child=serializers.JSONField()), **ERROR_RESPONSES},
    )
    def get(self, request):
        if not table_exists("portal_seating_arrangement"):
            return Response([])
        data = rows(
            """
            SELECT sa.id, sa.exam_schedule_id, sa.student_id, sa.room_name, sa.seat_number,
                   COALESCE(u.first_name || ' ' || u.last_name, u.username) AS student_name,
                   e.exam_name
            FROM portal_seating_arrangement sa
            LEFT JOIN auth_user u ON u.id = sa.student_id
            LEFT JOIN portal_exam_schedule e ON e.id = sa.exam_schedule_id
            ORDER BY sa.id
            """
        )
        return Response(serialise(data))

    @extend_schema(
        operation_id="AdminExamWorkflowSeatingGenerate", summary="Auto-generate seating for a schedule", tags=["Examinations"],
        request=OpenApiTypes.OBJECT, responses={200: DetailErrorSerializer, **ERROR_RESPONSES},
    )
    def post(self, request):
        """Auto-assign every enrolled student a seat for the exam schedule."""
        if not table_exists("portal_seating_arrangement"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        sched_id = request.data.get("exam_schedule_id")
        if not sched_id:
            return Response({"detail": "exam_schedule_id is required."}, status=400)
        exam = row("SELECT class_id, room_name, room FROM portal_exam_schedule WHERE id=%s", [sched_id])
        if not exam:
            return Response({"detail": "Exam schedule not found."}, status=404)
        room = exam.get("room_name") or exam.get("room") or "Room A"
        enrolled = rows(
            "SELECT student_id FROM portal_student_enrollment WHERE class_id=%s ORDER BY roll_number",
            [exam["class_id"]],
        )
        with connection.cursor() as cursor:
            # clear any previous arrangement for this schedule
            cursor.execute("DELETE FROM portal_seating_arrangement WHERE exam_schedule_id=%s", [sched_id])
            count = 0
            for i, enr in enumerate(enrolled, start=1):
                cursor.execute(
                    "INSERT INTO portal_seating_arrangement (exam_schedule_id, student_id, room_name, seat_number) "
                    "VALUES (%s,%s,%s,%s)",
                    [sched_id, enr["student_id"], room, i],
                )
                count += 1
        log_action(request.user, "exam.seating.generate", "portal_seating_arrangement", sched_id, {"count": count, "room": room})
        return Response({"detail": f"Seating arrangement generated for {count} students.", "total": count})


# =============================================================================
# Invigilator allocation
# =============================================================================
class ExamWorkflowInvigilatorsView(AdminMixin, APIView):
    @extend_schema(
        operation_id="AdminExamWorkflowInvigilatorsList", summary="List invigilator allocations", tags=["Examinations"],
        responses={200: serializers.ListSerializer(child=serializers.JSONField()), **ERROR_RESPONSES},
    )
    def get(self, request):
        if not table_exists("portal_invigilator_allocation"):
            return Response([])
        data = rows(
            """
            SELECT ia.id, ia.exam_schedule_id, ia.teacher_id, ia.room_name, ia.exam_date,
                   ia.start_time, ia.end_time, e.exam_name,
                   COALESCE(u.first_name || ' ' || u.last_name, u.username) AS teacher_name
            FROM portal_invigilator_allocation ia
            LEFT JOIN auth_user u ON u.id = ia.teacher_id
            LEFT JOIN portal_exam_schedule e ON e.id = ia.exam_schedule_id
            ORDER BY ia.id
            """
        )
        return Response(serialise(data))

    @extend_schema(
        operation_id="AdminExamWorkflowInvigilatorCreate", summary="Assign an invigilator", tags=["Examinations"],
        request=OpenApiTypes.OBJECT, responses={201: DetailErrorSerializer, **ERROR_RESPONSES},
    )
    def post(self, request):
        if not table_exists("portal_invigilator_allocation"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        d = request.data
        if not d.get("exam_schedule_id") or not d.get("teacher_id"):
            return Response({"detail": "exam_schedule_id and teacher_id are required."}, status=400)
        # conflict check: same teacher, same date, overlapping time
        conflict = row(
            "SELECT id FROM portal_invigilator_allocation WHERE teacher_id=%s AND exam_date=%s "
            "AND (%s::time < end_time AND %s::time > start_time)",
            [d.get("teacher_id"), d.get("exam_date"), d.get("start_time"), d.get("start_time")],
        ) if d.get("start_time") and d.get("exam_date") else None
        if conflict:
            return Response({"detail": "Teacher already assigned at this time."}, status=400)
        with connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO portal_invigilator_allocation (exam_schedule_id, teacher_id, room_name, exam_date, start_time, end_time) "
                "VALUES (%s,%s,%s,%s,%s,%s) RETURNING id",
                [d.get("exam_schedule_id"), d.get("teacher_id"), d.get("room_name") or "",
                 d.get("exam_date"), d.get("start_time"), d.get("end_time")],
            )
            new_id = cursor.fetchone()[0]
        log_action(request.user, "exam.invigilator.create", "portal_invigilator_allocation", new_id, dict(d))
        return Response({"id": new_id, "detail": "Invigilator assigned."}, status=201)

    @extend_schema(
        operation_id="AdminExamWorkflowInvigilatorUpdate", summary="Update an invigilator allocation", tags=["Examinations"],
        request=OpenApiTypes.OBJECT, responses={200: DetailErrorSerializer, **ERROR_RESPONSES},
    )
    def patch(self, request):
        if not table_exists("portal_invigilator_allocation"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        d = request.data
        rid = d.get("id")
        if rid in (None, ""):
            return Response({"detail": "The 'id' field is required for updates."}, status=400)
        fields = {}
        for col in ("exam_schedule_id", "teacher_id", "room_name", "exam_date", "start_time", "end_time"):
            if col in d and d[col] not in (None, ""):
                fields[col] = d[col]
        if not fields:
            return Response({"detail": "No updatable fields were provided."}, status=400)
        cols = list(fields)
        with connection.cursor() as cursor:
            cursor.execute(
                f"UPDATE portal_invigilator_allocation SET {', '.join(f'{c}=%s' for c in cols)} WHERE id=%s",
                [fields[c] for c in cols] + [rid],
            )
        log_action(request.user, "exam.invigilator.update", "portal_invigilator_allocation", rid, dict(fields))
        return Response({"id": rid, "detail": "Invigilator allocation updated."})

    @extend_schema(
        operation_id="AdminExamWorkflowInvigilatorDelete", summary="Remove an invigilator allocation", tags=["Examinations"],
        responses={200: DetailErrorSerializer, **ERROR_RESPONSES},
    )
    def delete(self, request):
        if not table_exists("portal_invigilator_allocation"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        try:
            rid = int(request.query_params.get("id", ""))
        except (TypeError, ValueError):
            return Response({"detail": "The 'id' query parameter is required."}, status=400)
        with connection.cursor() as cursor:
            cursor.execute("DELETE FROM portal_invigilator_allocation WHERE id=%s", [rid])
        log_action(request.user, "exam.invigilator.delete", "portal_invigilator_allocation", rid)
        return Response({"detail": "Invigilator allocation removed."})


# =============================================================================
# Hall tickets
# =============================================================================
class ExamWorkflowHallTicketsView(AdminMixin, APIView):
    @extend_schema(
        operation_id="AdminExamWorkflowHallTicketsGenerate", summary="Generate hall tickets for a schedule", tags=["Examinations"],
        request=OpenApiTypes.OBJECT, responses={200: DetailErrorSerializer, **ERROR_RESPONSES},
    )
    def post(self, request):
        if not table_exists("portal_hall_ticket"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        sched_id = request.data.get("exam_schedule_id")
        if not sched_id:
            return Response({"detail": "exam_schedule_id is required."}, status=400)
        exam = row("SELECT class_id, exam_name FROM portal_exam_schedule WHERE id=%s", [sched_id])
        if not exam:
            return Response({"detail": "Exam schedule not found."}, status=404)
        enrolled = rows(
            "SELECT student_id FROM portal_student_enrollment WHERE class_id=%s ORDER BY roll_number",
            [exam["class_id"]],
        )
        generated = 0
        with connection.cursor() as cursor:
            for enr in enrolled:
                existing = row(
                    "SELECT id FROM portal_hall_ticket WHERE student_id=%s AND exam_schedule_id=%s",
                    [enr["student_id"], sched_id],
                )
                if existing:
                    continue
                cursor.execute(
                    "INSERT INTO portal_hall_ticket (student_id, exam_schedule_id, ticket_number) "
                    "VALUES (%s,%s,%s)",
                    [enr["student_id"], sched_id, f"HT-{sched_id}-{enr['student_id']}"],
                )
                generated += 1
        log_action(request.user, "exam.hall_ticket.generate", "portal_hall_ticket", sched_id, {"generated": generated})
        return Response({
            "detail": f"Hall tickets generated for {generated} students.",
            "total_generated": generated,
            "total_students": len(enrolled),
            "message": "Tickets can now be downloaded from the student portal.",
        })


# =============================================================================
# Marks verification
# =============================================================================
class ExamWorkflowVerifyMarksView(AdminMixin, APIView):
    @extend_schema(
        operation_id="AdminExamWorkflowVerifyMarksList", summary="List unverified results", tags=["Examinations"],
        responses={200: serializers.ListSerializer(child=serializers.JSONField()), **ERROR_RESPONSES},
    )
    def get(self, request):
        if not table_exists("portal_result"):
            return Response([])
        sched_id = request.query_params.get("exam_schedule_id")
        if sched_id:
            exam = row(
                "SELECT e.id, e.exam_name, e.max_marks, c.name || '-' || c.section AS class_name, s.name AS subject_name "
                "FROM portal_exam_schedule e JOIN portal_class c ON c.id=e.class_id JOIN portal_subject s ON s.id=e.subject_id "
                "WHERE e.id=%s",
                [sched_id],
            )
            entries = rows(
                """
                SELECT r.id, r.student_id, COALESCE(u.first_name || ' ' || u.last_name, u.username) AS student_name,
                       r.marks_obtained, r.total_marks, r.percentage, r.grade_letter, r.is_verified, r.remarks
                FROM portal_result r JOIN auth_user u ON u.id = r.student_id
                WHERE r.exam_schedule_id = %s ORDER BY r.id
                """,
                [sched_id],
            )
            return Response({"exam": serialise(exam), "rows": serialise(entries)})
        data = rows(
            """
            SELECT r.id, r.exam_schedule_id, r.student_id,
                   COALESCE(u.first_name || ' ' || u.last_name, u.username) AS student_name,
                   e.exam_name, r.marks_obtained, r.is_verified
            FROM portal_result r
            JOIN auth_user u ON u.id = r.student_id
            LEFT JOIN portal_exam_schedule e ON e.id = r.exam_schedule_id
            WHERE r.is_verified = false
            ORDER BY r.id DESC LIMIT 200
            """
        )
        return Response(serialise(data))

    @extend_schema(
        operation_id="AdminExamWorkflowVerifyMarks", summary="Verify a result", tags=["Examinations"],
        request=OpenApiTypes.OBJECT, responses={200: DetailErrorSerializer, **ERROR_RESPONSES},
    )
    def post(self, request):
        if not table_exists("portal_result"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        rid = request.data.get("id")
        action = request.data.get("action")
        if not rid:
            return Response({"detail": "Result id is required."}, status=400)
        if action == "verify":
            with connection.cursor() as cursor:
                cursor.execute("UPDATE portal_result SET is_verified=true, updated_at=now() WHERE id=%s", [rid])
            log_action(request.user, "exam.marks.verify", "portal_result", rid, {"action": action})
            return Response({"detail": "Marks verified."})
        return Response({"detail": "Invalid action."}, status=400)


# =============================================================================
# Grade configuration
# =============================================================================
class ExamWorkflowGradeConfigView(AdminMixin, APIView):
    @extend_schema(
        operation_id="AdminExamWorkflowGradeConfigList", summary="List grade bands", tags=["Examinations"],
        responses={200: serializers.ListSerializer(child=serializers.JSONField()), **ERROR_RESPONSES},
    )
    def get(self, request):
        if not table_exists("portal_grade_config"):
            return Response([])
        return Response(serialise(rows("SELECT * FROM portal_grade_config ORDER BY min_percentage DESC")))

    @extend_schema(
        operation_id="AdminExamWorkflowGradeConfigCreate", summary="Create a grade band", tags=["Examinations"],
        request=OpenApiTypes.OBJECT, responses={201: DetailErrorSerializer, **ERROR_RESPONSES},
    )
    def post(self, request):
        if not table_exists("portal_grade_config"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        d = request.data
        if not (d.get("grade_letter") or "").strip():
            return Response({"detail": "Grade letter is required."}, status=400)
        with connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO portal_grade_config (academic_year, grade_letter, min_percentage, max_percentage, grade_points, description, cgpa_value) "
                "VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING id",
                [d.get("academic_year") or str(date.today().year), d.get("grade_letter"),
                 d.get("min_percentage", 0), d.get("max_percentage", 100),
                 d.get("grade_points") or None, d.get("description") or "", d.get("cgpa_value") or None],
            )
            new_id = cursor.fetchone()[0]
        log_action(request.user, "exam.grade_config.create", "portal_grade_config", new_id, dict(d))
        return Response({"id": new_id, "detail": "Grade band created."}, status=201)

    @extend_schema(
        operation_id="AdminExamWorkflowGradeConfigUpdate", summary="Update a grade band", tags=["Examinations"],
        request=OpenApiTypes.OBJECT, responses={200: DetailErrorSerializer, **ERROR_RESPONSES},
    )
    def patch(self, request):
        if not table_exists("portal_grade_config"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        d = request.data
        rid = d.get("id")
        if rid in (None, ""):
            return Response({"detail": "The 'id' field is required for updates."}, status=400)
        fields = {}
        for col in ("academic_year", "grade_letter", "min_percentage", "max_percentage", "grade_points", "description", "cgpa_value"):
            if col in d and d[col] not in (None, ""):
                fields[col] = d[col]
        if not fields:
            return Response({"detail": "No updatable fields were provided."}, status=400)
        cols = list(fields)
        with connection.cursor() as cursor:
            cursor.execute(
                f"UPDATE portal_grade_config SET {', '.join(f'{c}=%s' for c in cols)} WHERE id=%s",
                [fields[c] for c in cols] + [rid],
            )
        log_action(request.user, "exam.grade_config.update", "portal_grade_config", rid, dict(fields))
        return Response({"id": rid, "detail": "Grade band updated."})

    @extend_schema(
        operation_id="AdminExamWorkflowGradeConfigDelete", summary="Delete a grade band", tags=["Examinations"],
        responses={200: DetailErrorSerializer, **ERROR_RESPONSES},
    )
    def delete(self, request):
        if not table_exists("portal_grade_config"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        try:
            rid = int(request.query_params.get("id", ""))
        except (TypeError, ValueError):
            return Response({"detail": "The 'id' query parameter is required."}, status=400)
        with connection.cursor() as cursor:
            cursor.execute("DELETE FROM portal_grade_config WHERE id=%s", [rid])
        log_action(request.user, "exam.grade_config.delete", "portal_grade_config", rid)
        return Response({"detail": "Grade band deleted."})


# =============================================================================
# Result processing
# =============================================================================
class ExamWorkflowProcessResultsView(AdminMixin, APIView):
    @extend_schema(
        operation_id="AdminExamWorkflowProcessResults", summary="Process results for a schedule", tags=["Examinations"],
        request=OpenApiTypes.OBJECT, responses={200: DetailErrorSerializer, **ERROR_RESPONSES},
    )
    def post(self, request):
        if not table_exists("portal_result"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        sched_id = request.data.get("exam_schedule_id")
        if not sched_id:
            return Response({"detail": "exam_schedule_id is required."}, status=400)
        exam = row("SELECT max_marks, passing_marks FROM portal_exam_schedule WHERE id=%s", [sched_id])
        if not exam:
            return Response({"detail": "Exam schedule not found."}, status=404)
        max_marks = exam["max_marks"] or 100
        passing_marks = exam["passing_marks"] or 40
        pending = rows(
            "SELECT id, student_id, marks_obtained FROM portal_result WHERE exam_schedule_id=%s AND is_verified=false",
            [sched_id],
        )
        processed = 0
        with connection.cursor() as cursor:
            for r in pending:
                marks = r["marks_obtained"]
                pct = (marks / max_marks * 100) if max_marks else 0
                grade, points = _grade_for_pct(pct)
                cursor.execute(
                    "UPDATE portal_result SET total_marks=%s, percentage=%s, grade_letter=%s, grade_points=%s, "
                    "pass_fail=%s, cgpa=%s, grade_point=%s, is_verified=true, updated_at=now() WHERE id=%s",
                    [max_marks, round(pct, 2), grade, points, "Pass" if marks >= passing_marks else "Fail",
                     round(pct / 10, 2), points, r["id"]],
                )
                processed += 1
        log_action(request.user, "exam.process_results", "portal_result", sched_id, {"processed": processed})
        return Response({
            "detail": f"Processed {processed} results.",
            "processed": processed,
            "total": len(pending),
            "message": "Grades and pass/fail status have been computed.",
        })


# =============================================================================
# Notifications
# =============================================================================
class ExamWorkflowNotificationsView(AdminMixin, APIView):
    @extend_schema(
        operation_id="AdminExamWorkflowNotificationsList", summary="List exam notifications", tags=["Examinations"],
        responses={200: serializers.ListSerializer(child=serializers.JSONField()), **ERROR_RESPONSES},
    )
    def get(self, request):
        if not table_exists("portal_exam_notification"):
            return Response([])
        return Response(serialise(rows("SELECT * FROM portal_exam_notification ORDER BY created_at DESC LIMIT 100")))

    @extend_schema(
        operation_id="AdminExamWorkflowNotificationCreate", summary="Create an exam notification", tags=["Examinations"],
        request=OpenApiTypes.OBJECT, responses={201: DetailErrorSerializer, **ERROR_RESPONSES},
    )
    def post(self, request):
        if not table_exists("portal_exam_notification"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        d = request.data
        if not (d.get("title") or "").strip() or not (d.get("message") or "").strip():
            return Response({"detail": "Title and message are required."}, status=400)
        with connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO portal_exam_notification (exam_schedule_id, notification_type, title, message, target_audience) "
                "VALUES (%s,%s,%s,%s,%s) RETURNING id",
                [d.get("exam_schedule_id"), d.get("notification_type") or "Exam_Schedule",
                 d.get("title"), d.get("message"), d.get("target_audience") or "Students"],
            )
            new_id = cursor.fetchone()[0]
        log_action(request.user, "exam.notification.create", "portal_exam_notification", new_id, {"title": d.get("title")})
        return Response({"id": new_id, "detail": "Notification created."}, status=201)


class ExamWorkflowNotificationSendView(AdminMixin, APIView):
    @extend_schema(
        operation_id="AdminExamWorkflowNotificationSend", summary="Send a notification", tags=["Examinations"],
        request=OpenApiTypes.OBJECT, responses={200: DetailErrorSerializer, **ERROR_RESPONSES},
    )
    def post(self, request):
        if not table_exists("portal_exam_notification"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        nid = request.data.get("id")
        if not nid:
            return Response({"detail": "Notification id is required."}, status=400)
        notif = row("SELECT * FROM portal_exam_notification WHERE id=%s", [nid])
        if not notif:
            return Response({"detail": "Notification not found."}, status=404)
        # Mirror into the shared notification feed (portal_notification) so the
        # target audience actually sees it in their portals.
        with connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO portal_notification (sender_id, recipient_type, title, message) VALUES (%s,%s,%s,%s)",
                [request.user.id, notif["target_audience"] or "All", notif["title"], notif["message"]],
            )
            cursor.execute("UPDATE portal_exam_notification SET is_sent=true, sent_at=now() WHERE id=%s", [nid])
        log_action(request.user, "exam.notification.send", "portal_exam_notification", nid, {})
        return Response({"detail": "Notification sent."})


# =============================================================================
# Reports
# =============================================================================
class ExamWorkflowReportsView(AdminMixin, APIView):
    REPORT_TYPES = {"student_performance", "class_analysis", "subject_analysis", "pass_fail_summary", "toppers", "grade_distribution"}

    @extend_schema(
        operation_id="AdminExamWorkflowReports", summary="Generate an exam report", tags=["Examinations"],
        responses={200: serializers.ListSerializer(child=serializers.JSONField()), **ERROR_RESPONSES},
    )
    def get(self, request):
        if not table_exists("portal_result"):
            return Response({"results": []})
        rtype = request.query_params.get("type")
        if rtype not in self.REPORT_TYPES:
            return Response({"detail": "Invalid report type."}, status=400)
        if rtype == "student_performance":
            data = rows(
                """
                SELECT r.id, r.student_id,
                       COALESCE(u.first_name || ' ' || u.last_name, u.username) AS student_name,
                       e.exam_name, s.name AS subject_name, r.marks_obtained, r.percentage,
                       r.grade_letter, r.pass_fail
                FROM portal_result r
                JOIN auth_user u ON u.id = r.student_id
                LEFT JOIN portal_exam_schedule e ON e.id = r.exam_schedule_id
                LEFT JOIN portal_subject s ON s.id = e.subject_id
                ORDER BY r.student_id, r.exam_schedule_id
                """
            )
        elif rtype == "class_analysis":
            data = rows(
                """
                SELECT c.name || '-' || c.section AS class_name, e.exam_name,
                       COUNT(r.id) AS total_results,
                       ROUND(AVG(r.percentage)::numeric, 2) AS average_percentage,
                       ROUND(AVG(r.marks_obtained)::numeric, 2) AS average_marks
                FROM portal_result r
                LEFT JOIN portal_exam_schedule e ON e.id = r.exam_schedule_id
                LEFT JOIN portal_class c ON c.id = e.class_id
                GROUP BY class_name, e.exam_name ORDER BY class_name
                """
            )
        elif rtype == "subject_analysis":
            data = rows(
                """
                SELECT s.name AS subject_name, e.exam_name,
                       COUNT(r.id) AS total_results,
                       ROUND(AVG(r.marks_obtained)::numeric, 2) AS average_marks,
                       MAX(r.marks_obtained) AS highest_marks
                FROM portal_result r
                LEFT JOIN portal_exam_schedule e ON e.id = r.exam_schedule_id
                LEFT JOIN portal_subject s ON s.id = e.subject_id
                GROUP BY subject_name, e.exam_name ORDER BY subject_name
                """
            )
        elif rtype == "pass_fail_summary":
            data = rows(
                """
                SELECT e.exam_name, s.name AS subject_name,
                       COUNT(*) FILTER (WHERE r.pass_fail = 'Pass') AS passed,
                       COUNT(*) FILTER (WHERE r.pass_fail = 'Fail') AS failed,
                       ROUND(COUNT(*) FILTER (WHERE r.pass_fail = 'Pass') * 100.0 / NULLIF(COUNT(*), 0), 2) AS pass_percentage
                FROM portal_result r
                LEFT JOIN portal_exam_schedule e ON e.id = r.exam_schedule_id
                LEFT JOIN portal_subject s ON s.id = e.subject_id
                GROUP BY e.exam_name, s.name ORDER BY e.exam_name
                """
            )
        elif rtype == "toppers":
            data = rows(
                """
                SELECT r.student_id,
                       COALESCE(u.first_name || ' ' || u.last_name, u.username) AS student_name,
                       e.exam_name, ROUND(r.percentage::numeric, 2) AS percentage, r.grade_letter
                FROM portal_result r
                JOIN auth_user u ON u.id = r.student_id
                LEFT JOIN portal_exam_schedule e ON e.id = r.exam_schedule_id
                WHERE r.percentage IS NOT NULL
                ORDER BY r.percentage DESC LIMIT 50
                """
            )
        else:  # grade_distribution
            data = rows(
                """
                SELECT grade_letter, COUNT(*) AS students
                FROM portal_result WHERE grade_letter IS NOT NULL
                GROUP BY grade_letter ORDER BY grade_letter
                """
            )
        return Response({"results": serialise(data)})


# =============================================================================
# Analytics dashboard
# =============================================================================
class ExamWorkflowAnalyticsView(AdminMixin, APIView):
    @extend_schema(
        operation_id="AdminExamWorkflowAnalytics", summary="Exam dashboard analytics", tags=["Examinations"],
        responses={200: serializers.JSONField(), **ERROR_RESPONSES},
    )
    def get(self, request):
        total_exams = total_students = passed = failed = 0
        pass_pct = average_marks = 0.0
        if table_exists("portal_exam_schedule"):
            total_exams = row("SELECT COUNT(*) FROM portal_exam_schedule")["count"]
        if table_exists("portal_result"):
            agg = row(
                """
                SELECT COUNT(*) AS total,
                       COUNT(*) FILTER (WHERE pass_fail = 'Pass') AS passed,
                       COUNT(*) FILTER (WHERE pass_fail = 'Fail') AS failed,
                       ROUND(AVG(marks_obtained)::numeric, 2) AS avg_marks
                FROM portal_result
                """
            )
            total_students = agg["total"] or 0
            passed = agg["passed"] or 0
            failed = agg["failed"] or 0
            average_marks = agg["avg_marks"] or 0
            pass_pct = round(passed * 100.0 / total_students, 2) if total_students else 0
        pending = 0
        if table_exists("portal_result"):
            pending = row("SELECT COUNT(*) FROM portal_result WHERE is_verified = false")["count"]
        return Response({
            "total_exams": total_exams,
            "total_students": total_students,
            "passed": passed,
            "failed": failed,
            "pass_percentage": pass_pct,
            "average_marks": average_marks,
            "pending_evaluations": pending,
        })
