import os
import re

from django.utils import timezone
from rest_framework import serializers

from .models import AdmissionEnquiry


# Lenient phone check: 10-15 digits, optional leading "+", ignoring spaces/dashes.
_PHONE_RE = re.compile(r"^\+?\d{10,15}$")
_PERCENT_RE = re.compile(r"^(100(\.\d{1,2})?|\d{1,2}(\.\d{1,2})?)$")

# Uploaded proof documents: restrict to common safe formats + a size cap so a
# public API cannot be used to store arbitrary files.
_ALLOWED_DOC_TYPES = {".pdf", ".jpg", ".jpeg", ".png", ".gif", ".webp", ".doc", ".docx"}
_MAX_DOC_MB = 5


def _check_doc(value, label):
    if value is None:
        return value
    ext = os.path.splitext(value.name or "")[1].lower()
    if ext not in _ALLOWED_DOC_TYPES:
        raise serializers.ValidationError(
            f"{label}: unsupported file type '{ext or 'unknown'}'. "
            "Allowed: PDF, JPG, PNG, WEBP, DOC/DOCX."
        )
    if value.size and value.size > _MAX_DOC_MB * 1024 * 1024:
        raise serializers.ValidationError(f"{label} must be {_MAX_DOC_MB}MB or smaller.")
    return value


def _check_phone(value, label):
    if value in (None, ""):
        return value
    digits = str(value).replace(" ", "").replace("-", "")
    if not _PHONE_RE.match(digits):
        raise serializers.ValidationError(
            f"{label} must be a valid phone number (10-15 digits, optional + country code)."
        )
    return value


class AdmissionEnquirySerializer(serializers.ModelSerializer):
    """Public-facing serializer: applicants can CREATE and can check their
    own status by registration_number, but cannot set status/review/admin
    pipeline fields. Phone numbers, date-of-birth and percentage are
    validated at the API level (not just in the browser)."""

    class Meta:
        model = AdmissionEnquiry
        fields = [
            "id", "registration_number", "applicant_name", "date_of_birth",
            "gender", "target_class", "blood_group", "aadhaar_number",
            "nationality", "religion", "category", "city", "state", "country",
            "pincode", "parent_name", "parent_phone", "parent_email",
            "father_name", "father_occupation", "father_company", "father_income",
            "father_phone", "father_email",
            "mother_name", "mother_occupation", "mother_company", "mother_phone",
            "mother_email", "guardian_name", "guardian_relationship",
            "guardian_phone", "guardian_address", "emergency_contact_name",
            "emergency_contact_phone", "emergency_contact_relation",
            "address", "permanent_address", "communication_address",
            "prev_school_name", "board", "prev_school_grade", "percentage",
            "reason_for_leaving", "source_of_enquiry", "preferred_branch",
            "curriculum", "scholarship_applied", "has_medical_conditions",
            "medical_details", "allergies", "id_proof_document",
            "doc_aadhaar_card", "doc_address_proof", "doc_birth_certificate",
            "doc_parent_id", "doc_passport_photo", "doc_previous_marks",
            "doc_transfer_certificate",
            # Read-only / workflow state
            "status", "reviewed_by", "rejection_reason", "submitted_at",
            "updated_at", "student_user_id", "parent_user_id",
            "allocated_class", "allocated_section", "counselling_date",
            "counselling_notes", "counselling_status", "counsellor_id",
            "eligibility_notes", "is_eligible", "is_waitlisted",
            "waitlist_position", "seat_allocated", "interview_date",
            "interview_required", "interview_scheduled", "interview_result",
            "fee_amount", "net_fee", "fee_paid", "fee_transaction_id",
            "scholarship_discount", "student_admission_number",
            "student_roll_number",
        ]

        read_only_fields = [
            "id", "registration_number", "status", "reviewed_by",
            "rejection_reason", "submitted_at", "updated_at",
            "student_user_id", "parent_user_id",
            "allocated_class", "allocated_section", "counselling_date",
            "counselling_notes", "counselling_status", "counsellor_id",
            "eligibility_notes", "is_eligible", "is_waitlisted",
            "waitlist_position", "seat_allocated", "interview_date",
            "interview_required", "interview_scheduled", "interview_result",
            "fee_amount", "net_fee", "fee_paid", "fee_transaction_id",
            "scholarship_discount", "student_admission_number",
            "student_roll_number",
        ]

    def validate_parent_phone(self, value):
        if value in (None, ""):
            raise serializers.ValidationError("Parent phone is required.")
        return _check_phone(value, "Parent phone")

    def validate_father_phone(self, value):
        return _check_phone(value, "Father phone")

    def validate_mother_phone(self, value):
        return _check_phone(value, "Mother phone")

    def validate_guardian_phone(self, value):
        return _check_phone(value, "Guardian phone")

    def validate_emergency_contact_phone(self, value):
        return _check_phone(value, "Emergency contact phone")

    def validate_date_of_birth(self, value):
        if value and value > timezone.localdate():
            raise serializers.ValidationError("Date of birth cannot be in the future.")
        return value

    def validate_percentage(self, value):
        if value in (None, ""):
            return value
        if not _PERCENT_RE.match(str(value)):
            raise serializers.ValidationError("Percentage must be a number between 0 and 100.")
        return value

    def validate_id_proof_document(self, value):
        return _check_doc(value, "ID proof document")

    def validate_doc_aadhaar_card(self, value):
        return _check_doc(value, "Aadhaar card")

    def validate_doc_address_proof(self, value):
        return _check_doc(value, "Address proof")

    def validate_doc_birth_certificate(self, value):
        return _check_doc(value, "Birth certificate")

    def validate_doc_parent_id(self, value):
        return _check_doc(value, "Parent ID")

    def validate_doc_passport_photo(self, value):
        return _check_doc(value, "Passport photo")

    def validate_doc_previous_marks(self, value):
        return _check_doc(value, "Previous marks")

    def validate_doc_transfer_certificate(self, value):
        return _check_doc(value, "Transfer certificate")


class AdmissionStatusSerializer(serializers.ModelSerializer):
    """Thin READ-ONLY serializer for the public 'check my application status'
    endpoint (GET /api/admissions/enquiries/{reg_no}/). Deliberately excludes
    every admin pipeline field — fee amounts, allocated class, interview and
    counselling notes, rejection reason, reviewer identity — so an applicant
    can only ever see their own basic application state, never internal
    administration data."""

    class Meta:
        model = AdmissionEnquiry
        fields = [
            "id", "registration_number", "applicant_name", "date_of_birth",
            "gender", "target_class", "parent_name", "status", "submitted_at",
        ]
        read_only_fields = fields

