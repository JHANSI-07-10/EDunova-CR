from datetime import date, datetime
from uuid import uuid4
import logging

from django.db import connection
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.throttling import ScopedRateThrottle
from rest_framework import serializers, status

from drf_spectacular.utils import extend_schema, OpenApiParameter, inline_serializer

logger = logging.getLogger("edunova")

from .doc_schemas import (
    DetailErrorSerializer,
    ValidationErrorSerializer,
    LeaveRequestSerializer,
    LeaveSubmitResponseSerializer,
    ChatRequestSerializer,
    ChatResponseSerializer,
    ChatRequestExample,
    MONTH_PARAMETER,
    SEARCH_QUERY_PARAMETER,
    ERROR_RESPONSES,
    FileUploadRequestSerializer,
    FileUploadResponseSerializer,
)

from .roles import IsStudent


# ---------------------------------------------------------------------------
# Documentation-only schemas for the student portal views (raw SQL, no DRF
# serializers). These are never used for (de)serialization — they exist solely
# so drf-spectacular can render the hand-shaped response/request payloads.
# ---------------------------------------------------------------------------

_StudentProfileResponse = inline_serializer(
    name="StudentProfileResponse",
    fields={
        "id": serializers.IntegerField(help_text="Django auth user id."),
        "name": serializers.CharField(help_text="Full name of the student."),
        "email": serializers.EmailField(allow_blank=True),
        "phone_number": serializers.CharField(allow_blank=True),
        "admission_number": serializers.CharField(allow_blank=True),
        "class_name": serializers.CharField(help_text="Class grade-section, or 'Not assigned'."),
        "date_of_birth": serializers.DateField(allow_null=True, required=False),
        "gender": serializers.CharField(allow_blank=True),
        "blood_group": serializers.CharField(allow_blank=True),
        "status": serializers.CharField(),
        "roll_number": serializers.CharField(allow_null=True, required=False),
        "academic_year": serializers.CharField(allow_null=True, required=False),
    },
)

_ExamsDueItem = inline_serializer(
    name="DashboardUpcomingExamItem",
    fields={
        "id": serializers.IntegerField(),
        "exam_name": serializers.CharField(),
        "exam_type": serializers.CharField(),
        "exam_date": serializers.DateField(),
        "duration_minutes": serializers.IntegerField(),
        "max_marks": serializers.FloatField(),
        "subject_name": serializers.CharField(),
    },
)

_DashboardAssignmentItem = inline_serializer(
    name="DashboardAssignmentItem",
    fields={
        "id": serializers.IntegerField(),
        "title": serializers.CharField(),
        "description": serializers.CharField(allow_null=True, required=False),
        "due_date": serializers.DateTimeField(allow_null=True, required=False),
        "max_marks": serializers.FloatField(),
        "subject_name": serializers.CharField(),
    },
)

_ExamRefItem = inline_serializer(
    name="DashboardExamRefItem",
    fields={
        "id": serializers.IntegerField(),
        "exam_name": serializers.CharField(),
        "max_marks": serializers.FloatField(),
        "subject_name": serializers.CharField(),
    },
)

_DashboardResultItem = inline_serializer(
    name="DashboardResultItem",
    fields={
        "id": serializers.IntegerField(),
        "marks_obtained": serializers.FloatField(),
        "rank_position": serializers.IntegerField(allow_null=True, required=False),
        "grade_letter": serializers.CharField(allow_blank=True),
        "remarks": serializers.CharField(allow_blank=True),
        "percentage": serializers.FloatField(),
        "exam": _ExamRefItem,
    },
)

_DashboardHomeworkItem = inline_serializer(
    name="DashboardHomeworkItem",
    fields={
        "id": serializers.IntegerField(),
        "title": serializers.CharField(),
        "description": serializers.CharField(allow_null=True, required=False),
        "assigned_date": serializers.DateField(allow_null=True, required=False),
        "due_date": serializers.DateField(allow_null=True, required=False),
        "subject_name": serializers.CharField(),
        "is_overdue": serializers.BooleanField(),
    },
)

_DashboardAnnouncementItem = inline_serializer(
    name="DashboardAnnouncementItem",
    fields={
        "id": serializers.IntegerField(),
        "title": serializers.CharField(),
        "message": serializers.CharField(allow_blank=True),
        "created_at": serializers.DateTimeField(),
        "sender_name": serializers.CharField(),
    },
)

_DashboardPendingFeeItem = inline_serializer(
    name="DashboardPendingFeeItem",
    fields={
        "id": serializers.IntegerField(),
        "term_name": serializers.CharField(),
        "tuition_fee": serializers.FloatField(),
        "transport_fee": serializers.FloatField(),
        "hostel_fee": serializers.FloatField(),
        "total_amount": serializers.FloatField(),
    },
)

_StudentDashboardResponse = inline_serializer(
    name="StudentDashboardResponse",
    fields={
        "attendance_percentage": serializers.FloatField(allow_null=True, required=False),
        "assignments_due": serializers.ListSerializer(child=_DashboardAssignmentItem),
        "upcoming_exams": serializers.ListSerializer(child=_ExamsDueItem),
        "pending_fees": serializers.ListSerializer(child=_DashboardPendingFeeItem),
        "recent_results": serializers.ListSerializer(child=_DashboardResultItem),
        "homework_due": serializers.ListSerializer(child=_DashboardHomeworkItem),
        "announcements": serializers.ListSerializer(child=_DashboardAnnouncementItem),
    },
)

_AttendanceSummaryResponse = inline_serializer(
    name="AttendanceSummaryResponse",
    fields={
        "present": serializers.IntegerField(),
        "absent": serializers.IntegerField(),
        "late": serializers.IntegerField(),
        "medical_leave": serializers.IntegerField(),
        "percentage": serializers.FloatField(allow_null=True, required=False),
    },
)

_AttendanceRecordItem = inline_serializer(
    name="AttendanceRecordItem",
    fields={
        "id": serializers.IntegerField(),
        "date": serializers.DateField(),
        "status": serializers.CharField(help_text="e.g. Present, Absent, Late, Medical."),
        "remarks": serializers.CharField(allow_blank=True),
    },
)

_AttendanceListResponse = inline_serializer(
    name="AttendanceListResponse",
    fields={
        "summary": _AttendanceSummaryResponse,
        "records": serializers.ListSerializer(child=_AttendanceRecordItem),
    },
)

_TimetableItem = inline_serializer(
    name="TimetableItem",
    fields={
        "id": serializers.IntegerField(),
        "day_of_week": serializers.CharField(),
        "start_time": serializers.TimeField(),
        "end_time": serializers.TimeField(),
        "subject_name": serializers.CharField(),
        "teacher_name": serializers.CharField(),
    },
)

_HomeworkItem = inline_serializer(
    name="HomeworkItem",
    fields={
        "id": serializers.IntegerField(),
        "title": serializers.CharField(),
        "description": serializers.CharField(allow_null=True, required=False),
        "assigned_date": serializers.DateField(allow_null=True, required=False),
        "due_date": serializers.DateField(allow_null=True, required=False),
        "subject_name": serializers.CharField(),
        "teacher_name": serializers.CharField(),
        "is_overdue": serializers.BooleanField(),
    },
)

_AssignmentSubmissionItem = inline_serializer(
    name="AssignmentSubmissionItem",
    fields={
        "id": serializers.IntegerField(),
        "submission_url": serializers.CharField(allow_blank=True),
        "submitted_at": serializers.DateTimeField(allow_null=True, required=False),
        "marks_obtained": serializers.FloatField(allow_null=True, required=False),
        "teacher_feedback": serializers.CharField(allow_blank=True),
        "grade": serializers.CharField(allow_blank=True),
    },
)

_AssignmentItem = inline_serializer(
    name="AssignmentItem",
    fields={
        "id": serializers.IntegerField(),
        "title": serializers.CharField(),
        "description": serializers.CharField(allow_null=True, required=False),
        "file_url": serializers.CharField(allow_null=True, required=False),
        "max_marks": serializers.FloatField(),
        "due_date": serializers.DateTimeField(allow_null=True, required=False),
        "assignment_type": serializers.CharField(),
        "quiz_questions": serializers.ListField(),
        "subject_name": serializers.CharField(),
        "my_submission": _AssignmentSubmissionItem,
    },
)

