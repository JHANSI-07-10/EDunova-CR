import json
from datetime import date, timedelta
from django.utils.timezone import now

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.contrib.auth.models import Group
from django.db import IntegrityError, connection, models, transaction
from django.utils.crypto import get_random_string
from django.utils.dateparse import parse_datetime
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import (
    extend_schema,
    extend_schema_view,
    OpenApiParameter,
    OpenApiExample,
    inline_serializer,
)
from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.admissions.models import AdmissionEnquiry, generate_registration_number
from apps.cms.models import ContactSubmission
from .doc_schemas import (
    DetailErrorSerializer,
    ValidationErrorSerializer,
    IdDetailResponseSerializer,
    MultiRouteAutoSchema,
    ERROR_RESPONSES,
)
from .roles import IsAdmin, get_role, log_action
from .views import row, rows, serialise, table_exists

User = get_user_model()


# ---------------------------------------------------------------------------
# Documentation-only schemas (drf-spectacular). None are used for real
# (de)serialization — the views use raw SQL and hand-shaped dictionaries.
# ---------------------------------------------------------------------------

_RecentAdmissionItem = inline_serializer(
    name="AdminRecentAdmissionItem",
    fields={
        "registration_number": serializers.CharField(required=False),
        "applicant_name": serializers.CharField(required=False),
        "target_class": serializers.CharField(required=False),
        "status": serializers.CharField(required=False),
        "submitted_at": serializers.DateTimeField(required=False),
    },
)

_AdminDashboardResponse = inline_serializer(
    name="AdminDashboardResponse",
    fields={
        "pending_admissions": serializers.IntegerField(required=False),
        "total_students": serializers.IntegerField(required=False),
        "total_teachers": serializers.IntegerField(required=False),
        "total_parents": serializers.IntegerField(required=False),
        "total_employees": serializers.IntegerField(required=False),
        "open_leaves": serializers.IntegerField(required=False),
        "fee_collected_this_month": serializers.FloatField(required=False),
        "library_books_out": serializers.IntegerField(required=False),
        "recent_admissions": serializers.ListSerializer(child=_RecentAdmissionItem, required=False),
    },
)

_AdmissionListItem = inline_serializer(
    name="AdminAdmissionListItem",
    fields={
        "registration_number": serializers.CharField(required=False),
        "applicant_name": serializers.CharField(required=False),
        "date_of_birth": serializers.DateField(required=False),
        "gender": serializers.CharField(required=False),
        "target_class": serializers.CharField(required=False),
        "parent_name": serializers.CharField(required=False),
        "parent_phone": serializers.CharField(required=False),
        "parent_email": serializers.EmailField(required=False),
        "scholarship_applied": serializers.BooleanField(required=False),
        "status": serializers.CharField(required=False),
        "rejection_reason": serializers.CharField(required=False),
        "submitted_at": serializers.DateTimeField(required=False),
    },
)

_AdmissionCreateRequest = inline_serializer(
    name="AdminAdmissionCreateRequest",
    fields={
        "applicant_name": serializers.CharField(help_text="Full name of the applicant."),
        "date_of_birth": serializers.DateField(required=False),
        "gender": serializers.ChoiceField(
            choices=["Male", "Female", "Other"], default="Male", required=False
        ),
        "target_class": serializers.CharField(),
        "parent_name": serializers.CharField(required=False),
        "parent_phone": serializers.CharField(required=False),
        "parent_email": serializers.EmailField(required=False),
        "address": serializers.CharField(required=False, default=""),
        "scholarship_applied": serializers.BooleanField(required=False, default=False),
    },
)

_AdmissionCreateResponse = inline_serializer(
    name="AdminAdmissionCreateResponse",
    fields={
        "detail": serializers.CharField(),
        "registration_number": serializers.CharField(),
    },
)

_CredentialsPayload = inline_serializer(
    name="AdminCredentialsPayload",
    fields={
        "student_username": serializers.CharField(),
        "student_temp_password": serializers.CharField(),
        "parent_username": serializers.CharField(),
        "parent_temp_password": serializers.CharField(required=False),
        "parent_account_reused": serializers.BooleanField(required=False),
    },
)

_AdmissionActionResponse = inline_serializer(
    name="AdminAdmissionActionResponse",
    fields={
        "status": serializers.CharField(),
        "credentials": _CredentialsPayload,
    },
)

_AdmissionActionRequest = inline_serializer(
    name="AdminAdmissionActionRequest",
    fields={
        "action": serializers.ChoiceField(
            choices=["advance", "reject"],
            help_text="'advance' moves the application forward; 'reject' refuses it.",
        ),
        "reason": serializers.CharField(
            required=False, help_text="Rejection reason (required when action='reject')."
        ),
    },
)

_ADMISSION_ACTION_BODY_EXAMPLE = OpenApiExample(
    "AdmissionActionBody",
    value={"action": "advance", "reason": ""},
    description="Move an application to its next workflow stage.",
)

_UserItem = inline_serializer(
    name="AdminUserItem",
    fields={
        "id": serializers.IntegerField(),
        "username": serializers.CharField(),
        "email": serializers.EmailField(required=False),
        "name": serializers.CharField(),
        "is_active": serializers.BooleanField(),
        "date_joined": serializers.DateTimeField(),
        "role": serializers.CharField(),
    },
)

_UserCreateRequest = inline_serializer(
    name="AdminUserCreateRequest",
    fields={
        "role": serializers.ChoiceField(
            choices=["Student", "Teacher", "Parent", "Admin", "Employee"],
            help_text="Role to assign.",
        ),
        "email": serializers.EmailField(required=False),
        "username": serializers.CharField(required=False),
        "first_name": serializers.CharField(required=False, default=""),
        "last_name": serializers.CharField(required=False, default=""),
        "phone_number": serializers.CharField(required=False, default=""),
        "parent_name": serializers.CharField(
            required=False, help_text="Only for creating a Student's parent account."
        ),
        "parent_email": serializers.EmailField(
            required=False, help_text="Only for creating a Student's parent account."
        ),
        "parent_phone": serializers.CharField(required=False),
        "class_id": serializers.IntegerField(required=False),
        "roll_number": serializers.IntegerField(required=False),
    },
)

_UserCreateResponse = inline_serializer(
    name="AdminUserCreateResponse",
    fields={
        "id": serializers.IntegerField(),
        "username": serializers.CharField(),
        "temp_password": serializers.CharField(),
        "role": serializers.CharField(),
    },
)

_UserDetailPatchRequest = inline_serializer(
    name="AdminUserDetailPatchRequest",
    fields={
        "is_active": serializers.BooleanField(
            required=False, help_text="Toggle account active status."
        ),
        "role": serializers.ChoiceField(
            choices=["Student", "Teacher", "Parent", "Admin", "Employee"],
            required=False,
            help_text="Reassign the user's role/group.",
        ),
    },
)

_UserResetPasswordResponse = inline_serializer(
    name="AdminUserResetPasswordResponse",
    fields={
        "detail": serializers.CharField(),
        "temp_password": serializers.CharField(required=False),
        "email_error": serializers.BooleanField(required=False),
    },
)

_RolesResponse = inline_serializer(
    name="AdminRolesResponse",
    fields={
        "Student": serializers.IntegerField(required=False),
        "Teacher": serializers.IntegerField(required=False),
        "Parent": serializers.IntegerField(required=False),
        "Admin": serializers.IntegerField(required=False),
        "Employee": serializers.IntegerField(required=False),
    },
)

_ClassItem = inline_serializer(
    name="AdminClassItem",
    fields={
        "id": serializers.IntegerField(required=False),
        "name": serializers.CharField(required=False),
        "section": serializers.CharField(required=False),
        "curriculum": serializers.CharField(required=False),
        "room_number": serializers.CharField(required=False),
    },
)

_ClassCreateRequest = inline_serializer(
    name="AdminClassCreateRequest",
    fields={
        "name": serializers.CharField(),
        "section": serializers.CharField(),
        "curriculum": serializers.CharField(required=False),
        "room_number": serializers.CharField(required=False),
    },
)

_CLASS_CREATE_BODY_EXAMPLE = OpenApiExample(
    "ClassCreateBody",
    value={"name": "Class R", "section": "A"},
    description="Creates a new grade/section under the class module.",
)

_SubjectItem = inline_serializer(
    name="AdminSubjectItem",
    fields={
        "id": serializers.IntegerField(required=False),
        "name": serializers.CharField(required=False),
        "subject_code": serializers.CharField(required=False),
        "type": serializers.CharField(required=False),
    },
)

_SubjectCreateRequest = inline_serializer(
    name="AdminSubjectCreateRequest",
    fields={
        "name": serializers.CharField(),
        "subject_code": serializers.CharField(required=False),
        "type": serializers.CharField(required=False),
    },
)

_VehicleItem = inline_serializer(
    name="AdminVehicleItem",
    fields={
        "id": serializers.IntegerField(required=False),
        "vehicle_number": serializers.CharField(required=False),
        "capacity": serializers.IntegerField(required=False),
        "driver_id": serializers.IntegerField(required=False),
        "gps_device_id": serializers.CharField(required=False),
        "maintenance_status": serializers.CharField(required=False),
    },
)

_VehicleCreateRequest = inline_serializer(
    name="AdminVehicleCreateRequest",
    fields={
        "vehicle_number": serializers.CharField(),
        "capacity": serializers.IntegerField(required=False),
        "driver_id": serializers.IntegerField(required=False),
        "gps_device_id": serializers.CharField(required=False),
        "maintenance_status": serializers.CharField(required=False),
    },
)

_RouteItem = inline_serializer(
    name="AdminRouteItem",
    fields={
        "id": serializers.IntegerField(required=False),
        "route_name": serializers.CharField(required=False),
        "start_point": serializers.CharField(required=False),
        "end_point": serializers.CharField(required=False),
    },
)

_RouteCreateRequest = inline_serializer(
    name="AdminRouteCreateRequest",
    fields={
        "route_name": serializers.CharField(),
        "start_point": serializers.CharField(required=False),
        "end_point": serializers.CharField(required=False),
    },
)

_TransportAllocationItem = inline_serializer(
    name="AdminTransportAllocationItem",
    fields={
        "id": serializers.IntegerField(required=False),
        "student_id": serializers.IntegerField(required=False),
        "vehicle_id": serializers.IntegerField(required=False),
        "route_id": serializers.IntegerField(required=False),
        "pickup_point": serializers.CharField(required=False),
    },
)

_TransportAllocationCreateRequest = inline_serializer(
    name="AdminTransportAllocationCreateRequest",
    fields={
        "student_id": serializers.IntegerField(),
        "vehicle_id": serializers.IntegerField(required=False),
        "route_id": serializers.IntegerField(required=False),
        "pickup_point": serializers.CharField(required=False),
    },
)

_FeeStructureItem = inline_serializer(
    name="AdminFeeStructureItem",
    fields={
        "id": serializers.IntegerField(required=False),
        "class_id": serializers.IntegerField(required=False),
        "term_name": serializers.CharField(required=False),
        "tuition_fee": serializers.FloatField(required=False),
        "transport_fee": serializers.FloatField(required=False),
        "hostel_fee": serializers.FloatField(required=False),
        "total_amount": serializers.FloatField(required=False),
    },
)

_FeeStructureCreateRequest = inline_serializer(
    name="AdminFeeStructureCreateRequest",
    fields={
        "class_id": serializers.IntegerField(),
        "term_name": serializers.CharField(),
        "tuition_fee": serializers.FloatField(required=False),
        "transport_fee": serializers.FloatField(required=False),
        "hostel_fee": serializers.FloatField(required=False),
        "total_amount": serializers.FloatField(required=False),
    },
)

_PaymentItem = inline_serializer(
    name="AdminPaymentItem",
    fields={
        "id": serializers.IntegerField(required=False),
        "transaction_id": serializers.CharField(required=False),
        "amount_paid": serializers.FloatField(required=False),
        "status": serializers.CharField(required=False),
        "paid_at": serializers.DateTimeField(required=False),
        "student_name": serializers.CharField(required=False),
        "term_name": serializers.CharField(required=False),
    },
)

_BookItem = inline_serializer(
    name="AdminBookItem",
    fields={
        "id": serializers.IntegerField(required=False),
        "title": serializers.CharField(required=False),
        "author": serializers.CharField(required=False),
        "isbn": serializers.CharField(required=False),
        "barcode_id": serializers.CharField(required=False),
        "quantity": serializers.IntegerField(required=False),
        "available_quantity": serializers.IntegerField(required=False),
        "book_type": serializers.CharField(required=False),
        "digital_file_url": serializers.URLField(required=False),
    },
)

