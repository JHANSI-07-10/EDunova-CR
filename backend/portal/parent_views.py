from uuid import uuid4

from django.db import connection
from django.utils.crypto import get_random_string

from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiExample, inline_serializer
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import serializers

from .doc_schemas import (
    DetailErrorSerializer,
    ValidationErrorSerializer,
    IdDetailResponseSerializer,
    LeaveRequestSerializer,
    LeaveSubmitResponseSerializer,
    ERROR_RESPONSES,
    MONTH_PARAMETER,
    EXAM_NAME_PARAMETER,
)
from .views import table_exists, rows, row, serialise, current_class_for_student, validate_leave_dates
from .roles import IsParent, log_action


# ---------------------------------------------------------------------------
# Documentation-only schemas for the parent portal views (raw SQL, no DRF
# serializers). These are never used for (de)serialization — they exist solely
# so drf-spectacular can render the hand-shaped response/request payloads.
# ---------------------------------------------------------------------------

CHILD_ID_PARAMETER = OpenApiParameter(
    name="child_id",
    type=OpenApiTypes.INT,
    location=OpenApiParameter.QUERY,
    required=False,
    description="Student (auth user) id of one of the parent's children.",
)

CHILD_ID_REQUIRED_PARAMETER = OpenApiParameter(
    name="child_id",
    type=OpenApiTypes.INT,
    location=OpenApiParameter.QUERY,
    required=True,
    description="Student (auth user) id of one of the parent's children.",
)

WITH_PARAMETER = OpenApiParameter(
    name="with",
    type=OpenApiTypes.INT,
    location=OpenApiParameter.QUERY,
    required=False,
    description="Other user id to filter the conversation thread by.",
)

_child_item = inline_serializer(
    name="ParentChildItem",
    fields={
        "id": serializers.IntegerField(help_text="Student (auth user) id."),
        "name": serializers.CharField(help_text="Student display name."),
        "admission_number": serializers.CharField(allow_null=True, required=False),
        "qr_id_code": serializers.CharField(allow_null=True, required=False),
        "date_of_birth": serializers.DateField(allow_null=True, required=False),
        "gender": serializers.CharField(allow_null=True, required=False),
        "status": serializers.CharField(allow_null=True, required=False),
    },
)

_parent_profile_child_item = inline_serializer(
    name="ParentProfileChildItem",
    fields={
        "id": serializers.IntegerField(help_text="Student (auth user) id."),
        "name": serializers.CharField(help_text="Student display name."),
        "admission_number": serializers.CharField(allow_null=True, required=False),
        "qr_id_code": serializers.CharField(allow_null=True, required=False),
        "date_of_birth": serializers.DateField(allow_null=True, required=False),
        "gender": serializers.CharField(allow_null=True, required=False),
        "status": serializers.CharField(allow_null=True, required=False),
    },
)

_parent_profile_response = inline_serializer(
    name="ParentProfileResponse",
    fields={
        "id": serializers.IntegerField(help_text="Auth user id."),
        "name": serializers.CharField(),
        "email": serializers.EmailField(allow_blank=True),
        "user_type": serializers.CharField(help_text="Always 'Parent'."),
        "phone_number": serializers.CharField(allow_blank=True, required=False),
        "father_name": serializers.CharField(allow_blank=True, required=False),
        "mother_name": serializers.CharField(allow_blank=True, required=False),
        "emergency_contact": serializers.CharField(allow_blank=True, required=False),
        "address": serializers.CharField(allow_blank=True, required=False),
        "is_verified": serializers.BooleanField(required=False),
        "children": serializers.ListSerializer(child=_parent_profile_child_item),
    },
)

_child_summary_item = inline_serializer(
    name="ParentChildSummaryItem",
    fields={
        "id": serializers.IntegerField(),
        "name": serializers.CharField(),
        "admission_number": serializers.CharField(allow_null=True, required=False),
        "qr_id_code": serializers.CharField(allow_null=True, required=False),
        "date_of_birth": serializers.DateField(allow_null=True, required=False),
        "gender": serializers.CharField(allow_null=True, required=False),
        "status": serializers.CharField(allow_null=True, required=False),
        "class_name": serializers.CharField(allow_null=True, required=False),
        "attendance_percentage": serializers.FloatField(allow_null=True, required=False),
        "pending_fee_items": serializers.IntegerField(required=False),
    },
)

_parent_dashboard_response = inline_serializer(
    name="ParentDashboardResponse",
    fields={
        "children": serializers.ListSerializer(child=_child_summary_item),
        "unread_messages": serializers.IntegerField(),
    },
)

_attendance_summary = inline_serializer(
    name="ParentAttendanceSummary",
    fields={
        "present": serializers.IntegerField(),
        "absent": serializers.IntegerField(),
        "late": serializers.IntegerField(),
        "medical_leave": serializers.IntegerField(),
        "percentage": serializers.FloatField(allow_null=True, required=False),
    },
)

_attendance_record_item = inline_serializer(
    name="ParentAttendanceRecordItem",
    fields={
        "id": serializers.IntegerField(),
        "date": serializers.DateField(),
        "status": serializers.CharField(),
        "remarks": serializers.CharField(allow_null=True, required=False),
    },
)

_child_attendance_response = inline_serializer(
    name="ParentChildAttendanceResponse",
    fields={
        "summary": _attendance_summary,
        "records": serializers.ListSerializer(child=_attendance_record_item),
    },
)

_child_homework_item = inline_serializer(
    name="ParentChildHomeworkItem",
    fields={
        "id": serializers.IntegerField(),
        "title": serializers.CharField(),
        "description": serializers.CharField(allow_null=True, required=False),
        "assigned_date": serializers.DateField(allow_null=True, required=False),
        "due_date": serializers.DateField(allow_null=True, required=False),
        "subject_name": serializers.CharField(),
        "teacher_name": serializers.CharField(allow_null=True, required=False),
        "is_overdue": serializers.BooleanField(required=False),
    },
)

_exam_ref_item = inline_serializer(
    name="ParentResultExamItem",
    fields={
        "id": serializers.IntegerField(),
        "exam_name": serializers.CharField(),
        "max_marks": serializers.FloatField(),
        "subject_name": serializers.CharField(),
    },
)

_child_result_item = inline_serializer(
    name="ParentChildResultItem",
    fields={
        "id": serializers.IntegerField(),
        "marks_obtained": serializers.FloatField(),
        "rank_position": serializers.IntegerField(allow_null=True, required=False),
        "grade_letter": serializers.CharField(allow_null=True, required=False),
        "remarks": serializers.CharField(allow_null=True, required=False),
        "percentage": serializers.FloatField(help_text="Marks as a percentage of max marks."),
        "exam": _exam_ref_item,
    },
)

