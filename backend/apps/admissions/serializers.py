from rest_framework import serializers
from .models import AdmissionEnquiry


class AdmissionEnquirySerializer(serializers.ModelSerializer):
    """Public-facing serializer: applicants can CREATE and can check their
    own status by registration_number, but cannot set status/review fields."""
    class Meta:
        model = AdmissionEnquiry
        fields = [
            "id", "registration_number", "applicant_name", "date_of_birth",
            "gender", "target_class", "parent_name", "parent_phone",
            "parent_email", "address", "scholarship_applied",
            "id_proof_document", "status", "submitted_at",
        ]
        read_only_fields = ["id", "registration_number", "status", "submitted_at"]

    def validate_id_proof_document(self, value):
        if value is None:
            return value
        import os
        from django.conf import settings

        max_size = getattr(settings, "MAX_UPLOAD_SIZE_MB", 20) * 1024 * 1024
        if hasattr(value, "size") and value.size > max_size:
            raise serializers.ValidationError(
                f"File exceeds the {getattr(settings, 'MAX_UPLOAD_SIZE_MB', 20)} MB size limit."
            )
        name = getattr(value, "name", "") or ""
        allowed = {".pdf", ".jpg", ".jpeg", ".png", ".webp", ".gif", ".doc", ".docx"}
        ext = os.path.splitext(name)[1].lower()
        if ext and ext not in allowed:
            raise serializers.ValidationError(
                "Unsupported file type. Use a PDF, image or Word document."
            )
        return value