_BookCreateRequest = inline_serializer(
    name="AdminBookCreateRequest",
    fields={
        "title": serializers.CharField(),
        "author": serializers.CharField(required=False),
        "isbn": serializers.CharField(required=False),
        "barcode_id": serializers.CharField(required=False),
        "quantity": serializers.IntegerField(required=False),
        "available_quantity": serializers.IntegerField(required=False),
        "book_type": serializers.CharField(required=False),
        "digital_file_url": serializers.URLField(required=False),
    },
)

_LibraryIssueRequest = inline_serializer(
    name="AdminLibraryIssueRequest",
    fields={
        "book_id": serializers.IntegerField(),
        "borrower_id": serializers.IntegerField(),
        "loan_days": serializers.IntegerField(required=False, default=14),
    },
)

_LIBRARY_ISSUE_EXAMPLE = OpenApiExample(
    "LibraryIssueBody",
    value={"book_id": 12, "borrower_id": 8, "loan_days": 14},
    description="Issues a book to a borrower for a configured number of days.",
)

_LibraryIssueResponse = inline_serializer(
    name="AdminLibraryIssueResponse",
    fields={
        "id": serializers.IntegerField(),
        "due_date": serializers.DateField(),
        "detail": serializers.CharField(),
    },
)

_LibraryReturnResponse = inline_serializer(
    name="AdminLibraryReturnResponse",
    fields={
        "detail": serializers.CharField(),
        "late_days": serializers.IntegerField(),
        "fine_amount": serializers.IntegerField(),
    },
)

_NoticeItem = inline_serializer(
    name="AdminNoticeItem",
    fields={
        "id": serializers.IntegerField(required=False),
        "sender_id": serializers.IntegerField(required=False),
        "recipient_type": serializers.CharField(required=False),
        "target_class_id": serializers.IntegerField(required=False),
        "title": serializers.CharField(required=False),
        "message": serializers.CharField(required=False),
        "created_at": serializers.DateTimeField(required=False),
    },
)

_NoticeCreateRequest = inline_serializer(
    name="AdminNoticeCreateRequest",
    fields={
        "recipient_type": serializers.CharField(required=False, default="All"),
        "target_class_id": serializers.IntegerField(required=False),
        "title": serializers.CharField(),
        "message": serializers.CharField(),
    },
)

_NOTICE_BROADCAST_EXAMPLE = OpenApiExample(
    "NoticeBroadcastBody",
    value={
        "recipient_type": "All",
        "target_class_id": None,
        "title": "Exam Schedule Released",
        "message": "Final term exams start on Monday.",
    },
    description="Broadcasts a notice/notification to the selected audience.",
)

_NoticeCreateResponse = inline_serializer(
    name="AdminNoticeCreateResponse",
    fields={"id": serializers.IntegerField(), "detail": serializers.CharField()},
)

_LeaveItem = inline_serializer(
    name="AdminLeaveItem",
    fields={
        "id": serializers.IntegerField(required=False),
        "leave_type": serializers.CharField(required=False),
        "start_date": serializers.DateField(required=False),
        "end_date": serializers.DateField(required=False),
        "reason": serializers.CharField(required=False),
        "status": serializers.CharField(required=False),
        "applicant_name": serializers.CharField(required=False),
    },
)

_LeaveDecideRequest = inline_serializer(
    name="AdminLeaveDecideRequest",
    fields={
        "decision": serializers.ChoiceField(
            choices=["Approved", "Rejected"], help_text="Decision to apply to the leave request."
        ),
    },
)

_LEAVE_DECIDE_EXAMPLE = OpenApiExample(
    "LeaveDecideBody",
    value={"decision": "Approved"},
    description="Approves or rejects a pending leave request.",
)

_LeaveDecideResponse = inline_serializer(
    name="AdminLeaveDecideResponse",
    fields={"detail": serializers.CharField()},
)

_ReportAttendanceByClass = inline_serializer(
    name="AdminReportAttendanceByClass",
    fields={
        "class_name": serializers.CharField(required=False),
        "attendance_pct": serializers.FloatField(required=False),
    },
)

_ReportFeeByMonth = inline_serializer(
    name="AdminReportFeeByMonth",
    fields={
        "month": serializers.CharField(required=False),
        "total": serializers.FloatField(required=False),
    },
)

_ReportAverageMarks = inline_serializer(
    name="AdminReportAverageMarks",
    fields={
        "subject_name": serializers.CharField(required=False),
        "average_marks": serializers.FloatField(required=False),
    },
)

_ReportsResponse = inline_serializer(
    name="AdminReportsResponse",
    fields={
        "attendance_by_class": serializers.ListSerializer(
            child=_ReportAttendanceByClass, required=False
        ),
        "fee_collection_by_month": serializers.ListSerializer(
            child=_ReportFeeByMonth, required=False
        ),
        "average_marks_by_subject": serializers.ListSerializer(
            child=_ReportAverageMarks, required=False
        ),
    },
)

_AuditLogItem = inline_serializer(
    name="AdminAuditLogItem",
    fields={
        "id": serializers.IntegerField(required=False),
        "action": serializers.CharField(required=False),
        "target_type": serializers.CharField(required=False),
        "target_id": serializers.CharField(required=False),
        "details": serializers.JSONField(required=False),
        "created_at": serializers.DateTimeField(required=False),
        "actor_name": serializers.CharField(required=False),
    },
)

_BackupExportResponse = inline_serializer(
    name="AdminBackupExportResponse",
    fields={
        "generated_at": serializers.DateField(required=False),
        "tables": serializers.DictField(child=serializers.JSONField(), required=False),
    },
)

_EnrollmentListItem = inline_serializer(
    name="AdminEnrollmentListItem",
    fields={
        "id": serializers.IntegerField(required=False),
        "student_id": serializers.IntegerField(required=False),
        "student_username": serializers.CharField(required=False),
        "student_name": serializers.CharField(required=False),
        "class_id": serializers.IntegerField(required=False),
        "class_name": serializers.CharField(required=False),
        "academic_year": serializers.CharField(required=False),
        "roll_number": serializers.IntegerField(required=False),
    },
)

_EnrollmentCreateRequest = inline_serializer(
    name="AdminEnrollmentCreateRequest",
    fields={
        "student_id": serializers.IntegerField(),
        "class_id": serializers.IntegerField(),
        "roll_number": serializers.IntegerField(required=False),
        "academic_year": serializers.CharField(required=False, default="2025-26"),
    },
)

_EnrollmentCreateResponse = inline_serializer(
    name="AdminEnrollmentCreateResponse",
    fields={"id": serializers.IntegerField(), "detail": serializers.CharField()},
)

_AssignedSubject = inline_serializer(
    name="AdminAssignedSubject",
    fields={"id": serializers.IntegerField(required=False), "name": serializers.CharField(required=False)},
)

_ClassTeacherListItem = inline_serializer(
    name="AdminClassTeacherListItem",
    fields={
        "class_id": serializers.IntegerField(required=False),
        "class_name": serializers.CharField(required=False),
        "teacher_id": serializers.IntegerField(required=False),
        "teacher_name": serializers.CharField(required=False),
        "assigned_subjects": serializers.ListSerializer(child=_AssignedSubject, required=False),
    },
)

_ClassTeacherAssignRequest = inline_serializer(
    name="AdminClassTeacherAssignRequest",
    fields={
        "class_id": serializers.IntegerField(),
        "teacher_id": serializers.IntegerField(),
        "subject_id": serializers.IntegerField(required=False),
    },
)

_ClassTeacherAssignResponse = inline_serializer(
    name="AdminClassTeacherAssignResponse",
    fields={"detail": serializers.CharField()},
)

_LmsUploadItem = inline_serializer(
    name="AdminLmsUploadItem",
    fields={
        "id": serializers.IntegerField(required=False),
        "title": serializers.CharField(required=False),
        "content_type": serializers.CharField(required=False),
        "uploaded_at": serializers.DateTimeField(required=False),
        "course_title": serializers.CharField(required=False),
        "class_name": serializers.CharField(required=False),
        "subject_name": serializers.CharField(required=False),
        "teacher_name": serializers.CharField(required=False),
    },
)

_LmsAnalyticsResponse = inline_serializer(
    name="AdminLmsAnalyticsResponse",
    fields={
        "uploads": serializers.ListSerializer(child=_LmsUploadItem, required=False),
        "stats": inline_serializer(
            name="AdminLmsAnalyticsStats",
            fields={
                "total_courses": serializers.IntegerField(required=False),
                "total_chapters": serializers.IntegerField(required=False),
                "total_lessons": serializers.IntegerField(required=False),
                "total_resources": serializers.IntegerField(required=False),
                "estimated_storage_mb": serializers.FloatField(required=False),
                "resources_by_type": serializers.DictField(
                    child=serializers.IntegerField(), required=False
                ),
            },
        ),
    },
)


class AdminMixin:
    permission_classes = [IsAdmin]


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------
class AdminDashboardView(AdminMixin, APIView):
    @extend_schema(
        operation_id="AdminDashboard",
        summary="Admin portal dashboard",
        description="Returns aggregate counts across admissions, students, teachers, parents, employees, leaves, fees and library, plus the most recent admissions.",
        tags=["Admin Portal"],
        responses={200: _AdminDashboardResponse, **ERROR_RESPONSES},
    )
    def get(self, request):
        def count(table, where=""):
            if not table_exists(table):
                return 0
            r = row(f"SELECT COUNT(*)::int AS c FROM {table} {where}")
            return r["c"] if r else 0

        pending_admissions = AdmissionEnquiry.objects.exclude(status__in=["Confirmed", "Rejected"]).count()
        total_students = count("portal_student_profile")
        total_teachers = count("portal_teacher_profile")
        total_parents = count("portal_parent_profile")
        total_employees = count("portal_employee")
        open_leaves = count("portal_leave", "WHERE status='Pending'")
        fee_collected_month = 0
        if table_exists("portal_payment"):
            r = row(
                "SELECT COALESCE(SUM(amount_paid),0)::float AS total FROM portal_payment "
                "WHERE status='Success' AND date_trunc('month', paid_at) = date_trunc('month', now())"
            )
            fee_collected_month = r["total"] if r else 0
        library_out = count("portal_library_transaction", "WHERE return_date IS NULL")
        recent_admissions = list(
            AdmissionEnquiry.objects.order_by("-submitted_at").values(
                "registration_number", "applicant_name", "target_class", "status", "submitted_at"
            )[:8]
        )
        return Response(serialise({
            "pending_admissions": pending_admissions,
            "total_students": total_students,
            "total_teachers": total_teachers,
            "total_parents": total_parents,
            "total_employees": total_employees,
            "open_leaves": open_leaves,
            "fee_collected_this_month": fee_collected_month,
            "library_books_out": library_out,
            "recent_admissions": recent_admissions,
        }))


# ---------------------------------------------------------------------------
# Admissions workflow (Registered -> Verification -> Screening -> Fee_Pending
# -> Confirmed/Rejected), including credential generation on Confirmed.
# ---------------------------------------------------------------------------
NEXT_STATUS = {
    "Enquiry": "Registered",
    "Registered": "Counselling_Pending",
    "Counselling_Pending": "Counselling_Done",
    "Counselling_Done": "Verification",
    "Verification": "Eligibility_Check",
    "Eligibility_Check": "Screening",
    "Screening": "Interview_Pending",
    "Interview_Pending": "Interview_Done",
    "Interview_Done": "Seat_Available",
    "Seat_Available": "Fee_Pending",
    "Seat_Waitlisted": "Fee_Pending",
    "Fee_Pending": "Approved",
    "Approved": "Confirmed",
}


def _unique_username(base):
    base = (base or "user").lower().replace(" ", ".")
    candidate = base
    i = 1
    while User.objects.filter(username=candidate).exists():
        i += 1
        candidate = f"{base}{i}"
    return candidate


def _ensure_group(name):
    grp, _ = Group.objects.get_or_create(name=name)
    return grp


