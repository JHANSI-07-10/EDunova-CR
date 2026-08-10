from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers
from .models import (
    SchoolSettings, Campus, AcademicProgram, Department, LeadershipMember,
    SchoolStat, WhyChooseItem, TechnologyPartner, CMSPage, NewsPost, Event,
    GalleryAlbum, GalleryImage, Achievement, Testimonial, FAQ, Document,
    JobPosting, JobApplication, CampusVisitBooking, ContactSubmission,
    ScholarshipInfo, FacultyMember,
)


class SchoolSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SchoolSettings
        fields = "__all__"


class CampusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Campus
        fields = "__all__"


class AcademicProgramSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcademicProgram
        fields = "__all__"


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = "__all__"


class LeadershipMemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeadershipMember
        fields = "__all__"


class FacultyMemberSerializer(serializers.ModelSerializer):
    """Public faculty directory entry. `photo_url` is an absolute URL so the
    website can render the photo regardless of storage backend (local media
    in dev, Supabase Storage CDN in production)."""
    photo_url = serializers.SerializerMethodField()

    class Meta:
        model = FacultyMember
        fields = [
            "id", "first_name", "last_name", "designation", "photo_url",
            "email", "qualification_detail", "experience_years",
            "specializations", "achievements", "bio",
        ]

    @extend_schema_field(serializers.URLField(allow_null=True))
    def get_photo_url(self, obj):
        if not obj.photo:
            return None
        try:
            url = obj.photo.url
        except Exception:
            return None
        request = self.context.get("request")
        if request is not None:
            return request.build_absolute_uri(url)
        return url


class SchoolStatSerializer(serializers.ModelSerializer):
    class Meta:
        model = SchoolStat
        fields = "__all__"


class WhyChooseItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = WhyChooseItem
        fields = "__all__"


class TechnologyPartnerSerializer(serializers.ModelSerializer):
    class Meta:
        model = TechnologyPartner
        fields = "__all__"


class CMSPageSerializer(serializers.ModelSerializer):
    class Meta:
        model = CMSPage
        fields = "__all__"


class NewsPostSerializer(serializers.ModelSerializer):
    class Meta:
        model = NewsPost
        fields = "__all__"


class EventSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = "__all__"


class GalleryImageSerializer(serializers.ModelSerializer):
    album_name = serializers.CharField(source="album.name", read_only=True)

    class Meta:
        model = GalleryImage
        fields = ["id", "album", "album_name", "image", "caption", "uploaded_at"]


class GalleryAlbumSerializer(serializers.ModelSerializer):
    images = GalleryImageSerializer(many=True, read_only=True)

    class Meta:
        model = GalleryAlbum
        fields = ["id", "name", "images"]


class AchievementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Achievement
        fields = "__all__"


class TestimonialSerializer(serializers.ModelSerializer):
    class Meta:
        model = Testimonial
        fields = "__all__"


class FAQSerializer(serializers.ModelSerializer):
    class Meta:
        model = FAQ
        fields = "__all__"


class DocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = "__all__"


class JobPostingSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobPosting
        fields = "__all__"


class JobApplicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobApplication
        fields = ["job_posting", "applicant_name", "email", "phone", "cover_letter", "resume_file"]
        extra_kwargs = {"resume_file": {"required": False}}

    def validate_resume_file(self, value):
        allowed = ("application/pdf", "application/msword",
                   "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
        if value and value.content_type not in allowed:
            raise serializers.ValidationError("Resume must be a PDF or Word document (.pdf, .doc, .docx).")
        if value and value.size > 5 * 1024 * 1024:
            raise serializers.ValidationError("Resume file size exceeds 5MB.")
        return value


class CampusVisitBookingSerializer(serializers.ModelSerializer):
    class Meta:
        model = CampusVisitBooking
        fields = ["campus_id", "visitor_name", "visitor_email", "visitor_phone",
                  "visit_date", "visit_time", "purpose"]


class ContactSubmissionSerializer(serializers.ModelSerializer):
    name = serializers.CharField(max_length=150, trim_whitespace=True, allow_blank=False)
    message = serializers.CharField(max_length=5000, trim_whitespace=True, allow_blank=False)

    class Meta:
        model = ContactSubmission
        fields = ["id", "name", "email", "phone", "message", "is_resolved", "submitted_at"]
        read_only_fields = ["id", "submitted_at", "is_resolved"]


class ScholarshipInfoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScholarshipInfo
        fields = "__all__"