_AssignmentSubmitRequest = inline_serializer(
    name="AssignmentSubmitRequest",
    fields={
        "submission_url": serializers.CharField(help_text="Submission URL or file URL."),
    },
)

_AssignmentSubmitResponse = inline_serializer(
    name="AssignmentSubmitResponse",
    fields={
        "detail": serializers.CharField(),
        "id": serializers.IntegerField(),
        "marks_obtained": serializers.FloatField(allow_null=True, required=False),
        "grade": serializers.CharField(allow_null=True, required=False),
    },
)

_CourseResourceItem = inline_serializer(
    name="CourseResourceItem",
    fields={
        "id": serializers.IntegerField(),
        "content_type": serializers.CharField(),
        "title": serializers.CharField(),
        "resource_url": serializers.URLField(allow_blank=True),
        "description": serializers.CharField(allow_blank=True),
        "due_date": serializers.DateField(allow_null=True, required=False),
        "max_marks": serializers.FloatField(allow_null=True, required=False),
        "quiz_id": serializers.IntegerField(allow_null=True, required=False),
        "assignment_id": serializers.IntegerField(allow_null=True, required=False),
        "visible_from": serializers.DateTimeField(allow_null=True, required=False),
        "uploaded_at": serializers.DateTimeField(),
        "download_count": serializers.IntegerField(),
        "sort_order": serializers.IntegerField(),
        "is_completed": serializers.BooleanField(),
        "submission": _AssignmentSubmissionItem,
    },
)

_CourseLessonItem = inline_serializer(
    name="CourseLessonItem",
    fields={
        "id": serializers.IntegerField(),
        "title": serializers.CharField(),
        "description": serializers.CharField(allow_blank=True),
        "sort_order": serializers.IntegerField(),
        "resources": serializers.ListSerializer(child=_CourseResourceItem),
    },
)

_CourseChapterResourceItem = inline_serializer(
    name="CourseChapterResourceItem",
    fields={
        "id": serializers.IntegerField(),
        "content_type": serializers.CharField(),
        "title": serializers.CharField(),
        "resource_url": serializers.URLField(allow_blank=True),
        "description": serializers.CharField(allow_blank=True),
        "visible_from": serializers.DateTimeField(allow_null=True, required=False),
        "uploaded_at": serializers.DateTimeField(),
        "download_count": serializers.IntegerField(),
        "sort_order": serializers.IntegerField(),
        "is_completed": serializers.BooleanField(),
    },
)

_CourseChapterItem = inline_serializer(
    name="CourseChapterItem",
    fields={
        "id": serializers.IntegerField(),
        "title": serializers.CharField(),
        "description": serializers.CharField(allow_blank=True),
        "sort_order": serializers.IntegerField(),
        "resources": serializers.ListSerializer(child=_CourseChapterResourceItem),
        "lessons": serializers.ListSerializer(child=_CourseLessonItem),
    },
)

_CourseLegacyContentItem = inline_serializer(
    name="CourseLegacyContentItem",
    fields={
        "id": serializers.IntegerField(),
        "content_type": serializers.CharField(),
        "title": serializers.CharField(),
        "resource_url": serializers.URLField(allow_blank=True),
        "sort_order": serializers.IntegerField(),
        "is_completed": serializers.BooleanField(),
    },
)

_CourseQuizItem = inline_serializer(
    name="CourseQuizItem",
    fields={
        "id": serializers.IntegerField(),
        "title": serializers.CharField(),
        "duration_minutes": serializers.IntegerField(),
        "passing_score": serializers.FloatField(),
    },
)

_CourseItem = inline_serializer(
    name="CourseItem",
    fields={
        "id": serializers.IntegerField(),
        "title": serializers.CharField(),
        "description": serializers.CharField(allow_blank=True),
        "subject_name": serializers.CharField(),
        "chapters": serializers.ListSerializer(child=_CourseChapterItem),
        "legacy_content": serializers.ListSerializer(child=_CourseLegacyContentItem),
        "quizzes": serializers.ListSerializer(child=_CourseQuizItem),
    },
)

_QuizQuestionItem = inline_serializer(
    name="QuizQuestionItem",
    fields={
        "id": serializers.IntegerField(),
        "question_text": serializers.CharField(),
        "options": serializers.ListField(),
    },
)

_QuizDetailResponse = inline_serializer(
    name="QuizDetailResponse",
    fields={
        "id": serializers.IntegerField(),
        "title": serializers.CharField(),
        "duration_minutes": serializers.IntegerField(allow_null=True, required=False),
        "passing_score": serializers.FloatField(allow_null=True, required=False),
        "questions": serializers.ListSerializer(child=_QuizQuestionItem),
    },
)

_QuizSubmitRequest = inline_serializer(
    name="QuizSubmitRequest",
    fields={
        "answers": serializers.DictField(child=serializers.CharField(), allow_null=True, required=False),
    },
)

_QuizSubmitResponse = inline_serializer(
    name="QuizSubmitResponse",
    fields={
        "score": serializers.IntegerField(),
        "detail": serializers.CharField(),
    },
)

_ExamItem = inline_serializer(
    name="ExamItem",
    fields={
        "id": serializers.IntegerField(),
        "exam_name": serializers.CharField(),
        "exam_type": serializers.CharField(),
        "exam_date": serializers.DateField(),
        "start_time": serializers.TimeField(allow_null=True, required=False),
        "duration_minutes": serializers.IntegerField(),
        "max_marks": serializers.FloatField(),
        "subject_name": serializers.CharField(),
    },
)

_HallTicketExamItem = inline_serializer(
    name="HallTicketExamItem",
    fields={
        "id": serializers.IntegerField(),
        "exam_name": serializers.CharField(),
        "exam_date": serializers.DateField(allow_null=True, required=False),
        "subject_name": serializers.CharField(),
    },
)

_HallTicketItem = inline_serializer(
    name="HallTicketItem",
    fields={
        "id": serializers.IntegerField(),
        "ticket_number": serializers.CharField(),
        "is_verified": serializers.BooleanField(),
        "exam": _HallTicketExamItem,
    },
)

_ResultExamItem = inline_serializer(
    name="ResultExamItem",
    fields={
        "id": serializers.IntegerField(),
        "exam_name": serializers.CharField(),
        "max_marks": serializers.FloatField(),
        "subject_name": serializers.CharField(),
    },
)

_ResultItem = inline_serializer(
    name="ResultItem",
    fields={
        "id": serializers.IntegerField(),
        "marks_obtained": serializers.FloatField(),
        "rank_position": serializers.IntegerField(allow_null=True, required=False),
        "grade_letter": serializers.CharField(allow_blank=True),
        "remarks": serializers.CharField(allow_blank=True),
        "percentage": serializers.FloatField(),
        "exam": _ResultExamItem,
    },
)

_PaymentFeeStructureItem = inline_serializer(
    name="PaymentFeeStructureItem",
    fields={
        "id": serializers.IntegerField(),
        "term_name": serializers.CharField(),
        "total_amount": serializers.FloatField(),
    },
)

_PaymentHistoryItem = inline_serializer(
    name="PaymentHistoryItem",
    fields={
        "id": serializers.IntegerField(),
        "transaction_id": serializers.CharField(),
        "amount_paid": serializers.FloatField(),
        "status": serializers.CharField(),
        "paid_at": serializers.DateTimeField(allow_null=True, required=False),
        "fee_structure_detail": _PaymentFeeStructureItem,
    },
)

_FeesPendingFeeItem = inline_serializer(
    name="FeesPendingFeeItem",
    fields={
        "id": serializers.IntegerField(),
        "term_name": serializers.CharField(),
        "tuition_fee": serializers.FloatField(),
        "transport_fee": serializers.FloatField(),
        "hostel_fee": serializers.FloatField(),
        "total_amount": serializers.FloatField(),
    },
)