def _generate_credentials(enquiry):
    """Creates a Parent account (if needed) + Student account for a Confirmed
    admission enquiry, and links both back onto portal_* tables. Idempotent:
    if the enquiry already has student_user_id/parent_user_id set, does
    nothing and returns the existing accounts."""
    if enquiry.student_user_id:
        student = User.objects.filter(id=enquiry.student_user_id).first()
        parent = User.objects.filter(id=enquiry.parent_user_id).first() if enquiry.parent_user_id else None
        return student, parent, None

    temp_password = get_random_string(10)
    parent_temp_password = get_random_string(10)

    with transaction.atomic():
        parent = User.objects.filter(email__iexact=enquiry.parent_email).first()
        parent_is_new = parent is None
        if parent is None:
            parent = User.objects.create_user(
                username=_unique_username(enquiry.parent_email.split("@")[0]),
                email=enquiry.parent_email,
                password=parent_temp_password,
                first_name=enquiry.parent_name.split(" ")[0] if enquiry.parent_name else "",
                last_name=" ".join(enquiry.parent_name.split(" ")[1:]) if enquiry.parent_name else "",
            )
            _ensure_group("Parent")
            parent.groups.add(Group.objects.get(name="Parent"))

        student_username = _unique_username(f"{enquiry.applicant_name}.{enquiry.registration_number[-4:]}")
        student = User.objects.create_user(
            username=student_username,
            email=f"{student_username}@students.edunova.edu",
            password=temp_password,
            first_name=enquiry.applicant_name.split(" ")[0] if enquiry.applicant_name else "",
            last_name=" ".join(enquiry.applicant_name.split(" ")[1:]) if enquiry.applicant_name else "",
        )
        _ensure_group("Student")
        student.groups.add(Group.objects.get(name="Student"))

        with connection.cursor() as cursor:
            if table_exists("portal_user_profile"):
                cursor.execute(
                    "INSERT INTO portal_user_profile (user_id, user_type) VALUES (%s,'Parent') "
                    "ON CONFLICT (user_id) DO NOTHING",
                    [parent.id],
                )
                cursor.execute(
                    "INSERT INTO portal_user_profile (user_id, user_type) VALUES (%s,'Student') "
                    "ON CONFLICT (user_id) DO NOTHING",
                    [student.id],
                )
            if table_exists("portal_parent_profile"):
                parent_code = f"PRN-{parent.id:04d}-{get_random_string(4).upper()}"
                cursor.execute(
                    "INSERT INTO portal_parent_profile (user_id, parent_code, address) VALUES (%s,%s,%s) "
                    "ON CONFLICT (user_id) DO NOTHING",
                    [parent.id, parent_code, enquiry.address],
                )
            if table_exists("portal_student_profile"):
                admission_number = f"STU-{enquiry.registration_number[-8:]}"
                cursor.execute(
                    "INSERT INTO portal_student_profile (user_id, parent_id, admission_number, date_of_birth, gender) "
                    "VALUES (%s,%s,%s,%s,%s) ON CONFLICT (user_id) DO NOTHING",
                    [student.id, parent.id, admission_number, enquiry.date_of_birth, enquiry.gender],
                )

        enquiry.student_user_id = student.id
        enquiry.parent_user_id = parent.id
        enquiry.save(update_fields=["student_user_id", "parent_user_id"])

    credentials = {
        "student_username": student.username,
        "student_temp_password": temp_password,
        "parent_username": parent.username,
        "parent_temp_password": parent_temp_password if parent_is_new else None,
        "parent_account_reused": not parent_is_new,
    }
    return student, parent, credentials


class AdmissionListView(AdminMixin, APIView):
    @extend_schema(
        operation_id="AdminAdmissionList",
        summary="List admission applications",
        description="Returns admission applications, optionally filtered by status. Ordered by most recent submission.",
        tags=["Admissions"],
        parameters=[
            OpenApiParameter(
                name="status",
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                required=False,
                description="Filter by application status (e.g. Registered, Verification, Screening, Fee_Pending, Confirmed, Rejected).",
            ),
        ],
        responses={200: serializers.ListSerializer(child=_AdmissionListItem), **ERROR_RESPONSES},
    )
    def get(self, request):
        qs = AdmissionEnquiry.objects.all().order_by("-submitted_at")
        status_filter = request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        data = list(qs.values(
            "registration_number", "applicant_name", "date_of_birth", "gender", "target_class",
            "parent_name", "parent_phone", "parent_email", "scholarship_applied", "status",
            "rejection_reason", "submitted_at",
        ))
        return Response(serialise(data))

    @extend_schema(
        operation_id="AdminAdmissionCreate",
        summary="Register a manual admission application",
        description="Creates a new admission application in the 'Registered' status with an auto-generated registration number.",
        tags=["Admissions"],
        request=_AdmissionCreateRequest,
        responses={
            201: _AdmissionCreateResponse,
            400: ValidationErrorSerializer,
            **ERROR_RESPONSES,
        },
    )
    def post(self, request):
        d = request.data
        from django.utils.crypto import get_random_string
        reg_num = f"REG-{get_random_string(8).upper()}"
        
        # Ensure model is imported locally
        from apps.admissions.models import AdmissionEnquiry

        enquiry = AdmissionEnquiry.objects.create(
            registration_number=reg_num,
            applicant_name=d.get("applicant_name"),
            date_of_birth=d.get("date_of_birth"),
            gender=d.get("gender", "Male"),
            target_class=d.get("target_class"),
            parent_name=d.get("parent_name"),
            parent_phone=d.get("parent_phone"),
            parent_email=d.get("parent_email"),
            address=d.get("address", ""),
            scholarship_applied=d.get("scholarship_applied", False),
            status="Registered"
        )
        return Response({"detail": "Admission application manually registered.", "registration_number": reg_num})


class AdmissionActionView(AdminMixin, APIView):
    """POST { action: 'advance' | 'reject' | 'confirm', reason? } to move an
    application through Verification -> Screening -> Fee_Pending -> Confirmed,
    or reject it at any stage. 'confirm' also generates student+parent logins."""

    @extend_schema(
        operation_id="AdminAdmissionAction",
        summary="Advance or reject an admission application",
        description="Moves an application through the verification workflow ('advance') or rejects it ('reject'). Advancing a Fee_Pending application to Confirmed also generates student and parent login credentials.",
        tags=["Admissions"],
        parameters=[
            OpenApiParameter(
                name="registration_number",
                type=OpenApiTypes.STR,
                location=OpenApiParameter.PATH,
                required=True,
                description="Admission registration number.",
            ),
        ],
        request=_AdmissionActionRequest,
        examples=[_ADMISSION_ACTION_BODY_EXAMPLE],
        responses={
            200: _AdmissionActionResponse,
            400: ValidationErrorSerializer,
            **ERROR_RESPONSES,
        },
    )
    def post(self, request, registration_number):
        try:
            enquiry = AdmissionEnquiry.objects.get(registration_number=registration_number)
        except AdmissionEnquiry.DoesNotExist:
            return Response({"detail": "Application not found."}, status=404)

        action = request.data.get("action")
        if action == "reject":
            enquiry.status = "Rejected"
            enquiry.rejection_reason = request.data.get("reason", "")
            enquiry.reviewed_by = request.user.get_full_name() or request.user.username
            enquiry.save()
            log_action(request.user, "admission.reject", "admission", registration_number, {"reason": enquiry.rejection_reason})
            return Response(serialise({"status": enquiry.status}))

        if action == "advance":
            nxt = NEXT_STATUS.get(enquiry.status)
            if not nxt:
                return Response({"detail": f"Cannot advance from status '{enquiry.status}'."}, status=400)
            enquiry.status = nxt
            enquiry.reviewed_by = request.user.get_full_name() or request.user.username
            enquiry.save()
            log_action(request.user, "admission.advance", "admission", registration_number, {"to": nxt})
            payload = {"status": enquiry.status}
            if nxt == "Confirmed":
                student, parent, credentials = _generate_credentials(enquiry)
                if credentials:
                    payload["credentials"] = credentials
                    log_action(request.user, "admission.credentials_generated", "admission", registration_number,
                               {"student_username": credentials["student_username"]})
            return Response(serialise(payload))

        return Response({"detail": "Unknown action. Use 'advance' or 'reject'."}, status=400)


# ---------------------------------------------------------------------------
# Admissions workflow — full 12-phase pipeline (frontend Admissions.jsx)
# ---------------------------------------------------------------------------
DOC_FIELDS = [
    "doc_birth_certificate",
    "doc_aadhaar_card",
    "doc_passport_photo",
    "doc_parent_id",
    "doc_address_proof",
    "doc_previous_marks",
    "doc_transfer_certificate",
]


def _admission_list_payload(e):
    return {
        "registration_number": e.registration_number,
        "applicant_name": e.applicant_name,
        "date_of_birth": serialise(e.date_of_birth),
        "gender": e.gender,
        "target_class": e.target_class,
        "curriculum": e.curriculum or "CBSE",
        "parent_name": e.parent_name,
        "parent_phone": e.parent_phone,
        "parent_email": e.parent_email,
        "preferred_branch": e.preferred_branch,
        "source_of_enquiry": e.source_of_enquiry,
        "scholarship_applied": e.scholarship_applied,
        "status": e.status,
        "counselling_status": e.counselling_status or "",
        "is_eligible": e.is_eligible,
        "interview_required": e.interview_required,
        "interview_result": e.interview_result or "",
        "seat_allocated": e.seat_allocated,
        "allocated_class": e.allocated_class,
        "allocated_section": e.allocated_section,
        "is_waitlisted": e.is_waitlisted,
        "fee_paid": e.fee_paid,
        "rejection_reason": e.rejection_reason,
        "submitted_at": serialise(e.submitted_at),
    }


def _admission_detail_payload(e):
    payload = _admission_list_payload(e)
    payload.update({
        "father_name": e.father_name,
        "father_phone": e.father_phone,
        "father_email": e.father_email,
        "mother_name": e.mother_name,
        "mother_phone": e.mother_phone,
        "address": e.address,
        "city": e.city,
        "state": e.state,
        "pincode": e.pincode,
        "has_medical_conditions": e.has_medical_conditions,
        "medical_details": e.medical_details,
        "blood_group": e.blood_group,
        "prev_school_name": e.prev_school_name,
        "prev_school_grade": e.prev_school_grade,
        "percentage": e.percentage,
        "interview_date": serialise(e.interview_date),
        "waitlist_position": e.waitlist_position,
        "fee": {
            "total_amount": float(e.fee_amount or 0),
            "scholarship_discount": float(e.scholarship_discount or 0),
            "net_amount": float(e.net_fee or 0),
        } if (e.fee_amount or e.net_fee or e.scholarship_discount) else None,
        "allocation": {
            "class_id": e.allocated_class,
            "section": e.allocated_section,
            "house": e.house,
            "roll_number": e.student_roll_number,
        } if (e.allocated_class or e.allocated_section or e.student_roll_number) else None,
        "module_allocations": e.module_allocations or [],
    })
    for field in DOC_FIELDS:
        f = getattr(e, field, None)
        if not f:
            payload[field] = None
            continue
        # URL references (enquiries submitted with an http(s) URL as the
        # document) are stored verbatim and must not be re-prefixed with
        # MEDIA_URL by the FileField machinery.
        name = getattr(f, "name", None) or str(f)
        if name.startswith(("http://", "https://")):
            payload[field] = name
        else:
            payload[field] = f.url
    return payload


def _add_notification(title, message, sender_id=None, recipient_type="All"):
    """Insert an admission workflow notification into portal_notification."""
    if not table_exists("portal_notification"):
        return
    with connection.cursor() as cursor:
        cursor.execute(
            "INSERT INTO portal_notification (sender_id, recipient_type, title, message) "
            "VALUES (%s, %s, %s, %s)",
            [sender_id, recipient_type, title, message],
        )


class AdmissionEnquiriesView(AdminMixin, APIView):
    """GET  /admin-portal/admissions/enquiries/  (list with search+status filters)
    POST /admin-portal/admissions/enquiries/  (manual registration form)"""

    @extend_schema(
        operation_id="AdminAdmissionEnquiriesList",
        summary="List admission enquiries",
        description="Returns admission applications with optional status and search (name/email/reg no) filters.",
        tags=["Admissions"],
        parameters=[
            OpenApiParameter("status", type=OpenApiTypes.STR, location=OpenApiParameter.QUERY, required=False),
            OpenApiParameter("search", type=OpenApiTypes.STR, location=OpenApiParameter.QUERY, required=False),
        ],
        responses={200: serializers.ListSerializer(child=serializers.JSONField()), **ERROR_RESPONSES},
    )
    def get(self, request):
        qs = AdmissionEnquiry.objects.all().order_by("-submitted_at")
        status_filter = request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        search = request.query_params.get("search", "").strip()
        if search:
            qs = qs.filter(
                models.Q(applicant_name__icontains=search)
                | models.Q(parent_email__icontains=search)
                | models.Q(registration_number__icontains=search)
            )
        return Response(serialise([_admission_list_payload(e) for e in qs[:200]]))

    @extend_schema(
        operation_id="AdminAdmissionEnquiryCreate",
        summary="Register a manual admission enquiry",
        description="Creates an admission enquiry from the admin 'Register Admission' form (father_* fields are mapped to parent_*).",
        tags=["Admissions"],
        request=OpenApiTypes.OBJECT,
        responses={201: OpenApiTypes.OBJECT, **ERROR_RESPONSES},
    )
    def post(self, request):
        d = request.data
        applicant_name = (d.get("applicant_name") or "").strip()
        if not applicant_name:
            return Response({"detail": "Applicant name is required."}, status=400)
        dob = d.get("date_of_birth")
        if not dob:
            return Response({"detail": "Date of birth is required."}, status=400)

        # Manual form sends father_* fields; model requires parent_*.
        parent_name = d.get("parent_name") or d.get("father_name") or applicant_name
        parent_phone = d.get("parent_phone") or d.get("father_phone") or ""
        parent_email = d.get("parent_email") or d.get("father_email") or ""
        if not parent_phone:
            return Response({"detail": "Parent phone is required."}, status=400)
        if not parent_email:
            return Response({"detail": "Parent email is required."}, status=400)

        enquiry = AdmissionEnquiry.objects.create(
            registration_number=generate_registration_number(),
            applicant_name=applicant_name,
            date_of_birth=dob,
            gender=d.get("gender", "Male"),
            target_class=d.get("target_class", "Class 1"),
            parent_name=parent_name,
            parent_phone=parent_phone,
            parent_email=parent_email,
            father_name=d.get("father_name", ""),
            father_phone=d.get("father_phone", ""),
            father_email=d.get("father_email", ""),
            address=d.get("address", ""),
            source_of_enquiry=d.get("source_of_enquiry", "Walk-in"),
            preferred_branch=d.get("preferred_branch", ""),
            curriculum=d.get("curriculum", "CBSE"),
            scholarship_applied=bool(d.get("scholarship_applied", False)),
            status="Registered",
            reviewed_by=request.user.get_full_name() or request.user.username,
        )
        log_action(request.user, "admission.manual_register", "admission", enquiry.registration_number)
        return Response(serialise({
            "detail": "Admission registered successfully.",
            "registration_number": enquiry.registration_number,
        }), status=201)