_pending_fee_item = inline_serializer(
    name="ParentPendingFeeItem",
    fields={
        "id": serializers.IntegerField(),
        "term_name": serializers.CharField(),
        "tuition_fee": serializers.FloatField(),
        "transport_fee": serializers.FloatField(),
        "hostel_fee": serializers.FloatField(),
        "total_amount": serializers.FloatField(),
    },
)

_fee_structure_ref_item = inline_serializer(
    name="ParentFeeStructureRefItem",
    fields={
        "id": serializers.IntegerField(),
        "term_name": serializers.CharField(),
        "total_amount": serializers.FloatField(),
    },
)

_payment_history_item = inline_serializer(
    name="ParentPaymentHistoryItem",
    fields={
        "id": serializers.IntegerField(),
        "transaction_id": serializers.CharField(),
        "amount_paid": serializers.FloatField(),
        "status": serializers.CharField(),
        "paid_at": serializers.DateTimeField(allow_null=True, required=False),
        "fee_structure_detail": _fee_structure_ref_item,
    },
)

_child_fees_response = inline_serializer(
    name="ParentChildFeesResponse",
    fields={
        "pending": serializers.ListSerializer(child=_pending_fee_item),
        "payment_history": serializers.ListSerializer(child=_payment_history_item),
    },
)

_fees_pay_request = inline_serializer(
    name="ParentChildFeesPayRequest",
    fields={
        "child_id": serializers.IntegerField(help_text="Child to debit the payment to."),
        "fee_structure_id": serializers.IntegerField(help_text="Fee structure being paid."),
        "payment_method": serializers.CharField(required=False, default="Online"),
    },
)

_fees_pay_response = inline_serializer(
    name="ParentChildFeesPayResponse",
    fields={
        "detail": serializers.CharField(),
        "id": serializers.IntegerField(),
        "transaction_id": serializers.CharField(),
    },
)

_child_document_item = inline_serializer(
    name="ParentChildDocumentItem",
    fields={
        "id": serializers.IntegerField(),
        "certificate_type": serializers.CharField(),
        "issued_date": serializers.DateField(allow_null=True, required=False),
        "file_url": serializers.CharField(allow_null=True, required=False, allow_blank=True),
    },
)

_transport_allocation_item = inline_serializer(
    name="ParentTransportAllocationItem",
    fields={
        "pickup_point": serializers.CharField(allow_null=True, required=False),
        "vehicle_id": serializers.IntegerField(),
        "vehicle_number": serializers.CharField(),
        "maintenance_status": serializers.CharField(allow_null=True, required=False),
        "route_name": serializers.CharField(allow_null=True, required=False),
        "start_point": serializers.CharField(allow_null=True, required=False),
        "end_point": serializers.CharField(allow_null=True, required=False),
        "driver_name": serializers.CharField(allow_null=True, required=False),
    },
)

_transport_location_item = inline_serializer(
    name="ParentTransportLocationItem",
    fields={
        "latitude": serializers.FloatField(allow_null=True, required=False),
        "longitude": serializers.FloatField(allow_null=True, required=False),
        "updated_at": serializers.DateTimeField(allow_null=True, required=False),
    },
)

_child_transport_response = inline_serializer(
    name="ParentChildTransportResponse",
    fields={
        "allocation": _transport_allocation_item,
        "last_location": _transport_location_item,
    },
)

_teacher_contact_item = inline_serializer(
    name="ParentTeacherContactItem",
    fields={
        "id": serializers.IntegerField(),
        "name": serializers.CharField(),
        "subject_name": serializers.CharField(),
        "class_name": serializers.CharField(),
    },
)

_message_item = inline_serializer(
    name="ParentMessageItem",
    fields={
        "id": serializers.IntegerField(),
        "sender": serializers.IntegerField(),
        "receiver": serializers.IntegerField(),
        "message_text": serializers.CharField(),
        "created_at": serializers.DateTimeField(allow_null=True, required=False),
    },
)

_message_send_request = inline_serializer(
    name="ParentMessageSendRequest",
    fields={
        "receiver": serializers.IntegerField(help_text="Recipient user id (e.g. a teacher)."),
        "message_text": serializers.CharField(help_text="Message body."),
    },
)

_notification_item = inline_serializer(
    name="ParentNotificationItem",
    fields={
        "id": serializers.IntegerField(),
        "title": serializers.CharField(),
        "message": serializers.CharField(allow_null=True, required=False),
        "created_at": serializers.DateTimeField(allow_null=True, required=False),
    },
)

_leave_request_payload = inline_serializer(
    name="ParentLeaveSubmitRequest",
    fields={
        "child_id": serializers.IntegerField(help_text="Child (student user id) the leave is for."),
        "leave_type": serializers.ChoiceField(
            choices=["Sick", "Casual", "Earned", "Medical", "Other"],
            help_text="Type of leave.",
        ),
        "start_date": serializers.DateField(help_text="Leave start date (YYYY-MM-DD)."),
        "end_date": serializers.DateField(help_text="Leave end date (YYYY-MM-DD)."),
        "reason": serializers.CharField(help_text="Reason for leave."),
    },
)

_leave_item = inline_serializer(
    name="ParentLeaveItem",
    fields={
        "id": serializers.IntegerField(),
        "leave_type": serializers.CharField(),
        "start_date": serializers.DateField(allow_null=True, required=False),
        "end_date": serializers.DateField(allow_null=True, required=False),
        "reason": serializers.CharField(allow_null=True, required=False),
        "status": serializers.CharField(allow_null=True, required=False),
    },
)

_ptm_booking_item = inline_serializer(
    name="ParentPtmBookingItem",
    fields={
        "id": serializers.IntegerField(),
        "meeting_date": serializers.DateField(allow_null=True, required=False),
        "time_slot": serializers.CharField(allow_null=True, required=False),
        "status": serializers.CharField(allow_null=True, required=False),
        "parent_notes": serializers.CharField(allow_null=True, required=False),
        "teacher_name": serializers.CharField(allow_null=True, required=False),
        "student_name": serializers.CharField(allow_null=True, required=False),
    },
)

_ptm_booking_request = inline_serializer(
    name="ParentPtmBookingRequest",
    fields={
        "teacher_id": serializers.IntegerField(help_text="Teacher user id."),
        "student_id": serializers.IntegerField(help_text="Student user id."),
        "meeting_date": serializers.DateField(help_text="Desired meeting date (YYYY-MM-DD)."),
        "time_slot": serializers.CharField(help_text="Requested meeting time slot."),
        "parent_notes": serializers.CharField(required=False, default=""),
    },
)