_FeesResponse = inline_serializer(
    name="FeesResponse",
    fields={
        "pending": serializers.ListSerializer(child=_FeesPendingFeeItem),
        "payment_history": serializers.ListSerializer(child=_PaymentHistoryItem),
    },
)

_InitiatePaymentRequest = inline_serializer(
    name="InitiatePaymentRequest",
    fields={
        "fee_structure_id": serializers.IntegerField(help_text="Fee structure id to pay for."),
        "payment_method": serializers.CharField(
            required=False, help_text="Online/Offline payment method.", default="Online"
        ),
    },
)

_InitiatePaymentResponse = inline_serializer(
    name="InitiatePaymentResponse",
    fields={
        "detail": serializers.CharField(),
        "id": serializers.IntegerField(),
        "transaction_id": serializers.CharField(),
    },
)

_BookDetailItem = inline_serializer(
    name="BookDetailItem",
    fields={
        "id": serializers.IntegerField(),
        "title": serializers.CharField(),
        "author": serializers.CharField(),
    },
)

_LibraryItem = inline_serializer(
    name="LibraryItem",
    fields={
        "id": serializers.IntegerField(),
        "issue_date": serializers.DateField(allow_null=True, required=False),
        "due_date": serializers.DateField(allow_null=True, required=False),
        "return_date": serializers.DateField(allow_null=True, required=False),
        "fine_amount": serializers.FloatField(),
        "book_detail": _BookDetailItem,
    },
)

_BookItem = inline_serializer(
    name="BookItem",
    fields={
        "id": serializers.IntegerField(),
        "title": serializers.CharField(),
        "author": serializers.CharField(),
        "available_quantity": serializers.IntegerField(),
    },
)

_CertificateItem = inline_serializer(
    name="CertificateItem",
    fields={
        "id": serializers.IntegerField(),
        "certificate_type": serializers.CharField(),
        "issued_date": serializers.DateField(allow_null=True, required=False),
        "file_url": serializers.CharField(allow_blank=True),
    },
)

_AnnouncementItem = inline_serializer(
    name="AnnouncementItem",
    fields={
        "id": serializers.IntegerField(),
        "title": serializers.CharField(),
        "message": serializers.CharField(allow_blank=True),
        "created_at": serializers.DateTimeField(allow_null=True, required=False),
        "sender_name": serializers.CharField(),
    },
)

_EventItem = inline_serializer(
    name="EventItem",
    fields={
        "id": serializers.IntegerField(),
        "title": serializers.CharField(),
        "description": serializers.CharField(allow_blank=True),
        "event_date": serializers.DateField(allow_null=True, required=False),
        "venue": serializers.CharField(allow_blank=True),
    },
)

_LeaveItem = inline_serializer(
    name="LeaveItem",
    fields={
        "id": serializers.IntegerField(),
        "leave_type": serializers.CharField(),
        "start_date": serializers.DateField(allow_null=True, required=False),
        "end_date": serializers.DateField(allow_null=True, required=False),
        "reason": serializers.CharField(allow_blank=True),
        "status": serializers.CharField(),
    },
)


