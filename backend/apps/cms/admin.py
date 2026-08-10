from django.contrib import admin
from .models import (
    SchoolSettings, Campus, AcademicProgram, Department, LeadershipMember,
    SchoolStat, WhyChooseItem, TechnologyPartner, CMSPage, NewsPost, Event,
    JobApplication, CampusVisitBooking,
    GalleryAlbum, GalleryImage, Achievement, Testimonial, FAQ, Document,
    JobPosting, ContactSubmission, ScholarshipInfo, FacultyMember,
    AcademicLevel, ClassDetail, SubjectDetail, ClassSubjectMapping,
    CurriculumEntry, FacultyProfile, FacultySubjectAssignment, AcademicDownload,
)

admin.site.register(SchoolSettings)
admin.site.register(Campus)
admin.site.register(AcademicProgram)
admin.site.register(Department)
admin.site.register(LeadershipMember)
admin.site.register(SchoolStat)
admin.site.register(WhyChooseItem)
admin.site.register(TechnologyPartner)
admin.site.register(CMSPage)
admin.site.register(NewsPost)
admin.site.register(Event)
admin.site.register(GalleryAlbum)
admin.site.register(GalleryImage)
admin.site.register(Achievement)
admin.site.register(Testimonial)
admin.site.register(FAQ)
admin.site.register(Document)
admin.site.register(JobPosting)
admin.site.register(ScholarshipInfo)


@admin.register(FacultyMember)
class FacultyMemberAdmin(admin.ModelAdmin):
    list_display = ["first_name", "last_name", "designation", "experience_years", "is_active", "sort_order"]
    list_filter = ["is_active", "designation"]
    search_fields = ["first_name", "last_name", "designation"]
    list_editable = ["is_active", "sort_order"]


@admin.register(ContactSubmission)
class ContactSubmissionAdmin(admin.ModelAdmin):
    list_display = ["name", "email", "phone", "submitted_at", "is_resolved"]
    list_filter = ["is_resolved"]
    readonly_fields = ["submitted_at"]


@admin.register(JobApplication)
class JobApplicationAdmin(admin.ModelAdmin):
    list_display = ["applicant_name", "email", "phone", "job_posting", "status", "applied_at"]
    list_filter = ["job_posting", "status"]
    search_fields = ["applicant_name", "email", "phone"]
    readonly_fields = ["applied_at"]


@admin.register(CampusVisitBooking)
class CampusVisitBookingAdmin(admin.ModelAdmin):
    list_display = ["visitor_name", "visitor_email", "visitor_phone", "visit_date", "visit_time", "booked_at"]
    search_fields = ["visitor_name", "visitor_email", "visitor_phone"]
    readonly_fields = ["booked_at"]


@admin.register(AcademicLevel)
class AcademicLevelAdmin(admin.ModelAdmin):
    list_display = ["name", "sort_order", "is_published"]
    list_editable = ["sort_order", "is_published"]


@admin.register(ClassDetail)
class ClassDetailAdmin(admin.ModelAdmin):
    list_display = ["class_id", "academic_level", "is_published"]
    list_filter = ["is_published"]


@admin.register(SubjectDetail)
class SubjectDetailAdmin(admin.ModelAdmin):
    list_display = ["subject_id", "is_published"]
    list_filter = ["is_published"]


@admin.register(ClassSubjectMapping)
class ClassSubjectMappingAdmin(admin.ModelAdmin):
    list_display = ["class_id", "subject_id", "is_compulsory", "sort_order"]
    list_editable = ["is_compulsory", "sort_order"]


@admin.register(CurriculumEntry)
class CurriculumEntryAdmin(admin.ModelAdmin):
    list_display = ["class_id", "curriculum_name", "is_published"]
    list_filter = ["curriculum_name", "is_published"]


@admin.register(FacultyProfile)
class FacultyProfileAdmin(admin.ModelAdmin):
    list_display = ["user_id", "designation", "experience_years", "is_published"]
    list_filter = ["is_published"]


@admin.register(FacultySubjectAssignment)
class FacultySubjectAssignmentAdmin(admin.ModelAdmin):
    list_display = ["faculty_id", "class_id", "subject_id"]


@admin.register(AcademicDownload)
class AcademicDownloadAdmin(admin.ModelAdmin):
    list_display = ["title", "file_type", "category", "is_published"]
    list_filter = ["file_type", "category", "is_published"]