_feedback_item = inline_serializer(
    name="ParentFeedbackItem",
    fields={
        "id": serializers.IntegerField(),
        "category": serializers.CharField(),
        "feedback_text": serializers.CharField(allow_null=True, required=False),
        "status": serializers.CharField(allow_null=True, required=False),
        "created_at": serializers.DateTimeField(allow_null=True, required=False),
    },
)

_feedback_request = inline_serializer(
    name="ParentFeedbackRequest",
    fields={
        "category": serializers.CharField(required=False, default="General"),
        "feedback_text": serializers.CharField(help_text="Feedback body."),
    },
)

_lms_upcoming_test_item = inline_serializer(
    name="ParentLmsUpcomingTestItem",
    fields={
        "exam_name": serializers.CharField(),
        "exam_date": serializers.DateField(allow_null=True, required=False),
        "start_time": serializers.CharField(allow_null=True, required=False),
        "max_marks": serializers.FloatField(allow_null=True, required=False),
    },
)

_lms_progress_course_item = inline_serializer(
    name="ParentLmsCourseProgressItem",
    fields={
        "id": serializers.IntegerField(),
        "subject_name": serializers.CharField(),
        "course_title": serializers.CharField(),
        "progress_percent": serializers.FloatField(),
        "total_resources": serializers.IntegerField(),
        "completed_resources": serializers.IntegerField(),
        "chapters_total": serializers.IntegerField(),
        "chapters_completed": serializers.IntegerField(),
        "attendance_percent": serializers.FloatField(),
        "assignments_total": serializers.IntegerField(),
        "assignments_completed": serializers.IntegerField(),
        "quizzes_total": serializers.IntegerField(),
        "upcoming_tests": serializers.ListSerializer(child=_lms_upcoming_test_item),
        "average_score_percent": serializers.FloatField(allow_null=True, required=False),
        "is_weak": serializers.BooleanField(),
        "recent_remark": serializers.CharField(),
    },
)

_parent_lms_progress_response = inline_serializer(
    name="ParentLmsProgressResponse",
    fields={
        "courses": serializers.ListSerializer(child=_lms_progress_course_item),
        "detail": serializers.CharField(required=False, allow_blank=True),
    },
)

FEES_PAY_EXAMPLE = OpenApiExample(
    name="FeesPayRequestExample",
    value={"child_id": 5, "fee_structure_id": 12, "payment_method": "Online"},
    request_only=True,
)

LEAVE_SUBMIT_EXAMPLE = OpenApiExample(
    name="LeaveSubmitRequestExample",
    value={
        "child_id": 5,
        "leave_type": "Medical",
        "start_date": "2026-08-10",
        "end_date": "2026-08-11",
        "reason": "Doctor appointment",
    },
    request_only=True,
)

MESSAGE_SEND_EXAMPLE = OpenApiExample(
    name="MessageSendRequestExample",
    value={"receiver": 7, "message_text": "Please share the homework details."},
    request_only=True,
)


class ParentMixin:
    permission_classes = [IsParent]


def _children(parent_id):
    """All students linked to this parent via portal_student_profile.parent_id."""
    if not table_exists("portal_student_profile"):
        return []
    return rows(
        """
        SELECT u.id, COALESCE(u.first_name || ' ' || u.last_name, u.username) AS name,
               sp.admission_number, sp.qr_id_code, sp.date_of_birth, sp.gender, sp.status
        FROM portal_student_profile sp
        JOIN auth_user u ON u.id = sp.user_id
        WHERE sp.parent_id = %s
        ORDER BY u.first_name
        """,
        [parent_id],
    )


def _assert_own_child(parent_id, child_id):
    """Returns True only if child_id genuinely belongs to this parent — every
    child-scoped endpoint below must call this before touching any data, or a
    parent could read another family's records just by changing a query param."""
    if not child_id or not table_exists("portal_student_profile"):
        return False
    hit = row("SELECT 1 AS ok FROM portal_student_profile WHERE user_id=%s AND parent_id=%s", [child_id, parent_id])
    return bool(hit)


class ParentProfileView(ParentMixin, APIView):
    @extend_schema(
        operation_id="ParentProfile",
        summary="Get parent profile",
        description="Returns the logged-in parent's profile information along with a list of their linked children.",
        tags=["Parent"],
        responses={200: _parent_profile_response, **ERROR_RESPONSES},
    )
    def get(self, request):
        u = request.user
        profile = {
            "id": u.id,
            "name": u.get_full_name().strip() or u.username,
            "email": u.email,
            "user_type": "Parent",
            "phone_number": "",
            "father_name": "",
            "mother_name": "",
            "emergency_contact": "",
            "address": "",
            "is_verified": False,
        }
        if table_exists("portal_user_profile"):
            p = row("SELECT phone_number FROM portal_user_profile WHERE user_id=%s", [u.id])
            if p:
                profile.update(p)
        if table_exists("portal_parent_profile"):
            pp = row(
                "SELECT father_name, mother_name, emergency_contact, address, is_verified "
                "FROM portal_parent_profile WHERE user_id=%s",
                [u.id],
            )
            if pp:
                profile.update(pp)
        profile["children"] = _children(u.id)
        return Response(serialise(profile))


class ParentDashboardView(ParentMixin, APIView):
    @extend_schema(
        operation_id="ParentDashboard",
        summary="Get parent dashboard summary",
        description="Returns a per-child summary (class, attendance percentage, pending fee item count) plus the parent's unread message count.",
        tags=["Parent"],
        responses={200: _parent_dashboard_response, **ERROR_RESPONSES},
    )
    def get(self, request):
        pid = request.user.id
        children = _children(pid)
        summary = []
        for c in children:
            cid = c["id"]
            cls = current_class_for_student(cid)
            att = None
            if table_exists("portal_attendance"):
                stats = row(
                    "SELECT COUNT(*)::int total, SUM(CASE WHEN status='Present' THEN 1 ELSE 0 END)::int present "
                    "FROM portal_attendance WHERE student_id=%s",
                    [cid],
                )
                if stats and stats["total"]:
                    att = round((stats["present"] or 0) * 100 / stats["total"], 1)
            pending_fees = 0
            if cls and table_exists("portal_fee_structure"):
                pf = row(
                    """
                    SELECT COUNT(*)::int AS count FROM portal_fee_structure fs
                    WHERE fs.class_id=%s AND NOT EXISTS (
                      SELECT 1 FROM portal_payment p WHERE p.fee_structure_id=fs.id AND p.student_id=%s AND p.status='Success'
                    )
                    """,
                    [cls["class_id"], cid],
                )
                pending_fees = pf["count"] if pf else 0
            summary.append({
                **c,
                "class_name": cls["class_name"] if cls else "Not assigned",
                "attendance_percentage": att,
                "pending_fee_items": pending_fees,
            })
        unread_messages = 0
        if table_exists("portal_message"):
            m = row("SELECT COUNT(*)::int AS count FROM portal_message WHERE receiver_id=%s AND is_read=false", [pid])
            unread_messages = m["count"] if m else 0
        return Response(serialise({"children": summary, "unread_messages": unread_messages}))