def table_exists(table_name):
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.tables
                    WHERE table_schema='public' AND table_name=%s
                )
                """,
                [table_name],
            )
            return cursor.fetchone()[0]
    except Exception:
        return False


def rows(sql, params=None):
    with connection.cursor() as cursor:
        cursor.execute(sql, params or [])
        cols = [c[0] for c in cursor.description]
        return [dict(zip(cols, r, strict=True)) for r in cursor.fetchall()]


def row(sql, params=None):
    result = rows(sql, params)
    return result[0] if result else None


# Fixed set of exam-cycle names. Rank lists and report cards group results by
# exam_name as a raw string — without a fixed set, "Mid Term" vs "Mid-Term"
# vs "midterm" would silently split one exam cycle's results across three
# different "cycles", producing incomplete report cards with no error.
EXAM_NAME_CHOICES = [
    "Unit_Test_1", "Unit_Test_2", "Unit_Test_3", "Unit_Test_4",
    "Mid_Term", "Final_Term", "Pre_Board", "Board_Exam",
]


def qdate(v):
    if isinstance(v, (date, datetime)):
        return v.isoformat()
    return v


def validate_leave_dates(payload):
    """Validate a leave-request payload's dates, returning (error_response, start, end).

    Returns (None, start, end) on success, or (Response, None, None) with a clean
    400 instead of letting invalid literals / inverted ranges reach Postgres and
    surface as 500s.
    """
    if not isinstance(payload, dict):
        return (
            Response({"detail": "A JSON object body is required."}, status=status.HTTP_400_BAD_REQUEST),
            None,
            None,
        )
    start_raw = payload.get("start_date")
    end_raw = payload.get("end_date")
    if not start_raw or not end_raw:
        return (
            Response({"detail": "Missing required fields."}, status=status.HTTP_400_BAD_REQUEST),
            None,
            None,
        )
    try:
        start = date.fromisoformat(str(start_raw))
    except (TypeError, ValueError):
        return (
            Response({"detail": "start_date must be a valid date (YYYY-MM-DD)."}, status=status.HTTP_400_BAD_REQUEST),
            None,
            None,
        )
    try:
        end = date.fromisoformat(str(end_raw))
    except (TypeError, ValueError):
        return (
            Response({"detail": "end_date must be a valid date (YYYY-MM-DD)."}, status=status.HTTP_400_BAD_REQUEST),
            None,
            None,
        )
    if end < start:
        return (
            Response({"detail": "end_date must be on or after start_date."}, status=status.HTTP_400_BAD_REQUEST),
            None,
            None,
        )
    if start < date.today():
        return (
            Response({"detail": "start_date cannot be in the past."}, status=status.HTTP_400_BAD_REQUEST),
            None,
            None,
        )
    return None, start, end


def serialise(obj):
    if isinstance(obj, list):
        return [serialise(i) for i in obj]
    if isinstance(obj, dict):
        return {k: qdate(v) for k, v in obj.items()}
    return qdate(obj)


def current_class_for_student(user_id):
    if not table_exists("portal_student_enrollment"):
        return None
    return row(
        """
        SELECT e.class_id, c.name || '-' || c.section AS class_name, e.academic_year, e.roll_number
        FROM portal_student_enrollment e
        JOIN portal_class c ON c.id=e.class_id
        WHERE e.student_id=%s
        ORDER BY e.academic_year DESC, e.id DESC
        LIMIT 1
        """,
        [user_id],
    )


def student_profile_payload(user):
    full_name = user.get_full_name().strip() or user.username
    base = {
        "id": user.id,
        "name": full_name,
        "email": user.email,
        "phone_number": "",
        "admission_number": "—",
        "class_name": "Not assigned",
        "date_of_birth": None,
        "gender": "",
        "blood_group": "",
        "status": "Active",
    }
    if table_exists("portal_user_profile"):
        p = row("SELECT phone_number FROM portal_user_profile WHERE user_id=%s", [user.id])
        if p:
            base["phone_number"] = p.get("phone_number") or ""
    if table_exists("portal_student_profile"):
        sp = row("SELECT admission_number, date_of_birth, gender, blood_group, status FROM portal_student_profile WHERE user_id=%s", [user.id])
        if sp:
            base.update(serialise(sp))
    cls = current_class_for_student(user.id)
    if cls:
        base["class_name"] = cls["class_name"]
        base["roll_number"] = cls.get("roll_number")
        base["academic_year"] = cls.get("academic_year")
    return base


class StudentOnlyMixin:
    # RBAC: only accounts whose resolved role is 'Student' pass. Resolved via
    # portal.roles.get_role (portal_user_profile -> groups -> is_staff), never
    # trusted from the client.
    permission_classes = [IsStudent]


class ProfileView(StudentOnlyMixin, APIView):
    @extend_schema(
        operation_id="StudentProfile",
        summary="Get student profile",
        description="Returns the logged-in student's profile information (contact details, admission, class, and academic year).",
        tags=["Student"],
        responses={200: _StudentProfileResponse, **ERROR_RESPONSES},
    )
    def get(self, request):
        return Response(student_profile_payload(request.user))


class DashboardView(StudentOnlyMixin, APIView):
    @extend_schema(
        operation_id="StudentDashboard",
        summary="Get student dashboard summary",
        description="Returns a summary of the student's attendance, upcoming exams, recent results, homework and assignments due, pending fees, and announcements.",
        tags=["Student"],
        responses={200: _StudentDashboardResponse, **ERROR_RESPONSES},
    )
    def get(self, request):
        uid = request.user.id
        cls = current_class_for_student(uid)
        class_id = cls["class_id"] if cls else None

        attendance_percentage = None
        if class_id and table_exists("portal_attendance"):
            stats = row(
                """
                SELECT COUNT(*)::int total,
                       SUM(CASE WHEN status='Present' THEN 1 ELSE 0 END)::int present
                FROM portal_attendance WHERE student_id=%s
                """,
                [uid],
            )
            if stats and stats["total"]:
                attendance_percentage = round((stats["present"] or 0) * 100 / stats["total"], 1)

        assignments_due = []
        if class_id and table_exists("portal_assignment"):
            assignments_due = rows(
                """
                SELECT a.id, a.title, a.description, a.due_date, a.max_marks, s.name AS subject_name
                FROM portal_assignment a JOIN portal_subject s ON s.id=a.subject_id
                WHERE a.class_id=%s AND a.due_date >= now()
                ORDER BY a.due_date ASC LIMIT 5
                """,
                [class_id],
            )

        upcoming_exams = []
        if class_id and table_exists("portal_exam_schedule"):
            upcoming_exams = rows(
                """
                SELECT e.id, e.exam_name, e.exam_type, e.exam_date, e.duration_minutes, e.max_marks,
                       s.name AS subject_name
                FROM portal_exam_schedule e JOIN portal_subject s ON s.id=e.subject_id
                WHERE e.class_id=%s AND e.exam_date >= current_date
                ORDER BY e.exam_date ASC LIMIT 5
                """,
                [class_id],
            )

        recent_results = []
        if table_exists("portal_result"):
            recent_results = rows(
                """
                SELECT r.id, r.marks_obtained, r.rank_position, r.grade_letter, r.remarks,
                       ROUND((r.marks_obtained / NULLIF(e.max_marks,0)) * 100, 1) AS percentage,
                       json_build_object('id', e.id, 'exam_name', e.exam_name, 'max_marks', e.max_marks, 'subject_name', s.name) AS exam
                FROM portal_result r
                JOIN portal_exam_schedule e ON e.id=r.exam_schedule_id
                JOIN portal_subject s ON s.id=e.subject_id
                WHERE r.student_id=%s
                ORDER BY e.exam_date DESC LIMIT 6
                """,
                [uid],
            )

        homework_due = []
        if class_id and table_exists("portal_homework"):
            homework_due = rows(
                """
                SELECT h.id, h.title, h.description, h.assigned_date, h.due_date,
                       COALESCE(s.name, 'General') AS subject_name, (h.due_date < current_date) AS is_overdue
                FROM portal_homework h LEFT JOIN portal_subject s ON s.id=h.subject_id
                WHERE h.class_id=%s
                ORDER BY h.due_date ASC LIMIT 5
                """,
                [class_id],
            )

        announcements = []
        if table_exists("portal_notification"):
            announcements = rows(
                """
                SELECT n.id, n.title, n.message, n.created_at,
                       COALESCE(u.first_name || ' ' || u.last_name, u.username, 'EduNova Admin') AS sender_name
                FROM portal_notification n LEFT JOIN auth_user u ON u.id=n.sender_id
                WHERE n.recipient_type IN ('All','Student') OR n.target_class_id=%s
                ORDER BY n.created_at DESC LIMIT 5
                """,
                [class_id],
            )
        elif table_exists("cms_newspost"):
            announcements = rows(
                """
                SELECT id, title, content AS message, published_date AS created_at, 'EduNova Admin' AS sender_name
                FROM cms_newspost WHERE is_published=true ORDER BY published_date DESC LIMIT 5
                """
            )

        pending_fees = []
        if class_id and table_exists("portal_fee_structure"):
            pending_fees = rows(
                """
                SELECT fs.id, fs.term_name, fs.tuition_fee, fs.transport_fee, fs.hostel_fee, fs.total_amount
                FROM portal_fee_structure fs
                WHERE fs.class_id=%s AND NOT EXISTS (
                  SELECT 1 FROM portal_payment p WHERE p.fee_structure_id=fs.id AND p.student_id=%s AND p.status='Success'
                )
                ORDER BY fs.id LIMIT 5
                """,
                [class_id, uid],
            )

        return Response(serialise({
            "attendance_percentage": attendance_percentage,
            "assignments_due": assignments_due,
            "upcoming_exams": upcoming_exams,
            "pending_fees": pending_fees,
            "recent_results": recent_results,
            "homework_due": homework_due,
            "announcements": announcements,
        }))


class AttendanceListView(StudentOnlyMixin, APIView):
    @extend_schema(
        operation_id="StudentAttendanceList",
        summary="Get attendance records",
        description="Returns the student's attendance records (optionally filtered by an YYYY-MM month) plus a summary count and percentage.",
        tags=["Student"],
        parameters=[MONTH_PARAMETER],
        responses={200: _AttendanceListResponse, **ERROR_RESPONSES},
    )
    def get(self, request):
        month = request.query_params.get("month")
        uid = request.user.id
        records = []
        if table_exists("portal_attendance"):
            sql = "SELECT id, date, status, remarks FROM portal_attendance WHERE student_id=%s"
            params = [uid]
            if month:
                sql += " AND to_char(date, 'YYYY-MM')=%s"
                params.append(month)
            sql += " ORDER BY date DESC"
            records = rows(sql, params)
        summary = {"present": 0, "absent": 0, "late": 0, "medical_leave": 0, "percentage": None}
        for r in records:
            key = str(r["status"]).lower()
            if key == "medical_leave": key = "medical_leave"
            if key in summary: summary[key] += 1
        total = len(records)
        if total:
            summary["percentage"] = round(summary["present"] * 100 / total, 1)
        return Response(serialise({"summary": summary, "records": records}))


class TimetableView(StudentOnlyMixin, APIView):
    @extend_schema(
        operation_id="StudentTimetable",
        summary="Get class timetable",
        description="Returns the weekly timetable entries for the student's enrolled class, or an empty list when not enrolled.",
        tags=["Student"],
        responses={200: serializers.ListSerializer(child=_TimetableItem), **ERROR_RESPONSES},
    )
    def get(self, request):
        cls = current_class_for_student(request.user.id)
        if not cls or not table_exists("portal_timetable"):
            return Response([])
        data = rows(
            """
            SELECT t.id, t.day_of_week, t.start_time, t.end_time,
                   s.name AS subject_name,
                   COALESCE(u.first_name || ' ' || u.last_name, u.username) AS teacher_name
            FROM portal_timetable t
            JOIN portal_subject s ON s.id=t.subject_id
            JOIN auth_user u ON u.id=t.teacher_id
            WHERE t.class_id=%s
            ORDER BY t.day_of_week, t.start_time
            """, [cls["class_id"]]
        )
        return Response(serialise(data))


class HomeworkListView(StudentOnlyMixin, APIView):
    @extend_schema(
        operation_id="StudentHomeworkList",
        summary="Get homework list",
        description="Returns the homework assigned to the student's class, or an empty list when not enrolled.",
        tags=["Student"],
        responses={200: serializers.ListSerializer(child=_HomeworkItem), **ERROR_RESPONSES},
    )
    def get(self, request):
        cls = current_class_for_student(request.user.id)
        if not cls or not table_exists("portal_homework"):
            return Response([])
        data = rows(
            """
            SELECT h.id, h.title, h.description, h.assigned_date, h.due_date,
                   COALESCE(s.name, 'General') AS subject_name,
                   COALESCE(u.first_name || ' ' || u.last_name, u.username) AS teacher_name,
                   (h.due_date < current_date) AS is_overdue
            FROM portal_homework h
            LEFT JOIN portal_subject s ON s.id=h.subject_id
            JOIN auth_user u ON u.id=h.teacher_id
            WHERE h.class_id=%s ORDER BY h.due_date DESC
            """, [cls["class_id"]]
        )
        return Response(serialise(data))


class AssignmentListView(StudentOnlyMixin, APIView):
    @extend_schema(
        operation_id="StudentAssignmentList",
        summary="Get assignments list",
        description="Returns the assignments for the student's class including the student's own submission if any. Quiz correct answers are hidden until submitted.",
        tags=["Student"],
        responses={200: serializers.ListSerializer(child=_AssignmentItem), **ERROR_RESPONSES},
    )
    def get(self, request):
        cls = current_class_for_student(request.user.id)
        if not cls or not table_exists("portal_assignment"):
            return Response([])
        data = rows(
            """
            SELECT a.id, a.title, a.description, a.file_url, a.max_marks, a.due_date, a.assignment_type, a.quiz_questions, s.name AS subject_name,
              (SELECT json_build_object('id', sub.id, 'submission_url', sub.submission_url, 'submitted_at', sub.submitted_at,
                                        'marks_obtained', sub.marks_obtained, 'teacher_feedback', sub.teacher_feedback, 'grade', sub.grade)
               FROM portal_assignment_submission sub WHERE sub.assignment_id=a.id AND sub.student_id=%s) AS my_submission
            FROM portal_assignment a JOIN portal_subject s ON s.id=a.subject_id
            WHERE a.class_id=%s ORDER BY a.due_date DESC
            """, [request.user.id, cls["class_id"]]
        )

        # Strip correct answers if not submitted yet to prevent cheating
        import json
        for row_dict in data:
            if row_dict.get("assignment_type") == "Quiz" and row_dict.get("quiz_questions"):
                has_submitted = row_dict.get("my_submission") is not None
                try:
                    questions = json.loads(row_dict["quiz_questions"]) if isinstance(row_dict["quiz_questions"], str) else row_dict["quiz_questions"]
                    clean_qs = []
                    for q in questions:
                        clean_q = {
                            "question_text": q.get("question_text"),
                            "options": q.get("options") or []
                        }
                        if has_submitted:
                            clean_q["correct_answer"] = q.get("correct_answer")
                        clean_qs.append(clean_q)
                    row_dict["quiz_questions"] = clean_qs
                except Exception:
                    pass

        return Response(serialise(data))


class AssignmentSubmitView(StudentOnlyMixin, APIView):
    @extend_schema(
        operation_id="StudentAssignmentSubmit",
        summary="Submit an assignment",
        description="Records a submission for a given assignment. Quiz assignments are auto-graded; other assignments store the URL.",
        tags=["Student"],
        parameters=[
            OpenApiParameter(
                name="assignment_id",
                type=int,
                location=OpenApiParameter.PATH,
                required=True,
                description="Assignment id.",
            ),
        ],
        request=_AssignmentSubmitRequest,
        responses={
            200: _AssignmentSubmitResponse,
            400: ValidationErrorSerializer,
            404: DetailErrorSerializer,
            **ERROR_RESPONSES,
        },
    )
    def post(self, request, assignment_id):
        if not table_exists("portal_assignment_submission"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)

        assign = row("SELECT id, assignment_type, quiz_questions, max_marks FROM portal_assignment WHERE id=%s", [assignment_id])
        if not assign:
            return Response({"detail": "Assignment not found."}, status=404)

        url = request.data.get("submission_url") or request.data.get("file_url")
        if not url:
            return Response({"detail": "submission_url is required."}, status=400)

        marks_obtained = None
        grade = None

        if assign.get("assignment_type") == "Quiz":
            import json
            try:
                student_answers = json.loads(url) if isinstance(url, str) else url
                questions = assign.get("quiz_questions") or []
                if isinstance(questions, str):
                    questions = json.loads(questions)

                correct_count = 0
                total_questions = len(questions)

                if total_questions > 0:
                    for i, q in enumerate(questions):
                        expected = q.get("correct_answer")
                        student_ans = student_answers.get(str(i)) or student_answers.get(i)
                        if student_ans and str(student_ans).strip().lower() == str(expected).strip().lower():
                            correct_count += 1

                    max_m = float(assign.get("max_marks") or 100)
                    marks_obtained = round((correct_count / total_questions) * max_m, 2)
                    pct = (marks_obtained / max_m) * 100
                    if pct >= 90: grade = 'A+'
                    elif pct >= 80: grade = 'A'
                    elif pct >= 70: grade = 'B'
                    elif pct >= 60: grade = 'C'
                    elif pct >= 50: grade = 'D'
                    else: grade = 'F'
            except Exception:
                pass

        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO portal_assignment_submission (assignment_id, student_id, submission_url, marks_obtained, grade)
                VALUES (%s,%s,%s,%s,%s)
                ON CONFLICT (assignment_id, student_id)
                DO UPDATE SET submission_url=EXCLUDED.submission_url, submitted_at=now(),
                              marks_obtained=EXCLUDED.marks_obtained, grade=EXCLUDED.grade
                RETURNING id
                """, [assignment_id, request.user.id, str(url) if isinstance(url, (dict, list)) else url, marks_obtained, grade]
            )
            sid = cursor.fetchone()[0]
        return Response({"detail": "Assignment submitted.", "id": sid, "marks_obtained": marks_obtained, "grade": grade})