class AdmissionApplicationDetailView(AdminMixin, APIView):
    """GET /admin-portal/admissions/<reg>/application/"""

    @extend_schema(
        operation_id="AdminAdmissionApplicationDetail",
        summary="Admission application detail",
        description="Full application record with workflow state, documents, fee and allocation.",
        tags=["Admissions"],
        responses={200: OpenApiTypes.OBJECT, **ERROR_RESPONSES},
    )
    def get(self, request, registration_number):
        try:
            enquiry = AdmissionEnquiry.objects.get(registration_number=registration_number)
        except AdmissionEnquiry.DoesNotExist:
            return Response({"detail": "Application not found."}, status=404)
        return Response(serialise(_admission_detail_payload(enquiry)))


class AdmissionEligibilityView(AdminMixin, APIView):
    """POST /admin-portal/admissions/<reg>/eligibility/ — runs the eligibility check."""

    @extend_schema(
        operation_id="AdminAdmissionEligibilityCheck",
        summary="Run admission eligibility check",
        description="Evaluates age, academics and documents against the target class and flags duplicates.",
        tags=["Admissions"],
        responses={200: OpenApiTypes.OBJECT, **ERROR_RESPONSES},
    )
    def post(self, request, registration_number):
        try:
            enquiry = AdmissionEnquiry.objects.get(registration_number=registration_number)
        except AdmissionEnquiry.DoesNotExist:
            return Response({"detail": "Application not found."}, status=404)

        # Age check vs. typical age for target class (Class N -> age N+5).
        # Advisory: an out-of-range age is surfaced as a warning for the admin
        # to review — it does not hard-block eligibility (schools may admit
        # with discretion; the final decision lives in the Decision panel).
        import re as _re
        m = _re.search(r"(\d+)", enquiry.target_class or "")
        expected_age = (int(m.group(1)) + 5) if m else 6
        age = None
        age_reason = "Date of birth not provided."
        if enquiry.date_of_birth:
            age = (date.today() - enquiry.date_of_birth).days / 365.25
            if abs(age - expected_age) <= 3.5:
                age_reason = f"Age {age:.1f} years is within range for {enquiry.target_class} (typical {expected_age})."
            else:
                age_reason = f"Age {age:.1f} years is outside the typical range for {enquiry.target_class} (expected ~{expected_age})."
        age_eligible = age is not None and abs(age - expected_age) <= 3.5

        # Academic check: percentage present and reasonable, or previous school
        # recorded. Advisory: a missing record (fresh applicant, or not yet
        # entered) is a warning, not a hard failure — it is assessed at interview.
        academic_reason = "No previous academic record provided (will be assessed at interview)."
        academic_eligible = True
        try:
            pct = float(enquiry.percentage) if enquiry.percentage else None
        except (TypeError, ValueError):
            pct = None
        if pct is not None and 0 <= pct <= 100:
            academic_eligible = pct >= 35
            academic_reason = f"Previous percentage {pct}% recorded." if academic_eligible else f"Previous percentage {pct}% is below the 35% minimum."
        elif enquiry.prev_school_name:
            academic_eligible = True
            academic_reason = f"Previous school {enquiry.prev_school_name} recorded."

        # Documents check. Advisory: only the core identity documents are
        # expected at eligibility time; the rest are collected later in the
        # Documents phase, so missing optional docs are warnings, not blockers.
        CORE_DOC_FIELDS = ["doc_birth_certificate", "doc_aadhaar_card", "doc_passport_photo"]
        missing_core = [f for f in CORE_DOC_FIELDS if not getattr(enquiry, f, None)]
        documents_eligible = len(missing_core) == 0
        optional_missing = [f for f in DOC_FIELDS if f not in CORE_DOC_FIELDS and not getattr(enquiry, f, None)]
        if documents_eligible:
            documents_reason = "Core documents uploaded."
            if optional_missing:
                documents_reason += f" Optional docs pending: {', '.join(optional_missing)}."
        else:
            documents_reason = f"Missing core docs: {', '.join(missing_core)}."

        # Duplicate check on parent phone/email across active applications —
        # the only hard blocker at the eligibility stage.
        duplicate = AdmissionEnquiry.objects.exclude(pk=enquiry.pk).filter(
            models.Q(parent_phone=enquiry.parent_phone) | models.Q(parent_email__iexact=enquiry.parent_email)
        ).exclude(status__in=["Rejected", "Withdrawn"]).exists()

        overall = not duplicate
        enquiry.is_eligible = overall
        enquiry.eligibility_notes = f"{age_reason} {academic_reason} {documents_reason}"
        enquiry.status = "Eligibility_Check"
        enquiry.save(update_fields=["is_eligible", "eligibility_notes", "status"])
        log_action(request.user, "admission.eligibility", "admission", registration_number, {"eligible": overall})
        return Response({
            "age_eligible": age_eligible,
            "age_reason": age_reason,
            "academic_eligible": academic_eligible,
            "academic_reason": academic_reason,
            "documents_eligible": documents_eligible,
            "documents_reason": documents_reason,
            "duplicate_check": duplicate,
            "overall_eligible": overall,
        })


class AdmissionWorkflowActionView(AdminMixin, APIView):
    """POST /admin-portal/admissions/<reg>/<panel>/ for counselling, interview,
    seat, decision, fee, confirm, allocation and modules panels."""

    @extend_schema(
        operation_id="AdminAdmissionPanelAction",
        summary="Admission workflow panel action",
        description="Executes a workflow action for a panel (counselling, interview, seat, decision, fee, confirm, allocation, modules).",
        tags=["Admissions"],
        request=OpenApiTypes.OBJECT,
        responses={200: OpenApiTypes.OBJECT, **ERROR_RESPONSES},
    )
    def post(self, request, registration_number, panel):
        try:
            enquiry = AdmissionEnquiry.objects.get(registration_number=registration_number)
        except AdmissionEnquiry.DoesNotExist:
            return Response({"detail": "Application not found."}, status=404)

        d = request.data
        if panel == "counselling":
            action = d.get("action")
            if action == "assign_counsellor":
                enquiry.counsellor_id = d.get("counsellor_id") or enquiry.counsellor_id
                enquiry.counselling_status = "Assigned"
                enquiry.status = "Counselling_Pending"
                enquiry.save()
                _add_notification("Counselling assigned", f"A counsellor has been assigned for {enquiry.applicant_name}.", request.user.id)
            elif action == "complete_counselling":
                enquiry.counselling_status = "Completed"
                enquiry.counselling_notes = d.get("notes", enquiry.counselling_notes)
                enquiry.counselling_date = date.today()
                enquiry.status = "Counselling_Done"
                enquiry.save()
                _add_notification("Counselling completed", f"Counselling completed for {enquiry.applicant_name}.", request.user.id)
            else:
                return Response({"detail": "Unknown counselling action."}, status=400)
            log_action(request.user, "admission.counselling", "admission", registration_number, {"action": action})
            return Response(serialise(_admission_detail_payload(enquiry)))

        if panel == "interview":
            action = d.get("action")
            if action == "schedule":
                raw = d.get("interview_date")
                parsed = parse_datetime(raw) if raw else None
                if raw and not parsed:
                    return Response({"detail": "Invalid interview_date format."}, status=400)
                enquiry.interview_date = parsed
                enquiry.interview_required = True
                enquiry.interview_scheduled = True
                enquiry.interview_result = "Scheduled"
                enquiry.status = "Interview_Pending"
                enquiry.save()
                _add_notification("Interview scheduled", f"Interview scheduled for {enquiry.applicant_name}.", request.user.id)
            elif action == "complete":
                enquiry.interview_result = d.get("recommendation", "Recommended")
                enquiry.status = "Interview_Done"
                enquiry.save()
                _add_notification("Interview completed", f"Interview completed with result: {enquiry.interview_result}.", request.user.id)
            else:
                return Response({"detail": "Unknown interview action."}, status=400)
            log_action(request.user, "admission.interview", "admission", registration_number, {"action": action})
            return Response(serialise(_admission_detail_payload(enquiry)))

        if panel == "seat":
            action = d.get("action")
            if action == "allocate":
                enquiry.seat_allocated = True
                enquiry.is_waitlisted = False
                enquiry.allocated_class = enquiry.target_class
                enquiry.allocated_section = d.get("section", "A")
                enquiry.status = "Seat_Available"
                enquiry.save()
                _add_notification("Seat allocated", f"Seat allocated to {enquiry.applicant_name} in {enquiry.allocated_class}-{enquiry.allocated_section}.", request.user.id)
            elif action == "waitlist":
                enquiry.is_waitlisted = True
                enquiry.seat_allocated = False
                enquiry.waitlist_position = (enquiry.waitlist_position or 0) + 1
                enquiry.status = "Seat_Waitlisted"
                enquiry.save()
                _add_notification("Waitlisted", f"{enquiry.applicant_name} added to the waitlist.", request.user.id)
            else:
                return Response({"detail": "Unknown seat action."}, status=400)
            log_action(request.user, "admission.seat", "admission", registration_number, {"action": action})
            return Response(serialise(_admission_detail_payload(enquiry)))

        if panel == "decision":
            action = d.get("action")
            if action != "approve":
                return Response({"detail": "Unknown decision action."}, status=400)
            try:
                enquiry.fee_amount = float(d.get("fee_amount") or 0)
                enquiry.scholarship_discount = float(d.get("scholarship_discount") or 0)
            except (TypeError, ValueError):
                return Response({"detail": "Invalid fee amount."}, status=400)
            enquiry.net_fee = enquiry.fee_amount - enquiry.scholarship_discount
            enquiry.status = "Approved"
            enquiry.save()
            _add_notification("Admission approved", f"Admission approved for {enquiry.applicant_name}. Invoice generated for ₹{enquiry.net_fee}.", request.user.id)
            log_action(request.user, "admission.approve", "admission", registration_number, {"fee": float(enquiry.fee_amount)})
            return Response(serialise(_admission_detail_payload(enquiry)))

        if panel == "fee":
            action = d.get("action")
            if action != "pay":
                return Response({"detail": "Unknown fee action."}, status=400)
            enquiry.fee_paid = True
            enquiry.fee_transaction_id = d.get("transaction_id", "") or get_random_string(12).upper()
            enquiry.save()
            _add_notification("Payment recorded", f"Fee payment of ₹{enquiry.net_fee} recorded for {enquiry.applicant_name}.", request.user.id)
            log_action(request.user, "admission.fee_paid", "admission", registration_number)
            return Response(serialise(_admission_detail_payload(enquiry)))

        if panel == "confirm":
            if enquiry.status not in ("Approved", "Fee_Pending", "Confirmed"):
                return Response({"detail": f"Cannot confirm from status '{enquiry.status}'."}, status=400)
            enquiry.status = "Confirmed"
            enquiry.save()
            student, parent, credentials = _generate_credentials(enquiry)
            _add_notification("Admission confirmed", f"Admission confirmed for {enquiry.applicant_name}. Login credentials generated.", request.user.id)
            log_action(request.user, "admission.confirm", "admission", registration_number)
            payload = {"status": enquiry.status, "credentials": credentials}
            return Response(serialise(payload))

        if panel == "allocation":
            enquiry.allocated_class = d.get("class_id", enquiry.allocated_class) or enquiry.target_class
            enquiry.allocated_section = d.get("section", enquiry.allocated_section or "A")
            enquiry.house = d.get("house", enquiry.house)
            enquiry.student_roll_number = d.get("roll_number", enquiry.student_roll_number)
            enquiry.save()
            log_action(request.user, "admission.allocation", "admission", registration_number)
            return Response(serialise(_admission_detail_payload(enquiry)))

        if panel == "modules":
            module_type = d.get("module_type")
            if module_type not in ("Transport", "Hostel", "Library", "LMS"):
                return Response({"detail": "Invalid module type."}, status=400)
            # Persist the module allocation (upsert by module_type) so the
            # Modules panel can show details per allocated module.
            allocation_data = d.get("allocation_data") or {}
            allocations = list(enquiry.module_allocations or [])
            allocations = [a for a in allocations if a.get("module_type") != module_type]
            allocations.append({
                "module_type": module_type,
                "allocation_data": allocation_data,
                "allocated_at": now().isoformat(),
            })
            enquiry.module_allocations = allocations
            enquiry.save(update_fields=["module_allocations"])
            _add_notification(f"{module_type} allocated", f"{module_type} module allocated for {enquiry.applicant_name}.", request.user.id)
            log_action(request.user, "admission.module_allocated", "admission", registration_number, {"module": module_type})
            return Response(serialise(_admission_detail_payload(enquiry)))

        return Response({"detail": f"Unknown panel '{panel}'."}, status=400)