class ChildrenListView(ParentMixin, APIView):
    @extend_schema(
        operation_id="ParentChildrenList",
        summary="List parent's children",
        description="Returns the list of students linked to the logged-in parent.",
        tags=["Parent"],
        responses={200: serializers.ListSerializer(child=_child_item), **ERROR_RESPONSES},
    )
    def get(self, request):
        return Response(serialise(_children(request.user.id)))


class ChildAttendanceView(ParentMixin, APIView):
    @extend_schema(
        operation_id="ParentChildAttendance",
        summary="Get child attendance",
        description="Returns attendance records for one of the parent's children, optionally filtered by month, along with a computed summary.",
        tags=["Academic"],
        parameters=[CHILD_ID_PARAMETER, MONTH_PARAMETER],
        responses={200: _child_attendance_response, **ERROR_RESPONSES},
    )
    def get(self, request):
        child_id = request.query_params.get("child_id")
        if not _assert_own_child(request.user.id, child_id):
            return Response({"detail": "Not your child, or child not found."}, status=403)
        month = request.query_params.get("month")
        sql = "SELECT id, date, status, remarks FROM portal_attendance WHERE student_id=%s"
        params = [child_id]
        if month:
            sql += " AND to_char(date, 'YYYY-MM')=%s"
            params.append(month)
        sql += " ORDER BY date DESC"
        records = rows(sql, params) if table_exists("portal_attendance") else []
        summary = {"present": 0, "absent": 0, "late": 0, "medical_leave": 0, "percentage": None}
        for r in records:
            key = str(r["status"]).lower()
            if key in summary:
                summary[key] += 1
        if records:
            summary["percentage"] = round(summary["present"] * 100 / len(records), 1)
        return Response(serialise({"summary": summary, "records": records}))


class ChildHomeworkView(ParentMixin, APIView):
    @extend_schema(
        operation_id="ParentChildHomework",
        summary="Get child homework",
        description="Returns homework assigned to one of the parent's children, with subject, teacher and overdue flag.",
        tags=["Academic"],
        parameters=[CHILD_ID_PARAMETER],
        responses={200: serializers.ListSerializer(child=_child_homework_item), **ERROR_RESPONSES},
    )
    def get(self, request):
        child_id = request.query_params.get("child_id")
        if not _assert_own_child(request.user.id, child_id):
            return Response({"detail": "Not your child, or child not found."}, status=403)
        cls = current_class_for_student(child_id)
        if not cls or not table_exists("portal_homework"):
            return Response([])
        data = rows(
            """
            SELECT h.id, h.title, h.description, h.assigned_date, h.due_date,
                   COALESCE(s.name, 'General') AS subject_name,
                   COALESCE(u.first_name || ' ' || u.last_name, u.username) AS teacher_name,
                   (h.due_date < current_date) AS is_overdue
            FROM portal_homework h LEFT JOIN portal_subject s ON s.id=h.subject_id
            LEFT JOIN auth_user u ON u.id=h.teacher_id
            WHERE h.class_id=%s ORDER BY h.due_date DESC
            """, [cls["class_id"]]
        )
        return Response(serialise(data))


class ChildResultsView(ParentMixin, APIView):
    @extend_schema(
        operation_id="ParentChildResults",
        summary="Get child exam results",
        description="Returns exam results for one of the parent's children, including marks, percentage and the linked exam details.",
        tags=["Academic"],
        parameters=[CHILD_ID_PARAMETER],
        responses={200: serializers.ListSerializer(child=_child_result_item), **ERROR_RESPONSES},
    )
    def get(self, request):
        child_id = request.query_params.get("child_id")
        if not _assert_own_child(request.user.id, child_id):
            return Response({"detail": "Not your child, or child not found."}, status=403)
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
            """,
            [child_id],
        )
        return Response(serialise(data))


class ChildFeesView(ParentMixin, APIView):
    @extend_schema(
        operation_id="ParentChildFees",
        summary="Get child fees",
        description="Returns pending fee structures and the payment history for one of the parent's children.",
        tags=["Finance"],
        parameters=[CHILD_ID_PARAMETER],
        responses={200: _child_fees_response, **ERROR_RESPONSES},
    )
    def get(self, request):
        child_id = request.query_params.get("child_id")
        if not _assert_own_child(request.user.id, child_id):
            return Response({"detail": "Not your child, or child not found."}, status=403)
        cls = current_class_for_student(child_id)
        pending, history = [], []
        if cls and table_exists("portal_fee_structure"):
            pending = rows(
                """
                SELECT fs.id, fs.term_name, fs.tuition_fee, fs.transport_fee, fs.hostel_fee, fs.total_amount
                FROM portal_fee_structure fs
                WHERE fs.class_id=%s AND NOT EXISTS (
                  SELECT 1 FROM portal_payment p WHERE p.fee_structure_id=fs.id AND p.student_id=%s AND p.status='Success'
                ) ORDER BY fs.id
                """,
                [cls["class_id"], child_id],
            )
        if table_exists("portal_payment"):
            history = rows(
                """
                SELECT p.id, p.transaction_id, p.amount_paid, p.status, p.paid_at,
                       json_build_object('id', fs.id, 'term_name', fs.term_name, 'total_amount', fs.total_amount) AS fee_structure_detail
                FROM portal_payment p JOIN portal_fee_structure fs ON fs.id=p.fee_structure_id
                WHERE p.student_id=%s ORDER BY p.paid_at DESC
                """,
                [child_id],
            )
        return Response(serialise({"pending": pending, "payment_history": history}))


class ChildFeesPayView(ParentMixin, APIView):
    @extend_schema(
        operation_id="ParentChildFeesPay",
        summary="Pay a child's fee",
        description="Records a successful payment against a fee structure for one of the parent's children and returns the generated transaction id.",
        tags=["Finance"],
        request=_fees_pay_request,
        examples=[FEES_PAY_EXAMPLE],
        responses={
            200: _fees_pay_response,
            400: ValidationErrorSerializer,
            **ERROR_RESPONSES,
        },
    )
    def post(self, request):
        child_id = request.data.get("child_id")
        if not _assert_own_child(request.user.id, child_id):
            return Response({"detail": "Not your child, or child not found."}, status=403)
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
                """,
                [child_id, fee_id, tx, fee["total_amount"], method],
            )
            pid = cursor.fetchone()[0]
        log_action(request.user, "fee.pay", "student", child_id, {"transaction_id": tx, "amount": str(fee["total_amount"])})
        return Response({"detail": "Payment recorded successfully.", "id": pid, "transaction_id": tx})


