"""Admin portal — Recruitment (job applications) and Interviews.

Backs the admin Recruitment page:
  GET/PATCH /admin-portal/recruitment/    list applications / update status
  GET/POST/PATCH /admin-portal/interviews/  list / schedule / update interviews
"""
from django.utils.dateparse import parse_datetime
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.cms.models import JobApplication
from .doc_schemas import ERROR_RESPONSES
from .roles import IsAdmin, log_action
from .views import serialise

APPLICATION_STATUSES = {"Pending", "Interview", "Hired", "Rejected"}
INTERVIEW_STATUSES = {"Scheduled", "Completed", "Cancelled"}


def _application_payload(app):
    return {
        "id": app.id,
        "applicant_name": app.applicant_name,
        "email": app.email,
        "phone": app.phone,
        "job_title": app.job_posting.title if app.job_posting else "",
        "job_posting_id": app.job_posting_id,
        "cover_letter": app.cover_letter,
        "resume_file": app.resume_file.url if app.resume_file else None,
        "status": app.status,
        "applied_at": serialise(app.applied_at),
        "interview_date": serialise(app.interview_date),
        "interviewer_name": app.interviewer_name,
        "location_or_link": app.location_or_link,
        "interview_status": app.interview_status,
        "feedback": app.feedback,
    }


class RecruitmentView(APIView):
    permission_classes = [IsAdmin]

    @extend_schema(
        operation_id="AdminRecruitmentList",
        summary="List job applications",
        description="Returns all candidate applications, newest first, with the job title resolved.",
        tags=["Recruitment"],
        responses={200: serializers.ListSerializer(child=serializers.JSONField()), **ERROR_RESPONSES},
    )
    def get(self, request):
        qs = JobApplication.objects.select_related("job_posting").order_by("-applied_at")
        return Response([_application_payload(a) for a in qs])

    @extend_schema(
        operation_id="AdminRecruitmentUpdateStatus",
        summary="Update application status",
        description="Update the review status (Pending / Interview / Hired / Rejected) of an application.",
        tags=["Recruitment"],
        request=OpenApiTypes.OBJECT,
        responses={200: OpenApiTypes.OBJECT, **ERROR_RESPONSES},
    )
    def patch(self, request):
        app_id = request.data.get("id")
        status = request.data.get("status")
        if not app_id:
            return Response({"detail": "Application id is required."}, status=400)
        if status not in APPLICATION_STATUSES:
            return Response({"detail": f"Invalid status. Choose from {sorted(APPLICATION_STATUSES)}."}, status=400)
        try:
            app = JobApplication.objects.get(id=app_id)
        except JobApplication.DoesNotExist:
            return Response({"detail": "Application not found."}, status=404)
        app.status = status
        app.save(update_fields=["status"])
        log_action(request.user, "recruitment.status", "job_application", app_id, {"status": status})
        return Response(_application_payload(app))


class InterviewView(APIView):
    permission_classes = [IsAdmin]

    @extend_schema(
        operation_id="AdminInterviewList",
        summary="List interviews",
        description="Returns applications that have been scheduled for interview.",
        tags=["Recruitment"],
        responses={200: serializers.ListSerializer(child=serializers.JSONField()), **ERROR_RESPONSES},
    )
    def get(self, request):
        qs = JobApplication.objects.select_related("job_posting").filter(interview_status__in=["Scheduled", "Completed", "Cancelled"]).order_by("-interview_date")
        return Response([_application_payload(a) for a in qs])

    @extend_schema(
        operation_id="AdminInterviewSchedule",
        summary="Schedule an interview",
        description="Sets interview date, interviewer and location/link for an application and marks it Scheduled.",
        tags=["Recruitment"],
        request=OpenApiTypes.OBJECT,
        responses={200: OpenApiTypes.OBJECT, **ERROR_RESPONSES},
    )
    def post(self, request):
        app_id = request.data.get("application_id")
        if not app_id:
            return Response({"detail": "application_id is required."}, status=400)
        try:
            app = JobApplication.objects.get(id=app_id)
        except JobApplication.DoesNotExist:
            return Response({"detail": "Application not found."}, status=404)

        raw_date = request.data.get("interview_date")
        parsed = parse_datetime(raw_date) if raw_date else None
        if raw_date and not parsed:
            return Response({"detail": "Invalid interview_date format."}, status=400)

        app.interview_date = parsed
        app.interviewer_name = request.data.get("interviewer_name", app.interviewer_name)
        app.location_or_link = request.data.get("location_or_link", app.location_or_link)
        app.interview_status = "Scheduled"
        app.status = "Interview"
        app.save()
        log_action(request.user, "recruitment.interview_scheduled", "job_application", app_id, {"date": raw_date})
        return Response(_application_payload(app))

    @extend_schema(
        operation_id="AdminInterviewUpdate",
        summary="Update interview",
        description="Mark an interview Completed or Cancelled, with optional feedback.",
        tags=["Recruitment"],
        request=OpenApiTypes.OBJECT,
        responses={200: OpenApiTypes.OBJECT, **ERROR_RESPONSES},
    )
    def patch(self, request):
        interview_id = request.data.get("id")
        status = request.data.get("status")
        if not interview_id:
            return Response({"detail": "Interview id is required."}, status=400)
        if status not in INTERVIEW_STATUSES:
            return Response({"detail": f"Invalid status. Choose from {sorted(INTERVIEW_STATUSES)}."}, status=400)
        try:
            app = JobApplication.objects.get(id=interview_id)
        except JobApplication.DoesNotExist:
            return Response({"detail": "Application not found."}, status=404)
        app.interview_status = status
        if status == "Completed":
            app.status = "Hired"
        elif status == "Cancelled":
            app.status = "Pending"
            app.interview_status = ""
        if request.data.get("feedback"):
            app.feedback = request.data.get("feedback")
        app.save()
        log_action(request.user, "recruitment.interview_update", "job_application", interview_id, {"status": status})
        return Response(_application_payload(app))
