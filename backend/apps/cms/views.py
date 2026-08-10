from django.db import connection
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page

from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import viewsets, mixins
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from .models import (
    SchoolSettings, Campus, AcademicProgram, Department, LeadershipMember,
    SchoolStat, WhyChooseItem, TechnologyPartner, CMSPage, NewsPost, Event,
    GalleryAlbum, GalleryImage, Achievement, Testimonial, FAQ, Document,
    JobPosting, JobApplication, CampusVisitBooking, ContactSubmission,
    ScholarshipInfo, FacultyMember,
)
from . import serializers as ser

WEBSITE_TAG = ["Website"]


class PublicReadViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only public CMS endpoint with a 60s response cache.

    The public website renders dozens of these per page load and they are
    identical for every visitor, so caching the rendered JSON cuts remote-DB
    round trips (each ~1s against the Supabase pooler) down to a local cache
    hit. Content edits show up within 60 seconds.
    """

    @method_decorator(cache_page(60))
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)


@extend_schema_view(
    list=extend_schema(
        operation_id="WebsiteSchoolSettingsList",
        summary="List school settings",
        description="Public school-wide settings (name, contact, social links, etc.).",
        tags=WEBSITE_TAG,
    ),
    retrieve=extend_schema(
        operation_id="WebsiteSchoolSettingsRetrieve",
        summary="Get school settings",
        description="Retrieve a single school settings record by id.",
        tags=WEBSITE_TAG,
    ),
)
class SchoolSettingsViewSet(PublicReadViewSet):
    """Singleton — frontend calls /api/cms/settings/1/ or /api/cms/settings/ and takes first result."""
    queryset = SchoolSettings.objects.all()
    serializer_class = ser.SchoolSettingsSerializer


@extend_schema_view(
    list=extend_schema(
        summary="List campuses",
        description="Public list of school campuses.",
        tags=WEBSITE_TAG,
    ),
    retrieve=extend_schema(
        summary="Get a campus",
        description="Retrieve a single campus by id.",
        tags=WEBSITE_TAG,
    ),
)
class CampusViewSet(PublicReadViewSet):
    queryset = Campus.objects.all()
    serializer_class = ser.CampusSerializer
    # The Contact page consumes a plain array (no pagination wrapper) — only
    # a handful of campuses exist, so disable pagination for this endpoint.
    pagination_class = None

    @extend_schema(
        summary="Find nearest campus",
        description=(
            "Return the campus closest to the supplied latitude/longitude "
            "(haversine over campus coordinates). Falls back to the head "
            "office (or first campus) when coordinates are missing."
        ),
        tags=WEBSITE_TAG,
    )
    @action(detail=False, methods=["get"], url_path="nearest")
    def nearest(self, request):
        import math

        def _haversine(c, lat, lng):
            if c.latitude is None or c.longitude is None:
                return None
            r = 6371.0
            d_lat = math.radians(lat - c.latitude)
            d_lng = math.radians(lng - c.longitude)
            a = (
                math.sin(d_lat / 2) ** 2
                + math.cos(math.radians(lat))
                * math.cos(math.radians(c.latitude))
                * math.sin(d_lng / 2) ** 2
            )
            return 2 * r * math.asin(math.sqrt(a))

        try:
            lat = float(request.query_params.get("lat"))
            lng = float(request.query_params.get("lng"))
        except (TypeError, ValueError):
            lat = lng = None

        campuses = list(Campus.objects.all())
        chosen = None
        if lat is not None and lng is not None:
            scored = [(c, d) for c in campuses if (d := _haversine(c, lat, lng)) is not None]
            if scored:
                chosen = min(scored, key=lambda pair: pair[1])[0]
        if chosen is None:
            chosen = next((c for c in campuses if c.is_headquarters), None)
        if chosen is None and campuses:
            chosen = campuses[0]
        if chosen is None:
            return Response({"detail": "No campuses registered."}, status=404)
        return Response({"campus_id": chosen.id, "name": chosen.name})


@extend_schema_view(
    list=extend_schema(
        operation_id="WebsiteAcademicProgramList",
        summary="List academic programs",
        description="Public list of academic programs offered by the school.",
        tags=WEBSITE_TAG,
    ),
    retrieve=extend_schema(
        operation_id="WebsiteAcademicProgramRetrieve",
        summary="Get an academic program",
        description="Retrieve a single academic program by id.",
        tags=WEBSITE_TAG,
    ),
)
class AcademicProgramViewSet(PublicReadViewSet):
    queryset = AcademicProgram.objects.all()
    serializer_class = ser.AcademicProgramSerializer


@extend_schema_view(
    list=extend_schema(
        operation_id="WebsiteDepartmentList",
        summary="List departments",
        description="Public list of school departments.",
        tags=WEBSITE_TAG,
    ),
    retrieve=extend_schema(
        operation_id="WebsiteDepartmentRetrieve",
        summary="Get a department",
        description="Retrieve a single department by id.",
        tags=WEBSITE_TAG,
    ),
)
class DepartmentViewSet(PublicReadViewSet):
    queryset = Department.objects.all()
    serializer_class = ser.DepartmentSerializer


@extend_schema_view(
    list=extend_schema(
        operation_id="WebsiteLeadershipList",
        summary="List leadership members",
        description="Public list of school leadership team members.",
        tags=WEBSITE_TAG,
    ),
    retrieve=extend_schema(
        operation_id="WebsiteLeadershipRetrieve",
        summary="Get a leadership member",
        description="Retrieve a single leadership member by id.",
        tags=WEBSITE_TAG,
    ),
)
class LeadershipMemberViewSet(PublicReadViewSet):
    queryset = LeadershipMember.objects.all()
    serializer_class = ser.LeadershipMemberSerializer


@extend_schema_view(
    list=extend_schema(
        operation_id="WebsiteStatList",
        summary="List school stats",
        description="Public list of headline school statistics (e.g. students, teachers).",
        tags=WEBSITE_TAG,
    ),
    retrieve=extend_schema(
        operation_id="WebsiteStatRetrieve",
        summary="Get a school stat",
        description="Retrieve a single school statistic by id.",
        tags=WEBSITE_TAG,
    ),
)
class SchoolStatViewSet(PublicReadViewSet):
    queryset = SchoolStat.objects.all()
    serializer_class = ser.SchoolStatSerializer


@extend_schema_view(
    list=extend_schema(
        operation_id="WebsiteWhyChooseList",
        summary="List 'Why choose us' items",
        description="Public list of the reasons to choose the school.",
        tags=WEBSITE_TAG,
    ),
    retrieve=extend_schema(
        operation_id="WebsiteWhyChooseRetrieve",
        summary="Get a 'Why choose us' item",
        description="Retrieve a single 'Why choose us' item by id.",
        tags=WEBSITE_TAG,
    ),
)
class WhyChooseItemViewSet(PublicReadViewSet):
    queryset = WhyChooseItem.objects.all()
    serializer_class = ser.WhyChooseItemSerializer


@extend_schema_view(
    list=extend_schema(
        operation_id="WebsiteTechPartnerList",
        summary="List technology partners",
        description="Public list of the school's technology partners.",
        tags=WEBSITE_TAG,
    ),
    retrieve=extend_schema(
        operation_id="WebsiteTechPartnerRetrieve",
        summary="Get a technology partner",
        description="Retrieve a single technology partner by id.",
        tags=WEBSITE_TAG,
    ),
)
class TechnologyPartnerViewSet(PublicReadViewSet):
    queryset = TechnologyPartner.objects.all()
    serializer_class = ser.TechnologyPartnerSerializer


@extend_schema_view(
    list=extend_schema(
        operation_id="WebsitePageList",
        summary="List CMS pages",
        description="Public list of CMS pages (lookup by slug).",
        tags=WEBSITE_TAG,
    ),
    retrieve=extend_schema(
        operation_id="WebsitePageRetrieve",
        summary="Get a CMS page",
        description="Retrieve a single CMS page by its slug.",
        tags=WEBSITE_TAG,
    ),
)
class CMSPageViewSet(PublicReadViewSet):
    queryset = CMSPage.objects.all()
    serializer_class = ser.CMSPageSerializer
    lookup_field = "slug"


@extend_schema_view(
    list=extend_schema(
        operation_id="WebsiteNewsList",
        summary="List published news",
        description="Public list of published news posts (lookup by slug).",
        tags=WEBSITE_TAG,
    ),
    retrieve=extend_schema(
        operation_id="WebsiteNewsRetrieve",
        summary="Get a news post",
        description="Retrieve a single published news post by its slug.",
        tags=WEBSITE_TAG,
    ),
)
class NewsPostViewSet(PublicReadViewSet):
    queryset = NewsPost.objects.filter(is_published=True)
    serializer_class = ser.NewsPostSerializer
    lookup_field = "slug"


@extend_schema_view(
    list=extend_schema(
        operation_id="WebsiteEventList",
        summary="List events",
        description="Public list of school events.",
        tags=WEBSITE_TAG,
    ),
    retrieve=extend_schema(
        operation_id="WebsiteEventRetrieve",
        summary="Get an event",
        description="Retrieve a single event by id.",
        tags=WEBSITE_TAG,
    ),
)
class EventViewSet(PublicReadViewSet):
    queryset = Event.objects.all()
    serializer_class = ser.EventSerializer


@extend_schema_view(
    list=extend_schema(
        operation_id="WebsiteGalleryAlbumList",
        summary="List gallery albums",
        description="Public list of photo gallery albums.",
        tags=WEBSITE_TAG,
    ),
    retrieve=extend_schema(
        operation_id="WebsiteGalleryAlbumRetrieve",
        summary="Get a gallery album",
        description="Retrieve a single gallery album by id.",
        tags=WEBSITE_TAG,
    ),
)
class GalleryAlbumViewSet(PublicReadViewSet):
    queryset = GalleryAlbum.objects.prefetch_related("images")
    serializer_class = ser.GalleryAlbumSerializer


@extend_schema_view(
    list=extend_schema(
        operation_id="WebsiteGalleryImageList",
        summary="List gallery images",
        description="Public list of gallery images.",
        tags=WEBSITE_TAG,
    ),
    retrieve=extend_schema(
        operation_id="WebsiteGalleryImageRetrieve",
        summary="Get a gallery image",
        description="Retrieve a single gallery image by id.",
        tags=WEBSITE_TAG,
    ),
)
class GalleryImageViewSet(PublicReadViewSet):
    queryset = GalleryImage.objects.select_related("album")
    serializer_class = ser.GalleryImageSerializer


@extend_schema_view(
    list=extend_schema(
        operation_id="WebsiteAchievementList",
        summary="List achievements",
        description="Public list of school achievements.",
        tags=WEBSITE_TAG,
    ),
    retrieve=extend_schema(
        operation_id="WebsiteAchievementRetrieve",
        summary="Get an achievement",
        description="Retrieve a single achievement by id.",
        tags=WEBSITE_TAG,
    ),
)
class AchievementViewSet(PublicReadViewSet):
    queryset = Achievement.objects.all()
    serializer_class = ser.AchievementSerializer


@extend_schema_view(
    list=extend_schema(
        operation_id="WebsiteTestimonialList",
        summary="List featured testimonials",
        description="Public list of featured testimonials.",
        tags=WEBSITE_TAG,
    ),
    retrieve=extend_schema(
        operation_id="WebsiteTestimonialRetrieve",
        summary="Get a testimonial",
        description="Retrieve a single testimonial by id.",
        tags=WEBSITE_TAG,
    ),
)
class TestimonialViewSet(PublicReadViewSet):
    queryset = Testimonial.objects.filter(is_featured=True)
    serializer_class = ser.TestimonialSerializer


@extend_schema_view(
    list=extend_schema(
        operation_id="WebsiteFaqList",
        summary="List FAQs",
        description="Public list of frequently asked questions.",
        tags=WEBSITE_TAG,
    ),
    retrieve=extend_schema(
        operation_id="WebsiteFaqRetrieve",
        summary="Get an FAQ",
        description="Retrieve a single FAQ by id.",
        tags=WEBSITE_TAG,
    ),
)
class FAQViewSet(PublicReadViewSet):
    queryset = FAQ.objects.all()
    serializer_class = ser.FAQSerializer


@extend_schema_view(
    list=extend_schema(
        operation_id="WebsiteDocumentList",
        summary="List documents",
        description="Public list of downloadable documents, optionally filtered by audience.",
        tags=WEBSITE_TAG,
        parameters=[
            OpenApiParameter(
                name="audience",
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                required=False,
                description="Filter documents by audience (e.g. students, teachers, parents).",
            )
        ],
    ),
    retrieve=extend_schema(
        operation_id="WebsiteDocumentRetrieve",
        summary="Get a document",
        description="Retrieve a single document by id.",
        tags=WEBSITE_TAG,
    ),
)
class DocumentViewSet(PublicReadViewSet):
    serializer_class = ser.DocumentSerializer

    def get_queryset(self):
        qs = Document.objects.all()
        audience = self.request.query_params.get("audience")
        if audience:
            qs = qs.filter(audience=audience)
        return qs


@extend_schema_view(
    list=extend_schema(
        operation_id="WebsiteJobList",
        summary="List open jobs",
        description="Public list of currently open job postings.",
        tags=WEBSITE_TAG,
    ),
    retrieve=extend_schema(
        operation_id="WebsiteJobRetrieve",
        summary="Get a job posting",
        description="Retrieve a single open job posting by id.",
        tags=WEBSITE_TAG,
    ),
)
class JobPostingViewSet(PublicReadViewSet):
    queryset = JobPosting.objects.select_related("department").filter(is_open=True)
    serializer_class = ser.JobPostingSerializer

    @extend_schema(
        operation_id="WebsiteJobApply",
        summary="Apply to a job posting",
        description=(
            "Public endpoint: submit a job application (name, email, phone, "
            "cover letter, resume file) for a specific open job posting."
        ),
        tags=WEBSITE_TAG,
        request=ser.JobApplicationSerializer,
        responses={201: None},
    )
    @action(detail=True, methods=["post"])
    def apply(self, request, pk=None):
        job = self.get_object()
        serializer = ser.JobApplicationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(job_posting=job)
        return Response(
            {"success": True, "message": "Application received. Our HR team will review it."},
            status=201,
        )

    # Collection-level apply: the frontend posts to /jobs/apply/ with
    # job_posting (id) in the multipart body — accept that shape too.
    @extend_schema(
        operation_id="WebsiteJobApplyByPosting",
        summary="Apply to a job posting (by id in body)",
        description="Submit a job application where the job_posting id is sent in the request body.",
        tags=WEBSITE_TAG,
        request=ser.JobApplicationSerializer,
        responses={201: None},
    )
    @action(detail=False, methods=["post"], url_path="apply")
    def apply_collection(self, request):
        job_id = request.data.get("job_posting")
        if not job_id:
            return Response(
                {"job_posting": ["This field is required."]},
                status=400,
            )
        job = self.get_queryset().filter(pk=job_id).first()
        if job is None:
            return Response(
                {"job_posting": ["Invalid job posting id."]},
                status=400,
            )
        serializer = ser.JobApplicationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(job_posting=job)
        return Response(
            {"success": True, "message": "Application received. Our HR team will review it."},
            status=201,
        )


@extend_schema_view(
    post=extend_schema(
        operation_id="WebsiteCampusVisitCreate",
        summary="Schedule a campus visit",
        description=(
            "Public endpoint: the Contact page's 'Schedule Campus Visit' modal "
            "posts a booking request here."
        ),
        tags=WEBSITE_TAG,
        request=ser.CampusVisitBookingSerializer,
        responses={201: None},
    ),
)
class CampusVisitView(APIView):
    """Public: write-only campus visit booking."""
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "contact"

    def post(self, request):
        serializer = ser.CampusVisitBookingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {"success": True, "message": "Visit request received. Our team will confirm by email."},
            status=201,
        )


@extend_schema_view(
    list=extend_schema(
        operation_id="WebsiteScholarshipList",
        summary="List scholarships",
        description="Public list of available scholarships.",
        tags=WEBSITE_TAG,
    ),
    retrieve=extend_schema(
        operation_id="WebsiteScholarshipRetrieve",
        summary="Get a scholarship",
        description="Retrieve a single scholarship by id.",
        tags=WEBSITE_TAG,
    ),
)
class ScholarshipInfoViewSet(PublicReadViewSet):
    queryset = ScholarshipInfo.objects.all()
    serializer_class = ser.ScholarshipInfoSerializer


@extend_schema_view(
    create=extend_schema(
        operation_id="WebsiteContactCreate",
        summary="Submit a contact enquiry",
        description="Public write-only endpoint: the contact page posts an enquiry here.",
        tags=WEBSITE_TAG,
    )
)
class ContactSubmissionViewSet(mixins.CreateModelMixin, viewsets.GenericViewSet):
    """Public: write-only. Contact page POSTs here; nothing is exposed to read publicly."""
    queryset = ContactSubmission.objects.all()
    serializer_class = ser.ContactSubmissionSerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "contact"


@extend_schema_view(
    list=extend_schema(
        summary="List faculty members",
        description="Public list of active faculty members for the website faculty directory.",
        tags=WEBSITE_TAG,
    ),
    retrieve=extend_schema(
        summary="Get a faculty member",
        description="Retrieve a single faculty member by id.",
        tags=WEBSITE_TAG,
    ),
)
class FacultyMemberViewSet(PublicReadViewSet):
    queryset = FacultyMember.objects.filter(is_active=True)
    serializer_class = ser.FacultyMemberSerializer


def _table_exists(name):
    """True when the given (unmanaged, portal-*) table exists in the DB.
    Portal tables may be absent on fresh databases, so every website
    endpoint degrades gracefully instead of 500ing the public site."""
    try:
        with connection.cursor() as cur:
            cur.execute(
                "SELECT 1 FROM information_schema.tables WHERE table_name=%s",
                [name],
            )
            return cur.fetchone() is not None
    except Exception:
        return False


class WebsiteLevelListView(APIView):
    """Public academic levels for the Classes filter dropdown
    (/api/website/levels/). Backed by the unmanaged portal_academic_level
    table; degrades to an empty list if the table is missing."""
    permission_classes = [AllowAny]

    @method_decorator(cache_page(60))
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)

    @extend_schema(
        operation_id="WebsiteLevelsList",
        summary="List academic levels",
        description="Academic levels (Pre-Primary, Primary, Middle, Secondary, Senior Secondary) for the Classes filter.",
        tags=WEBSITE_TAG,
    )
    def get(self, request):
        rows = []
        if _table_exists("portal_academic_level"):
            with connection.cursor() as cur:
                cur.execute(
                    "SELECT id, name, description FROM portal_academic_level "
                    "WHERE is_published IS NOT FALSE ORDER BY sort_order, id"
                )
                rows = [
                    {"id": r[0], "name": r[1], "description": r[2] or ""}
                    for r in cur.fetchall()
                ]
        return Response(rows)


class WebsiteClassListView(APIView):
    """Public class list for the Classes/Academics pages
    (/api/website/classes/). Reads the unmanaged portal_class table and
    joins the per-class subject count from portal_academic_allocation."""
    permission_classes = [AllowAny]

    @method_decorator(cache_page(60))
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)

    @extend_schema(
        operation_id="WebsiteClassesList",
        summary="List classes",
        description="Classes offered by the school, with section, curriculum and subject count.",
        tags=WEBSITE_TAG,
    )
    def get(self, request):
        rows = []
        if _table_exists("portal_class"):
            with connection.cursor() as cur:
                cur.execute(
                    "SELECT c.id, c.name, c.section, c.curriculum, c.room_number, "
                    "COUNT(a.subject_id)::int "
                    "FROM portal_class c "
                    "LEFT JOIN portal_academic_allocation a ON a.class_id = c.id "
                    "GROUP BY c.id ORDER BY c.id"
                )
                rows = [
                    {
                        "id": r[0],
                        "name": r[1],
                        "section": r[2] or "",
                        "curriculum": r[3] or "",
                        "room_number": r[4] or "",
                        "academic_level": None,
                        "cover_image_url": None,
                        "description": "",
                        "subjects": [],
                        "subject_count": r[5],
                    }
                    for r in cur.fetchall()
                ]
        return Response(rows)


class WebsiteClassDetailView(APIView):
    """Single class with its mapped subjects (/api/website/classes/<id>/)."""
    permission_classes = [AllowAny]

    @method_decorator(cache_page(60))
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)

    @extend_schema(
        operation_id="WebsiteClassRetrieve",
        summary="Get class details",
        description="One class including its mapped subjects.",
        tags=WEBSITE_TAG,
    )
    def get(self, request, pk):
        if not _table_exists("portal_class"):
            return Response({"detail": "Not found."}, status=404)
        with connection.cursor() as cur:
            cur.execute(
                "SELECT id, name, section, curriculum, room_number "
                "FROM portal_class WHERE id=%s",
                [pk],
            )
            row = cur.fetchone()
            if not row:
                return Response({"detail": "Not found."}, status=404)
            subjects = []
            if _table_exists("portal_subject"):
                cur.execute(
                    "SELECT s.id, s.name, s.subject_code, s.type "
                    "FROM portal_subject s "
                    "JOIN portal_academic_allocation a ON a.subject_id = s.id "
                    "WHERE a.class_id=%s ORDER BY s.name",
                    [pk],
                )
                subjects = [
                    {"id": r[0], "name": r[1], "subject_code": r[2] or "", "type": r[3] or ""}
                    for r in cur.fetchall()
                ]
        return Response({
            "id": row[0],
            "name": row[1],
            "section": row[2] or "",
            "curriculum": row[3] or "",
            "room_number": row[4] or "",
            "academic_level": None,
            "cover_image_url": None,
            "description": "",
            "subjects": subjects,
            "subject_count": len(subjects),
        })


class WebsiteSubjectListView(APIView):
    """Public subject list (/api/website/subjects/)."""
    permission_classes = [AllowAny]

    @method_decorator(cache_page(60))
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)

    @extend_schema(
        operation_id="WebsiteSubjectsList",
        summary="List subjects",
        description="Subjects taught at the school with their type (Theory/Practical/Language/Elective).",
        tags=WEBSITE_TAG,
    )
    def get(self, request):
        rows = []
        if _table_exists("portal_subject"):
            with connection.cursor() as cur:
                cur.execute(
                    "SELECT id, name, subject_code, type FROM portal_subject ORDER BY name"
                )
                rows = [
                    {"id": r[0], "name": r[1], "subject_code": r[2] or "", "type": r[3] or "", "description": ""}
                    for r in cur.fetchall()
                ]
        return Response(rows)


class WebsiteSubjectDetailView(APIView):
    """Single subject with the classes that teach it (/api/website/subjects/<id>/)."""
    permission_classes = [AllowAny]

    @method_decorator(cache_page(60))
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)

    @extend_schema(
        operation_id="WebsiteSubjectRetrieve",
        summary="Get subject details",
        description="One subject including the classes it is taught in.",
        tags=WEBSITE_TAG,
    )
    def get(self, request, pk):
        if not _table_exists("portal_subject"):
            return Response({"detail": "Not found."}, status=404)
        with connection.cursor() as cur:
            cur.execute(
                "SELECT id, name, subject_code, type FROM portal_subject WHERE id=%s",
                [pk],
            )
            row = cur.fetchone()
            if not row:
                return Response({"detail": "Not found."}, status=404)
            classes = []
            if _table_exists("portal_class"):
                cur.execute(
                    "SELECT c.id, c.name, c.section, c.curriculum "
                    "FROM portal_class c "
                    "JOIN portal_academic_allocation a ON a.class_id = c.id "
                    "WHERE a.subject_id=%s ORDER BY c.name",
                    [pk],
                )
                classes = [
                    {"id": r[0], "name": r[1], "section": r[2] or "", "curriculum": r[3] or ""}
                    for r in cur.fetchall()
                ]
        return Response({
            "id": row[0],
            "name": row[1],
            "subject_code": row[2] or "",
            "type": row[3] or "",
            "description": "",
            "classes": classes,
        })


class WebsiteStatsView(APIView):
    """Aggregate headline numbers for the public website (Faculty page stats
    strip, Academics counters): faculty, classes, subjects and students.
    Portal tables may not exist yet (fresh DB), so each count degrades to 0
    rather than 500ing the public site. Cached 60s like the other website
    endpoints."""
    permission_classes = [AllowAny]

    @method_decorator(cache_page(60))
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)

    @extend_schema(
        operation_id="WebsiteStatsGet",
        summary="Get website headline stats",
        description=(
            "Aggregate counts used by the public website: active faculty, "
            "classes, subjects and students."
        ),
        tags=WEBSITE_TAG,
    )
    def get(self, request):
        def _count(sql, default=0):
            try:
                with connection.cursor() as cur:
                    cur.execute(sql)
                    return cur.fetchone()[0] or 0
            except Exception:
                return default

        return Response({
            "faculty": FacultyMember.objects.filter(is_active=True).count(),
            "classes": _count("SELECT COUNT(*)::int FROM portal_class"),
            "subjects": _count(
                "SELECT COUNT(DISTINCT subject_id)::int FROM portal_academic_allocation"
            ),
            "students": _count("SELECT COUNT(*)::int FROM portal_student_profile"),
        })