class ChildDocumentsView(ParentMixin, APIView):
    @extend_schema(
        operation_id="ParentChildDocuments",
        summary="Get child certificates",
        description="Returns certificates/documents issued for one of the parent's children.",
        tags=["Parent"],
        parameters=[CHILD_ID_PARAMETER],
        responses={200: serializers.ListSerializer(child=_child_document_item), **ERROR_RESPONSES},
    )
    def get(self, request):
        child_id = request.query_params.get("child_id")
        if not _assert_own_child(request.user.id, child_id):
            return Response({"detail": "Not your child, or child not found."}, status=403)
        if not table_exists("portal_certificate"):
            return Response([])
        return Response(serialise(rows(
            "SELECT id, certificate_type, issued_date, file_url FROM portal_certificate WHERE student_id=%s ORDER BY issued_date DESC",
            [child_id],
        )))


class ChildTransportView(ParentMixin, APIView):
    """Bus route/pickup info + most recent known GPS ping for the child's bus."""

    @extend_schema(
        operation_id="ParentChildTransport",
        summary="Get child transport info",
        description="Returns bus route/pickup allocation and the most recent known GPS ping for one of the parent's children.",
        tags=["Transport"],
        parameters=[CHILD_ID_PARAMETER],
        responses={200: _child_transport_response, **ERROR_RESPONSES},
    )
    def get(self, request):
        child_id = request.query_params.get("child_id")
        if not _assert_own_child(request.user.id, child_id):
            return Response({"detail": "Not your child, or child not found."}, status=403)
        if not table_exists("portal_transport_allocation"):
            return Response({"allocation": None, "last_location": None})
        alloc = row(
            """
            SELECT ta.pickup_point, v.id AS vehicle_id, v.vehicle_number, v.maintenance_status,
                   r.route_name, r.start_point, r.end_point,
                   COALESCE(du.first_name || ' ' || du.last_name, du.username) AS driver_name
            FROM portal_transport_allocation ta
            JOIN portal_vehicle v ON v.id = ta.vehicle_id
            JOIN portal_route r ON r.id = ta.route_id
            LEFT JOIN auth_user du ON du.id = v.driver_id
            WHERE ta.student_id = %s
            """,
            [child_id],
        )
        last_location = None
        if alloc and table_exists("portal_live_bus_log"):
            last_location = row(
                "SELECT latitude, longitude, updated_at FROM portal_live_bus_log WHERE vehicle_id=%s ORDER BY updated_at DESC LIMIT 1",
                [alloc["vehicle_id"]],
            )
        return Response(serialise({"allocation": alloc, "last_location": last_location}))


class TeacherContactsView(ParentMixin, APIView):
    """Teachers currently teaching any of this parent's children — the valid
    set of people a parent may message or book a PTM slot with."""

    @extend_schema(
        operation_id="ParentTeacherContacts",
        summary="Get teacher contacts",
        description="Returns the distinct teachers currently teaching any of this parent's children, with subject and class names.",
        tags=["Parent"],
        responses={200: serializers.ListSerializer(child=_teacher_contact_item), **ERROR_RESPONSES},
    )
    def get(self, request):
        pid = request.user.id
        if not table_exists("portal_academic_allocation"):
            return Response([])
        data = rows(
            """
            SELECT DISTINCT u.id, COALESCE(u.first_name || ' ' || u.last_name, u.username) AS name,
                   s.name AS subject_name, c.name || '-' || c.section AS class_name
            FROM portal_student_profile sp
            JOIN portal_student_enrollment se ON se.student_id = sp.user_id
            JOIN portal_academic_allocation aa ON aa.class_id = se.class_id
            JOIN auth_user u ON u.id = aa.teacher_id
            JOIN portal_subject s ON s.id = aa.subject_id
            JOIN portal_class c ON c.id = aa.class_id
            WHERE sp.parent_id = %s
            ORDER BY name
            """,
            [pid],
        )
        return Response(serialise(data))


class MessageThreadView(ParentMixin, APIView):
    @extend_schema(
        operation_id="ParentMessageThread",
        summary="Get message thread / conversation list",
        description="Returns the parent's latest messages, or a full conversation with a single user when the 'with' parameter is provided.",
        tags=["Parent"],
        parameters=[WITH_PARAMETER],
        responses={200: serializers.ListSerializer(child=_message_item), **ERROR_RESPONSES},
    )
    def get(self, request):
        pid = request.user.id
        other = request.query_params.get("with")
        if not table_exists("portal_message"):
            return Response([])
        if other:
            data = rows(
                """
                SELECT m.id, m.sender_id AS sender, m.receiver_id AS receiver, m.message_text, m.created_at
                FROM portal_message m
                WHERE (m.sender_id=%s AND m.receiver_id=%s) OR (m.sender_id=%s AND m.receiver_id=%s)
                ORDER BY m.created_at
                """,
                [pid, other, other, pid],
            )
        else:
            data = rows(
                """
                SELECT DISTINCT ON (CASE WHEN sender_id=%s THEN receiver_id ELSE sender_id END)
                       m.id, m.sender_id AS sender, m.receiver_id AS receiver, m.message_text, m.created_at
                FROM portal_message m
                WHERE m.sender_id=%s OR m.receiver_id=%s
                ORDER BY CASE WHEN sender_id=%s THEN receiver_id ELSE sender_id END, m.created_at DESC
                """,
                [pid, pid, pid, pid],
            )
        return Response(serialise(data))

    @extend_schema(
        operation_id="ParentMessageSend",
        summary="Send a message",
        description="Sends a message from the logged-in parent to the given receiver and returns the new message id.",
        tags=["Parent"],
        request=_message_send_request,
        examples=[MESSAGE_SEND_EXAMPLE],
        responses={
            200: IdDetailResponseSerializer,
            400: ValidationErrorSerializer,
            **ERROR_RESPONSES,
        },
    )
    def post(self, request):
        if not table_exists("portal_message"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        with connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO portal_message (sender_id, receiver_id, message_text) VALUES (%s,%s,%s) RETURNING id",
                [request.user.id, request.data.get("receiver"), request.data.get("message_text")],
            )
            mid = cursor.fetchone()[0]
        return Response({"id": mid, "detail": "Message sent."})