class AdmissionNotificationsView(AdminMixin, APIView):
    """GET /admin-portal/admissions/<reg>/notifications/"""

    @extend_schema(
        operation_id="AdminAdmissionNotifications",
        summary="Admission workflow notifications",
        description="Lists workflow notifications for an application.",
        tags=["Admissions"],
        responses={200: serializers.ListSerializer(child=serializers.JSONField()), **ERROR_RESPONSES},
    )
    def get(self, request, registration_number):
        if not AdmissionEnquiry.objects.filter(registration_number=registration_number).exists():
            return Response({"detail": "Application not found."}, status=404)
        if not table_exists("portal_notification"):
            return Response([])
        rs = rows(
            "SELECT id, title, message, created_at FROM portal_notification "
            "WHERE title ILIKE %s OR message ILIKE %s ORDER BY id DESC LIMIT 50",
            [f"%{registration_number}%", f"%{registration_number}%"],
        )
        items = []
        for r in rs or []:
            items.append({
                "id": r["id"],
                "channel": "System",
                "title": r["title"],
                "message": r["message"],
                "is_sent": True,
                "created_at": serialise(r.get("created_at")),
            })
        # Fall back to most recent notifications when none match the reg number.
        if not items:
            rs = rows("SELECT id, title, message, created_at FROM portal_notification ORDER BY id DESC LIMIT 20")
            for r in rs or []:
                items.append({
                    "id": r["id"],
                    "channel": "System",
                    "title": r["title"],
                    "message": r["message"],
                    "is_sent": True,
                    "created_at": serialise(r.get("created_at")),
                })
        return Response(items)


class AdmissionReportsView(AdminMixin, APIView):
    """GET /admin-portal/admissions/reports/?type=overview"""

    @extend_schema(
        operation_id="AdminAdmissionReports",
        summary="Admission reports overview",
        description="Aggregate admission analytics: totals, status/source/gender/curriculum breakdowns and fee collected.",
        tags=["Admissions"],
        responses={200: OpenApiTypes.OBJECT, **ERROR_RESPONSES},
    )
    def get(self, request):
        qs = AdmissionEnquiry.objects.all()
        status_counts = {}
        source_counts = {}
        gender_counts = {}
        curriculum_counts = {}
        for e in qs:
            status_counts[e.status] = status_counts.get(e.status, 0) + 1
            src = e.source_of_enquiry or "Unknown"
            source_counts[src] = source_counts.get(src, 0) + 1
            g = e.gender or "Unknown"
            gender_counts[g] = gender_counts.get(g, 0) + 1
            c = e.curriculum or "CBSE"
            curriculum_counts[c] = curriculum_counts.get(c, 0) + 1
        fee_collected = sum(float(e.net_fee or 0) for e in qs.filter(fee_paid=True))
        return Response({
            "total_enquiries": qs.count(),
            "fee_collected": fee_collected,
            "status_counts": status_counts,
            "source_counts": source_counts,
            "gender_counts": gender_counts,
            "curriculum_counts": curriculum_counts,
        })


class AdmissionReportExportView(AdminMixin, APIView):
    """GET /admin-portal/admissions/report/ — CSV export of the pipeline."""

    @extend_schema(
        operation_id="AdminAdmissionReportExport",
        summary="Export admissions report (CSV)",
        description="Downloads all admission applications as a CSV file.",
        tags=["Admissions"],
        responses={200: OpenApiTypes.BINARY, **ERROR_RESPONSES},
    )
    def get(self, request):
        from django.http import HttpResponse

        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="admissions-report.csv"'
        import csv as _csv

        writer = _csv.writer(response)
        writer.writerow([
            "Registration Number", "Applicant", "Date of Birth", "Gender", "Target Class",
            "Curriculum", "Parent Name", "Parent Phone", "Parent Email", "Status",
            "Counselling", "Eligible", "Interview", "Seat", "Fee Paid", "Submitted At",
        ])
        for e in AdmissionEnquiry.objects.all().order_by("-submitted_at"):
            writer.writerow([
                e.registration_number, e.applicant_name, e.date_of_birth, e.gender, e.target_class,
                e.curriculum or "CBSE", e.parent_name, e.parent_phone, e.parent_email, e.status,
                e.counselling_status or "", "Yes" if e.is_eligible else "No",
                e.interview_result or ("Required" if e.interview_required else "Not Required"),
                f"{e.allocated_class}-{e.allocated_section}" if e.seat_allocated else ("Waitlisted" if e.is_waitlisted else "Not allocated"),
                "Yes" if e.fee_paid else "No",
                e.submitted_at.strftime("%Y-%m-%d %H:%M") if e.submitted_at else "",
            ])
        return response


# ---------------------------------------------------------------------------
# Users / RBAC
# ---------------------------------------------------------------------------
class UserListView(AdminMixin, APIView):
    @extend_schema(
        operation_id="AdminUserList",
        summary="List portal users",
        description="Returns all auth users with their resolved role, optionally filtered by role.",
        tags=["Admin Portal"],
        parameters=[
            OpenApiParameter(
                name="role",
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                required=False,
                description="Filter by role (Student, Teacher, Parent, Admin, Employee).",
            ),
        ],
        responses={200: serializers.ListSerializer(child=_UserItem), **ERROR_RESPONSES},
    )
    def get(self, request):
        from django.contrib.auth.models import User
        from .roles import get_role
        role_filter = request.query_params.get("role")
        
        users = User.objects.all().prefetch_related("groups").order_by("-date_joined")
        data = []
        for u in users:
            data.append({
                "id": u.id,
                "username": u.username,
                "email": u.email,
                "name": u.get_full_name() or u.username,
                "is_active": u.is_active,
                "date_joined": u.date_joined,
                "role": get_role(u)
            })

        if role_filter:
            data = [d for d in data if d["role"] == role_filter]
        return Response(serialise(data))

    @extend_schema(
        operation_id="AdminUserCreate",
        summary="Create a portal user",
        description="Creates a user of any role with a temporary password. For Student roles an optional linked parent account can be created, and class enrollment can be added.",
        tags=["Admin Portal"],
        request=_UserCreateRequest,
        responses={
            201: _UserCreateResponse,
            400: ValidationErrorSerializer,
            **ERROR_RESPONSES,
        },
    )
    def post(self, request):
        """Create a user of any role with a temporary password."""
        d = request.data
        role = d.get("role")
        if role not in ("Student", "Teacher", "Parent", "Admin", "Employee"):
            return Response({"detail": "role must be one of Student/Teacher/Parent/Admin/Employee."}, status=400)
        email = (d.get("email") or "").strip()
        if not email:
            return Response({"detail": "Email is required."}, status=400)
        try:
            validate_email(email)
        except ValidationError:
            return Response({"detail": "Enter a valid email address."}, status=400)
        if User.objects.filter(email__iexact=email).exists():
            return Response({"detail": "A user with this email already exists."}, status=400)
        temp_password = get_random_string(10)
        username = _unique_username(d.get("username") or email.split("@")[0])
        user = User.objects.create_user(
            username=username,
            email=email,
            password=temp_password,
            first_name=d.get("first_name", ""),
            last_name=d.get("last_name", ""),
            is_staff=(role == "Admin"),
        )
        _ensure_group(role)
        user.groups.add(Group.objects.get(name=role))
        if table_exists("portal_user_profile"):
            with connection.cursor() as cursor:
                cursor.execute(
                    "INSERT INTO portal_user_profile (user_id, user_type, phone_number) VALUES (%s,%s,%s) "
                    "ON CONFLICT (user_id) DO UPDATE SET user_type=EXCLUDED.user_type",
                    [user.id, role, d.get("phone_number", "")],
                )
        if role == "Student":
            parent_id = None
            parent_email = d.get("parent_email")
            if parent_email:
                parent_user = User.objects.filter(email__iexact=parent_email).first()
                if not parent_user:
                    parent_temp_password = get_random_string(10)
                    parent_name = d.get("parent_name") or "Parent"
                    p_first = parent_name.split(" ")[0]
                    p_last = " ".join(parent_name.split(" ")[1:]) if " " in parent_name else ""
                    parent_user = User.objects.create_user(
                        username=_unique_username(parent_email.split("@")[0]),
                        email=parent_email,
                        password=parent_temp_password,
                        first_name=p_first,
                        last_name=p_last,
                    )
                    _ensure_group("Parent")
                    parent_user.groups.add(Group.objects.get(name="Parent"))
                    
                    with connection.cursor() as cursor:
                        if table_exists("portal_user_profile"):
                            cursor.execute(
                                "INSERT INTO portal_user_profile (user_id, user_type, phone_number) VALUES (%s,'Parent',%s) "
                                "ON CONFLICT (user_id) DO NOTHING",
                                [parent_user.id, d.get("parent_phone", "")],
                            )
                        if table_exists("portal_parent_profile"):
                            parent_code = f"PRN-{parent_user.id:04d}-{get_random_string(4).upper()}"
                            cursor.execute(
                                "INSERT INTO portal_parent_profile (user_id, parent_code, father_name, emergency_contact) VALUES (%s,%s,%s,%s) "
                                "ON CONFLICT (user_id) DO NOTHING",
                                [parent_user.id, parent_code, parent_name, d.get("parent_phone", "")],
                            )
                parent_id = parent_user.id

            admission_number = f"ADM-{user.id:04d}-{get_random_string(4).upper()}"
            with connection.cursor() as cursor:
                cursor.execute(
                    "INSERT INTO portal_student_profile (user_id, parent_id, admission_number, date_of_birth, gender, status) "
                    "VALUES (%s,%s,%s,current_date,'Male','Active') "
                    "ON CONFLICT (user_id) DO UPDATE SET parent_id=EXCLUDED.parent_id",
                    [user.id, parent_id, admission_number]
                )
                if d.get("class_id"):
                    cursor.execute(
                        "INSERT INTO portal_student_enrollment (student_id, class_id, academic_year, roll_number) "
                        "VALUES (%s,%s,'2025-26',%s) "
                        "ON CONFLICT DO NOTHING",
                        [user.id, d.get("class_id"), d.get("roll_number") or 1]
                    )
        elif role == "Teacher":
            employee_code = f"TCH-{user.id:04d}-{get_random_string(4).upper()}"
            with connection.cursor() as cursor:
                cursor.execute(
                    "INSERT INTO portal_teacher_profile (user_id, employee_code, date_of_joining) "
                    "VALUES (%s,%s,current_date) "
                    "ON CONFLICT (user_id) DO NOTHING",
                    [user.id, employee_code]
                )
        elif role == "Parent":
            parent_code = f"PRN-{user.id:04d}-{get_random_string(4).upper()}"
            with connection.cursor() as cursor:
                cursor.execute(
                    "INSERT INTO portal_parent_profile (user_id, parent_code) "
                    "VALUES (%s,%s) "
                    "ON CONFLICT (user_id) DO NOTHING",
                    [user.id, parent_code]
                )
        log_action(request.user, f"Audit {role} Created", "user", user.id, {"role": role})
        return Response({"id": user.id, "username": user.username, "temp_password": temp_password, "role": role})


class _UserDetailRouteSchema(MultiRouteAutoSchema):
    OPERATION_IDS = {
        ("PATCH", ("admin-portal", "users", "{user_id}")): "AdminUserDetail",
        ("POST", ("admin-portal", "users", "{user_id}")): "AdminUserDetailAction",
        ("PATCH", ("admin-portal", "users", "{user_id}", "reset-password")): "AdminUserDetailViaResetPassword",
        ("POST", ("admin-portal", "users", "{user_id}", "reset-password")): "AdminUserResetPassword",
    }