class CourseListView(StudentOnlyMixin, APIView):
    @extend_schema(
        operation_id="StudentCourseList",
        summary="Get LMS courses",
        description="Returns the learning management courses for the student's class including chapters, lessons, resources, quizzes, and progress flags.",
        tags=["Student"],
        responses={200: serializers.ListSerializer(child=_CourseItem), **ERROR_RESPONSES},
    )
    def get(self, request):
        cls = current_class_for_student(request.user.id)
        if not cls or not table_exists("portal_course"):
            return Response([])
        courses = rows(
            """
            SELECT c.id, c.title, c.description, s.name AS subject_name
            FROM portal_course c JOIN portal_subject s ON s.id=c.subject_id
            WHERE c.class_id=%s ORDER BY c.id
            """, [cls["class_id"]]
        )
        for c in courses:
            # 1. Fetch Chapters for this Course
            chapters = rows(
                "SELECT id, title, description, sort_order FROM portal_chapter WHERE course_id=%s ORDER BY sort_order, id",
                [c["id"]]
            ) if table_exists("portal_chapter") else []

            for ch in chapters:
                # 1.5 Fetch Chapter-level Resources (directly attached)
                ch["resources"] = rows(
                    """
                    SELECT r.id, r.content_type, r.title, r.resource_url, r.description,
                           r.visible_from, r.uploaded_at, r.download_count, r.sort_order,
                           EXISTS(SELECT 1 FROM portal_course_progress cp WHERE cp.student_id=%s AND cp.content_id=r.id) AS is_completed
                    FROM portal_course_content r
                    WHERE r.chapter_id=%s AND r.lesson_id IS NULL AND (r.visible_from IS NULL OR r.visible_from <= now())
                    ORDER BY r.sort_order, r.id
                    """, [request.user.id, ch["id"]]
                ) if table_exists("portal_course_content") else []

                # 2. Fetch Lessons for each Chapter
                lessons = rows(
                    "SELECT id, title, description, sort_order FROM portal_lesson WHERE chapter_id=%s ORDER BY sort_order, id",
                    [ch["id"]]
                ) if table_exists("portal_lesson") else []

                for les in lessons:
                    # 3. Fetch Resources for each Lesson
                    resources = rows(
                        """
                        SELECT r.id, r.content_type, r.title, r.resource_url, r.description,
                               r.due_date, r.max_marks, r.quiz_id, r.assignment_id, r.visible_from,
                               r.uploaded_at, r.download_count, r.sort_order,
                               EXISTS(SELECT 1 FROM portal_course_progress cp WHERE cp.student_id=%s AND cp.content_id=r.id) AS is_completed
                        FROM portal_course_content r
                        WHERE r.lesson_id=%s AND (r.visible_from IS NULL OR r.visible_from <= now())
                        ORDER BY r.sort_order, r.id
                        """, [request.user.id, les["id"]]
                    ) if table_exists("portal_course_content") else []

                    # Check assignment status for resources
                    for res in resources:
                        if res.get("assignment_id"):
                            sub = row(
                                "SELECT submitted_at, marks_obtained, teacher_feedback, grade FROM portal_assignment_submission WHERE assignment_id=%s AND student_id=%s",
                                [res["assignment_id"], request.user.id]
                            )
                            res["submission"] = sub if sub else None
                    les["resources"] = resources
                ch["lessons"] = lessons
            c["chapters"] = chapters
            # Fallback legacy content if any
            c["legacy_content"] = rows(
                """
                SELECT r.id, r.content_type, r.title, r.resource_url, r.sort_order,
                       EXISTS(SELECT 1 FROM portal_course_progress cp WHERE cp.student_id=%s AND cp.content_id=r.id) AS is_completed
                FROM portal_course_content r WHERE r.course_id=%s AND r.lesson_id IS NULL
                ORDER BY r.sort_order, r.id
                """, [request.user.id, c["id"]]
            ) if table_exists("portal_course_content") else []
            c["quizzes"] = rows("SELECT id, title, duration_minutes, passing_score FROM portal_quiz WHERE course_id=%s ORDER BY id", [c["id"]]) if table_exists("portal_quiz") else []
        return Response(serialise(courses))