class NotificationListView(ParentMixin, APIView):
    @extend_schema(
        operation_id="ParentNotificationList",
        summary="Get notifications",
        description="Returns the 50 most recent notifications targeted at parents (all parents or the classes of the parent's children).",
        tags=["Parent"],
        responses={200: serializers.ListSerializer(child=_notification_item), **ERROR_RESPONSES},
    )
    def get(self, request):
        pid = request.user.id
        children = _children(pid)
        class_ids = [c.get("class_id") for c in [current_class_for_student(c["id"]) or {} for c in children] if c.get("class_id")]
        if table_exists("portal_notification"):
            sql = "SELECT n.id, n.title, n.message, n.created_at FROM portal_notification n WHERE n.recipient_type IN ('All','Parent')"
            params = []
            if class_ids:
                sql += " OR n.target_class_id = ANY(%s)"
                params.append(class_ids)
            sql += " ORDER BY n.created_at DESC LIMIT 50"
            return Response(serialise(rows(sql, params)))
        return Response([])


class LeaveRequestView(ParentMixin, APIView):
    """Parent submits/views leave requests on behalf of a child."""

    @extend_schema(
        operation_id="ParentLeaveRequest",
        summary="Get child leave requests",
        description="Returns leave requests submitted for one of the parent's children.",
        tags=["Parent"],
        parameters=[CHILD_ID_PARAMETER],
        responses={200: serializers.ListSerializer(child=_leave_item), **ERROR_RESPONSES},
    )
    def get(self, request):
        child_id = request.query_params.get("child_id")
        if not _assert_own_child(request.user.id, child_id):
            return Response({"detail": "Not your child, or child not found."}, status=403)
        if not table_exists("portal_leave"):
            return Response([])
        return Response(serialise(rows(
            "SELECT id, leave_type, start_date, end_date, reason, status FROM portal_leave WHERE user_id=%s ORDER BY start_date DESC",
            [child_id],
        )))

    @extend_schema(
        operation_id="ParentLeaveRequestSubmit",
        summary="Submit a leave request",
        description="Submits a leave request on behalf of one of the parent's children and returns the new leave request id.",
        tags=["Parent"],
        request=_leave_request_payload,
        examples=[LEAVE_SUBMIT_EXAMPLE],
        responses={
            200: LeaveSubmitResponseSerializer,
            400: ValidationErrorSerializer,
            **ERROR_RESPONSES,
        },
    )
    def post(self, request):
        child_id = request.data.get("child_id")
        if not _assert_own_child(request.user.id, child_id):
            return Response({"detail": "Not your child, or child not found."}, status=403)
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
                [child_id, request.data.get("leave_type"), start, end,
                 request.data.get("reason"), request.user.id],
            )
            lid = cursor.fetchone()[0]
        return Response({"id": lid, "detail": "Leave request submitted."}, status=201)


