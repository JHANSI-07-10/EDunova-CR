"""Shared drf-spectacular schema building blocks for the raw-SQL portal views.

The portal API layer intentionally has no DRF serializers: the views execute
raw SQL and return hand-shaped dictionaries. This module provides the reusable
`inline_serializer` / `OpenApiParameter` / `OpenApiExample` building blocks used
by ``@extend_schema`` decorators across the portal view files so the generated
OpenAPI schema is complete, consistent and easy to maintain.

None of these classes are ever instantiated or used for (de)serialization —
they exist purely so drf-spectacular can render request/response shapes,
examples and query/path parameters in Swagger UI / ReDoc.
"""

from drf_spectacular.openapi import AutoSchema
from drf_spectacular.settings import spectacular_settings
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import (
    OpenApiExample,
    OpenApiParameter,
    inline_serializer,
)
from rest_framework import serializers


class MultiRouteAutoSchema(AutoSchema):
    """AutoSchema whose operation_id is derived from the concrete URL route.

    Used only for views that are mounted on two paths (e.g. a collection path
    and a detail/action path). drf-spectacular auto-generates the same
    operationId for both because both share the same handler methods, so we
    hand out unique ids here.

    Subclasses must fill ``OPERATION_IDS`` keyed by ``(HTTP method, url_segments)``
    where ``url_segments`` is the tuple of path segments (path params kept in
    place, e.g. ``'{user_id}'``). Unmapped combinations fall back to the
    default drf-spectacular id.
    """

    OPERATION_IDS = {}

    def get_operation_id(self):
        key = (self.method, self._route_key())
        operation_id = self.OPERATION_IDS.get(key)
        if operation_id:
            return operation_id
        return super().get_operation_id()

    def _route_key(self):
        path = self.path.lstrip("/")
        prefix = (spectacular_settings.SCHEMA_PATH_PREFIX or "").lstrip("/")
        if prefix:
            path = path[len(prefix):].lstrip("/") if path.startswith(prefix) else path
        segments = [seg for seg in path.split("/") if seg]
        return tuple(segments)


# ---------------------------------------------------------------------------
# Common error / detail responses
# ---------------------------------------------------------------------------

DetailErrorSerializer = inline_serializer(
    name="DetailErrorResponse",
    fields={"detail": serializers.CharField(help_text="Human readable error message.")},
)

ValidationErrorSerializer = inline_serializer(
    name="ValidationErrorResponse",
    fields={
        "detail": serializers.CharField(
            help_text="Human readable error message.", required=False
        ),
        "field_errors": serializers.DictField(
            child=serializers.ListField(
                child=serializers.CharField(help_text="Per-field error message.")
            ),
            required=False,
            help_text="Map of field name to list of validation errors.",
        ),
    },
)

# Standard error responses reused across the schema.
ERROR_RESPONSES = {
    400: ValidationErrorSerializer,
    401: DetailErrorSerializer,
    403: DetailErrorSerializer,
    404: DetailErrorSerializer,
    500: DetailErrorSerializer,
}

PORTAL_SCHEMA_MISSING_EXAMPLE = OpenApiExample(
    "PortalSchemaNotApplied",
    value={"detail": "Portal schema has not been applied."},
    description="Returned when the portal extension SQL has not been applied yet.",
)


# ---------------------------------------------------------------------------
# Authentication
# ---------------------------------------------------------------------------

UserPayloadSerializer = inline_serializer(
    name="UserPayload",
    fields={
        "id": serializers.IntegerField(help_text="Django auth user id."),
        "username": serializers.CharField(),
        "email": serializers.EmailField(allow_blank=True),
        "name": serializers.CharField(help_text="Full name of the user."),
        "first_name": serializers.CharField(),
        "last_name": serializers.CharField(),
        "user_type": serializers.CharField(
            help_text="Resolved portal role: Admin, Teacher, Parent, Student or Employee."
        ),
    },
)

LoginStep1RequestSerializer = inline_serializer(
    name="LoginStep1Request",
    fields={
        "email": serializers.CharField(
            required=False,
            help_text="Registered email address (alternative to username).",
        ),
        "username": serializers.CharField(
            required=False, help_text="Registered username (alternative to email)."
        ),
        "password": serializers.CharField(write_only=True, help_text="Account password."),
    },
)

