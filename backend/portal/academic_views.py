"""Admin portal — Academic content management.

Backs the admin Classes page tabs:
  /admin-portal/academic/{class-details, subject-details, class-subjects,
  curriculum, faculty, faculty-subjects, downloads, levels}/  (CRUD)
  /admin-portal/academic/dashboard/                            (aggregate stats)

All entities are Django-managed models in apps.cms (they are NOT the raw
portal_class / portal_subject tables, which are managed via SimpleTableView).
"""
from django.db import IntegrityError
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from psycopg2 import sql as pysql
from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.cms.models import (
    AcademicDownload,
    AcademicLevel,
    ClassDetail,
    ClassSubjectMapping,
    CurriculumEntry,
    FacultyProfile,
    FacultySubjectAssignment,
    SubjectDetail,
)
from .doc_schemas import ERROR_RESPONSES
from .roles import IsAdmin, log_action
from .views import row, serialise, table_exists


def _payload(obj, model):
    data = {"id": obj.id}
    for field in model._meta.get_fields():
        if field.concrete and not field.auto_created and field.name != "id":
            data[field.name] = serialise(getattr(obj, field.name))
    return data


class AcademicCrudView(APIView):
    """Generic list/create + patch/delete-by-id for admin academic content."""
    permission_classes = [IsAdmin]
    model = None
    label = "record"

    @extend_schema(
        operation_id=None,
        summary="List records",
        description="Returns all records for this academic entity.",
        tags=["Academic"],
        responses={200: serializers.ListSerializer(child=serializers.JSONField()), **ERROR_RESPONSES},
    )
    def get(self, request):
        objs = self.model.objects.all()
        return Response([_payload(o, self.model) for o in objs])

    @extend_schema(
        operation_id=None,
        summary="Create record",
        description="Creates a new record.",
        tags=["Academic"],
        request=OpenApiTypes.OBJECT,
        responses={200: OpenApiTypes.OBJECT, **ERROR_RESPONSES},
    )
    def post(self, request):
        try:
            obj = self.model.objects.create(**self._clean(request.data))
        except IntegrityError:
            return Response({"detail": "A record with those values already exists."}, status=400)
        log_action(request.user, f"academic.{self.label}.create", self.label, obj.id)
        return Response(_payload(obj, self.model))

    @extend_schema(
        operation_id=None,
        summary="Update record",
        description="Partially updates a record by id.",
        tags=["Academic"],
        request=OpenApiTypes.OBJECT,
        responses={200: OpenApiTypes.OBJECT, **ERROR_RESPONSES},
    )
    def patch(self, request, pk):
        try:
            obj = self.model.objects.get(id=pk)
        except self.model.DoesNotExist:
            return Response({"detail": f"{self.label.title()} not found."}, status=404)
        try:
            for key, value in self._clean(request.data).items():
                setattr(obj, key, value)
            obj.save()
        except IntegrityError:
            return Response({"detail": "A record with those values already exists."}, status=400)
        log_action(request.user, f"academic.{self.label}.update", self.label, pk)
        return Response(_payload(obj, self.model))

    @extend_schema(
        operation_id=None,
        summary="Delete record",
        description="Deletes a record by id.",
        tags=["Academic"],
        responses={200: OpenApiTypes.OBJECT, **ERROR_RESPONSES},
    )
    def delete(self, request, pk):
        try:
            obj = self.model.objects.get(id=pk)
        except self.model.DoesNotExist:
            return Response({"detail": f"{self.label.title()} not found."}, status=404)
        obj.delete()
        log_action(request.user, f"academic.{self.label}.delete", self.label, pk)
        return Response({"detail": "Deleted."})

    def _clean(self, data):
        """Coerce the raw request dict into model-writable values."""
        d = dict(data)
        for key in list(d.keys()):
            if key == "id":
                d.pop(key)
            elif key in ("class_id", "subject_id", "faculty_id", "user_id", "target_class_id", "sort_order", "experience_years", "roll_number"):
                if d[key] in (None, ""):
                    d[key] = None
                else:
                    try:
                        d[key] = int(d[key])
                    except (TypeError, ValueError):
                        d.pop(key)
        return d


class ClassDetailView(AcademicCrudView):
    model = ClassDetail
    label = "class_detail"


class SubjectDetailView(AcademicCrudView):
    model = SubjectDetail
    label = "subject_detail"


class ClassSubjectMappingView(AcademicCrudView):
    model = ClassSubjectMapping
    label = "class_subject_mapping"


class CurriculumView(AcademicCrudView):
    model = CurriculumEntry
    label = "curriculum"


class FacultyProfileView(AcademicCrudView):
    model = FacultyProfile
    label = "faculty_profile"


class FacultySubjectAssignmentView(AcademicCrudView):
    model = FacultySubjectAssignment
    label = "faculty_subject"


class AcademicDownloadView(AcademicCrudView):
    model = AcademicDownload
    label = "academic_download"


class AcademicLevelView(AcademicCrudView):
    model = AcademicLevel
    label = "academic_level"


class AcademicDashboardView(APIView):
    permission_classes = [IsAdmin]

    @extend_schema(
        operation_id="AdminAcademicDashboard",
        summary="Academic dashboard stats",
        description="Aggregate counts across all academic content plus recent items.",
        tags=["Academic"],
        responses={200: OpenApiTypes.OBJECT, **ERROR_RESPONSES},
    )
    def get(self, request):
        def count(model):
            return model.objects.count()

        def count_table(table):
            if not table_exists(table):
                return 0
            r = row(pysql.SQL("SELECT COUNT(*)::int AS c FROM {}").format(pysql.Identifier(table)))
            return r["c"] if r else 0

        total_classes = count_table("portal_class")
        total_subjects = count_table("portal_subject")

        recent = []
        for model, label in (
            (ClassDetail, "Class Detail"),
            (SubjectDetail, "Subject Detail"),
            (CurriculumEntry, "Curriculum"),
            (AcademicDownload, "Download"),
        ):
            obj = model.objects.order_by("-id").first()
            if obj:
                title = getattr(obj, "title", None) or getattr(obj, "description", None) or f"{label} #{obj.id}"
                recent.append({"id": obj.id, "title": str(title)[:80], "type": label, "date": ""})

        return Response({
            "total_classes": total_classes,
            "total_subjects": total_subjects,
            "total_class_details": count(ClassDetail),
            "total_subject_details": count(SubjectDetail),
            "total_faculty_profiles": count(FacultyProfile),
            "total_faculty_assignments": count(FacultySubjectAssignment),
            "total_curriculum": count(CurriculumEntry),
            "total_class_subject_mappings": count(ClassSubjectMapping),
            "total_downloads": count(AcademicDownload),
            "total_levels": count(AcademicLevel),
            "recent_items": recent,
        })