class PtmBookingView(ParentMixin, APIView):
    @extend_schema(
        operation_id="ParentPtmBooking",
        summary="Get PTM bookings",
        description="Returns the parent's parent-teacher meeting bookings with teacher and student names.",
        tags=["Parent"],
        responses={200: serializers.ListSerializer(child=_ptm_booking_item), **ERROR_RESPONSES},
    )
    def get(self, request):
        if not table_exists("portal_ptm_booking"):
            return Response([])
        data = rows(
            """
            SELECT b.id, b.meeting_date, b.time_slot, b.status, b.parent_notes,
                   COALESCE(tu.first_name || ' ' || tu.last_name, tu.username) AS teacher_name,
                   COALESCE(su.first_name || ' ' || su.last_name, su.username) AS student_name
            FROM portal_ptm_booking b
            JOIN auth_user tu ON tu.id = b.teacher_id
            LEFT JOIN auth_user su ON su.id = b.student_id
            WHERE b.parent_id = %s ORDER BY b.meeting_date DESC
            """,
            [request.user.id],
        )
        return Response(serialise(data))

    @extend_schema(
        operation_id="ParentPtmBookingCreate",
        summary="Request a PTM booking",
        description="Creates a parent-teacher meeting booking request and returns the new booking id.",
        tags=["Parent"],
        request=_ptm_booking_request,
        responses={
            200: IdDetailResponseSerializer,
            400: ValidationErrorSerializer,
            **ERROR_RESPONSES,
        },
    )
    def post(self, request):
        if not table_exists("portal_ptm_booking"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        data = request.data if isinstance(request.data, dict) else {}
        teacher_id = data.get("teacher_id")
        student_id = data.get("student_id")
        meeting_date = data.get("meeting_date")
        time_slot = data.get("time_slot")
        if not teacher_id or not student_id or not meeting_date or not time_slot:
            return Response({"detail": "teacher_id, student_id, meeting_date and time_slot are required."}, status=400)
        from datetime import date as _date
        try:
            _date.fromisoformat(str(meeting_date))
        except (TypeError, ValueError):
            return Response({"detail": "meeting_date must be a valid date (YYYY-MM-DD)."}, status=400)
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO portal_ptm_booking (parent_id, teacher_id, student_id, meeting_date, time_slot, parent_notes)
                VALUES (%s,%s,%s,%s,%s,%s) RETURNING id
                """,
                [request.user.id, teacher_id, student_id,
                 meeting_date, time_slot, data.get("parent_notes", "")],
            )
            bid = cursor.fetchone()[0]
        return Response({"id": bid, "detail": "Meeting requested."})


class FeedbackView(ParentMixin, APIView):
    @extend_schema(
        operation_id="ParentFeedback",
        summary="Get parent feedback submissions",
        description="Returns the list of feedback submissions made by the logged-in parent.",
        tags=["Parent"],
        responses={200: serializers.ListSerializer(child=_feedback_item), **ERROR_RESPONSES},
    )
    def get(self, request):
        if not table_exists("portal_parent_feedback"):
            return Response([])
        return Response(serialise(rows(
            "SELECT id, category, feedback_text, status, created_at FROM portal_parent_feedback WHERE parent_id=%s ORDER BY created_at DESC",
            [request.user.id],
        )))

    @extend_schema(
        operation_id="ParentFeedbackCreate",
        summary="Submit parent feedback",
        description="Submits feedback from the logged-in parent and returns the new feedback id.",
        tags=["Parent"],
        request=_feedback_request,
        responses={
            200: IdDetailResponseSerializer,
            400: ValidationErrorSerializer,
            **ERROR_RESPONSES,
        },
    )
    def post(self, request):
        if not table_exists("portal_parent_feedback"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        with connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO portal_parent_feedback (parent_id, category, feedback_text) VALUES (%s,%s,%s) RETURNING id",
                [request.user.id, request.data.get("category", "General"), request.data.get("feedback_text")],
            )
            fid = cursor.fetchone()[0]
        return Response({"id": fid, "detail": "Feedback submitted."})


class ParentLmsProgressView(ParentMixin, APIView):
    @extend_schema(
        operation_id="ParentLmsProgress",
        summary="Get child LMS learning progress",
        description="Returns per-course LMS progress for one of the parent's children: progress percent, resources, chapters, attendance, assignments, quizzes, upcoming tests, weak-subject flag and teacher remarks.",
        tags=["Academic"],
        parameters=[CHILD_ID_REQUIRED_PARAMETER],
        responses={200: _parent_lms_progress_response, **ERROR_RESPONSES},
    )
    def get(self, request):
        child_id = request.query_params.get("child_id")
        if not child_id:
            return Response({"detail": "child_id parameter is required."}, status=400)
            
        # Verify parent-child relationship
        relation = row("SELECT user_id FROM portal_student_profile WHERE user_id=%s AND parent_id=%s", [child_id, request.user.id])
        if not relation:
            return Response({"detail": "Unauthorized or child not found."}, status=403)
            
        # Find child class enrollment
        enroll = row("SELECT class_id FROM portal_student_enrollment WHERE student_id=%s ORDER BY academic_year DESC LIMIT 1", [child_id])
        if not enroll:
            return Response({"courses": [], "detail": "Child is not enrolled in any class."})
            
        class_id = enroll["class_id"]
        
        # Get courses
        courses = rows(
            """
            SELECT c.id, c.title, s.name AS subject_name, c.subject_id
            FROM portal_course c
            JOIN portal_subject s ON s.id = c.subject_id
            WHERE c.class_id = %s
            """, [class_id]
        )
        
        result_data = []
        for course in courses:
            # 1. Progress %
            total_res = row("SELECT COUNT(*)::int AS count FROM portal_course_content WHERE course_id=%s", [course["id"]])["count"]
            comp_res = row(
                """
                SELECT COUNT(*)::int AS count FROM portal_course_progress 
                WHERE student_id=%s AND content_id IN (SELECT id FROM portal_course_content WHERE course_id=%s)
                """, [child_id, course["id"]]
            )["count"]
            
            progress_percent = round((comp_res / total_res) * 100, 1) if total_res > 0 else 0.0
            
            # 2. Completed Chapters
            chapters = rows("SELECT id, title FROM portal_chapter WHERE course_id=%s", [course["id"]])
            completed_chapters_count = 0
            for ch in chapters:
                ch_res = row(
                    """
                    SELECT COUNT(*)::int AS count FROM portal_course_content 
                    WHERE lesson_id IN (SELECT id FROM portal_lesson WHERE chapter_id=%s)
                    """, [ch["id"]]
                )["count"]
                
                ch_comp = row(
                    """
                    SELECT COUNT(*)::int AS count FROM portal_course_progress 
                    WHERE student_id=%s AND content_id IN (
                        SELECT id FROM portal_course_content 
                        WHERE lesson_id IN (SELECT id FROM portal_lesson WHERE chapter_id=%s)
                    )
                    """, [child_id, ch["id"]]
                )["count"]
                
                if ch_res > 0 and ch_res == ch_comp:
                    completed_chapters_count += 1
            
            # 3. Attendance for this class
            attendance_summary = row(
                """
                SELECT COUNT(*)::int AS total,
                       SUM(CASE WHEN status='Present' THEN 1 ELSE 0 END)::int AS present
                FROM portal_attendance
                WHERE student_id=%s AND class_id=%s
                """, [child_id, class_id]
            )
            attendance_percentage = 100.0
            if attendance_summary and attendance_summary["total"] > 0:
                attendance_percentage = round((attendance_summary["present"] / attendance_summary["total"]) * 100, 1)
                
            # 4. Assignments Status
            assignments = rows(
                """
                SELECT a.id, a.title, a.due_date, a.max_marks,
                       s.marks_obtained, s.submitted_at, s.teacher_feedback
                FROM portal_assignment a
                LEFT JOIN portal_assignment_submission s ON s.assignment_id = a.id AND s.student_id = %s
                WHERE a.class_id = %s AND a.subject_id = %s
                """, [child_id, class_id, course["subject_id"]]
            )
            
            completed_assignments = sum(1 for a in assignments if a.get("submitted_at") is not None)
            total_assignments = len(assignments)
            
            # 5. Quizzes Total
            quizzes = rows(
                """
                SELECT q.id, q.title, q.passing_score
                FROM portal_quiz q
                WHERE q.course_id = %s
                """, [course["id"]]
            )
            
            # 6. Upcoming Tests
            upcoming_tests = rows(
                """
                SELECT exam_name, exam_date, start_time, max_marks
                FROM portal_exam_schedule
                WHERE class_id=%s AND subject_id=%s AND exam_date >= CURRENT_DATE
                ORDER BY exam_date LIMIT 3
                """, [class_id, course["subject_id"]]
            )
            
            # 7. Weak Subject check
            avg_score = 0
            score_count = 0
            for a in assignments:
                if a.get("marks_obtained") is not None:
                    avg_score += float(a["marks_obtained"]) / (a["max_marks"] or 100)
                    score_count += 1
            avg_percent = (avg_score / score_count) * 100 if score_count > 0 else None
            is_weak = avg_percent is not None and avg_percent < 50.0
            
            # 8. Teacher remarks
            remarks = [a["teacher_feedback"] for a in assignments if a.get("teacher_feedback")]
            recent_remark = remarks[0] if remarks else "Consistent effort. Shows good understanding of the topics."
            
            result_data.append({
                "id": course["id"],
                "subject_name": course["subject_name"],
                "course_title": course["title"],
                "progress_percent": progress_percent,
                "total_resources": total_res,
                "completed_resources": comp_res,
                "chapters_total": len(chapters),
                "chapters_completed": completed_chapters_count,
                "attendance_percent": attendance_percentage,
                "assignments_total": total_assignments,
                "assignments_completed": completed_assignments,
                "quizzes_total": len(quizzes),
                "upcoming_tests": upcoming_tests,
                "average_score_percent": avg_percent,
                "is_weak": is_weak,
                "recent_remark": recent_remark
            })
            
        return Response(serialise({"courses": result_data}))


# ---------------------------------------------------------------------------
# Parent exam extras — report card, revaluation, certificates
# (frontend parent/pages/Results.jsx tabs)
# ---------------------------------------------------------------------------
class ParentReportCardView(ParentMixin, APIView):
    """GET /parent/report-card/?child_id=&exam_name= — child's report card."""

    @extend_schema(
        operation_id="ParentChildReportCard",
        summary="Get child report card",
        description="Returns a report card for one of the parent's children for a given exam round.",
        tags=["Parent"],
        parameters=[CHILD_ID_PARAMETER, EXAM_NAME_PARAMETER],
        responses={
            200: OpenApiTypes.OBJECT,
            400: ValidationErrorSerializer,
            403: DetailErrorSerializer,
        },
    )
    def get(self, request):
        child_id = request.query_params.get("child_id")
        exam_name = request.query_params.get("exam_name")
        if not _assert_own_child(request.user.id, child_id):
            return Response({"detail": "Not your child, or child not found."}, status=403)
        if not exam_name:
            return Response({"detail": "exam_name is required."}, status=400)
        from .exam_extras_views import _report_card_data
        return Response(serialise(_report_card_data(child_id, exam_name)))


class ParentRevaluationView(ParentMixin, APIView):
    """GET /parent/exams/revaluation/?child_id= — list requests
    POST /parent/exams/revaluation/ — create a request"""

    @extend_schema(
        operation_id="ParentRevaluationList",
        summary="List child revaluation requests",
        description="Returns revaluation requests for one of the parent's children.",
        tags=["Parent"],
        parameters=[CHILD_ID_PARAMETER],
        responses={200: serializers.ListSerializer(child=serializers.JSONField()), **ERROR_RESPONSES},
    )
    def get(self, request):
        child_id = request.query_params.get("child_id")
        if not _assert_own_child(request.user.id, child_id):
            return Response({"detail": "Not your child, or child not found."}, status=403)
        if not table_exists("portal_revaluation"):
            return Response([])
        data = rows(
            "SELECT id, subject_name, exam_name, reason, status, teacher_remarks, requested_at "
            "FROM portal_revaluation WHERE student_id=%s ORDER BY id DESC",
            [child_id],
        )
        return Response(serialise(data))

    @extend_schema(
        operation_id="ParentRevaluationCreate",
        summary="Request revaluation",
        description="Files a revaluation request for one of the parent's children.",
        tags=["Parent"],
        request=OpenApiTypes.OBJECT,
        responses={201: OpenApiTypes.OBJECT, **ERROR_RESPONSES},
    )
    def post(self, request):
        d = request.data
        child_id = d.get("child_id")
        if not _assert_own_child(request.user.id, child_id):
            return Response({"detail": "Not your child, or child not found."}, status=403)
        result_id = d.get("result_id")
        reason = (d.get("reason") or "").strip()
        if not result_id or not reason:
            return Response({"detail": "result_id and reason are required."}, status=400)

        subject_name = ""
        exam_name = ""
        if table_exists("portal_result") and table_exists("portal_exam_schedule") and table_exists("portal_subject"):
            info = row(
                """
                SELECT COALESCE(s.name,'') AS subject_name, COALESCE(e.exam_name,'') AS exam_name
                FROM portal_result r
                LEFT JOIN portal_exam_schedule e ON e.id = r.exam_schedule_id
                LEFT JOIN portal_subject s ON s.id = e.subject_id
                WHERE r.id=%s AND r.student_id=%s
                """,
                [result_id, child_id],
            )
            if info:
                subject_name = info["subject_name"]
                exam_name = info["exam_name"]

        with connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO portal_revaluation (student_id, result_id, subject_name, exam_name, reason, status) "
                "VALUES (%s, %s, %s, %s, %s, 'Pending')",
                [child_id, result_id, subject_name, exam_name, reason],
            )
        log_action(request.user, "parent.revaluation_requested", "revaluation", child_id)
        return Response({"detail": "Revaluation request submitted."}, status=201)


