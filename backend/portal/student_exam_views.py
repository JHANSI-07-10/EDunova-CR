"""Student portal — exam extras (student/pages/Results.jsx tabs).

  GET/POST /student/exams/revaluation/        list / request revaluation
  GET/POST /student/supplementary/            list / register supplementary exam
  GET/POST /student/academic-certificates/    list / request a certificate
"""
from django.db import connection
from django.utils.crypto import get_random_string
from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from .doc_schemas import ERROR_RESPONSES
from .roles import log_action
from .views import StudentOnlyMixin, row, rows, serialise, table_exists


class StudentRevaluationView(StudentOnlyMixin, APIView):
    @extend_schema(
        operation_id="StudentRevaluationList",
        summary="List revaluation requests",
        description="Returns the student's revaluation requests.",
        tags=["Student"],
        responses={200: serializers.ListSerializer(child=serializers.DictField()), **ERROR_RESPONSES},
    )
    def get(self, request):
        if not table_exists("portal_revaluation"):
            return Response([])
        data = rows(
            "SELECT id, subject_name, exam_name, reason, status, teacher_remarks, requested_at "
            "FROM portal_revaluation WHERE student_id=%s ORDER BY id DESC",
            [request.user.id],
        )
        return Response(serialise(data))

    @extend_schema(
        operation_id="StudentRevaluationCreate",
        summary="Request revaluation",
        description="Files a revaluation request for one of the student's results.",
        tags=["Student"],
        request=serializers.DictField(),
        responses={201: serializers.DictField(), **ERROR_RESPONSES},
    )
    def post(self, request):
        result_id = request.data.get("result_id")
        reason = (request.data.get("reason") or "").strip()
        if not result_id or not reason:
            return Response({"detail": "result_id and reason are required."}, status=400)

        subject_name = ""
        exam_name = ""
        if table_exists("portal_result") and table_exists("portal_exam_schedule") and table_exists("portal_subject"):
            info = row(
                """
                SELECT COALESCE(s.name,'') AS subject_name, COALESCE(e.exam_name,'') AS exam_name
                FROM portal_result r
                LEFT JOIN portal_exam_schedule e ON e.id = r.exam_schedule_id
                LEFT JOIN portal_subject s ON s.id = e.subject_id
                WHERE r.id=%s AND r.student_id=%s
                """,
                [result_id, request.user.id],
            )
            if info:
                subject_name = info["subject_name"]
                exam_name = info["exam_name"]

        with connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO portal_revaluation (student_id, result_id, subject_name, exam_name, reason, status) "
                "VALUES (%s, %s, %s, %s, %s, 'Pending')",
                [request.user.id, result_id, subject_name, exam_name, reason],
            )
        log_action(request.user, "student.revaluation_requested", "revaluation", request.user.id)
        return Response({"detail": "Revaluation request submitted successfully."}, status=201)


class StudentSupplementaryView(StudentOnlyMixin, APIView):
    @extend_schema(
        operation_id="StudentSupplementaryList",
        summary="List supplementary registrations",
        description="Returns the student's supplementary exam registrations.",
        tags=["Student"],
        responses={200: serializers.ListSerializer(child=serializers.DictField()), **ERROR_RESPONSES},
    )
    def get(self, request):
        if not table_exists("portal_supplementary_request"):
            return Response([])
        data = rows(
            "SELECT id, subject_name, original_exam_name, status, grade_letter, requested_at "
            "FROM portal_supplementary_request WHERE student_id=%s ORDER BY id DESC",
            [request.user.id],
        )
        return Response(serialise(data))

    @extend_schema(
        operation_id="StudentSupplementaryCreate",
        summary="Register for a supplementary exam",
        description="Registers the student for a supplementary exam in a failed subject.",
        tags=["Student"],
        request=serializers.DictField(),
        responses={201: serializers.DictField(), **ERROR_RESPONSES},
    )
    def post(self, request):
        subject_id = request.data.get("subject_id")
        exam_schedule_id = request.data.get("original_exam_schedule_id")
        if not subject_id:
            return Response({"detail": "subject_id is required."}, status=400)

        subject_name = ""
        original_exam_name = ""
        if table_exists("portal_exam_schedule") and table_exists("portal_subject"):
            info = row(
                """
                SELECT COALESCE(s.name,'') AS subject_name, COALESCE(e.exam_name,'') AS exam_name
                FROM portal_exam_schedule e
                LEFT JOIN portal_subject s ON s.id = e.subject_id
                WHERE e.id=%s
                """,
                [exam_schedule_id],
            )
            if info:
                subject_name = info["subject_name"]
                original_exam_name = info["exam_name"]
        if not subject_name and table_exists("portal_subject"):
            s = row("SELECT name FROM portal_subject WHERE id=%s", [subject_id])
            if s:
                subject_name = s["name"]

        with connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO portal_supplementary_request "
                "(student_id, subject_id, subject_name, original_exam_schedule_id, original_exam_name, status, grade_letter) "
                "VALUES (%s, %s, %s, %s, %s, 'Pending', 'F')",
                [request.user.id, subject_id, subject_name, exam_schedule_id, original_exam_name],
            )
        log_action(request.user, "student.supplementary_registered", "supplementary", request.user.id)
        return Response({"detail": "Registered for supplementary exam successfully."}, status=201)


class StudentAcademicCertificatesView(StudentOnlyMixin, APIView):
    @extend_schema(
        operation_id="StudentAcademicCertificatesList",
        summary="List certificates",
        description="Returns the student's certificate requests.",
        tags=["Student"],
        responses={200: serializers.ListSerializer(child=serializers.DictField()), **ERROR_RESPONSES},
    )
    def get(self, request):
        if not table_exists("portal_certificate_request"):
            return Response([])
        data = rows(
            "SELECT id, certificate_type, exam_name, status, verification_code, requested_at, issued_date "
            "FROM portal_certificate_request WHERE student_id=%s ORDER BY id DESC",
            [request.user.id],
        )
        return Response(serialise(data))

    @extend_schema(
        operation_id="StudentAcademicCertificatesCreate",
        summary="Request a certificate",
        description="Files a certificate request for the student.",
        tags=["Student"],
        request=serializers.DictField(),
        responses={201: serializers.DictField(), **ERROR_RESPONSES},
    )
    def post(self, request):
        cert_type = request.data.get("certificate_type")
        if not cert_type:
            return Response({"detail": "certificate_type is required."}, status=400)
        exam_name = request.data.get("exam_name", "")
        code = get_random_string(10).upper()
        with connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO portal_certificate_request (student_id, certificate_type, exam_name, status, verification_code) "
                "VALUES (%s, %s, %s, 'Pending', %s)",
                [request.user.id, cert_type, exam_name, code],
            )
        log_action(request.user, "student.certificate_requested", "certificate", request.user.id)
        return Response({"detail": "Certificate request submitted successfully.", "verification_code": code}, status=201)