class UserDetailView(AdminMixin, APIView):
    # Mounted on BOTH /users/{user_id}/ and /users/{user_id}/reset-password/,
    # so operation ids must be route-aware to stay unique (see OPERATION_IDS).
    schema = _UserDetailRouteSchema()

    @extend_schema(
        summary="Update a user's status or role",
        description="Toggles the account's active status and/or reassigns its role/group.",
        tags=["Admin Portal"],
        parameters=[
            OpenApiParameter(
                name="user_id",
                type=OpenApiTypes.INT,
                location=OpenApiParameter.PATH,
                required=True,
                description="Django auth user id.",
            ),
        ],
        request=_UserDetailPatchRequest,
        responses={
            200: DetailErrorSerializer,
            400: ValidationErrorSerializer,
            **ERROR_RESPONSES,
        },
    )
    def patch(self, request, user_id):
        try:
            target = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"detail": "User not found."}, status=404)
        
        role = "User"
        if target.groups.exists():
            role = target.groups.first().name

        if "is_active" in request.data:
            target.is_active = bool(request.data["is_active"])
            target.save(update_fields=["is_active"])
            log_action(request.user, f"Audit {role} Toggled", "user", user_id, {"is_active": target.is_active})
        if "role" in request.data:
            new_role = request.data["role"]
            if new_role not in ("Student", "Teacher", "Parent", "Admin", "Employee"):
                return Response({"detail": "Invalid role."}, status=400)
            target.groups.clear()
            target.groups.add(_ensure_group(new_role))
            if table_exists("portal_user_profile"):
                with connection.cursor() as cursor:
                    cursor.execute(
                        "INSERT INTO portal_user_profile (user_id, user_type) VALUES (%s,%s) "
                        "ON CONFLICT (user_id) DO UPDATE SET user_type=EXCLUDED.user_type",
                        [user_id, new_role],
                    )
            log_action(request.user, f"Audit {role} Role Changed", "user", user_id, {"role": new_role})
        return Response({"detail": "Updated."})

    @extend_schema(
        summary="Reset a user's password",
        description="Generates a temporary password for the user, updates it, and emails it via the reset-password service.",
        tags=["Admin Portal"],
        parameters=[
            OpenApiParameter(
                name="user_id",
                type=OpenApiTypes.INT,
                location=OpenApiParameter.PATH,
                required=True,
                description="Django auth user id.",
            ),
        ],
        request=None,
        responses={
            200: _UserResetPasswordResponse,
            **ERROR_RESPONSES,
        },
    )
    def post(self, request, user_id):
        """Admin-triggered password reset."""
        try:
            target = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"detail": "User not found."}, status=404)
        
        role = "User"
        if target.groups.exists():
            role = target.groups.first().name

        temp_password = get_random_string(10)
        target.set_password(temp_password)
        target.save(update_fields=["password"])
        log_action(request.user, f"Audit {role} Password Reset", "user", user_id, {})

        email_sent = True
        try:
            from .services.email_service import send_reset_password_email
            send_reset_password_email(target, temp_password)
        except Exception:
            import logging
            logger = logging.getLogger(__name__)
            logger.exception("Failed to send reset password email")
            email_sent = False

        if not email_sent:
            return Response({
                "detail": "Password reset, but unable to send email.",
                "temp_password": temp_password,
                "email_error": True
            })

        return Response({
            "detail": "Password reset. Email sent successfully.",
            "temp_password": temp_password
        })


class RolesView(AdminMixin, APIView):
    @extend_schema(
        operation_id="AdminRoles",
        summary="Role member counts",
        description="Returns the number of users in each supported role (Student, Teacher, Parent, Admin, Employee).",
        tags=["Admin Portal"],
        responses={200: _RolesResponse, **ERROR_RESPONSES},
    )
    def get(self, request):
        roles = ["Student", "Teacher", "Parent", "Admin", "Employee"]
        counts = {}
        for r in roles:
            grp = Group.objects.filter(name=r).first()
            counts[r] = grp.user_set.count() if grp else 0
        return Response(counts)


# ---------------------------------------------------------------------------
# Generic small CRUD helper for simple lookup-style portal_* tables
# ---------------------------------------------------------------------------
class SimpleTableView(AdminMixin, APIView):
    table = None
    columns = ()          # columns accepted on create, in order
    order_by = "id"
    int_columns = ()      # columns that must coerce to int (FKs, quantities)

    def get(self, request):
        if not table_exists(self.table):
            return Response([])
        return Response(serialise(rows(f"SELECT * FROM {self.table} ORDER BY {self.order_by}")))

    def post(self, request):
        if not table_exists(self.table):
            return Response({"detail": "Table not found. Apply the schema extension SQL first."}, status=400)
        if not isinstance(request.data, dict):
            return Response({"detail": "A JSON object body is required."}, status=400)
        cols, placeholders, values = [], [], []
        for c in self.columns:
            v = request.data.get(c)
            # Omitted/empty columns fall back to the column's DB DEFAULT (e.g.
            # subject.type defaults to 'Theory') instead of inserting NULL and
            # tripping a NOT NULL constraint.
            if v in (None, ""):
                cols.append(c)
                placeholders.append("DEFAULT")
                continue
            if c in self.int_columns:
                try:
                    v = int(v)
                except (TypeError, ValueError):
                    return Response({"detail": f"Field '{c}' must be an integer."}, status=400)
            cols.append(c)
            placeholders.append("%s")
            values.append(v)
        col_sql = ",".join(cols)
        placeholder_sql = ",".join(placeholders)
        try:
            with connection.cursor() as cursor:
                cursor.execute(f"INSERT INTO {self.table} ({col_sql}) VALUES ({placeholder_sql}) RETURNING id", values)
                new_id = cursor.fetchone()[0]
        except IntegrityError:
            return Response(
                {"detail": "Could not create the record: a referenced record is missing or a unique value already exists."},
                status=400,
            )
        log_action(request.user, f"{self.table}.create", self.table, new_id, dict(zip(self.columns, [str(v) for v in values])))
        return Response({"id": new_id, "detail": "Created."}, status=201)


@extend_schema_view(
    get=extend_schema(
        operation_id="AdminClassList",
        summary="List classes",
        description="Returns all class (grade/section) records from the portal.",
        tags=["Academic"],
        responses={200: serializers.ListSerializer(child=_ClassItem), **ERROR_RESPONSES},
    ),
    post=extend_schema(
        operation_id="AdminClassCreate",
        summary="Create a class",
        description="Creates a new class/grade record with an optional section, curriculum and room number.",
        tags=["Academic"],
        request=_ClassCreateRequest,
        examples=[_CLASS_CREATE_BODY_EXAMPLE],
        responses={200: IdDetailResponseSerializer, **ERROR_RESPONSES},
    ),
)
class ClassView(SimpleTableView):
    table = "portal_class"
    columns = ("name", "section", "curriculum", "room_number")
    order_by = "name, section"


@extend_schema_view(
    get=extend_schema(
        operation_id="AdminSubjectList",
        summary="List subjects",
        description="Returns all subject records from the portal.",
        tags=["Academic"],
        responses={200: serializers.ListSerializer(child=_SubjectItem), **ERROR_RESPONSES},
    ),
    post=extend_schema(
        operation_id="AdminSubjectCreate",
        summary="Create a subject",
        description="Creates a new subject record.",
        tags=["Academic"],
        request=_SubjectCreateRequest,
        responses={200: IdDetailResponseSerializer, **ERROR_RESPONSES},
    ),
)
class SubjectView(SimpleTableView):
    table = "portal_subject"
    columns = ("name", "subject_code", "type")
    order_by = "name"


@extend_schema_view(
    get=extend_schema(
        operation_id="AdminVehicleList",
        summary="List vehicles",
        description="Returns all transport vehicle records from the portal.",
        tags=["Transport"],
        responses={200: serializers.ListSerializer(child=_VehicleItem), **ERROR_RESPONSES},
    ),
    post=extend_schema(
        operation_id="AdminVehicleCreate",
        summary="Create a vehicle",
        description="Creates a new transport vehicle record.",
        tags=["Transport"],
        request=_VehicleCreateRequest,
        responses={200: IdDetailResponseSerializer, **ERROR_RESPONSES},
    ),
)
class VehicleView(SimpleTableView):
    table = "portal_vehicle"
    columns = ("vehicle_number", "capacity", "driver_id", "gps_device_id", "maintenance_status")
    order_by = "vehicle_number"
    int_columns = ("capacity", "driver_id", "gps_device_id")


@extend_schema_view(
    get=extend_schema(
        operation_id="AdminRouteList",
        summary="List transport routes",
        description="Returns all transport route records from the portal.",
        tags=["Transport"],
        responses={200: serializers.ListSerializer(child=_RouteItem), **ERROR_RESPONSES},
    ),
    post=extend_schema(
        operation_id="AdminRouteCreate",
        summary="Create a route",
        description="Creates a new transport route record.",
        tags=["Transport"],
        request=_RouteCreateRequest,
        responses={200: IdDetailResponseSerializer, **ERROR_RESPONSES},
    ),
)
class RouteView(SimpleTableView):
    table = "portal_route"
    columns = ("route_name", "start_point", "end_point")
    order_by = "route_name"


@extend_schema_view(
    get=extend_schema(
        operation_id="AdminTransportAllocation",
        summary="List transport allocations",
        description="Returns all student-to-vehicle/route allocations from the portal.",
        tags=["Transport"],
        responses={200: serializers.ListSerializer(child=_TransportAllocationItem), **ERROR_RESPONSES},
    ),
    post=extend_schema(
        operation_id="AdminTransportAllocationCreate",
        summary="Create a transport allocation",
        description="Assigns a student to a vehicle and route with an optional pickup point.",
        tags=["Transport"],
        request=_TransportAllocationCreateRequest,
        responses={200: IdDetailResponseSerializer, **ERROR_RESPONSES},
    ),
)
class TransportAllocationView(SimpleTableView):
    table = "portal_transport_allocation"
    columns = ("student_id", "vehicle_id", "route_id", "pickup_point")
    order_by = "id"
    int_columns = ("student_id", "vehicle_id", "route_id")


@extend_schema_view(
    get=extend_schema(
        operation_id="AdminFeeStructure",
        summary="List fee structures",
        description="Returns all fee structure records (per class and term) from the portal.",
        tags=["Finance"],
        responses={200: serializers.ListSerializer(child=_FeeStructureItem), **ERROR_RESPONSES},
    ),
    post=extend_schema(
        operation_id="AdminFeeStructureCreate",
        summary="Create a fee structure",
        description="Creates a fee structure for a class and term.",
        tags=["Finance"],
        request=_FeeStructureCreateRequest,
        responses={200: IdDetailResponseSerializer, **ERROR_RESPONSES},
    ),
)
class FeeStructureView(SimpleTableView):
    table = "portal_fee_structure"
    columns = ("class_id", "term_name", "tuition_fee", "transport_fee", "hostel_fee", "total_amount")
    order_by = "class_id"
    int_columns = ("class_id",)


class PaymentListView(AdminMixin, APIView):
    @extend_schema(
        operation_id="AdminPaymentList",
        summary="List payments",
        description="Returns up to the 200 most recent successful payment records joined with student and fee-term info.",
        tags=["Finance"],
        responses={200: serializers.ListSerializer(child=_PaymentItem), **ERROR_RESPONSES},
    )
    def get(self, request):
        if not table_exists("portal_payment"):
            return Response([])
        data = rows(
            """
            SELECT p.id, p.transaction_id, p.amount_paid, p.status, p.paid_at,
                   COALESCE(u.first_name || ' ' || u.last_name, u.username) AS student_name,
                   fs.term_name
            FROM portal_payment p
            JOIN auth_user u ON u.id = p.student_id
            JOIN portal_fee_structure fs ON fs.id = p.fee_structure_id
            ORDER BY p.paid_at DESC LIMIT 200
            """
        )
        return Response(serialise(data))


# ---------------------------------------------------------------------------
# Library — barcode lookup, issue/return with automatic fine calculation
# ---------------------------------------------------------------------------
FINE_PER_DAY = 5  # rupees/day late, beyond due_date


