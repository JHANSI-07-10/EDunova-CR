from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import (
    OpenApiExample,
    OpenApiParameter,
    extend_schema,
    extend_schema_view,
)
from rest_framework import mixins, viewsets
from rest_framework.permissions import AllowAny
from rest_framework.throttling import ScopedRateThrottle
from .models import AdmissionEnquiry
from .serializers import AdmissionEnquirySerializer, AdmissionStatusSerializer

ADMISSIONS_TAG = ["Admissions"]

ADMISSION_CREATE_EXAMPLE = OpenApiExample(
    "AdmissionEnquiryExample",
    value={
        "applicant_name": "Aarav Sharma",
        "date_of_birth": "2014-05-12",
        "gender": "Male",
        "target_class": "6",
        "parent_name": "Rajesh Sharma",
        "parent_phone": "+919876543210",
        "parent_email": "rajesh@example.com",
        "address": "12, Lake View Road, Bengaluru",
        "scholarship_applied": False,
        "id_proof_document": "https://cdn.example.com/id-proofs/aadhar-1234.pdf",
    },
)

ADMISSION_STATUS_EXAMPLE = OpenApiExample(
    "AdmissionStatusExample",
    value={
        "id": 101,
        "registration_number": "EDN-2026-0001",
        "applicant_name": "Aarav Sharma",
        "status": "Submitted",
        "target_class": "6",
        "submitted_at": "2026-08-06T10:15:30Z",
    },
)


@extend_schema_view(
    create=extend_schema(
        operation_id="AdmissionEnquiryCreate",
        summary="Submit an admission enquiry",
        description=(
            "Public endpoint to submit a new admission application. Returns the generated "
            "registration number which can be used to check application status."
        ),
        tags=ADMISSIONS_TAG,
        request=AdmissionEnquirySerializer,
        responses={201: AdmissionEnquirySerializer},
        examples=[ADMISSION_CREATE_EXAMPLE],
    ),
    retrieve=extend_schema(
        operation_id="AdmissionEnquiryStatus",
        summary="Check admission application status",
        description="Public endpoint for an applicant to check their application status using its registration number.",
        tags=ADMISSIONS_TAG,
        parameters=[
            OpenApiParameter(
                name="registration_number",
                type=OpenApiTypes.STR,
                location=OpenApiParameter.PATH,
                required=True,
                description="Registration number returned when the enquiry was submitted.",
            )
        ],
        responses={200: AdmissionStatusSerializer, 404: None},
        examples=[ADMISSION_STATUS_EXAMPLE],
    ),
)
class AdmissionEnquiryViewSet(mixins.CreateModelMixin,
                               mixins.RetrieveModelMixin,
                               viewsets.GenericViewSet):
    """
    POST /api/admissions/enquiries/            -> submit new application
    GET  /api/admissions/enquiries/{reg_no}/    -> applicant checks own status
    (Admin review/approve/reject happens in the Admin Panel app, not here —
    this app is public-facing only, matching the Flowchart's Visitor scope.)
    """
    queryset = AdmissionEnquiry.objects.all()
    lookup_field = "registration_number"
    permission_classes = [AllowAny]

    def get_serializer_class(self):
        # The public status check must never expose admin pipeline fields
        # (fees, interview/counselling notes, allocation, rejection reason).
        if self.action == "retrieve":
            return AdmissionStatusSerializer
        return AdmissionEnquirySerializer
    # Per-method throttling: strict on write, looser on status lookups so a
    # community IP (campus/NAT) isn't blocked checking multiple applications.
    throttle_classes = [ScopedRateThrottle]
    throttle_scopes = {
        "POST": "admission_enquiry",
        "GET": "admission_status",
    }

