import uuid
from datetime import date, datetime, timedelta
from urllib.parse import urlsplit

from django.utils.timezone import now

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.contrib.auth.models import Group
from django.db import IntegrityError, connection, models, transaction
from django.utils.crypto import get_random_string
from django.utils.dateparse import parse_datetime
from psycopg2 import sql as pysql
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
        "first_name": serializers.CharField(required=False),
        "last_name": serializers.CharField(required=False),
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
        "driver_name": serializers.CharField(required=False),
        "driver_phone": serializers.CharField(required=False),
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
        "vehicle_id": serializers.IntegerField(required=False),
        "vehicle_number": serializers.CharField(required=False),
        "attendant_id": serializers.IntegerField(required=False),
        "stop_count": serializers.IntegerField(required=False),
    },
)

_RouteCreateRequest = inline_serializer(
    name="AdminRouteCreateRequest",
    fields={
        "route_name": serializers.CharField(),
        "start_point": serializers.CharField(required=False),
        "end_point": serializers.CharField(required=False),
        "vehicle_id": serializers.IntegerField(required=False),
        "attendant_id": serializers.IntegerField(required=False),
    },
)

_TransportAllocationItem = inline_serializer(
    name="AdminTransportAllocationItem",
    fields={
        "id": serializers.IntegerField(required=False),
        "student_id": serializers.IntegerField(required=False),
        "student_name": serializers.CharField(required=False),
        "vehicle_id": serializers.IntegerField(required=False),
        "vehicle_number": serializers.CharField(required=False),
        "route_id": serializers.IntegerField(required=False),
        "route_name": serializers.CharField(required=False),
        "pickup_point": serializers.CharField(required=False),
        "pass_number": serializers.CharField(required=False),
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
        "class_name": serializers.CharField(required=False),
        "section": serializers.CharField(required=False),
        "term_name": serializers.CharField(required=False),
        "academic_year_id": serializers.IntegerField(required=False),
        "academic_year_name": serializers.CharField(required=False),
        "due_date": serializers.DateField(required=False),
        "late_fine_per_day": serializers.FloatField(required=False),
        "tuition_fee": serializers.FloatField(required=False),
        "admission_fee": serializers.FloatField(required=False),
        "transport_fee": serializers.FloatField(required=False),
        "hostel_fee": serializers.FloatField(required=False),
        "library_fee": serializers.FloatField(required=False),
        "exam_fee": serializers.FloatField(required=False),
        "misc_fee": serializers.FloatField(required=False),
        "description": serializers.CharField(required=False),
        "is_published": serializers.BooleanField(required=False),
        "total_amount": serializers.FloatField(required=False),
        "amount_collected": serializers.FloatField(required=False),
    },
)

_FeeStructureCreateRequest = inline_serializer(
    name="AdminFeeStructureCreateRequest",
    fields={
        "class_id": serializers.IntegerField(),
        "term_name": serializers.CharField(),
        "academic_year_id": serializers.IntegerField(required=False),
        "due_date": serializers.DateField(required=False),
        "late_fine_per_day": serializers.FloatField(required=False),
        "tuition_fee": serializers.FloatField(required=False),
        "admission_fee": serializers.FloatField(required=False),
        "transport_fee": serializers.FloatField(required=False),
        "hostel_fee": serializers.FloatField(required=False),
        "library_fee": serializers.FloatField(required=False),
        "exam_fee": serializers.FloatField(required=False),
        "misc_fee": serializers.FloatField(required=False),
        "description": serializers.CharField(required=False),
        "is_published": serializers.BooleanField(required=False),
        "total_amount": serializers.FloatField(required=False),
    },
)

_PaymentItem = inline_serializer(
    name="AdminPaymentItem",
    fields={
        "id": serializers.UUIDField(required=False),
        "transaction_id": serializers.CharField(required=False),
        "amount_paid": serializers.FloatField(required=False),
        "status": serializers.CharField(required=False),
        "payment_method": serializers.CharField(required=False),
        "paid_at": serializers.DateTimeField(required=False),
        "student_name": serializers.CharField(required=False),
        "admission_number": serializers.CharField(required=False),
        "class_name": serializers.CharField(required=False),
        "section": serializers.CharField(required=False),
        "term_name": serializers.CharField(required=False),
    },
)

# --- Fees module -----------------------------------------------------------

_AcademicYearItem = inline_serializer(
    name="AdminAcademicYearItem",
    fields={
        "id": serializers.IntegerField(required=False),
        "name": serializers.CharField(required=False),
        "start_date": serializers.DateField(required=False),
        "end_date": serializers.DateField(required=False),
        "is_active": serializers.BooleanField(required=False),
    },
)

_AcademicYearCreateRequest = inline_serializer(
    name="AdminAcademicYearCreateRequest",
    fields={
        "name": serializers.CharField(),
        "start_date": serializers.DateField(),
        "end_date": serializers.DateField(),
        "is_active": serializers.BooleanField(required=False),
    },
)

_FeeCategoryItem = inline_serializer(
    name="AdminFeeCategoryItem",
    fields={
        "id": serializers.IntegerField(required=False),
        "name": serializers.CharField(required=False),
        "description": serializers.CharField(required=False),
        "sort_order": serializers.IntegerField(required=False),
        "is_active": serializers.BooleanField(required=False),
    },
)

_FeeCategoryCreateRequest = inline_serializer(
    name="AdminFeeCategoryCreateRequest",
    fields={
        "name": serializers.CharField(),
        "description": serializers.CharField(required=False),
        "sort_order": serializers.IntegerField(required=False),
        "is_active": serializers.BooleanField(required=False),
    },
)

_FeeAssignmentItem = inline_serializer(
    name="AdminFeeAssignmentItem",
    fields={
        "id": serializers.IntegerField(required=False),
        "fee_structure_id": serializers.IntegerField(required=False),
        "student_id": serializers.IntegerField(required=False),
        "student_name": serializers.CharField(required=False),
        "admission_number": serializers.CharField(required=False),
        "assigned_at": serializers.DateTimeField(required=False),
    },
)

_FeeAssignmentCreateRequest = inline_serializer(
    name="AdminFeeAssignmentCreateRequest",
    fields={
        "fee_structure_id": serializers.IntegerField(),
        "student_id": serializers.IntegerField(required=False),
        "assign_class": serializers.BooleanField(
            required=False, help_text="Bulk-assign every student enrolled in the structure's class."
        ),
    },
)

_FeeConcessionItem = inline_serializer(
    name="AdminFeeConcessionItem",
    fields={
        "id": serializers.IntegerField(required=False),
        "student_id": serializers.IntegerField(required=False),
        "student_name": serializers.CharField(required=False),
        "fee_structure_id": serializers.IntegerField(required=False),
        "term_name": serializers.CharField(required=False),
        "concession_type": serializers.CharField(required=False),
        "discount_amount": serializers.FloatField(required=False),
        "discount_percent": serializers.FloatField(required=False),
        "reason": serializers.CharField(required=False),
    },
)

_FeeConcessionCreateRequest = inline_serializer(
    name="AdminFeeConcessionCreateRequest",
    fields={
        "student_id": serializers.IntegerField(),
        "fee_structure_id": serializers.IntegerField(),
        "concession_type": serializers.ChoiceField(
            choices=["Scholarship", "Merit", "Sibling", "Staff", "Disability", "Discount", "Other"],
            required=False,
        ),
        "discount_amount": serializers.FloatField(required=False),
        "discount_percent": serializers.FloatField(required=False),
        "reason": serializers.CharField(required=False),
    },
)

_FeeLedgerItem = inline_serializer(
    name="AdminFeeLedgerItem",
    fields={
        "id": serializers.IntegerField(required=False),
        "student_id": serializers.IntegerField(required=False),
        "student_name": serializers.CharField(required=False),
        "admission_number": serializers.CharField(required=False),
        "gross_amount": serializers.FloatField(required=False),
        "concession_amount": serializers.FloatField(required=False),
        "fine_amount": serializers.FloatField(required=False),
        "net_payable": serializers.FloatField(required=False),
        "amount_paid": serializers.FloatField(required=False),
        "balance_due": serializers.FloatField(required=False),
        "status": serializers.CharField(required=False),
    },
)

_FeeLedgerGenerateRequest = inline_serializer(
    name="AdminFeeLedgerGenerateRequest",
    fields={"fee_structure_id": serializers.IntegerField()},
)

_DetailResponseSerializer = inline_serializer(
    name="AdminDetailResponse",
    fields={
        "detail": serializers.CharField(required=False),
        "id": serializers.IntegerField(required=False),
        "count": serializers.IntegerField(required=False),
    },
)

_FeeReportStructureItem = inline_serializer(
    name="AdminFeeReportStructureItem",
    fields={
        "id": serializers.IntegerField(required=False),
        "term_name": serializers.CharField(required=False),
        "class_name": serializers.CharField(required=False),
        "section": serializers.CharField(required=False),
        "total_amount": serializers.FloatField(required=False),
        "amount_collected": serializers.FloatField(required=False),
        "due_date": serializers.DateField(required=False),
        "is_published": serializers.BooleanField(required=False),
    },
)

_FeeReportMonthlyItem = inline_serializer(
    name="AdminFeeReportMonthlyItem",
    fields={
        "month": serializers.CharField(required=False),
        "collected": serializers.FloatField(required=False),
    },
)

_FeeReportPendingItem = inline_serializer(
    name="AdminFeeReportPendingItem",
    fields={
        "status": serializers.CharField(required=False),
        "total_balance": serializers.FloatField(required=False),
        "count": serializers.IntegerField(required=False),
    },
)