class ParentCertificatesView(ParentMixin, APIView):
    """GET /parent/exams/certificates/?child_id= — list certificate requests
    POST /parent/exams/certificates/ — request a certificate"""

    @extend_schema(
        operation_id="ParentCertificateList",
        summary="List child certificates",
        description="Returns certificate requests/issued certificates for one of the parent's children.",
        tags=["Parent"],
        parameters=[CHILD_ID_PARAMETER],
        responses={200: serializers.ListSerializer(child=serializers.JSONField()), **ERROR_RESPONSES},
    )
    def get(self, request):
        child_id = request.query_params.get("child_id")
        if not _assert_own_child(request.user.id, child_id):
            return Response({"detail": "Not your child, or child not found."}, status=403)
        if not table_exists("portal_certificate_request"):
            return Response([])
        data = rows(
            "SELECT id, certificate_type, exam_name, status, verification_code, requested_at, issued_date "
            "FROM portal_certificate_request WHERE student_id=%s ORDER BY id DESC",
            [child_id],
        )
        return Response(serialise(data))

    @extend_schema(
        operation_id="ParentCertificateCreate",
        summary="Request a certificate",
        description="Files a certificate request for one of the parent's children.",
        tags=["Parent"],
        request=OpenApiTypes.OBJECT,
        responses={201: OpenApiTypes.OBJECT, **ERROR_RESPONSES},
    )
    def post(self, request):
        d = request.data
        child_id = d.get("child_id")
        if not _assert_own_child(request.user.id, child_id):
            return Response({"detail": "Not your child, or child not found."}, status=403)
        cert_type = d.get("certificate_type")
        if not cert_type:
            return Response({"detail": "certificate_type is required."}, status=400)
        exam_name = d.get("exam_name", "")
        code = get_random_string(10).upper()
        with connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO portal_certificate_request (student_id, certificate_type, exam_name, status, verification_code) "
                "VALUES (%s, %s, %s, 'Pending', %s)",
                [child_id, cert_type, exam_name, code],
            )
        log_action(request.user, "parent.certificate_requested", "certificate", child_id)
        return Response({"detail": "Certificate request submitted.", "verification_code": code}, status=201)