LoginStep1ResponseSerializer = inline_serializer(
    name="LoginStep1Response",
    fields={
        "user_id": serializers.IntegerField(help_text="ID to pass to verify-otp."),
        "user_type": serializers.CharField(),
        "detail": serializers.CharField(help_text="Status message, e.g. 'OTP sent successfully.'"),
    },
)

LOGIN_STEP1_REQUEST_EXAMPLE = OpenApiExample(
    "LoginRequestExample",
    value={"email": "student@edunova.com", "password": "Password@123"},
)

VerifyOtpRequestSerializer = inline_serializer(
    name="VerifyOtpRequest",
    fields={
        "user_id": serializers.IntegerField(help_text="User id returned by auth/login."),
        "otp": serializers.CharField(help_text="6-digit one-time password received by email."),
    },
)

VerifyOtpResponseSerializer = inline_serializer(
    name="VerifyOtpResponse",
    fields={
        "refresh": serializers.CharField(help_text="JWT refresh token."),
        "access": serializers.CharField(help_text="JWT access token (Bearer)."),
        "user": UserPayloadSerializer,
    },
)

VERIFY_OTP_RESPONSE_EXAMPLE = OpenApiExample(
    "VerifyOtpResponseExample",
    value={
        "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "user": {
            "id": 1,
            "username": "student1",
            "email": "student@edunova.com",
            "name": "Aarav Sharma",
            "first_name": "Aarav",
            "last_name": "Sharma",
            "user_type": "Student",
        },
    },
)

ResendOtpRequestSerializer = inline_serializer(
    name="ResendOtpRequest",
    fields={
        "user_id": serializers.IntegerField(
            help_text="User id returned by auth/login to resend OTP for."
        ),
    },
)

TokenRefreshRequestSerializer = inline_serializer(
    name="TokenRefreshRequest",
    fields={"refresh": serializers.CharField(help_text="JWT refresh token.")},
)

TokenRefreshResponseSerializer = inline_serializer(
    name="TokenRefreshResponse",
    fields={"access": serializers.CharField(help_text="New JWT access token.")},
)

TOKEN_REFRESH_EXAMPLE = OpenApiExample(
    "TokenRefreshExample",
    value={"refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."},
)


# ---------------------------------------------------------------------------
# File uploads (multipart/form-data)
# ---------------------------------------------------------------------------

FileUploadRequestSerializer = inline_serializer(
    name="FileUploadRequest",
    fields={
        "file": serializers.FileField(
            help_text="The file to upload (any type).",
        ),
        "bucket": serializers.ChoiceField(
            choices=[
                "lms-resources",
                "assignmentsubmissions",
                "officialdocuments",
                "studentavatars",
            ],
            required=False,
            default="lms-resources",
            help_text="Supabase storage bucket to upload into.",
        ),
    },
)

FileUploadResponseSerializer = inline_serializer(
    name="FileUploadResponse",
    fields={"url": serializers.URLField(help_text="Public URL of the uploaded file.")},
)

FILE_UPLOAD_RESPONSE_EXAMPLE = OpenApiExample(
    "FileUploadResponseExample",
    value={"url": "https://xyz.supabase.co/storage/v1/object/public/lms-resources/abc.pdf"},
)


# ---------------------------------------------------------------------------
# Reusable query parameters
# ---------------------------------------------------------------------------

PAGE_PARAMETERS = [
    OpenApiParameter(
        name="page",
        type=OpenApiTypes.INT,
        location=OpenApiParameter.QUERY,
        required=False,
        description="Page number (1-based).",
    ),
    OpenApiParameter(
        name="page_size",
        type=OpenApiTypes.INT,
        location=OpenApiParameter.QUERY,
        required=False,
        description="Number of records per page (default 20).",
    ),
]

SEARCH_PARAMETERS = [
    OpenApiParameter(
        name="search",
        type=OpenApiTypes.STR,
        location=OpenApiParameter.QUERY,
        required=False,
        description="Search keyword(s).",
    ),
]

ORDERING_PARAMETER = OpenApiParameter(
    name="ordering",
    type=OpenApiTypes.STR,
    location=OpenApiParameter.QUERY,
    required=False,
    description="Comma-separated ordering fields (prefix with '-' for descending).",
)

MONTH_PARAMETER = OpenApiParameter(
    name="month",
    type=OpenApiTypes.STR,
    location=OpenApiParameter.QUERY,
    required=False,
    description="Attendance month filter in 'YYYY-MM' format, e.g. 2025-01.",
)