_FeeReportSummary = inline_serializer(
    name="AdminFeeReportSummary",
    fields={
        "total_collected": serializers.FloatField(required=False),
        "collected_this_month": serializers.FloatField(required=False),
        "unique_payers": serializers.IntegerField(required=False),
        "total_transactions": serializers.IntegerField(required=False),
    },
)

_FeeReportsResponse = inline_serializer(
    name="AdminFeeReportsResponse",
    fields={
        "summary": _FeeReportSummary(required=False),
        "structures": serializers.ListSerializer(child=_FeeReportStructureItem(), required=False),
        "monthly": serializers.ListSerializer(child=_FeeReportMonthlyItem(), required=False),
        "pending": serializers.ListSerializer(child=_FeeReportPendingItem(), required=False),
    },
)

# --- Transport module ------------------------------------------------------

_TransportDriverItem = inline_serializer(
    name="AdminTransportDriverItem",
    fields={
        "id": serializers.IntegerField(required=False),
        "user_id": serializers.IntegerField(required=False),
        "name": serializers.CharField(required=False),
        "phone": serializers.CharField(required=False),
        "license_number": serializers.CharField(required=False),
        "vehicle_id": serializers.IntegerField(required=False),
        "vehicle_number": serializers.CharField(required=False),
        "is_active": serializers.BooleanField(required=False),
    },
)

_TransportDriverCreateRequest = inline_serializer(
    name="AdminTransportDriverCreateRequest",
    fields={
        "user_id": serializers.IntegerField(),
        "license_number": serializers.CharField(required=False),
        "phone": serializers.CharField(required=False),
        "vehicle_id": serializers.IntegerField(required=False),
    },
)

_TransportAttendantItem = inline_serializer(
    name="AdminTransportAttendantItem",
    fields={
        "id": serializers.IntegerField(required=False),
        "user_id": serializers.IntegerField(required=False),
        "name": serializers.CharField(required=False),
        "phone": serializers.CharField(required=False),
        "assigned_route_id": serializers.IntegerField(required=False),
        "route_name": serializers.CharField(required=False),
        "is_active": serializers.BooleanField(required=False),
    },
)

_TransportAttendantCreateRequest = inline_serializer(
    name="AdminTransportAttendantCreateRequest",
    fields={
        "user_id": serializers.IntegerField(),
        "phone": serializers.CharField(required=False),
        "assigned_route_id": serializers.IntegerField(required=False),
    },
)

_TransportPickupPointItem = inline_serializer(
    name="AdminTransportPickupPointItem",
    fields={
        "id": serializers.IntegerField(required=False),
        "route_id": serializers.IntegerField(required=False),
        "route_name": serializers.CharField(required=False),
        "name": serializers.CharField(required=False),
        "sequence_order": serializers.IntegerField(required=False),
        "pickup_time": serializers.CharField(required=False),
        "drop_time": serializers.CharField(required=False),
    },
)

_TransportPickupPointCreateRequest = inline_serializer(
    name="AdminTransportPickupPointCreateRequest",
    fields={
        "route_id": serializers.IntegerField(),
        "name": serializers.CharField(),
        "sequence_order": serializers.IntegerField(required=False),
        "pickup_time": serializers.CharField(required=False),
        "drop_time": serializers.CharField(required=False),
    },
)

_TransportPassItem = inline_serializer(
    name="AdminTransportPassItem",
    fields={
        "id": serializers.IntegerField(required=False),
        "student_id": serializers.IntegerField(required=False),
        "student_name": serializers.CharField(required=False),
        "pass_number": serializers.CharField(required=False),
        "route_name": serializers.CharField(required=False),
        "vehicle_number": serializers.CharField(required=False),
        "pickup_point": serializers.CharField(required=False),
        "issued_at": serializers.DateTimeField(required=False),
    },
)

_TransportPassGenerateRequest = inline_serializer(
    name="AdminTransportPassGenerateRequest",
    fields={"student_id": serializers.IntegerField()},
)

_TransportTripItem = inline_serializer(
    name="AdminTransportTripItem",
    fields={
        "id": serializers.IntegerField(required=False),
        "vehicle_id": serializers.IntegerField(required=False),
        "vehicle_number": serializers.CharField(required=False),
        "route_id": serializers.IntegerField(required=False),
        "route_name": serializers.CharField(required=False),
        "trip_date": serializers.DateField(required=False),
        "status": serializers.CharField(required=False),
        "started_at": serializers.DateTimeField(required=False),
        "ended_at": serializers.DateTimeField(required=False),
    },
)

_TransportTripCreateRequest = inline_serializer(
    name="AdminTransportTripCreateRequest",
    fields={
        "vehicle_id": serializers.IntegerField(),
        "route_id": serializers.IntegerField(required=False),
    },
)

_TransportTripPatchRequest = inline_serializer(
    name="AdminTransportTripPatchRequest",
    fields={
        "id": serializers.IntegerField(),
        "status": serializers.ChoiceField(
            choices=["Scheduled", "In Progress", "Completed", "Cancelled"],
            help_text="Scheduled -> In Progress -> Completed (or Cancelled).",
        ),
    },
)

_TransportAlertItem = inline_serializer(
    name="AdminTransportAlertItem",
    fields={
        "id": serializers.IntegerField(required=False),
        "type": serializers.CharField(required=False),
        "message": serializers.CharField(required=False),
        "vehicle_id": serializers.IntegerField(required=False),
        "route_id": serializers.IntegerField(required=False),
        "route_name": serializers.CharField(required=False),
        "created_at": serializers.DateTimeField(required=False),
        "created_by_name": serializers.CharField(required=False),
    },
)

_TransportAlertCreateRequest = inline_serializer(
    name="AdminTransportAlertCreateRequest",
    fields={
        "type": serializers.ChoiceField(
            choices=["Bus Arrived", "Delay Alert", "Route Changed", "Emergency", "Info"],
            required=False,
        ),
        "message": serializers.CharField(),
        "vehicle_id": serializers.IntegerField(required=False),
        "route_id": serializers.IntegerField(required=False),
    },
)

_TransportSettingsItem = inline_serializer(
    name="AdminTransportSettingsItem",
    fields={
        "contact_number": serializers.CharField(required=False),
        "annual_transport_fee": serializers.FloatField(required=False),
        "fee_due_date": serializers.DateField(required=False),
        "gps_update_interval_sec": serializers.IntegerField(required=False),
    },
)

_TransportRouteUtilisationItem = inline_serializer(
    name="AdminTransportRouteUtilisationItem",
    fields={
        "route_name": serializers.CharField(required=False),
        "start_point": serializers.CharField(required=False),
        "end_point": serializers.CharField(required=False),
        "vehicle_number": serializers.CharField(required=False),
        "capacity": serializers.IntegerField(required=False),
        "student_count": serializers.IntegerField(required=False),
    },
)

_TransportRecentTripItem = inline_serializer(
    name="AdminTransportRecentTripItem",
    fields={
        "vehicle_number": serializers.CharField(required=False),
        "route_name": serializers.CharField(required=False),
        "trip_date": serializers.DateField(required=False),
        "started_at": serializers.DateTimeField(required=False),
        "status": serializers.CharField(required=False),
    },
)

_TransportReportsResponse = inline_serializer(
    name="AdminTransportReportsResponse",
    fields={
        "total_vehicles": serializers.IntegerField(required=False),
        "total_routes": serializers.IntegerField(required=False),
        "allocated_students": serializers.IntegerField(required=False),
        "active_trips": serializers.IntegerField(required=False),
        "active_passes": serializers.IntegerField(required=False),
        "route_utilisation": serializers.ListSerializer(child=_TransportRouteUtilisationItem(), required=False),
        "recent_trips": serializers.ListSerializer(child=_TransportRecentTripItem(), required=False),
    },
)