class QuizDetailView(StudentOnlyMixin, APIView):
    @extend_schema(
        operation_id="StudentQuizDetail",
        summary="Get quiz detail",
        description="Returns a quiz and its questions with answer options for the student.",
        tags=["Student"],
        parameters=[
            OpenApiParameter(
                name="quiz_id",
                type=int,
                location=OpenApiParameter.PATH,
                required=True,
                description="Quiz id.",
            ),
        ],
        responses={200: _QuizDetailResponse, **ERROR_RESPONSES},
    )
    def get(self, request, quiz_id):
        if not table_exists("portal_quiz"):
            return Response({"id": quiz_id, "title": "Quiz", "questions": []})
        quiz = row("SELECT id, title, duration_minutes, passing_score FROM portal_quiz WHERE id=%s", [quiz_id]) or {"id": quiz_id, "title": "Quiz"}
        quiz["questions"] = rows("SELECT id, question_text, options FROM portal_quiz_question WHERE quiz_id=%s", [quiz_id]) if table_exists("portal_quiz_question") else []
        return Response(serialise(quiz))

    @extend_schema(
        operation_id="StudentQuizSubmit",
        summary="Submit a quiz response",
        description=(
            "Accepts the student's answers (a map of question_id to selected option) and "
            "returns a percentage score computed against the quiz's stored correct answers."
        ),
        tags=["Student"],
        parameters=[
            OpenApiParameter(
                name="quiz_id",
                type=int,
                location=OpenApiParameter.PATH,
                required=True,
                description="Quiz id.",
            ),
        ],
        request=_QuizSubmitRequest,
        responses={200: _QuizSubmitResponse, **ERROR_RESPONSES},
    )
    def post(self, request, quiz_id):
        answers = request.data.get("answers")
        if not isinstance(answers, dict):
            return Response({"detail": "answers (question_id -> selected option) is required."}, status=400)

        if not table_exists("portal_quiz_question"):
            return Response({"score": 0, "detail": "Quiz submitted, but no questions are available for scoring."})

        questions = rows(
            "SELECT id, correct_answer FROM portal_quiz_question WHERE quiz_id=%s",
            [quiz_id],
        )
        if not questions:
            return Response({"score": 0, "detail": "Quiz submitted, but no questions are available for scoring."})

        correct = 0
        for q in questions:
            submitted = str(answers.get(str(q["id"]), "")).strip()
            expected = str(q.get("correct_answer") or "").strip()
            if submitted and submitted == expected:
                correct += 1

        total = len(questions)
        score = int(round(100 * correct / total)) if total else 0
        return Response(
            {
                "score": score,
                "detail": f"Quiz submitted. {correct} of {total} questions answered correctly.",
            }
        )


class ExamListView(StudentOnlyMixin, APIView):
    @extend_schema(
        operation_id="StudentExamList",
        summary="Get exam schedule",
        description="Returns the exam schedule for the student's class, or an empty list when not enrolled.",
        tags=["Student"],
        responses={200: serializers.ListSerializer(child=_ExamItem), **ERROR_RESPONSES},
    )
    def get(self, request):
        cls = current_class_for_student(request.user.id)
        if not cls or not table_exists("portal_exam_schedule"):
            return Response([])
        data = rows(
            """
            SELECT e.id, e.exam_name, e.exam_type, e.exam_date, e.start_time, e.duration_minutes, e.max_marks,
                   s.name AS subject_name
            FROM portal_exam_schedule e JOIN portal_subject s ON s.id=e.subject_id
            WHERE e.class_id=%s ORDER BY e.exam_date DESC
            """, [cls["class_id"]]
        )
        return Response(serialise(data))


class HallTicketListView(StudentOnlyMixin, APIView):
    @extend_schema(
        operation_id="StudentHallTicketList",
        summary="Get hall tickets",
        description="Returns the student's generated exam hall tickets with exam details.",
        tags=["Student"],
        responses={200: serializers.ListSerializer(child=_HallTicketItem), **ERROR_RESPONSES},
    )
    def get(self, request):
        if not table_exists("portal_hall_ticket"):
            return Response([])
        data = rows(
            """
            SELECT ht.id, ht.ticket_number, ht.is_verified,
                   json_build_object('id', e.id, 'exam_name', e.exam_name, 'exam_date', e.exam_date, 'subject_name', s.name) AS exam
            FROM portal_hall_ticket ht
            JOIN portal_exam_schedule e ON e.id=ht.exam_schedule_id
            JOIN portal_subject s ON s.id=e.subject_id
            WHERE ht.student_id=%s ORDER BY e.exam_date DESC
            """, [request.user.id]
        )
        return Response(serialise(data))


class ResultListView(StudentOnlyMixin, APIView):
    @extend_schema(
        operation_id="StudentResultList",
        summary="Get exam results",
        description="Returns the student's exam results with percentage and exam details, or an empty list when no results exist.",
        tags=["Student"],
        responses={200: serializers.ListSerializer(child=_ResultItem), **ERROR_RESPONSES},
    )
    def get(self, request):
        if not table_exists("portal_result"):
            return Response([])
        data = rows(
            """
            SELECT r.id, r.marks_obtained, r.rank_position, r.grade_letter, r.remarks,
                   ROUND((r.marks_obtained / NULLIF(e.max_marks,0)) * 100, 1) AS percentage,
                   json_build_object('id', e.id, 'exam_name', e.exam_name, 'max_marks', e.max_marks, 'subject_name', s.name) AS exam
            FROM portal_result r
            JOIN portal_exam_schedule e ON e.id=r.exam_schedule_id
            JOIN portal_subject s ON s.id=e.subject_id
            WHERE r.student_id=%s ORDER BY e.exam_date DESC
            """, [request.user.id]
        )
        return Response(serialise(data))