COURSE_ID_PARAMETER = OpenApiParameter(
    name="course_id",
    type=OpenApiTypes.INT,
    location=OpenApiParameter.QUERY,
    required=True,
    description="LMS course id.",
)

CLASS_ID_PARAMETER = OpenApiParameter(
    name="class_id",
    type=OpenApiTypes.INT,
    location=OpenApiParameter.QUERY,
    required=False,
    description="Class (grade + section) id.",
)

STUDENT_ID_PARAMETER = OpenApiParameter(
    name="student_id",
    type=OpenApiTypes.INT,
    location=OpenApiParameter.QUERY,
    required=False,
    description="Student (auth user) id.",
)

EXAM_SCHEDULE_ID_PARAMETER = OpenApiParameter(
    name="exam_schedule_id",
    type=OpenApiTypes.INT,
    location=OpenApiParameter.QUERY,
    required=True,
    description="Exam schedule id to rank / fetch results for.",
)

EXAM_NAME_PARAMETER = OpenApiParameter(
    name="exam_name",
    type=OpenApiTypes.STR,
    location=OpenApiParameter.QUERY,
    required=False,
    description=(
        "Exam cycle name. One of: Unit_Test_1, Unit_Test_2, Unit_Test_3, "
        "Unit_Test_4, Mid_Term, Final_Term, Pre_Board, Board_Exam."
    ),
)

SEARCH_QUERY_PARAMETER = OpenApiParameter(
    name="q",
    type=OpenApiTypes.STR,
    location=OpenApiParameter.QUERY,
    required=True,
    description="Search keyword.",
)

AUDIENCE_PARAMETER = OpenApiParameter(
    name="audience",
    type=OpenApiTypes.STR,
    location=OpenApiParameter.QUERY,
    required=False,
    description="Filter documents by audience (e.g. 'students', 'teachers', 'parents').",
)


# ---------------------------------------------------------------------------
# Small reusable request serializers used by several portal views
# ---------------------------------------------------------------------------

LeaveRequestSerializer = inline_serializer(
    name="LeaveRequest",
    fields={
        "leave_type": serializers.ChoiceField(
            choices=["Sick", "Casual", "Earned", "Medical", "Other"],
            help_text="Type of leave.",
        ),
        "start_date": serializers.DateField(help_text="Leave start date (YYYY-MM-DD)."),
        "end_date": serializers.DateField(help_text="Leave end date (YYYY-MM-DD)."),
        "reason": serializers.CharField(help_text="Reason for leave."),
    },
)

LeaveSubmitResponseSerializer = inline_serializer(
    name="LeaveSubmitResponse",
    fields={
        "id": serializers.IntegerField(help_text="New leave request id."),
        "detail": serializers.CharField(),
    },
)

IdDetailResponseSerializer = inline_serializer(
    name="IdDetailResponse",
    fields={
        "id": serializers.IntegerField(help_text="Created/updated record id.", required=False),
        "detail": serializers.CharField(),
    },
)

ForumTopicCreateSerializer = inline_serializer(
    name="ForumTopicCreateRequest",
    fields={
        "course_id": serializers.IntegerField(help_text="Course the topic belongs to."),
        "title": serializers.CharField(help_text="Topic title."),
        "content": serializers.CharField(help_text="Topic body (markdown supported)."),
    },
)

ForumPostCreateSerializer = inline_serializer(
    name="ForumPostCreateRequest",
    fields={"post_text": serializers.CharField(help_text="Reply body.")},
)

DigitalNoteCreateSerializer = inline_serializer(
    name="DigitalNoteCreateRequest",
    fields={
        "course_id": serializers.IntegerField(),
        "title": serializers.CharField(help_text="Note title."),
        "body_markdown": serializers.CharField(help_text="Note body in markdown."),
    },
)

MarkCompleteRequestSerializer = inline_serializer(
    name="MarkCompleteRequest",
    fields={"content_id": serializers.IntegerField(help_text="Course content id to mark complete.")},
)

ChatRequestSerializer = inline_serializer(
    name="ChatRequest",
    fields={"message": serializers.CharField(help_text="User's message to the assistant.")},
)

ChatResponseSerializer = inline_serializer(
    name="ChatResponse",
    fields={"reply": serializers.CharField(help_text="Assistant's reply text.")},
)

ChatRequestExample = OpenApiExample(
    "ChatRequestExample",
    value={"message": "What assignments are due?"},
)