_TransportLiveMapItem = inline_serializer(
    name="AdminTransportLiveMapItem",
    fields={
        "vehicle_id": serializers.IntegerField(required=False),
        "vehicle_number": serializers.CharField(required=False),
        "maintenance_status": serializers.CharField(required=False),
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
            r = row(
                pysql.SQL("SELECT COUNT(*)::int AS c FROM {} {}").format(
                    pysql.Identifier(table), pysql.SQL(where)
                )
            )
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

        AdmissionEnquiry.objects.create(
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
        if urlsplit(str(name)).scheme in ("http", "https"):
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
            OpenApiParameter(
                name="type",
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                required=False,
                description="Alias for 'role' (the admin Fees page uses ?type=student).",
            ),
        ],
        responses={200: serializers.ListSerializer(child=_UserItem), **ERROR_RESPONSES},
    )
    def get(self, request):
        from django.contrib.auth.models import User
        role_filter = request.query_params.get("role")
        if not role_filter:
            # ?type= is the legacy alias used by the admin Fees page dropdowns.
            role_filter = request.query_params.get("type")

        users = User.objects.all().prefetch_related("groups").order_by("-date_joined")
        data = []
        for u in users:
            data.append({
                "id": u.id,
                "username": u.username,
                "email": u.email,
                "name": u.get_full_name() or u.username,
                "first_name": u.first_name,
                "last_name": u.last_name,
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
# Every table this generic helper may touch. `SimpleTableView` builds its SQL
# by interpolating the table/column identifiers, so they must come from this
# fixed whitelist (never from request data). Add a new table here when a new
# SimpleTableView subclass is added.
_SIMPLE_TABLE_WHITELIST = frozenset({
    "portal_class",
    "portal_subject",
    "portal_vehicle",
    "portal_route",
    "portal_transport_allocation",
    "portal_fee_structure",
    "portal_book",
    "portal_hostel",
    "portal_academic_year",
    "portal_fee_category",
    "portal_driver",
    "portal_attendant",
    "portal_pickup_point",
})


def _compose_insert_statement(table, cols, placeholders):
    """Compose a parameterized INSERT statement using psycopg2.sql.

    Table and column names are quoted via ``Identifier`` (nothing is
    string-interpolated) and values are always passed as separate bind
    parameters; the pieces marked ``DEFAULT`` map empty-payload columns to
    their per-column database default. Kept in its own helper so the
    request-handling path only ever executes the composed, parameterized
    statement.
    """
    return (
        pysql.SQL("INSERT INTO ")
        + pysql.Identifier(table)
        + pysql.SQL(" (")
        + pysql.SQL(", ").join(pysql.Identifier(c) for c in cols)
        + pysql.SQL(") VALUES (")
        + pysql.SQL(", ").join(
            pysql.Placeholder() if p == "%s" else pysql.SQL("DEFAULT")
            for p in placeholders
        )
        + pysql.SQL(") RETURNING id")
    )


def _compose_update_statement(table, cols):
    """Compose an UPDATE statement (SET per-column placeholders WHERE id)."""
    return (
        pysql.SQL("UPDATE ")
        + pysql.Identifier(table)
        + pysql.SQL(" SET ")
        + pysql.SQL(", ").join(
            pysql.Identifier(c) + pysql.SQL(" = ") + pysql.Placeholder()
            for c in cols
        )
        + pysql.SQL(" WHERE id = ") + pysql.Placeholder()
        + pysql.SQL(" RETURNING id")
    )


def _compose_delete_statement(table):
    """Compose a parameterized DELETE statement keyed by id."""
    return (
        pysql.SQL("DELETE FROM ")
        + pysql.Identifier(table)
        + pysql.SQL(" WHERE id = ") + pysql.Placeholder()
    )


class SimpleTableView(AdminMixin, APIView):
    table = None
    columns = ()          # columns accepted on create, in order
    order_by = "id"
    int_columns = ()      # columns that must coerce to int (FKs, quantities)

    def _safe_table(self):
        """Return the table name only if it is in the whitelist."""
        if self.table not in _SIMPLE_TABLE_WHITELIST:
            raise RuntimeError(
                f"Table {self.table!r} is not in the SimpleTableView whitelist; "
                "add it to _SIMPLE_TABLE_WHITELIST in admin_views.py first."
            )
        return self.table

    def get(self, request):
        if not table_exists(self.table):
            return Response([])
        table = self._safe_table()
        query = pysql.SQL("SELECT * FROM {} ORDER BY {}").format(
            pysql.Identifier(table), pysql.SQL(self.order_by)
        )
        return Response(serialise(rows(query)))

    def validate_create(self, payload):
        """Optional per-view create validation hook.

        Subclasses override to enforce business rules (negative quantities,
        cross-field invariants). Return a Response to reject, or None to
        proceed. `payload` is the raw request body (dict).
        """
        return None

    def post(self, request):
        if not table_exists(self.table):
            return Response({"detail": "Table not found. Apply the schema extension SQL first."}, status=400)
        if not isinstance(request.data, dict):
            return Response({"detail": "A JSON object body is required."}, status=400)
        table = self._safe_table()
        reject = self.validate_create(request.data)
        if reject is not None:
            return reject
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
        try:
            with connection.cursor() as cursor:
                cursor.execute(
                    _compose_insert_statement(table, cols, placeholders), values
                )
                new_id = cursor.fetchone()[0]
        except IntegrityError:
            return Response(
                {"detail": "Could not create the record: a referenced record is missing or a unique value already exists."},
                status=400,
            )
        # `values` is intentionally shorter than `self.columns` when a column
        # fell back to its DB DEFAULT (skipped above), so zip must not be strict.
        log_action(
            request.user,
            f"{self.table}.create",
            self.table,
            new_id,
            dict(zip(self.columns, [str(v) for v in values], strict=False)),
        )
        return Response({"id": new_id, "detail": "Created."}, status=201)

    def validate_update(self, payload):
        """Optional per-view update validation hook. Return a Response to
        reject, or None to proceed. `payload` is the raw request body (dict)
        already confirmed to carry an `id`."""
        return None

    def patch(self, request):
        if not table_exists(self.table):
            return Response({"detail": "Table not found. Apply the schema extension SQL first."}, status=400)
        if not isinstance(request.data, dict):
            return Response({"detail": "A JSON object body is required."}, status=400)
        record_id = request.data.get("id")
        if record_id in (None, ""):
            return Response({"detail": "The 'id' field is required for updates."}, status=400)
        table = self._safe_table()
        reject = self.validate_update(request.data)
        if reject is not None:
            return reject
        cols, values = [], []
        for c in self.columns:
            if c not in request.data:
                continue
            v = request.data[c]
            # Empty values are skipped so they never wipe NOT NULL fields; an
            # explicit false/0 is preserved (booleans, sort orders).
            if v in (None, ""):
                continue
            if c in self.int_columns:
                try:
                    v = int(v)
                except (TypeError, ValueError):
                    return Response({"detail": f"Field '{c}' must be an integer."}, status=400)
            cols.append(c)
            values.append(v)
        if not cols:
            return Response({"detail": "No updatable fields were provided."}, status=400)
        try:
            with connection.cursor() as cursor:
                cursor.execute(
                    _compose_update_statement(table, cols), values + [record_id]
                )
                if cursor.fetchone() is None:
                    return Response({"detail": "Not found."}, status=404)
        except IntegrityError:
            return Response(
                {"detail": "Could not update the record: a referenced record is missing or a unique value already exists."},
                status=400,
            )
        log_action(
            request.user,
            f"{self.table}.update",
            self.table,
            record_id,
            dict(zip(cols, [str(v) for v in values], strict=True)),
        )
        return Response({"id": record_id, "detail": "Updated."})

    def delete(self, request):
        if not table_exists(self.table):
            return Response({"detail": "Table not found. Apply the schema extension SQL first."}, status=400)
        table = self._safe_table()
        try:
            record_id = int(request.query_params.get("id", ""))
        except (TypeError, ValueError):
            return Response({"detail": "The 'id' query parameter is required."}, status=400)
        with connection.cursor() as cursor:
            cursor.execute(_compose_delete_statement(table), [record_id])
            if cursor.rowcount == 0:
                return Response({"detail": "Not found."}, status=404)
        log_action(request.user, f"{self.table}.delete", self.table, record_id)
        return Response({"detail": "Deleted."})


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
    int_columns = ("capacity", "driver_id")

    def get(self, request):
        if not table_exists(self.table):
            return Response([])
        data = rows(
            "SELECT v.id, v.vehicle_number, v.capacity, v.driver_id, v.gps_device_id, "
            "v.maintenance_status, "
            "COALESCE(d.first_name || ' ' || d.last_name, d.username) AS driver_name, "
            "pd.phone AS driver_phone "
            "FROM portal_vehicle v "
            "LEFT JOIN auth_user d ON d.id = v.driver_id "
            "LEFT JOIN portal_driver pd ON pd.user_id = v.driver_id "
            "ORDER BY v.vehicle_number"
        )
        return Response(serialise(data))


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
    columns = ("route_name", "start_point", "end_point", "vehicle_id", "attendant_id")
    order_by = "route_name"
    int_columns = ("vehicle_id", "attendant_id")

    def get(self, request):
        if not table_exists(self.table):
            return Response([])
        data = rows(
            "SELECT r.id, r.route_name, r.start_point, r.end_point, r.vehicle_id, "
            "r.attendant_id, v.vehicle_number, "
            "(SELECT CAST(COUNT(*) AS INTEGER) FROM portal_pickup_point pp WHERE pp.route_id = r.id) AS stop_count "
            "FROM portal_route r "
            "LEFT JOIN portal_vehicle v ON v.id = r.vehicle_id "
            "ORDER BY r.route_name"
        )
        return Response(serialise(data))


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

    def get(self, request):
        if not table_exists(self.table):
            return Response([])
        data = rows(
            "SELECT a.id, a.student_id, a.vehicle_id, a.route_id, a.pickup_point, "
            "COALESCE(u.first_name || ' ' || u.last_name, u.username) AS student_name, "
            "v.vehicle_number, r.route_name, tp.pass_number "
            "FROM portal_transport_allocation a "
            "JOIN auth_user u ON u.id = a.student_id "
            "JOIN portal_vehicle v ON v.id = a.vehicle_id "
            "JOIN portal_route r ON r.id = a.route_id "
            "LEFT JOIN portal_transport_pass tp ON tp.student_id = a.student_id "
            "ORDER BY u.first_name, u.last_name"
        )
        return Response(serialise(data))

    def delete(self, request):
        # The admin UI removes an allocation by student_id (one per student).
        if not table_exists(self.table):
            return Response({"detail": "Table not found. Apply the schema extension SQL first."}, status=400)
        student_id = request.query_params.get("student_id")
        record_id = request.query_params.get("id")
        try:
            if student_id:
                value = int(student_id)
                stmt = pysql.SQL("DELETE FROM ") + pysql.Identifier(self.table) + pysql.SQL(" WHERE student_id = ") + pysql.Placeholder()
                where = "student_id"
            else:
                value = int(record_id or "")
                stmt = pysql.SQL("DELETE FROM ") + pysql.Identifier(self.table) + pysql.SQL(" WHERE id = ") + pysql.Placeholder()
                where = "id"
        except (TypeError, ValueError):
            return Response({"detail": "The 'id' or 'student_id' query parameter is required."}, status=400)
        with connection.cursor() as cursor:
            cursor.execute(stmt, [value])
            if cursor.rowcount == 0:
                return Response({"detail": "Not found."}, status=404)
        log_action(request.user, "transport_allocation.delete", self.table, value)
        return Response({"detail": "Deleted."})


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
    columns = (
        "class_id", "term_name", "academic_year_id", "due_date", "late_fine_per_day",
        "tuition_fee", "admission_fee", "transport_fee", "hostel_fee", "library_fee",
        "exam_fee", "misc_fee", "description", "is_published", "total_amount",
    )
    order_by = "class_id"
    int_columns = ("class_id", "academic_year_id")
    _fee_components = (
        "tuition_fee", "admission_fee", "transport_fee", "hostel_fee",
        "library_fee", "exam_fee", "misc_fee",
    )

    def validate_create(self, payload):
        # The UI computes the total client-side but sends only the components;
        # derive the total server-side so it can never drift from them.
        if "total_amount" not in payload or payload.get("total_amount") in (None, ""):
            total = 0.0
            for c in self._fee_components:
                try:
                    total += float(payload.get(c) or 0)
                except (TypeError, ValueError):
                    return Response({"detail": f"Field '{c}' must be a number."}, status=400)
            payload["total_amount"] = total
        for c in self._fee_components:
            if payload.get(c) not in (None, ""):
                try:
                    float(payload[c])
                except (TypeError, ValueError):
                    return Response({"detail": f"Field '{c}' must be a number."}, status=400)
        if payload.get("due_date") and payload["due_date"] < str(date.today()):
            return Response({"detail": "The due date cannot be in the past."}, status=400)
        return None

    def get(self, request):
        if not table_exists(self.table):
            return Response([])
        data = rows(
            "SELECT fs.*, c.name || '-' || c.section AS class_name, c.section, ay.name AS academic_year_name, "
            "COALESCE((SELECT SUM(p.amount_paid) FROM portal_payment p "
            "          WHERE p.fee_structure_id = fs.id AND p.status = 'Success'), 0) AS amount_collected "
            "FROM portal_fee_structure fs "
            "JOIN portal_class c ON c.id = fs.class_id "
            "LEFT JOIN portal_academic_year ay ON ay.id = fs.academic_year_id "
            "ORDER BY fs.class_id, fs.term_name"
        )
        return Response(serialise(data))


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
            SELECT p.id, p.transaction_id, p.amount_paid, p.status, p.paid_at, p.payment_method,
                   COALESCE(u.first_name || ' ' || u.last_name, u.username) AS student_name,
                   (SELECT sp.admission_number FROM portal_student_profile sp WHERE sp.user_id = p.student_id) AS admission_number,
                   (SELECT c.name FROM portal_student_enrollment e JOIN portal_class c ON c.id = e.class_id
                    WHERE e.student_id = p.student_id ORDER BY e.id DESC LIMIT 1) AS class_name,
                   (SELECT c.section FROM portal_student_enrollment e JOIN portal_class c ON c.id = e.class_id
                    WHERE e.student_id = p.student_id ORDER BY e.id DESC LIMIT 1) AS section,
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

    def validate_create(self, payload):
        """Enforce inventory invariants: non-negative quantities and
        available_quantity cannot exceed total quantity."""
        if not str(payload.get("title") or "").strip():
            return Response({"title": ["Title is required."]}, status=400)
        for field in ("quantity", "available_quantity"):
            raw = payload.get(field)
            if raw in (None, ""):
                continue  # falls back to the DB DEFAULT (1)
            try:
                value = int(raw)
            except (TypeError, ValueError):
                return Response({field: [f"{field} must be an integer."]}, status=400)
            if value < 0:
                return Response({field: [f"{field} cannot be negative."]}, status=400)
        qty = payload.get("quantity")
        avail = payload.get("available_quantity")
        if qty not in (None, "") and avail not in (None, ""):
            try:
                if int(avail) > int(qty):
                    return Response(
                        {"available_quantity": ["available_quantity cannot exceed quantity."]},
                        status=400,
                    )
            except (TypeError, ValueError):
                pass  # int coercion already reported above
        return None

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
                snapshot[t] = rows(pysql.SQL("SELECT * FROM {}").format(pysql.Identifier(t)))
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


# ---------------------------------------------------------------------------
# Fees module — academic years, categories, assignments, concessions, ledger
# (computed on read) and reports (computed on read). All amounts are passed
# as bound parameters; identifiers never appear in SQL text.
# ---------------------------------------------------------------------------

def _date_of(value):
    """Normalise a DB row value (date, datetime or ISO string) to a date."""
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    try:
        return date.fromisoformat(str(value)[:10])
    except ValueError:
        return None


def _deactivate_other_academic_years(record_id):
    with connection.cursor() as cursor:
        cursor.execute(
            "UPDATE portal_academic_year SET is_active = false WHERE id <> %s", [record_id]
        )


@extend_schema_view(
    get=extend_schema(
        operation_id="AdminAcademicYearList",
        summary="List academic years",
        description="Returns all academic years, newest first.",
        tags=["Finance"],
        responses={200: serializers.ListSerializer(child=_AcademicYearItem), **ERROR_RESPONSES},
    ),
    post=extend_schema(
        operation_id="AdminAcademicYearCreate",
        summary="Create an academic year",
        description="Creates an academic year; when is_active is set the other years are deactivated.",
        tags=["Finance"],
        request=_AcademicYearCreateRequest,
        responses={200: IdDetailResponseSerializer, **ERROR_RESPONSES},
    ),
)
class AcademicYearView(SimpleTableView):
    table = "portal_academic_year"
    columns = ("name", "start_date", "end_date", "is_active")
    order_by = "start_date DESC"

    def validate_create(self, payload):
        if not payload.get("name"):
            return Response({"detail": "The 'name' field is required."}, status=400)
        start = _date_of(payload.get("start_date"))
        end = _date_of(payload.get("end_date"))
        if start is None or end is None:
            return Response({"detail": "Both 'start_date' and 'end_date' are required."}, status=400)
        if end <= start:
            return Response({"detail": "The end date must be after the start date."}, status=400)
        return None

    def post(self, request):
        response = super().post(request)
        if response.status_code == 201 and request.data.get("is_active"):
            _deactivate_other_academic_years(response.data["id"])
        return response

    def patch(self, request):
        response = super().patch(request)
        if response.status_code == 200 and request.data.get("is_active"):
            _deactivate_other_academic_years(request.data["id"])
        return response


@extend_schema_view(
    get=extend_schema(
        operation_id="AdminFeeCategoryList",
        summary="List fee categories",
        description="Returns all fee categories ordered by sort_order.",
        tags=["Finance"],
        responses={200: serializers.ListSerializer(child=_FeeCategoryItem), **ERROR_RESPONSES},
    ),
    post=extend_schema(
        operation_id="AdminFeeCategoryCreate",
        summary="Create a fee category",
        description="Creates a fee category with an optional sort order.",
        tags=["Finance"],
        request=_FeeCategoryCreateRequest,
        responses={200: IdDetailResponseSerializer, **ERROR_RESPONSES},
    ),
)
class FeeCategoryView(SimpleTableView):
    table = "portal_fee_category"
    columns = ("name", "description", "sort_order", "is_active")
    order_by = "sort_order, name"
    int_columns = ("sort_order",)


class FeeAssignmentView(AdminMixin, APIView):
    """Assigns fee structures to individual students or to every student
    enrolled in the structure's class (bulk)."""

    @extend_schema(
        operation_id="AdminFeeAssignmentList",
        summary="List fee structure assignments",
        description="Returns the students assigned to a fee structure (required query param fee_structure_id).",
        tags=["Finance"],
        parameters=[
            OpenApiParameter(
                name="fee_structure_id",
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                required=True,
            ),
        ],
        responses={200: serializers.ListSerializer(child=_FeeAssignmentItem), **ERROR_RESPONSES},
    )
    def get(self, request):
        if not table_exists("portal_fee_assignment"):
            return Response([])
        structure_id = request.query_params.get("fee_structure_id")
        if structure_id in (None, ""):
            return Response({"detail": "The 'fee_structure_id' query parameter is required."}, status=400)
        data = rows(
            "SELECT a.id, a.fee_structure_id, a.student_id, a.assigned_at, "
            "COALESCE(u.first_name || ' ' || u.last_name, u.username) AS student_name, "
            "sp.admission_number "
            "FROM portal_fee_assignment a "
            "JOIN auth_user u ON u.id = a.student_id "
            "LEFT JOIN portal_student_profile sp ON sp.user_id = a.student_id "
            "WHERE a.fee_structure_id = %s ORDER BY u.first_name, u.last_name",
            [structure_id],
        )
        return Response(serialise(data))

    @extend_schema(
        operation_id="AdminFeeAssignmentCreate",
        summary="Assign a fee structure to students",
        description="Assigns a fee structure to one student (student_id) or to the whole class (assign_class=true).",
        tags=["Finance"],
        request=_FeeAssignmentCreateRequest,
        responses={200: _DetailResponseSerializer, **ERROR_RESPONSES},
    )
    def post(self, request):
        if not table_exists("portal_fee_assignment"):
            return Response({"detail": "Table not found. Apply the schema extension SQL first."}, status=400)
        if not isinstance(request.data, dict):
            return Response({"detail": "A JSON object body is required."}, status=400)
        structure_id = request.data.get("fee_structure_id")
        if structure_id in (None, ""):
            return Response({"detail": "The 'fee_structure_id' field is required."}, status=400)
        if request.data.get("assign_class"):
            with connection.cursor() as cursor:
                cursor.execute(
                    "INSERT INTO portal_fee_assignment (fee_structure_id, student_id) "
                    "SELECT %s, e.student_id FROM portal_student_enrollment e "
                    "JOIN portal_fee_structure fs ON fs.class_id = e.class_id AND fs.id = %s "
                    "WHERE NOT EXISTS (SELECT 1 FROM portal_fee_assignment a "
                    "WHERE a.fee_structure_id = %s AND a.student_id = e.student_id)",
                    [structure_id, structure_id, structure_id],
                )
                count = cursor.rowcount
            log_action(request.user, "fee.assignment.bulk", "portal_fee_assignment", structure_id, {"count": count})
            return Response({"detail": f"Assigned {count} student(s).", "count": count})
        student_id = request.data.get("student_id")
        if student_id in (None, ""):
            return Response({"detail": "Provide 'student_id' or set 'assign_class' to true."}, status=400)
        try:
            with connection.cursor() as cursor:
                cursor.execute(
                    "INSERT INTO portal_fee_assignment (fee_structure_id, student_id) "
                    "VALUES (%s, %s) RETURNING id",
                    [structure_id, student_id],
                )
                new_id = cursor.fetchone()[0]
        except IntegrityError:
            return Response(
                {"detail": "Could not create the record: a referenced record is missing or a unique value already exists."},
                status=400,
            )
        log_action(request.user, "fee.assignment.create", "portal_fee_assignment", new_id, {"fee_structure_id": structure_id, "student_id": student_id})
        return Response({"id": new_id, "detail": "Assigned."}, status=201)

    @extend_schema(
        operation_id="AdminFeeAssignmentDelete",
        summary="Remove a fee structure assignment",
        tags=["Finance"],
        parameters=[
            OpenApiParameter(name="id", type=OpenApiTypes.INT, location=OpenApiParameter.QUERY, required=True),
        ],
        responses={200: DetailErrorSerializer, 404: DetailErrorSerializer, **ERROR_RESPONSES},
    )
    def delete(self, request):
        try:
            record_id = int(request.query_params.get("id", ""))
        except (TypeError, ValueError):
            return Response({"detail": "The 'id' query parameter is required."}, status=400)
        with connection.cursor() as cursor:
            cursor.execute("DELETE FROM portal_fee_assignment WHERE id = %s", [record_id])
            if cursor.rowcount == 0:
                return Response({"detail": "Not found."}, status=404)
        log_action(request.user, "fee.assignment.delete", "portal_fee_assignment", record_id)
        return Response({"detail": "Removed."})


class FeeConcessionView(AdminMixin, APIView):
    CONCESSION_TYPES = ("Scholarship", "Merit", "Sibling", "Staff", "Disability", "Discount", "Other")

    @extend_schema(
        operation_id="AdminFeeConcessionList",
        summary="List fee concessions",
        description="Returns all concessions joined with the student and fee term.",
        tags=["Finance"],
        responses={200: serializers.ListSerializer(child=_FeeConcessionItem), **ERROR_RESPONSES},
    )
    def get(self, request):
        if not table_exists("portal_fee_concession"):
            return Response([])
        data = rows(
            "SELECT fc.id, fc.student_id, fc.fee_structure_id, fc.concession_type, "
            "fc.discount_amount, fc.discount_percent, fc.reason, "
            "COALESCE(u.first_name || ' ' || u.last_name, u.username) AS student_name, "
            "fs.term_name "
            "FROM portal_fee_concession fc "
            "JOIN auth_user u ON u.id = fc.student_id "
            "JOIN portal_fee_structure fs ON fs.id = fc.fee_structure_id "
            "ORDER BY fc.id DESC"
        )
        return Response(serialise(data))

    @extend_schema(
        operation_id="AdminFeeConcessionCreate",
        summary="Apply a concession",
        description="Applies a flat or percentage discount to a student for a fee structure.",
        tags=["Finance"],
        request=_FeeConcessionCreateRequest,
        responses={200: IdDetailResponseSerializer, **ERROR_RESPONSES},
    )
    def post(self, request):
        if not table_exists("portal_fee_concession"):
            return Response({"detail": "Table not found. Apply the schema extension SQL first."}, status=400)
        payload = request.data if isinstance(request.data, dict) else {}
        student_id = payload.get("student_id")
        structure_id = payload.get("fee_structure_id")
        if student_id in (None, "") or structure_id in (None, ""):
            return Response({"detail": "Both 'student_id' and 'fee_structure_id' are required."}, status=400)
        try:
            amount = float(payload.get("discount_amount") or 0)
            percent = float(payload.get("discount_percent") or 0)
        except (TypeError, ValueError):
            return Response({"detail": "Discount amounts must be numbers."}, status=400)
        if amount < 0 or percent < 0 or percent > 100:
            return Response({"detail": "Discount amount must be non-negative and percent between 0 and 100."}, status=400)
        if amount == 0 and percent == 0:
            return Response({"detail": "Enter a discount amount or a percentage."}, status=400)
        concession_type = payload.get("concession_type") or "Scholarship"
        if concession_type not in self.CONCESSION_TYPES:
            return Response({"detail": f"Unknown concession type '{concession_type}'."}, status=400)
        try:
            with connection.cursor() as cursor:
                cursor.execute(
                    "INSERT INTO portal_fee_concession "
                    "(student_id, fee_structure_id, concession_type, discount_amount, discount_percent, reason) "
                    "VALUES (%s, %s, %s, %s, %s, %s) RETURNING id",
                    [student_id, structure_id, concession_type, amount, percent, payload.get("reason") or ""],
                )
                new_id = cursor.fetchone()[0]
        except IntegrityError:
            return Response(
                {"detail": "Could not create the record: a referenced record is missing or a unique value already exists."},
                status=400,
            )
        log_action(request.user, "fee.concession.create", "portal_fee_concession", new_id, {
            "student_id": student_id, "fee_structure_id": structure_id, "concession_type": concession_type,
        })
        return Response({"id": new_id, "detail": "Concession applied."}, status=201)

    @extend_schema(
        operation_id="AdminFeeConcessionDelete",
        summary="Remove a concession",
        tags=["Finance"],
        parameters=[
            OpenApiParameter(name="id", type=OpenApiTypes.INT, location=OpenApiParameter.QUERY, required=True),
        ],
        responses={200: DetailErrorSerializer, 404: DetailErrorSerializer, **ERROR_RESPONSES},
    )
    def delete(self, request):
        try:
            record_id = int(request.query_params.get("id", ""))
        except (TypeError, ValueError):
            return Response({"detail": "The 'id' query parameter is required."}, status=400)
        with connection.cursor() as cursor:
            cursor.execute("DELETE FROM portal_fee_concession WHERE id = %s", [record_id])
            if cursor.rowcount == 0:
                return Response({"detail": "Not found."}, status=404)
        log_action(request.user, "fee.concession.delete", "portal_fee_concession", record_id)
        return Response({"detail": "Removed."})


def _ledger_rows_for_structure(structure_id):
    """Compute the per-student ledger for a fee structure on the fly.

    Gross comes from the structure's total; concessions reduce it; fines
    accrue past the due date; payments (status='Success') reduce the balance.
    Everything is computed in Python so the query stays vendor-portable.
    """
    fs = row(
        "SELECT id, total_amount, due_date, late_fine_per_day FROM portal_fee_structure WHERE id = %s",
        [structure_id],
    )
    if fs is None:
        return None
    gross = float(fs.get("total_amount") or 0)
    due_date = _date_of(fs.get("due_date"))
    late_fine_per_day = float(fs.get("late_fine_per_day") or 0)
    today = date.today()

    assignments = rows(
        "SELECT a.id, a.student_id, a.fee_structure_id, "
        "COALESCE(u.first_name || ' ' || u.last_name, u.username) AS student_name, "
        "sp.admission_number "
        "FROM portal_fee_assignment a "
        "JOIN auth_user u ON u.id = a.student_id "
        "LEFT JOIN portal_student_profile sp ON sp.user_id = a.student_id "
        "WHERE a.fee_structure_id = %s ORDER BY u.first_name, u.last_name",
        [structure_id],
    )
    concessions = rows(
        "SELECT student_id, discount_amount, discount_percent FROM portal_fee_concession "
        "WHERE fee_structure_id = %s",
        [structure_id],
    ) if table_exists("portal_fee_concession") else []
    payments = rows(
        "SELECT student_id, amount_paid FROM portal_payment "
        "WHERE fee_structure_id = %s AND status = 'Success'",
        [structure_id],
    ) if table_exists("portal_payment") else []

    concession_by_student = {}
    for c in concessions:
        sid = c["student_id"]
        concession_by_student[sid] = concession_by_student.get(sid, 0) + (
            float(c["discount_amount"] or 0)
            or gross * float(c["discount_percent"] or 0) / 100.0
        )
    paid_by_student = {}
    for p in payments:
        sid = p["student_id"]
        paid_by_student[sid] = paid_by_student.get(sid, 0) + float(p["amount_paid"] or 0)

    ledger = []
    for a in assignments:
        sid = a["student_id"]
        concession_amount = round(concession_by_student.get(sid, 0), 2)
        net_payable = round(gross - concession_amount, 2)
        amount_paid = round(paid_by_student.get(sid, 0), 2)
        overdue_days = (today - due_date).days if due_date and due_date < today else 0
        fine_amount = round(overdue_days * late_fine_per_day, 2) if overdue_days > 0 and amount_paid < net_payable else 0
        balance_due = round(max(0.0, net_payable + fine_amount - amount_paid), 2)
        if amount_paid > 0 and balance_due <= 0:
            status = "Paid"
        elif amount_paid > 0:
            status = "Partial"
        elif due_date and due_date < today:
            status = "Overdue"
        else:
            status = "Unpaid"
        ledger.append({
            "id": a["id"],
            "student_id": sid,
            "student_name": a["student_name"],
            "admission_number": a.get("admission_number"),
            "gross_amount": gross,
            "concession_amount": concession_amount,
            "fine_amount": fine_amount,
            "net_payable": net_payable,
            "amount_paid": amount_paid,
            "balance_due": balance_due,
            "status": status,
        })
    return ledger


class FeeLedgerView(AdminMixin, APIView):
    """Per-student ledger for a fee structure, computed on read so payments
    and concessions are always reflected."""

    @extend_schema(
        operation_id="AdminFeeLedgerList",
        summary="View the student ledger",
        description="Returns the computed ledger for a fee structure (query param fee_structure_id).",
        tags=["Finance"],
        parameters=[
            OpenApiParameter(
                name="fee_structure_id",
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                required=True,
            ),
        ],
        responses={200: serializers.ListSerializer(child=_FeeLedgerItem), **ERROR_RESPONSES},
    )
    def get(self, request):
        if not table_exists("portal_fee_assignment"):
            return Response([])
        structure_id = request.query_params.get("fee_structure_id")
        if structure_id in (None, ""):
            return Response({"detail": "The 'fee_structure_id' query parameter is required."}, status=400)
        ledger = _ledger_rows_for_structure(structure_id)
        if ledger is None:
            return Response({"detail": "Fee structure not found."}, status=404)
        return Response(serialise(ledger))

    @extend_schema(
        operation_id="AdminFeeLedgerGenerate",
        summary="Generate the student ledger",
        description="Validates the fee structure and refreshes the computed ledger.",
        tags=["Finance"],
        request=_FeeLedgerGenerateRequest,
        responses={200: _DetailResponseSerializer, **ERROR_RESPONSES},
    )
    def post(self, request):
        if not table_exists("portal_fee_assignment"):
            return Response({"detail": "Table not found. Apply the schema extension SQL first."}, status=400)
        structure_id = request.data.get("fee_structure_id") if isinstance(request.data, dict) else None
        if structure_id in (None, ""):
            return Response({"detail": "The 'fee_structure_id' field is required."}, status=400)
        if not table_exists("portal_fee_structure"):
            return Response({"detail": "Table not found. Apply the schema extension SQL first."}, status=400)
        if row("SELECT id FROM portal_fee_structure WHERE id = %s", [structure_id]) is None:
            return Response({"detail": "Fee structure not found."}, status=404)
        log_action(request.user, "fee.ledger.generate", "portal_fee_structure", structure_id)
        return Response({"detail": "Ledger generated."})


class FeeReportsView(AdminMixin, APIView):
    """Fee collection reports: summary stats, per-structure collection,
    monthly collection and outstanding balances, all computed on read."""

    @extend_schema(
        operation_id="AdminFeeReports",
        summary="Fee collection reports",
        description="Returns collection summary, per-structure, monthly (last 12 months) and outstanding stats.",
        tags=["Finance"],
        parameters=[
            OpenApiParameter(
                name="academic_year_id",
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                required=False,
                description="Restrict structures and payments to an academic year.",
            ),
        ],
        responses={200: _FeeReportsResponse, **ERROR_RESPONSES},
    )
    def get(self, request):
        ay_id = request.query_params.get("academic_year_id")
        ay = None
        if ay_id:
            ay = row("SELECT start_date, end_date FROM portal_academic_year WHERE id = %s", [ay_id])
        structures = []
        pending = []
        monthly = []
        summary = {"total_collected": 0, "collected_this_month": 0, "unique_payers": 0, "total_transactions": 0}

        if table_exists("portal_fee_structure") and table_exists("portal_class"):
            where = " WHERE fs.academic_year_id = %s" if ay_id else ""
            params = [ay_id] if ay_id else []
            structures = rows(
                "SELECT fs.id, fs.term_name, fs.total_amount, fs.due_date, fs.is_published, "
                "c.name || '-' || c.section AS class_name, c.section, "
                "COALESCE((SELECT SUM(p.amount_paid) FROM portal_payment p "
                "          WHERE p.fee_structure_id = fs.id AND p.status = 'Success'), 0) AS amount_collected "
                "FROM portal_fee_structure fs JOIN portal_class c ON c.id = fs.class_id"
                + where
                + " ORDER BY fs.id",
                params,
            )

        if table_exists("portal_payment"):
            payments = rows(
                "SELECT student_id, amount_paid, paid_at FROM portal_payment WHERE status = 'Success'"
            )
            if ay and (ay.get("start_date") or ay.get("end_date")):
                start = _date_of(ay.get("start_date"))
                end = _date_of(ay.get("end_date"))
            else:
                start = end = None
            total = 0.0
            this_month = 0.0
            payers = set()
            buckets = {}
            tx_count = 0
            today = date.today()
            for p in payments:
                paid_at = _date_of(p.get("paid_at"))
                if start and paid_at and (paid_at < start or paid_at > end):
                    continue
                amount = float(p["amount_paid"] or 0)
                total += amount
                tx_count += 1
                payers.add(p["student_id"])
                if paid_at and paid_at.year == today.year and paid_at.month == today.month:
                    this_month += amount
                month_key = paid_at.strftime("%Y-%m") if paid_at else None
                if month_key:
                    buckets[month_key] = buckets.get(month_key, 0) + amount
            summary = {
                "total_collected": round(total, 2),
                "collected_this_month": round(this_month, 2),
                "unique_payers": len(payers),
                "total_transactions": tx_count,
            }
            for offset in range(11, -1, -1):
                anchor = today - timedelta(days=offset * 30)
                key = anchor.strftime("%Y-%m")
                monthly.append({"month": key, "collected": round(buckets.get(key, 0.0), 2)})

        if table_exists("portal_fee_assignment") and table_exists("portal_fee_structure"):
            if ay_id:
                structures_for_pending = [s["id"] for s in structures]
            else:
                structures_for_pending = [r["id"] for r in rows("SELECT id FROM portal_fee_structure")]
            buckets = {}
            for structure_id in structures_for_pending:
                ledger = _ledger_rows_for_structure(structure_id) or []
                for entry in ledger:
                    bucket = buckets.setdefault(entry["status"], {"total_balance": 0.0, "count": 0})
                    bucket["total_balance"] += entry["balance_due"]
                    bucket["count"] += 1
            pending = [
                {"status": status, "total_balance": round(b["total_balance"], 2), "count": b["count"]}
                for status, b in buckets.items()
            ]
            pending.sort(key=lambda p: p["total_balance"], reverse=True)

        return Response(serialise({
            "summary": summary,
            "structures": structures,
            "monthly": monthly,
            "pending": pending,
        }))


# ---------------------------------------------------------------------------
# Transport module — drivers, attendants, pickup points, passes, trips,
# alerts, settings, live map and reports.
# ---------------------------------------------------------------------------

@extend_schema_view(
    get=extend_schema(
        operation_id="AdminTransportDriverList",
        summary="List transport drivers",
        description="Returns all drivers joined with their user name and assigned vehicle.",
        tags=["Transport"],
        responses={200: serializers.ListSerializer(child=_TransportDriverItem), **ERROR_RESPONSES},
    ),
    post=extend_schema(
        operation_id="AdminTransportDriverCreate",
        summary="Register a driver",
        description="Registers a driver (auth user id) with license and phone details.",
        tags=["Transport"],
        request=_TransportDriverCreateRequest,
        responses={200: IdDetailResponseSerializer, **ERROR_RESPONSES},
    ),
)
class TransportDriverView(SimpleTableView):
    table = "portal_driver"
    columns = ("user_id", "license_number", "phone", "vehicle_id")
    order_by = "id"
    int_columns = ("user_id", "vehicle_id")

    def get(self, request):
        if not table_exists(self.table):
            return Response([])
        data = rows(
            "SELECT d.id, d.user_id, d.license_number, d.phone, d.vehicle_id, d.is_active, "
            "COALESCE(u.first_name || ' ' || u.last_name, u.username) AS name, "
            "v.vehicle_number "
            "FROM portal_driver d "
            "JOIN auth_user u ON u.id = d.user_id "
            "LEFT JOIN portal_vehicle v ON v.id = d.vehicle_id "
            "ORDER BY u.first_name, u.last_name"
        )
        return Response(serialise(data))


@extend_schema_view(
    get=extend_schema(
        operation_id="AdminTransportAttendantList",
        summary="List transport attendants",
        description="Returns all attendants joined with their user name and assigned route.",
        tags=["Transport"],
        responses={200: serializers.ListSerializer(child=_TransportAttendantItem), **ERROR_RESPONSES},
    ),
    post=extend_schema(
        operation_id="AdminTransportAttendantCreate",
        summary="Register an attendant",
        description="Registers an attendant (auth user id) with phone and an optional route.",
        tags=["Transport"],
        request=_TransportAttendantCreateRequest,
        responses={200: IdDetailResponseSerializer, **ERROR_RESPONSES},
    ),
)
class TransportAttendantView(SimpleTableView):
    table = "portal_attendant"
    columns = ("user_id", "phone", "assigned_route_id")
    order_by = "id"
    int_columns = ("user_id", "assigned_route_id")

    def get(self, request):
        if not table_exists(self.table):
            return Response([])
        data = rows(
            "SELECT a.id, a.user_id, a.phone, a.assigned_route_id, a.is_active, "
            "COALESCE(u.first_name || ' ' || u.last_name, u.username) AS name, "
            "r.route_name "
            "FROM portal_attendant a "
            "JOIN auth_user u ON u.id = a.user_id "
            "LEFT JOIN portal_route r ON r.id = a.assigned_route_id "
            "ORDER BY u.first_name, u.last_name"
        )
        return Response(serialise(data))


@extend_schema_view(
    get=extend_schema(
        operation_id="AdminTransportPickupPointList",
        summary="List pickup points",
        description="Returns pickup/drop stops, optionally filtered by route_id, ordered by sequence.",
        tags=["Transport"],
        parameters=[
            OpenApiParameter(
                name="route_id",
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                required=False,
            ),
        ],
        responses={200: serializers.ListSerializer(child=_TransportPickupPointItem), **ERROR_RESPONSES},
    ),
    post=extend_schema(
        operation_id="AdminTransportPickupPointCreate",
        summary="Add a pickup point",
        description="Adds a stop to a route with sequence order and optional times.",
        tags=["Transport"],
        request=_TransportPickupPointCreateRequest,
        responses={200: IdDetailResponseSerializer, **ERROR_RESPONSES},
    ),
)
class TransportPickupPointView(SimpleTableView):
    table = "portal_pickup_point"
    columns = ("route_id", "name", "sequence_order", "pickup_time", "drop_time")
    order_by = "sequence_order, id"
    int_columns = ("route_id", "sequence_order")

    def get(self, request):
        if not table_exists(self.table):
            return Response([])
        route_id = request.query_params.get("route_id")
        if route_id:
            data = rows(
                "SELECT pp.id, pp.route_id, pp.name, pp.sequence_order, pp.pickup_time, pp.drop_time, "
                "r.route_name "
                "FROM portal_pickup_point pp "
                "JOIN portal_route r ON r.id = pp.route_id "
                "WHERE pp.route_id = %s ORDER BY pp.sequence_order, pp.id",
                [route_id],
            )
        else:
            data = rows(
                "SELECT pp.id, pp.route_id, pp.name, pp.sequence_order, pp.pickup_time, pp.drop_time, "
                "r.route_name "
                "FROM portal_pickup_point pp "
                "JOIN portal_route r ON r.id = pp.route_id "
                "ORDER BY pp.route_id, pp.sequence_order, pp.id"
            )
        return Response(serialise(data))


class TransportPassView(AdminMixin, APIView):
    """Issues transport passes for allocated students (one per student)."""

    @extend_schema(
        operation_id="AdminTransportPassList",
        summary="List transport passes",
        description="Returns all issued passes joined with the student and allocation.",
        tags=["Transport"],
        responses={200: serializers.ListSerializer(child=_TransportPassItem), **ERROR_RESPONSES},
    )
    def get(self, request):
        if not table_exists("portal_transport_pass"):
            return Response([])
        data = rows(
            "SELECT tp.id, tp.student_id, tp.pass_number, tp.issued_at, "
            "COALESCE(u.first_name || ' ' || u.last_name, u.username) AS student_name, "
            "r.route_name, v.vehicle_number, a.pickup_point "
            "FROM portal_transport_pass tp "
            "JOIN auth_user u ON u.id = tp.student_id "
            "LEFT JOIN portal_transport_allocation a ON a.student_id = tp.student_id "
            "LEFT JOIN portal_route r ON r.id = a.route_id "
            "LEFT JOIN portal_vehicle v ON v.id = a.vehicle_id "
            "ORDER BY tp.id DESC"
        )
        return Response(serialise(data))

    @extend_schema(
        operation_id="AdminTransportPassGenerate",
        summary="Generate a transport pass",
        description="Issues a pass for a student; existing passes are returned unchanged.",
        tags=["Transport"],
        request=_TransportPassGenerateRequest,
        responses={200: _TransportPassItem, **ERROR_RESPONSES},
    )
    def post(self, request):
        if not table_exists("portal_transport_pass"):
            return Response({"detail": "Table not found. Apply the schema extension SQL first."}, status=400)
        payload = request.data if isinstance(request.data, dict) else {}
        student_id = payload.get("student_id")
        if student_id in (None, ""):
            return Response({"detail": "The 'student_id' field is required."}, status=400)
        existing = row(
            "SELECT tp.pass_number, tp.student_id, "
            "COALESCE(u.first_name || ' ' || u.last_name, u.username) AS student_name, "
            "r.route_name, v.vehicle_number, a.pickup_point "
            "FROM portal_transport_pass tp "
            "JOIN auth_user u ON u.id = tp.student_id "
            "LEFT JOIN portal_transport_allocation a ON a.student_id = tp.student_id "
            "LEFT JOIN portal_route r ON r.id = a.route_id "
            "LEFT JOIN portal_vehicle v ON v.id = a.vehicle_id "
            "WHERE tp.student_id = %s",
            [student_id],
        )
        if existing:
            return Response(serialise(existing))
        pass_number = f"EP-{date.today().year}-{uuid.uuid4().hex[:8].upper()}"
        try:
            with connection.cursor() as cursor:
                cursor.execute(
                    "INSERT INTO portal_transport_pass (student_id, pass_number) VALUES (%s, %s) RETURNING id",
                    [student_id, pass_number],
                )
                new_id = cursor.fetchone()[0]
        except IntegrityError:
            return Response(
                {"detail": "Could not create the record: a referenced record is missing or a unique value already exists."},
                status=400,
            )
        log_action(request.user, "transport.pass.generate", "portal_transport_pass", new_id, {"student_id": student_id, "pass_number": pass_number})
        return Response(serialise(row(
            "SELECT tp.pass_number, tp.student_id, "
            "COALESCE(u.first_name || ' ' || u.last_name, u.username) AS student_name, "
            "r.route_name, v.vehicle_number, a.pickup_point "
            "FROM portal_transport_pass tp "
            "JOIN auth_user u ON u.id = tp.student_id "
            "LEFT JOIN portal_transport_allocation a ON a.student_id = tp.student_id "
            "LEFT JOIN portal_route r ON r.id = a.route_id "
            "LEFT JOIN portal_vehicle v ON v.id = a.vehicle_id "
            "WHERE tp.student_id = %s",
            [student_id],
        )), status=201)


_TRIP_STATUS_FLOW = {
    "Scheduled": ("In Progress", "Cancelled"),
    "In Progress": ("Completed", "Cancelled"),
}


class TransportTripView(AdminMixin, APIView):
    """Daily trip logs with Scheduled -> In Progress -> Completed lifecycle."""

    @extend_schema(
        operation_id="AdminTransportTripList",
        summary="List trips for a date",
        description="Returns the trips logged for a date (default: today).",
        tags=["Transport"],
        parameters=[
            OpenApiParameter(
                name="date",
                type=OpenApiTypes.DATE,
                location=OpenApiParameter.QUERY,
                required=False,
                description="Trip date (YYYY-MM-DD); defaults to today.",
            ),
        ],
        responses={200: serializers.ListSerializer(child=_TransportTripItem), **ERROR_RESPONSES},
    )
    def get(self, request):
        if not table_exists("portal_transport_trip"):
            return Response([])
        trip_date = request.query_params.get("date") or date.today().isoformat()
        data = rows(
            "SELECT t.id, t.vehicle_id, t.route_id, t.trip_date, t.status, t.started_at, t.ended_at, "
            "v.vehicle_number, r.route_name "
            "FROM portal_transport_trip t "
            "JOIN portal_vehicle v ON v.id = t.vehicle_id "
            "LEFT JOIN portal_route r ON r.id = t.route_id "
            "WHERE t.trip_date = %s ORDER BY t.id DESC",
            [trip_date],
        )
        return Response(serialise(data))

    @extend_schema(
        operation_id="AdminTransportTripCreate",
        summary="Schedule a trip",
        description="Creates a scheduled trip for a vehicle (and optionally a route).",
        tags=["Transport"],
        request=_TransportTripCreateRequest,
        responses={200: IdDetailResponseSerializer, **ERROR_RESPONSES},
    )
    def post(self, request):
        if not table_exists("portal_transport_trip"):
            return Response({"detail": "Table not found. Apply the schema extension SQL first."}, status=400)
        payload = request.data if isinstance(request.data, dict) else {}
        vehicle_id = payload.get("vehicle_id")
        if vehicle_id in (None, ""):
            return Response({"detail": "The 'vehicle_id' field is required."}, status=400)
        try:
            with connection.cursor() as cursor:
                cursor.execute(
                    "INSERT INTO portal_transport_trip (vehicle_id, route_id, status) "
                    "VALUES (%s, %s, 'Scheduled') RETURNING id",
                    [vehicle_id, payload.get("route_id")],
                )
                new_id = cursor.fetchone()[0]
        except IntegrityError:
            return Response(
                {"detail": "Could not create the record: a referenced record is missing or a unique value already exists."},
                status=400,
            )
        log_action(request.user, "transport.trip.create", "portal_transport_trip", new_id, {"vehicle_id": vehicle_id})
        return Response({"id": new_id, "detail": "Trip scheduled."}, status=201)

    @extend_schema(
        operation_id="AdminTransportTripUpdate",
        summary="Update a trip status",
        description="Moves a trip through Scheduled -> In Progress -> Completed (or Cancelled).",
        tags=["Transport"],
        request=_TransportTripPatchRequest,
        responses={200: IdDetailResponseSerializer, **ERROR_RESPONSES},
    )
    def patch(self, request):
        if not table_exists("portal_transport_trip"):
            return Response({"detail": "Table not found. Apply the schema extension SQL first."}, status=400)
        payload = request.data if isinstance(request.data, dict) else {}
        trip_id = payload.get("id")
        new_status = payload.get("status")
        if trip_id in (None, ""):
            return Response({"detail": "The 'id' field is required."}, status=400)
        current = row("SELECT status FROM portal_transport_trip WHERE id = %s", [trip_id])
        if current is None:
            return Response({"detail": "Not found."}, status=404)
        allowed = _TRIP_STATUS_FLOW.get(current["status"], ())
        if new_status not in allowed:
            return Response(
                {"detail": f"Invalid transition from '{current['status']}' to '{new_status}'."},
                status=400,
            )
        cols, values = ["status"], [new_status]
        if new_status == "In Progress":
            cols.append("started_at")
            values.append(now())
        elif new_status == "Completed":
            cols.append("ended_at")
            values.append(now())
        with connection.cursor() as cursor:
            cursor.execute(_compose_update_statement(self.table, cols), values + [trip_id])
        log_action(request.user, "transport.trip.update", "portal_transport_trip", trip_id, {"status": new_status})
        return Response({"id": trip_id, "detail": f"Trip marked {new_status}."})


class TransportAlertView(AdminMixin, APIView):
    ALERT_TYPES = ("Bus Arrived", "Delay Alert", "Route Changed", "Emergency", "Info")

    @extend_schema(
        operation_id="AdminTransportAlertList",
        summary="List transport alerts",
        description="Returns recent broadcast alerts, newest first.",
        tags=["Transport"],
        responses={200: serializers.ListSerializer(child=_TransportAlertItem), **ERROR_RESPONSES},
    )
    def get(self, request):
        if not table_exists("portal_transport_alert"):
            return Response([])
        data = rows(
            "SELECT al.id, al.type, al.message, al.vehicle_id, al.route_id, al.created_at, "
            "r.route_name, COALESCE(u.first_name || ' ' || u.last_name, u.username) AS created_by_name "
            "FROM portal_transport_alert al "
            "LEFT JOIN portal_route r ON r.id = al.route_id "
            "LEFT JOIN auth_user u ON u.id = al.created_by "
            "ORDER BY al.created_at DESC LIMIT 100"
        )
        return Response(serialise(data))

    @extend_schema(
        operation_id="AdminTransportAlertCreate",
        summary="Broadcast a transport alert",
        description="Broadcasts an alert to students and parents on a route/vehicle (optional).",
        tags=["Transport"],
        request=_TransportAlertCreateRequest,
        responses={200: IdDetailResponseSerializer, **ERROR_RESPONSES},
    )
    def post(self, request):
        if not table_exists("portal_transport_alert"):
            return Response({"detail": "Table not found. Apply the schema extension SQL first."}, status=400)
        payload = request.data if isinstance(request.data, dict) else {}
        message = payload.get("message")
        if not message or not str(message).strip():
            return Response({"detail": "The 'message' field is required."}, status=400)
        alert_type = payload.get("type") or "Info"
        if alert_type not in self.ALERT_TYPES:
            return Response({"detail": f"Unknown alert type '{alert_type}'."}, status=400)
        with connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO portal_transport_alert (type, message, vehicle_id, route_id, created_by) "
                "VALUES (%s, %s, %s, %s, %s) RETURNING id",
                [alert_type, str(message).strip(), payload.get("vehicle_id"), payload.get("route_id"), request.user.id],
            )
            new_id = cursor.fetchone()[0]
        log_action(request.user, "transport.alert", "portal_transport_alert", new_id, {"type": alert_type})
        return Response({"id": new_id, "detail": "Alert broadcast sent."}, status=201)


class TransportSettingsView(AdminMixin, APIView):
    """Single-row transport configuration (desk contact, fees, GPS interval)."""

    @extend_schema(
        operation_id="AdminTransportSettingsGet",
        summary="Get transport settings",
        description="Returns the transport configuration row (or defaults).",
        tags=["Transport"],
        responses={200: _TransportSettingsItem, **ERROR_RESPONSES},
    )
    def get(self, request):
        if not table_exists("portal_transport_settings"):
            return Response({})
        settings = row("SELECT * FROM portal_transport_settings WHERE id = 1")
        if settings is None:
            return Response({})
        return Response(serialise(settings))

    @extend_schema(
        operation_id="AdminTransportSettingsSave",
        summary="Save transport settings",
        description="Upserts the single transport configuration row.",
        tags=["Transport"],
        request=_TransportSettingsItem,
        responses={200: _TransportSettingsItem, **ERROR_RESPONSES},
    )
    def post(self, request):
        if not table_exists("portal_transport_settings"):
            return Response({"detail": "Table not found. Apply the schema extension SQL first."}, status=400)
        payload = request.data if isinstance(request.data, dict) else {}
        interval = payload.get("gps_update_interval_sec")
        if interval not in (None, ""):
            try:
                interval = int(interval)
            except (TypeError, ValueError):
                return Response({"detail": "'gps_update_interval_sec' must be an integer."}, status=400)
            if interval < 1:
                return Response({"detail": "'gps_update_interval_sec' must be at least 1."}, status=400)
        fee = payload.get("annual_transport_fee")
        if fee not in (None, ""):
            try:
                if float(fee) < 0:
                    return Response({"detail": "'annual_transport_fee' cannot be negative."}, status=400)
            except (TypeError, ValueError):
                return Response({"detail": "'annual_transport_fee' must be a number."}, status=400)
        cols = [c for c in ("contact_number", "annual_transport_fee", "fee_due_date", "gps_update_interval_sec") if c in payload]
        values = [payload[c] for c in cols]
        if not cols:
            return Response({"detail": "No settings fields were provided."}, status=400)
        stmt = _compose_upsert_settings(cols)
        with connection.cursor() as cursor:
            cursor.execute(stmt, values)
        log_action(request.user, "transport.settings.update", "portal_transport_settings", 1, dict(zip(cols, values, strict=False)))
        return Response(serialise(row("SELECT * FROM portal_transport_settings WHERE id = 1")))


def _compose_upsert_settings(cols):
    """Upsert the single-row transport settings table (id = 1)."""
    return (
        pysql.SQL("INSERT INTO portal_transport_settings (id, ")
        + pysql.SQL(", ").join(pysql.Identifier(c) for c in cols)
        + pysql.SQL(") VALUES (1, ")
        + pysql.SQL(", ").join(pysql.Placeholder() for _ in cols)
        + pysql.SQL(") ON CONFLICT (id) DO UPDATE SET ")
        + pysql.SQL(", ").join(
            pysql.Identifier(c) + pysql.SQL(" = EXCLUDED.") + pysql.Identifier(c)
            for c in cols
        )
    )


class TransportReportsView(AdminMixin, APIView):
    """Fleet/route utilisation overview for the transport dashboard."""

    @extend_schema(
        operation_id="AdminTransportReports",
        summary="Transport overview reports",
        description="Returns vehicle/route/student counts, route utilisation and recent trips.",
        tags=["Transport"],
        responses={200: _TransportReportsResponse, **ERROR_RESPONSES},
    )
    def get(self, request):
        def count(table):
            if not table_exists(table):
                return 0
            r = row(pysql.SQL("SELECT COUNT(*) AS c FROM {}").format(pysql.Identifier(table)))
            return int(r["c"]) if r else 0

        total_vehicles = count("portal_vehicle")
        total_routes = count("portal_route")
        allocated_students = count("portal_transport_allocation")
        active_passes = count("portal_transport_pass")
        active_trips = 0
        if table_exists("portal_transport_trip"):
            r = row(
                "SELECT COUNT(*) AS c FROM portal_transport_trip "
                "WHERE trip_date = %s AND status = 'In Progress'",
                [date.today().isoformat()],
            )
            active_trips = int(r["c"]) if r else 0

        route_utilisation = []
        if table_exists("portal_route"):
            route_utilisation = rows(
                "SELECT r.route_name, r.start_point, r.end_point, v.vehicle_number, v.capacity, "
                "(SELECT CAST(COUNT(*) AS INTEGER) FROM portal_transport_allocation a "
                " WHERE a.route_id = r.id) AS student_count "
                "FROM portal_route r "
                "LEFT JOIN portal_vehicle v ON v.id = r.vehicle_id "
                "ORDER BY r.route_name"
            )

        recent_trips = []
        if table_exists("portal_transport_trip"):
            recent_trips = rows(
                "SELECT t.trip_date, t.started_at, t.status, "
                "v.vehicle_number, r.route_name "
                "FROM portal_transport_trip t "
                "JOIN portal_vehicle v ON v.id = t.vehicle_id "
                "LEFT JOIN portal_route r ON r.id = t.route_id "
                "ORDER BY t.id DESC LIMIT 10"
            )

        return Response(serialise({
            "total_vehicles": total_vehicles,
            "total_routes": total_routes,
            "allocated_students": allocated_students,
            "active_trips": active_trips,
            "active_passes": active_passes,
            "route_utilisation": route_utilisation,
            "recent_trips": recent_trips,
        }))


class TransportLiveMapView(AdminMixin, APIView):
    """Live fleet snapshot (vehicles and their maintenance state)."""

    @extend_schema(
        operation_id="AdminTransportLiveMap",
        summary="Live fleet map",
        description="Returns the current vehicle fleet for the live map overlay.",
        tags=["Transport"],
        responses={200: serializers.ListSerializer(child=_TransportLiveMapItem), **ERROR_RESPONSES},
    )
    def get(self, request):
        if not table_exists("portal_vehicle"):
            return Response([])
        data = rows(
            "SELECT id AS vehicle_id, vehicle_number, maintenance_status "
            "FROM portal_vehicle ORDER BY vehicle_number"
        )
        return Response(serialise(data))