class FeesView(StudentOnlyMixin, APIView):
    @extend_schema(
        operation_id="StudentFees",
        summary="Get fees and payment history",
        description="Returns pending fee structures for the student's class and the student's payment history.",
        tags=["Student"],
        responses={200: _FeesResponse, **ERROR_RESPONSES},
    )
    def get(self, request):
        cls = current_class_for_student(request.user.id)
        pending, history = [], []
        if cls and table_exists("portal_fee_structure"):
            pending = rows(
                """
                SELECT fs.id, fs.term_name, fs.tuition_fee, fs.transport_fee, fs.hostel_fee, fs.total_amount
                FROM portal_fee_structure fs
                WHERE fs.class_id=%s AND NOT EXISTS (
                  SELECT 1 FROM portal_payment p WHERE p.fee_structure_id=fs.id AND p.student_id=%s AND p.status='Success'
                ) ORDER BY fs.id
                """, [cls["class_id"], request.user.id]
            )
        if table_exists("portal_payment"):
            history = rows(
                """
                SELECT p.id, p.transaction_id, p.amount_paid, p.status, p.paid_at,
                       json_build_object('id', fs.id, 'term_name', fs.term_name, 'total_amount', fs.total_amount) AS fee_structure_detail
                FROM portal_payment p JOIN portal_fee_structure fs ON fs.id=p.fee_structure_id
                WHERE p.student_id=%s ORDER BY p.paid_at DESC
                """, [request.user.id]
            )
        return Response(serialise({"pending": pending, "payment_history": history}))


class InitiatePaymentView(StudentOnlyMixin, APIView):
    @extend_schema(
        operation_id="StudentInitiatePayment",
        summary="Initiate a fee payment",
        description="Records a successful payment against a fee structure and returns the generated transaction id.",
        tags=["Student"],
        request=_InitiatePaymentRequest,
        responses={
            200: _InitiatePaymentResponse,
            400: ValidationErrorSerializer,
            **ERROR_RESPONSES,
        },
    )
    def post(self, request):
        if not table_exists("portal_payment"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        fee_id = request.data.get("fee_structure_id")
        method = request.data.get("payment_method") or "Online"
        fee = row("SELECT total_amount FROM portal_fee_structure WHERE id=%s", [fee_id])
        if not fee:
            return Response({"detail": "Invalid fee."}, status=400)
        tx = f"EDN-{uuid4().hex[:10].upper()}"
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO portal_payment (student_id, fee_structure_id, transaction_id, amount_paid, payment_method, status)
                VALUES (%s,%s,%s,%s,%s,'Success') RETURNING id
                """, [request.user.id, fee_id, tx, fee["total_amount"], method]
            )
            pid = cursor.fetchone()[0]
        return Response({"detail": "Payment recorded successfully.", "id": pid, "transaction_id": tx})


class LibraryView(StudentOnlyMixin, APIView):
    @extend_schema(
        operation_id="StudentLibraryList",
        summary="Get library transactions",
        description="Returns the student's library borrowing history with book details.",
        tags=["Student"],
        responses={200: serializers.ListSerializer(child=_LibraryItem), **ERROR_RESPONSES},
    )
    def get(self, request):
        if not table_exists("portal_library_transaction"):
            return Response([])
        data = rows(
            """
            SELECT t.id, t.issue_date, t.due_date, t.return_date, t.fine_amount,
                   json_build_object('id', b.id, 'title', b.title, 'author', b.author) AS book_detail
            FROM portal_library_transaction t JOIN portal_book b ON b.id=t.book_id
            WHERE t.borrower_id=%s ORDER BY t.issue_date DESC
            """, [request.user.id]
        )
        return Response(serialise(data))


class BookSearchView(StudentOnlyMixin, APIView):
    @extend_schema(
        operation_id="StudentBookSearch",
        summary="Search library books",
        description="Searches books by title or author keyword and returns up to 20 matches.",
        tags=["Student"],
        parameters=[SEARCH_QUERY_PARAMETER],
        responses={200: serializers.ListSerializer(child=_BookItem), **ERROR_RESPONSES},
    )
    def get(self, request):
        q = request.query_params.get("q", "").strip()
        if not q or not table_exists("portal_book"):
            return Response([])
        return Response(serialise(rows(
            """
            SELECT id, title, author, available_quantity FROM portal_book
            WHERE title ILIKE %s OR author ILIKE %s ORDER BY title LIMIT 20
            """, [f"%{q}%", f"%{q}%"]
        )))


class CertificateListView(StudentOnlyMixin, APIView):
    @extend_schema(
        operation_id="StudentCertificateList",
        summary="Get certificates",
        description="Returns the certificates issued to the student, or an empty list when none exist.",
        tags=["Student"],
        responses={200: serializers.ListSerializer(child=_CertificateItem), **ERROR_RESPONSES},
    )
    def get(self, request):
        if not table_exists("portal_certificate"):
            return Response([])
        return Response(serialise(rows("SELECT id, certificate_type, issued_date, file_url FROM portal_certificate WHERE student_id=%s ORDER BY issued_date DESC", [request.user.id])))


class AnnouncementListView(StudentOnlyMixin, APIView):
    @extend_schema(
        operation_id="StudentAnnouncementList",
        summary="Get announcements",
        description="Returns announcements and news targeted at students, or an empty list when none exist.",
        tags=["Student"],
        responses={200: serializers.ListSerializer(child=_AnnouncementItem), **ERROR_RESPONSES},
    )
    def get(self, request):
        cls = current_class_for_student(request.user.id)
        class_id = cls["class_id"] if cls else None
        if table_exists("portal_notification"):
            data = rows(
                """
                SELECT n.id, n.title, n.message, n.created_at,
                       COALESCE(u.first_name || ' ' || u.last_name, u.username, 'EduNova Admin') AS sender_name
                FROM portal_notification n LEFT JOIN auth_user u ON u.id=n.sender_id
                WHERE n.recipient_type IN ('All','Student') OR n.target_class_id=%s
                ORDER BY n.created_at DESC
                """, [class_id]
            )
            return Response(serialise(data))
        if table_exists("cms_newspost"):
            return Response(serialise(rows("SELECT id, title, content AS message, published_date AS created_at, 'EduNova Admin' AS sender_name FROM cms_newspost WHERE is_published=true ORDER BY published_date DESC")))
        return Response([])


class EventListView(StudentOnlyMixin, APIView):
    @extend_schema(
        operation_id="StudentEventList",
        summary="Get events",
        description="Returns school events with dates and venues, or an empty list when none exist.",
        tags=["Student"],
        responses={200: serializers.ListSerializer(child=_EventItem), **ERROR_RESPONSES},
    )
    def get(self, request):
        if not table_exists("cms_event"):
            return Response([])
        return Response(serialise(rows("SELECT id, title, description, event_date, venue FROM cms_event ORDER BY event_date DESC")))


class StudentLeaveView(StudentOnlyMixin, APIView):
    """Student submits or views their own leave applications."""

    @extend_schema(
        operation_id="StudentLeaveList",
        summary="Get leave applications",
        description="Returns the leave applications submitted by the student.",
        tags=["Student"],
        responses={200: serializers.ListSerializer(child=_LeaveItem), **ERROR_RESPONSES},
    )
    def get(self, request):
        if not table_exists("portal_leave"):
            return Response([])
        return Response(serialise(rows(
            "SELECT id, leave_type, start_date, end_date, reason, status FROM portal_leave WHERE user_id=%s ORDER BY start_date DESC",
            [request.user.id],
        )))

    @extend_schema(
        operation_id="StudentLeaveCreate",
        summary="Submit a leave application",
        description="Creates a new leave application for the student and returns the new leave request id.",
        tags=["Student"],
        request=LeaveRequestSerializer,
        responses={
            200: LeaveSubmitResponseSerializer,
            400: ValidationErrorSerializer,
            **ERROR_RESPONSES,
        },
    )
    def post(self, request):
        if not table_exists("portal_leave"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        err, start, end = validate_leave_dates(request.data)
        if err:
            return err
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO portal_leave (user_id, leave_type, start_date, end_date, reason, submitted_by)
                VALUES (%s,%s,%s,%s,%s,%s) RETURNING id
                """,
                [request.user.id, request.data.get("leave_type"), start, end,
                 request.data.get("reason"), request.user.id],
            )
            lid = cursor.fetchone()[0]
        return Response({"id": lid, "detail": "Leave request submitted."})