@extend_schema_view(
    post=extend_schema(
        operation_id="AdminLibraryBookCreate",
        summary="Create a library book",
        description="Adds a new book record with title, author, ISBN, barcode and inventory quantities.",
        tags=["Library"],
        request=_BookCreateRequest,
        responses={200: IdDetailResponseSerializer, **ERROR_RESPONSES},
    ),
)
class LibraryBookView(SimpleTableView):
    table = "portal_book"
    columns = ("title", "author", "isbn", "barcode_id", "quantity", "available_quantity", "book_type", "digital_file_url")
    order_by = "title"
    int_columns = ("quantity", "available_quantity")

    @extend_schema(
        operation_id="AdminLibraryBookList",
        summary="List or look up library books",
        description="Lists all books, or returns a single book when a barcode/isbn query parameter is supplied. A lookup that finds no match returns null; without the barcode parameter a list is returned.",
        tags=["Library"],
        parameters=[
            OpenApiParameter(
                name="barcode",
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                required=False,
                description="Barcode ID or ISBN to look up a single book.",
            ),
        ],
        responses={
            200: serializers.ListSerializer(child=_BookItem),
            **ERROR_RESPONSES,
        },
    )
    def get(self, request):
        barcode = request.query_params.get("barcode")
        if barcode:
            if not table_exists("portal_book"):
                return Response(None)
            book = row("SELECT * FROM portal_book WHERE barcode_id=%s OR isbn=%s", [barcode, barcode])
            return Response(serialise(book))
        return super().get(request)


