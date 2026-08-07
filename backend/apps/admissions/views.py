from rest_framework import mixins, viewsets
from rest_framework.permissions import AllowAny
from .models import AdmissionEnquiry
from .serializers import AdmissionEnquirySerializer, AdmissionStatusSerializer


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