class FileUploadView(APIView):
    from rest_framework.parsers import MultiPartParser, FormParser
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "upload"

    @extend_schema(
        operation_id="FileUpload",
        summary="Upload a file",
        description=(
            "Uploads a file to Supabase storage (or falls back to local storage) and "
            "returns the public URL. Requires authentication and a file type/size within "
            "the allowed bounds."
        ),
        tags=["System"],
        request=FileUploadRequestSerializer,
        responses={
            200: FileUploadResponseSerializer,
            400: ValidationErrorSerializer,
            **ERROR_RESPONSES,
        },
    )
    def post(self, request):
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({"detail": "No file uploaded."}, status=400)

        # --- File validation -------------------------------------------------
        import mimetypes
        from django.conf import settings

        MAX_SIZE = getattr(settings, "MAX_UPLOAD_SIZE_MB", 20) * 1024 * 1024
        ALLOWED_TYPES = getattr(settings, "ALLOWED_UPLOAD_TYPES", (
            "image/jpeg", "image/png", "image/webp", "image/gif",
            "application/pdf", "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/zip",
        ))
        # Objectionable / executable-ish extensions are rejected outright so a
        # renamed script cannot slip through on a guessed content-type.
        ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp", "gif", "pdf", "doc", "docx", "xls", "xlsx", "zip", "csv"}

        name = file_obj.name or ""
        file_size = file_obj.size
        guessed, _ = mimetypes.guess_type(name)
        if file_size > MAX_SIZE:
            return Response(
                {"detail": f"File exceeds the {getattr(settings, 'MAX_UPLOAD_SIZE_MB', 20)} MB size limit."},
                status=400,
            )
        extension = name.rsplit(".", 1)[-1].lower() if "." in name else ""
        if extension not in ALLOWED_EXTENSIONS:
            return Response(
                {"detail": "File type not allowed. Use a PDF, document, image or spreadsheet format."},
                status=400,
            )
        ctype = file_obj.content_type or guessed or ""
        if ctype.split(";")[0].strip().lower() not in ALLOWED_TYPES:
            return Response(
                {"detail": "File type not allowed. Use a common document, PDF or image format."},
                status=400,
            )

        if getattr(settings, "DEBUG", False):
            logger.info("Upload user_id=%s name=%s bytes=%s type=%s", request.user.id, name, file_size, ctype)

        bucket_name = request.data.get('bucket', 'lms-resources')
        from supabase import create_client
        import uuid as _uuid

        url = getattr(settings, "SUPABASE_URL", "")
        key = getattr(settings, "SUPABASE_SERVICE_ROLE_KEY", "")
        if not url or not key:
            from django.core.files.storage import default_storage
            filename = default_storage.save(f"uploads/{_uuid.uuid4()}_{name}", file_obj)
            file_url = request.build_absolute_uri(default_storage.url(filename))
            return Response({"url": file_url})

        try:
            client = create_client(url, key)
            file_extension = name.split('.')[-1] if '.' in name else "bin"
            unique_filename = f"{_uuid.uuid4()}.{file_extension}"

            file_bytes = file_obj.read()
            client.storage.from_(bucket_name).upload(
                path=unique_filename,
                file=file_bytes,
                file_options={"content-type": ctype}
            )

            file_url = client.storage.from_(bucket_name).get_public_url(unique_filename)
            return Response({"url": file_url})
        except Exception:
            logger.exception("Supabase upload failed; falling back to local storage")
            from django.core.files.storage import default_storage
            filename = default_storage.save(f"uploads/{_uuid.uuid4()}_{name}", file_obj)
            file_url = request.build_absolute_uri(default_storage.url(filename))
            return Response({"url": file_url})


class StudentAIChatView(StudentOnlyMixin, APIView):
    @extend_schema(
        operation_id="StudentAIChat",
        summary="Chat with the AI study assistant",
        description="Sends a natural-language message to the AI assistant and receives a helpful reply about assignments, timetable, or grades.",
        tags=["Student"],
        request=ChatRequestSerializer,
        responses={200: ChatResponseSerializer, **ERROR_RESPONSES},
        examples=[ChatRequestExample],
    )
    def post(self, request):
        message = request.data.get("message", "").strip()
        if not message:
            return Response({"reply": "Hello! How can I help you today?"})

        msg_lower = message.lower()
        user_id = request.user.id

        cls = current_class_for_student(user_id)
        class_id = cls["class_id"] if cls else None

        # 1. Homework / Assignment queries
        if any(w in msg_lower for w in ["homework", "hw", "assignment", "assignments", "task"]):
            if class_id:
                # Query due assignments
                assignments = rows(
                    """
                    SELECT a.title, a.due_date, a.max_marks, s.name AS subject_name 
                    FROM portal_assignment a
                    LEFT JOIN portal_subject s ON s.id=a.subject_id
                    WHERE a.class_id=%s AND a.id NOT IN (
                        SELECT assignment_id FROM portal_assignment_submission WHERE student_id=%s
                    ) AND a.due_date > now()
                    ORDER BY a.due_date LIMIT 3
                    """,
                    [class_id, user_id]
                )
                if assignments:
                    reply = "Here are your upcoming pending assignments:\n" + "\n".join(
                        f"• **{a['title']}** ({a['subject_name'] or 'General'}) — Due {a['due_date'].strftime('%b %d, %I:%M %p') if hasattr(a['due_date'], 'strftime') else a['due_date']}"
                        for a in assignments
                    )
                else:
                    reply = "🎉 Great news! You have no pending assignments due soon."
            else:
                reply = "I couldn't find any enrolled class for you, so I can't track assignments."
            return Response({"reply": reply})

        # 2. Timetable / Schedule queries
        elif any(w in msg_lower for w in ["timetable", "schedule", "classes", "today", "timetable"]):
            if class_id:
                timetable = rows(
                    """
                    SELECT t.day_of_week, t.start_time, t.end_time, s.name AS subject_name,
                           COALESCE(u.first_name || ' ' || u.last_name, u.username) AS teacher_name
                    FROM portal_timetable t
                    JOIN portal_subject s ON s.id=t.subject_id
                    JOIN auth_user u ON u.id=t.teacher_id
                    WHERE t.class_id=%s
                    ORDER BY t.day_of_week, t.start_time
                    """,
                    [class_id]
                )
                if timetable:
                    days = {}
                    for item in timetable:
                        day = item["day_of_week"]
                        if day not in days:
                            days[day] = []
                        days[day].append(f"{item['subject_name']} ({item['start_time']} - {item['end_time']}) by {item['teacher_name']}")

                    reply = "Here is your class timetable:\n" + "\n".join(
                        f"🗓️ **{d}**:\n" + "\n".join(f"  • {session}" for session in sessions)
                        for d, sessions in days.items()
                    )
                else:
                    reply = "No timetable sessions are scheduled for your class yet."
            else:
                reply = "You are not currently enrolled in any class."
            return Response({"reply": reply})

        # 3. Grades / Quiz results
        elif any(w in msg_lower for w in ["grade", "marks", "result", "score", "grades", "quiz"]):
            grades = rows(
                """
                SELECT a.title, s.marks_obtained, a.max_marks, s.grade
                FROM portal_assignment_submission s
                JOIN portal_assignment a ON a.id = s.assignment_id
                WHERE s.student_id=%s AND s.marks_obtained IS NOT NULL
                ORDER BY s.submitted_at DESC LIMIT 5
                """,
                [user_id]
            )
            if grades:
                reply = "Here are your recent assignment grades:\n" + "\n".join(
                    f"• **{g['title']}**: {g['marks_obtained']}/{g['max_marks']} (Grade: **{g['grade'] or 'N/A'}**)"
                    for g in grades
                )
            else:
                reply = "I couldn't find any graded submissions for your profile yet. Keep studying!"
            return Response({"reply": reply})

        # Default help menu response
        name = request.user.first_name or request.user.username
        reply = (
            f"Hello {name}! I am your EduNova AI Assistant. 🎓\n\n"
            f"I can help you navigate your student portal and view your records. Try asking me:\n"
            f"• *'What assignments are due?'*\n"
            f"• *'Show my class timetable'* \n"
            f"• *'What are my recent grades?'*"
        )
        return Response({"reply": reply})