class LibraryIssueView(AdminMixin, APIView):
    @extend_schema(
        operation_id="AdminLibraryIssue",
        summary="Issue a book",
        description="Issues an available book to a borrower and decrements its available quantity, computing the due date from the loan period.",
        tags=["Library"],
        request=_LibraryIssueRequest,
        examples=[_LIBRARY_ISSUE_EXAMPLE],
        responses={
            201: _LibraryIssueResponse,
            400: ValidationErrorSerializer,
            **ERROR_RESPONSES,
        },
    )
    def post(self, request):
        if not table_exists("portal_library_transaction"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        book_id = request.data.get("book_id")
        borrower_id = request.data.get("borrower_id")
        try:
            days = int(request.data.get("loan_days", 14))
        except (TypeError, ValueError):
            return Response({"detail": "loan_days must be a positive integer."}, status=400)
        if days < 1:
            return Response({"detail": "loan_days must be a positive integer."}, status=400)
        book = row("SELECT available_quantity FROM portal_book WHERE id=%s", [book_id])
        if not book or book["available_quantity"] < 1:
            return Response({"detail": "No copies available."}, status=400)
        due = date.today() + timedelta(days=days)
        with transaction.atomic():
            with connection.cursor() as cursor:
                cursor.execute(
                    "INSERT INTO portal_library_transaction (book_id, borrower_id, due_date) VALUES (%s,%s,%s) RETURNING id",
                    [book_id, borrower_id, due],
                )
                tid = cursor.fetchone()[0]
                cursor.execute("UPDATE portal_book SET available_quantity = available_quantity - 1 WHERE id=%s", [book_id])
        log_action(request.user, "library.issue", "book", book_id, {"borrower_id": borrower_id, "due_date": str(due)})
        return Response({"id": tid, "due_date": due.isoformat(), "detail": "Book issued."}, status=201)


class LibraryReturnView(AdminMixin, APIView):
    @extend_schema(
        operation_id="AdminLibraryReturn",
        summary="Return a book",
        description="Processes the return of an issued book, automatically calculating any late fine and incrementing the book's available quantity.",
        tags=["Library"],
        parameters=[
            OpenApiParameter(
                name="transaction_id",
                type=OpenApiTypes.INT,
                location=OpenApiParameter.PATH,
                required=True,
                description="Library transaction id to return.",
            ),
        ],
        request=None,
        responses={
            200: _LibraryReturnResponse,
            400: ValidationErrorSerializer,
            **ERROR_RESPONSES,
        },
    )
    def post(self, request, transaction_id):
        if not table_exists("portal_library_transaction"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        txn = row("SELECT book_id, due_date, return_date FROM portal_library_transaction WHERE id=%s", [transaction_id])
        if not txn:
            return Response({"detail": "Transaction not found."}, status=404)
        if txn["return_date"]:
            return Response({"detail": "Already returned."}, status=400)
        today = date.today()
        late_days = max(0, (today - txn["due_date"]).days)
        fine = late_days * FINE_PER_DAY
        with transaction.atomic():
            with connection.cursor() as cursor:
                cursor.execute(
                    "UPDATE portal_library_transaction SET return_date=%s, fine_amount=%s WHERE id=%s",
                    [today, fine, transaction_id],
                )
                cursor.execute("UPDATE portal_book SET available_quantity = available_quantity + 1 WHERE id=%s", [txn["book_id"]])
        log_action(request.user, "library.return", "transaction", transaction_id, {"fine": fine})
        return Response({"detail": "Book returned.", "late_days": late_days, "fine_amount": fine})


# ---------------------------------------------------------------------------
# Notices (broadcast) — reuses portal_notification
# ---------------------------------------------------------------------------
class NoticeBroadcastView(AdminMixin, APIView):
    @extend_schema(
        operation_id="AdminNoticeBroadcast",
        summary="List or broadcast notices",
        description="GET returns the 100 most recent portal notifications; POST broadcasts a new notice to a recipient audience.",
        tags=["CMS"],
        responses={
            200: serializers.ListSerializer(child=_NoticeItem),
            **ERROR_RESPONSES,
        },
    )
    def get(self, request):
        if not table_exists("portal_notification"):
            return Response([])
        return Response(serialise(rows("SELECT * FROM portal_notification ORDER BY created_at DESC LIMIT 100")))

    @extend_schema(
        operation_id="AdminNoticeBroadcastCreate",
        summary="Broadcast a notice",
        description="Sends a notification/notice to all users or a specific class audience.",
        tags=["CMS"],
        request=_NoticeCreateRequest,
        examples=[_NOTICE_BROADCAST_EXAMPLE],
        responses={
            201: _NoticeCreateResponse,
            400: ValidationErrorSerializer,
            **ERROR_RESPONSES,
        },
    )
    def post(self, request):
        if not table_exists("portal_notification"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        d = request.data
        with connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO portal_notification (sender_id, recipient_type, target_class_id, title, message) "
                "VALUES (%s,%s,%s,%s,%s) RETURNING id",
                [request.user.id, d.get("recipient_type", "All"), d.get("target_class_id"), d.get("title"), d.get("message")],
            )
            nid = cursor.fetchone()[0]
        log_action(request.user, "notice.broadcast", "notification", nid, {"recipient_type": d.get("recipient_type", "All")})
        return Response({"id": nid, "detail": "Notice sent."}, status=201)


# ---------------------------------------------------------------------------
# Leave approvals (all staff/student leave requests, Admin can approve/reject)
# ---------------------------------------------------------------------------
class _LeaveApprovalRouteSchema(MultiRouteAutoSchema):
    OPERATION_IDS = {
        ("GET", ("admin-portal", "leaves")): "AdminLeaveApprovalList",
        ("POST", ("admin-portal", "leaves")): "AdminLeaveDecideCreate",
        ("GET", ("admin-portal", "leaves", "{leave_id}", "decide")): "AdminLeaveDecideRoute",
        ("POST", ("admin-portal", "leaves", "{leave_id}", "decide")): "AdminLeaveDecide",
    }


class LeaveApprovalListView(AdminMixin, APIView):
    # Mounted on BOTH /leaves/ and /leaves/{leave_id}/decide/, so operation ids
    # must be route-aware to stay unique (see OPERATION_IDS).
    schema = _LeaveApprovalRouteSchema()

    @extend_schema(
        summary="List leave requests",
        description="Returns pending (or status-filtered) leave requests from staff and students.",
        tags=["Admin Portal"],
        parameters=[
            OpenApiParameter(
                name="status",
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                required=False,
                description="Leave status filter (default 'Pending').",
            ),
        ],
        responses={200: serializers.ListSerializer(child=_LeaveItem), **ERROR_RESPONSES},
    )
    def get(self, request):
        if not table_exists("portal_leave"):
            return Response([])
        status_filter = request.query_params.get("status", "Pending")
        data = rows(
            """
            SELECT l.id, l.leave_type, l.start_date, l.end_date, l.reason, l.status,
                   COALESCE(u.first_name || ' ' || u.last_name, u.username) AS applicant_name
            FROM portal_leave l JOIN auth_user u ON u.id = l.user_id
            WHERE (%s = '' OR l.status = %s) ORDER BY l.start_date DESC
            """,
            [status_filter or "", status_filter or ""],
        )
        return Response(serialise(data))

    @extend_schema(
        summary="Approve or reject a leave request",
        description="Applies an Approved/Rejected decision to a specified leave request.",
        tags=["Admin Portal"],
        parameters=[
            OpenApiParameter(
                name="leave_id",
                type=OpenApiTypes.INT,
                location=OpenApiParameter.PATH,
                required=True,
                description="Leave request id to decide on.",
            ),
        ],
        request=_LeaveDecideRequest,
        examples=[_LEAVE_DECIDE_EXAMPLE],
        responses={
            200: _LeaveDecideResponse,
            400: ValidationErrorSerializer,
            **ERROR_RESPONSES,
        },
    )
    def post(self, request, leave_id):
        if not table_exists("portal_leave"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        decision = request.data.get("decision")
        if decision not in ("Approved", "Rejected"):
            return Response({"detail": "decision must be Approved or Rejected."}, status=400)
        with connection.cursor() as cursor:
            cursor.execute(
                "UPDATE portal_leave SET status=%s, approved_by=%s WHERE id=%s",
                [decision, request.user.id, leave_id],
            )
        log_action(request.user, "leave.decide", "leave", leave_id, {"decision": decision})
        return Response({"detail": f"Leave {decision.lower()}."})


# ---------------------------------------------------------------------------
# Reports / analytics (basic)
# ---------------------------------------------------------------------------
class ReportsView(AdminMixin, APIView):
    @extend_schema(
        operation_id="AdminReports",
        summary="School performance reports",
        description="Returns aggregate attendance by class, monthly fee collection and average subject marks.",
        tags=["Reports"],
        responses={200: _ReportsResponse, **ERROR_RESPONSES},
    )
    def get(self, request):
        report = {}
        if table_exists("portal_attendance"):
            report["attendance_by_class"] = rows(
                """
                SELECT c.name || '-' || c.section AS class_name,
                       ROUND(AVG(CASE WHEN a.status='Present' THEN 100 ELSE 0 END), 1) AS attendance_pct
                FROM portal_attendance a JOIN portal_class c ON c.id = a.class_id
                GROUP BY c.name, c.section ORDER BY c.name
                """
            )
        if table_exists("portal_payment"):
            report["fee_collection_by_month"] = rows(
                """
                SELECT to_char(paid_at, 'YYYY-MM') AS month, SUM(amount_paid)::float AS total
                FROM portal_payment WHERE status='Success'
                GROUP BY month ORDER BY month DESC LIMIT 12
                """
            )
        if table_exists("portal_result"):
            report["average_marks_by_subject"] = rows(
                """
                SELECT s.name AS subject_name, ROUND(AVG(r.marks_obtained), 1) AS average_marks
                FROM portal_result r
                JOIN portal_exam_schedule e ON e.id = r.exam_schedule_id
                JOIN portal_subject s ON s.id = e.subject_id
                GROUP BY s.name ORDER BY s.name
                """
            )
        return Response(serialise(report))


# ---------------------------------------------------------------------------
# Audit log (read-only view of every admin write above)
# ---------------------------------------------------------------------------
class AuditLogListView(AdminMixin, APIView):
    @extend_schema(
        operation_id="AdminAuditLogList",
        summary="List audit log entries",
        description="Returns the 300 most recent admin audit-log entries with actor names.",
        tags=["System"],
        responses={200: serializers.ListSerializer(child=_AuditLogItem), **ERROR_RESPONSES},
    )
    def get(self, request):
        if not table_exists("portal_audit_log"):
            return Response([])
        data = rows(
            """
            SELECT a.id, a.action, a.target_type, a.target_id, a.details, a.created_at,
                   COALESCE(u.first_name || ' ' || u.last_name, u.username, 'System') AS actor_name
            FROM portal_audit_log a LEFT JOIN auth_user u ON u.id = a.actor_id
            ORDER BY a.created_at DESC LIMIT 300
            """
        )
        return Response(serialise(data))


# ---------------------------------------------------------------------------
# Basic data export — a pragmatic stand-in for the "Backup" module. This is
# NOT a substitute for real automated, encrypted, offsite daily backups
# (see the security notes for that); it just lets an admin download a JSON
# snapshot of the operational tables on demand.
# ---------------------------------------------------------------------------
EXPORT_TABLES = [
    "portal_class", "portal_subject", "portal_student_profile", "portal_teacher_profile",
    "portal_parent_profile", "portal_employee", "portal_fee_structure", "portal_payment",
    "portal_book", "portal_library_transaction", "portal_vehicle", "portal_route",
    "portal_student_enrollment", "portal_exam_schedule", "portal_result", "portal_hall_ticket",
    "portal_hostel", "portal_room", "portal_hostel_allocation", "portal_inventory",
    "portal_visitor_log", "portal_alumni", "portal_medical_log",
    "portal_course", "portal_course_content", "portal_quiz", "portal_quiz_question",
    "portal_assignment", "portal_assignment_submission", "portal_forum_topic",
    "portal_forum_post", "portal_digital_note", "portal_course_progress",
    "portal_payroll_record", "portal_audit_log",
]


class BackupExportView(AdminMixin, APIView):
    @extend_schema(
        operation_id="AdminBackupExport",
        summary="Export operational backup snapshot",
        description="Returns a JSON snapshot of all existing portal tables plus the generated-at date.",
        tags=["System"],
        responses={200: _BackupExportResponse, **ERROR_RESPONSES},
    )
    def get(self, request):
        snapshot = {}
        for t in EXPORT_TABLES:
            if table_exists(t):
                snapshot[t] = rows(f"SELECT * FROM {t}")
        log_action(request.user, "backup.export", "database", "-", {"tables": list(snapshot.keys())})
        return Response(serialise({"generated_at": date.today().isoformat(), "tables": snapshot}))


class ClassEnrollmentView(AdminMixin, APIView):
    @extend_schema(
        operation_id="AdminClassEnrollment",
        summary="List student enrollments",
        description="Returns student-class enrollment records joined with student and class names.",
        tags=["Academic"],
        responses={200: serializers.ListSerializer(child=_EnrollmentListItem), **ERROR_RESPONSES},
    )
    def get(self, request):
        if not table_exists("portal_student_enrollment"):
            return Response([])
        data = rows(
            """
            SELECT se.id, se.student_id, u.username AS student_username,
                   COALESCE(u.first_name || ' ' || u.last_name, u.username) AS student_name,
                   se.class_id, c.name || '-' || c.section AS class_name,
                   se.academic_year, se.roll_number
            FROM portal_student_enrollment se
            JOIN auth_user u ON u.id = se.student_id
            JOIN portal_class c ON c.id = se.class_id
            ORDER BY class_name, se.roll_number
            """
        )
        return Response(serialise(data))

    @extend_schema(
        operation_id="AdminClassEnrollmentCreate",
        summary="Enroll a student in a class",
        description="Enrolls a student in a class for an academic year, preventing duplicate enrollments.",
        tags=["Academic"],
        request=_EnrollmentCreateRequest,
        responses={
            201: _EnrollmentCreateResponse,
            400: ValidationErrorSerializer,
            **ERROR_RESPONSES,
        },
    )
    def post(self, request):
        d = request.data
        student_id = d.get("student_id")
        class_id = d.get("class_id")
        roll_number = d.get("roll_number")
        academic_year = d.get("academic_year", "2025-26")

        if not student_id or not class_id:
            return Response({"detail": "student_id and class_id are required."}, status=400)
        if roll_number not in (None, ""):
            try:
                roll_number = int(roll_number)
            except (TypeError, ValueError):
                return Response({"detail": "roll_number must be an integer."}, status=400)

        try:
            with connection.cursor() as cursor:
                # Check if student is already enrolled in this class for the academic year
                cursor.execute(
                    "SELECT id FROM portal_student_enrollment WHERE student_id=%s AND class_id=%s AND academic_year=%s",
                    [student_id, class_id, academic_year]
                )
                if cursor.fetchone():
                    return Response({"detail": "Student already enrolled in this class for the selected academic year."}, status=400)

                cursor.execute(
                    "INSERT INTO portal_student_enrollment (student_id, class_id, academic_year, roll_number) "
                    "VALUES (%s,%s,%s,%s) RETURNING id",
                    [student_id, class_id, academic_year, roll_number]
                )
                new_id = cursor.fetchone()[0]
        except IntegrityError:
            return Response(
                {"detail": "Could not enroll the student: the student or class does not exist."},
                status=400,
            )

        log_action(request.user, "student_enrollment.create", "portal_student_enrollment", new_id, d)
        return Response({"id": new_id, "detail": "Student enrolled successfully."}, status=201)


class ClassTeacherAssignView(AdminMixin, APIView):
    @extend_schema(
        operation_id="AdminClassTeacherAssign",
        summary="List class-teacher assignments",
        description="Returns class-to-teacher assignments including each teacher's assigned subjects.",
        tags=["Academic"],
        responses={200: serializers.ListSerializer(child=_ClassTeacherListItem), **ERROR_RESPONSES},
    )
    def get(self, request):
        if not table_exists("portal_class_teacher"):
            return Response([])
        data = rows(
            """
            SELECT ct.class_id, c.name || '-' || c.section AS class_name,
                   ct.teacher_id, COALESCE(u.first_name || ' ' || u.last_name, u.username) AS teacher_name,
                   (
                       SELECT COALESCE(json_agg(json_build_object('id', s.id, 'name', s.name)), '[]'::json)
                       FROM portal_academic_allocation aa
                       JOIN portal_subject s ON s.id = aa.subject_id
                       WHERE aa.class_id = ct.class_id AND aa.teacher_id = ct.teacher_id
                   ) AS assigned_subjects
            FROM portal_class_teacher ct
            JOIN portal_class c ON c.id = ct.class_id
            JOIN auth_user u ON u.id = ct.teacher_id
            ORDER BY class_name
            """
        )
        return Response(serialise(data))

    @extend_schema(
        operation_id="AdminClassTeacherAssignCreate",
        summary="Assign a class teacher",
        description="Assigns a teacher to a class (upserting the class teacher) and optionally allocates a subject to that teacher for the class.",
        tags=["Academic"],
        request=_ClassTeacherAssignRequest,
        responses={
            200: _ClassTeacherAssignResponse,
            400: ValidationErrorSerializer,
            **ERROR_RESPONSES,
        },
    )
    def post(self, request):
        d = request.data
        class_id = d.get("class_id")
        teacher_id = d.get("teacher_id")
        subject_id = d.get("subject_id")

        if not class_id or not teacher_id:
            return Response({"detail": "class_id and teacher_id are required."}, status=400)

        with connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO portal_class_teacher (class_id, teacher_id) VALUES (%s,%s) "
                "ON CONFLICT (class_id) DO UPDATE SET teacher_id = EXCLUDED.teacher_id",
                [class_id, teacher_id]
            )
            if subject_id:
                cursor.execute(
                    "INSERT INTO portal_academic_allocation (class_id, subject_id, teacher_id) VALUES (%s,%s,%s) "
                    "ON CONFLICT (class_id, subject_id, teacher_id) DO NOTHING",
                    [class_id, subject_id, teacher_id]
                )
        log_action(request.user, "class_teacher.assign", "portal_class_teacher", class_id, d)
        return Response({"detail": "Class teacher and subject assigned successfully."})


class AdminLmsAnalyticsView(AdminMixin, APIView):
    @extend_schema(
        operation_id="AdminLmsAnalytics",
        summary="LMS usage analytics",
        description="Returns recent course-content uploads and aggregate LMS statistics (courses, chapters, lessons, resources and estimated storage).",
        tags=["LMS"],
        responses={200: _LmsAnalyticsResponse, **ERROR_RESPONSES},
    )
    def get(self, request):
        if not table_exists("portal_course_content"):
            return Response({"uploads": [], "stats": {}})
            
        # Recent uploads
        uploads = rows(
            """
            SELECT cc.id, cc.title, cc.content_type, cc.uploaded_at,
                   c.title AS course_title, cl.name || '-' || cl.section AS class_name, s.name AS subject_name,
                   COALESCE(u.first_name || ' ' || u.last_name, u.username) AS teacher_name
            FROM portal_course_content cc
            JOIN portal_course c ON c.id = cc.course_id
            JOIN portal_class cl ON cl.id = c.class_id
            JOIN portal_subject s ON s.id = c.subject_id
            LEFT JOIN portal_academic_allocation aa ON aa.class_id = c.class_id AND aa.subject_id = c.subject_id
            LEFT JOIN auth_user u ON u.id = aa.teacher_id
            ORDER BY cc.uploaded_at DESC LIMIT 50
            """
        )
        
        # Statistics
        total_courses = row("SELECT COUNT(*)::int AS c FROM portal_course")["c"]
        total_chapters = row("SELECT COUNT(*)::int AS c FROM portal_chapter")["c"] if table_exists("portal_chapter") else 0
        total_lessons = row("SELECT COUNT(*)::int AS c FROM portal_lesson")["c"] if table_exists("portal_lesson") else 0
        total_resources = row("SELECT COUNT(*)::int AS c FROM portal_course_content")["c"]
        
        resources_by_type = rows(
            """
            SELECT content_type AS type, COUNT(*)::int AS count
            FROM portal_course_content GROUP BY content_type
            """
        )
        
        # Estimated storage (each resource is ~2.4MB on average, simulated metrics)
        file_count = row("SELECT COUNT(*)::int AS c FROM portal_course_content WHERE content_type IN ('PDF', 'PPT', 'DOC', 'Image', 'Audio', 'PDF_Notes')")["c"]
        estimated_storage_mb = round(file_count * 2.4, 2)
        
        return Response(serialise({
            "uploads": uploads,
            "stats": {
                "total_courses": total_courses,
                "total_chapters": total_chapters,
                "total_lessons": total_lessons,
                "total_resources": total_resources,
                "estimated_storage_mb": estimated_storage_mb,
                "resources_by_type": {r["type"]: r["count"] for r in resources_by_type}
            }
        }))

    @extend_schema(
        operation_id="AdminLmsDeleteResource",
        summary="Delete an LMS resource",
        description="Deletes a course content resource by id, cleaning up any referenced quiz or assignment, and logs the action.",
        tags=["LMS"],
        parameters=[
            OpenApiParameter(
                name="id",
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                required=True,
                description="ID of the course content resource to delete.",
            ),
        ],
        request=None,
        responses={
            200: DetailErrorSerializer,
            400: ValidationErrorSerializer,
            **ERROR_RESPONSES,
        },
    )
    def delete(self, request):
        resource_id = request.query_params.get("id")
        if not resource_id:
            return Response({"detail": "id parameter required."}, status=400)
            
        with connection.cursor() as cursor:
            # Clean up associated Quiz or Assignment if referenced
            ref = row("SELECT quiz_id, assignment_id FROM portal_course_content WHERE id=%s", [resource_id])
            cursor.execute("DELETE FROM portal_course_content WHERE id=%s", [resource_id])
            if ref:
                if ref.get("quiz_id"):
                    cursor.execute("DELETE FROM portal_quiz WHERE id=%s", [ref["quiz_id"]])
                if ref.get("assignment_id"):
                    cursor.execute("DELETE FROM portal_assignment WHERE id=%s", [ref["assignment_id"]])
                    
        log_action(request.user, "lms_resource.delete", "portal_course_content", resource_id, {"id": resource_id})
        return Response({"detail": "Resource deleted."})


_ContactMessageItem = inline_serializer(
    name="AdminContactMessageItem",
    fields={
        "id": serializers.IntegerField(required=False),
        "name": serializers.CharField(required=False),
        "email": serializers.CharField(required=False),
        "phone": serializers.CharField(required=False),
        "message": serializers.CharField(required=False),
        "is_resolved": serializers.BooleanField(required=False),
        "submitted_at": serializers.CharField(required=False),
    },
)


# ---------------------------------------------------------------------------
# Contact submissions (public Contact page -> admin inbox)
# ---------------------------------------------------------------------------
class ContactMessagesView(AdminMixin, APIView):
    """Lists public contact-form submissions and lets admins toggle their
    resolved state. Cross-portal sync: the public /api/cms/contact/ POST lands
    here for the admin portal."""

    @extend_schema(
        summary="List contact form submissions",
        description="Returns all public contact-page submissions, newest first.",
        tags=["Contact"],
        responses={200: serializers.ListSerializer(child=_ContactMessageItem), **ERROR_RESPONSES},
    )
    def get(self, request):
        submissions = ContactSubmission.objects.all().order_by("-submitted_at")
        return Response(
            [
                {
                    "id": s.id,
                    "name": s.name,
                    "email": s.email,
                    "phone": s.phone,
                    "message": s.message,
                    "is_resolved": s.is_resolved,
                    "submitted_at": s.submitted_at.isoformat(),
                }
                for s in submissions
            ]
        )

    @extend_schema(
        summary="Mark a contact submission resolved / unresolved",
        description="Toggles is_resolved on a single contact submission.",
        tags=["Contact"],
        responses={200: DetailErrorSerializer, 404: DetailErrorSerializer, **ERROR_RESPONSES},
    )
    def patch(self, request, message_id):
        try:
            submission = ContactSubmission.objects.get(id=message_id)
        except ContactSubmission.DoesNotExist:
            return Response({"detail": "Contact submission not found."}, status=404)
        submission.is_resolved = bool(request.data.get("is_resolved", True))
        submission.save(update_fields=["is_resolved"])
        log_action(request.user, "contact.update", "ContactSubmission", message_id, {"is_resolved": submission.is_resolved})
        return Response({"detail": "Contact submission updated."})

