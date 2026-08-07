import uuid
from django.db import models


def generate_registration_number():
    return f"ADM-{uuid.uuid4().hex[:10].upper()}"


class AdmissionEnquiry(models.Model):
    """Public 'Online Admission Registration Form' — matches the rich schema
    that exists in the production Supabase table (which was created by an
    earlier, fuller schema and whose migrations were faked in). Every column
    of the live table is declared here (with a default for NOT NULL columns)
    so Django INSERTs provide a value for each column and never hit a
    NotNullViolation. Columns that only the public frontend form sends (and
    that do not exist in the live table yet) are added by migration 0004.
    """
    STATUS_CHOICES = [
        ("Registered", "Registered"),
        ("Verification", "Verification"),
        ("Screening", "Screening"),
        ("Fee_Pending", "Fee_Pending"),
        ("Confirmed", "Confirmed"),
        ("Rejected", "Rejected"),
    ]

    registration_number = models.CharField(
        max_length=100, unique=True, default=generate_registration_number, editable=False
    )
    applicant_name = models.CharField(max_length=150)
    date_of_birth = models.DateField()
    gender = models.CharField(max_length=20, blank=True, default="")
    target_class = models.CharField(max_length=50, help_text="Class applied for, e.g. 'Grade 6'")

    # --- Applicant demographics (public form) -------------------------------
    blood_group = models.CharField(max_length=10, blank=True, default="")
    aadhaar_number = models.CharField(max_length=20, blank=True, default="")
    nationality = models.CharField(max_length=50, blank=True, default="Indian")
    religion = models.CharField(max_length=50, blank=True, default="")
    category = models.CharField(max_length=50, blank=True, default="General")
    city = models.CharField(max_length=100, blank=True, default="")
    state = models.CharField(max_length=100, blank=True, default="")
    country = models.CharField(max_length=100, blank=True, default="India")
    pincode = models.CharField(max_length=10, blank=True, default="")

    # --- Parent / guardian contacts ----------------------------------------
    parent_name = models.CharField(max_length=150)
    parent_phone = models.CharField(max_length=20)
    parent_email = models.EmailField()
    father_name = models.CharField(max_length=150, blank=True, default="")
    father_occupation = models.CharField(max_length=100, blank=True, default="")
    father_company = models.CharField(max_length=150, blank=True, default="")
    father_income = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    father_phone = models.CharField(max_length=20, blank=True, default="")
    father_email = models.CharField(max_length=150, blank=True, default="")
    mother_name = models.CharField(max_length=150, blank=True, default="")
    mother_occupation = models.CharField(max_length=100, blank=True, default="")
    mother_company = models.CharField(max_length=150, blank=True, default="")
    mother_phone = models.CharField(max_length=20, blank=True, default="")
    mother_email = models.CharField(max_length=150, blank=True, default="")
    guardian_name = models.CharField(max_length=150, blank=True, default="")
    guardian_relationship = models.CharField(max_length=50, blank=True, default="")
    guardian_phone = models.CharField(max_length=20, blank=True, default="")
    guardian_address = models.TextField(blank=True, default="")
    emergency_contact_name = models.CharField(max_length=150, blank=True, default="")
    emergency_contact_phone = models.CharField(max_length=20, blank=True, default="")
    emergency_contact_relation = models.CharField(max_length=50, blank=True, default="")

    # --- Addresses ----------------------------------------------------------
    address = models.TextField(blank=True, default="")
    permanent_address = models.TextField(blank=True, default="")
    communication_address = models.TextField(blank=True, default="")

    # --- Previous school / academics ---------------------------------------
    prev_school_name = models.CharField(max_length=200, blank=True, default="")
    board = models.CharField(max_length=50, blank=True, default="")
    prev_school_grade = models.CharField(max_length=20, blank=True, default="")
    percentage = models.CharField(max_length=20, blank=True, default="")
    reason_for_leaving = models.TextField(blank=True, default="")

    # --- Enquiry / preference ----------------------------------------------
    source_of_enquiry = models.CharField(max_length=100, blank=True, default="Website")
    preferred_branch = models.CharField(max_length=100, blank=True, default="")
    curriculum = models.CharField(max_length=50, blank=True, default="CBSE")
    scholarship_applied = models.BooleanField(default=False)

    # --- Medical ------------------------------------------------------------
    has_medical_conditions = models.BooleanField(default=False)
    medical_details = models.TextField(blank=True, default="")
    allergies = models.TextField(blank=True, default="")

    # --- Documents (uploaded by applicant) ----------------------------------
    id_proof_document = models.FileField(upload_to="admissions/documents/", blank=True, null=True)
    doc_aadhaar_card = models.FileField(upload_to="admissions/documents/", blank=True, null=True)
    doc_address_proof = models.FileField(upload_to="admissions/documents/", blank=True, null=True)
    doc_birth_certificate = models.FileField(upload_to="admissions/documents/", blank=True, null=True)
    doc_parent_id = models.FileField(upload_to="admissions/documents/", blank=True, null=True)
    doc_passport_photo = models.FileField(upload_to="admissions/documents/", blank=True, null=True)
    doc_previous_marks = models.FileField(upload_to="admissions/documents/", blank=True, null=True)
    doc_transfer_certificate = models.FileField(upload_to="admissions/documents/", blank=True, null=True)

    # --- Workflow / review state (admin-managed) ----------------------------
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="Registered")
    reviewed_by = models.CharField(max_length=150, blank=True, default="", help_text="Admin username/name")
    rejection_reason = models.TextField(blank=True, default="")
    submitted_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # --- Admin workflow fields (admission pipeline) -------------------------
    allocated_class = models.CharField(max_length=200, blank=True, default="")
    allocated_section = models.CharField(max_length=200, blank=True, default="")
    counselling_date = models.DateTimeField(null=True, blank=True)
    counselling_notes = models.TextField(blank=True, default="")
    counselling_status = models.CharField(max_length=50, blank=True, default="")
    counsellor_id = models.IntegerField(null=True, blank=True)
    eligibility_notes = models.TextField(blank=True, default="")
    is_eligible = models.BooleanField(default=False)
    is_waitlisted = models.BooleanField(default=False)
    waitlist_position = models.IntegerField(null=True, blank=True)
    seat_allocated = models.BooleanField(default=False)
    interview_date = models.DateTimeField(null=True, blank=True)
    interview_required = models.BooleanField(default=False)
    interview_scheduled = models.BooleanField(default=False)
    interview_result = models.CharField(max_length=50, blank=True, default="")
    fee_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    net_fee = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    fee_paid = models.BooleanField(default=False)
    fee_transaction_id = models.CharField(max_length=100, blank=True, default="")
    scholarship_discount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    student_admission_number = models.CharField(max_length=50, blank=True, default="")
    student_roll_number = models.CharField(max_length=50, blank=True, default="")

    # --- Credential links (set once Confirmed) ------------------------------
    student_user_id = models.IntegerField(null=True, blank=True)
    parent_user_id = models.IntegerField(null=True, blank=True)

    class Meta:
        ordering = ["-submitted_at"]

    def __str__(self):
        return f"{self.applicant_name} ({self.registration_number}) — {self.status}"
