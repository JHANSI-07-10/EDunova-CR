from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import viewsets, mixins
from rest_framework.throttling import ScopedRateThrottle
from .models import (
    SchoolSettings, Campus, AcademicProgram, Department, LeadershipMember,
    SchoolStat, WhyChooseItem, TechnologyPartner, CMSPage, NewsPost, Event,
    GalleryAlbum, GalleryImage, Achievement, Testimonial, FAQ, Document,
    JobPosting, ContactSubmission, ScholarshipInfo,
)
from . import serializers as ser

WEBSITE_TAG = ["Website"]


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
class SchoolSettingsViewSet(viewsets.ReadOnlyModelViewSet):
    """Singleton — frontend calls /api/cms/settings/1/ or /api/cms/settings/ and takes first result."""
    queryset = SchoolSettings.objects.all()
    serializer_class = ser.SchoolSettingsSerializer


@extend_schema_view(
    list=extend_schema(
        operation_id="WebsiteCampusList",
        summary="List campuses",
        description="Public list of school campuses.",
        tags=WEBSITE_TAG,
    ),
    retrieve=extend_schema(
        operation_id="WebsiteCampusRetrieve",
        summary="Get a campus",
        description="Retrieve a single campus by id.",
        tags=WEBSITE_TAG,
    ),
)
class CampusViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Campus.objects.all()
    serializer_class = ser.CampusSerializer


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
class AcademicProgramViewSet(viewsets.ReadOnlyModelViewSet):
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
class DepartmentViewSet(viewsets.ReadOnlyModelViewSet):
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
class LeadershipMemberViewSet(viewsets.ReadOnlyModelViewSet):
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
class SchoolStatViewSet(viewsets.ReadOnlyModelViewSet):
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
class WhyChooseItemViewSet(viewsets.ReadOnlyModelViewSet):
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
class TechnologyPartnerViewSet(viewsets.ReadOnlyModelViewSet):
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
class CMSPageViewSet(viewsets.ReadOnlyModelViewSet):
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
class NewsPostViewSet(viewsets.ReadOnlyModelViewSet):
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
class EventViewSet(viewsets.ReadOnlyModelViewSet):
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
class GalleryAlbumViewSet(viewsets.ReadOnlyModelViewSet):
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
class GalleryImageViewSet(viewsets.ReadOnlyModelViewSet):
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
class AchievementViewSet(viewsets.ReadOnlyModelViewSet):
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
class TestimonialViewSet(viewsets.ReadOnlyModelViewSet):
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
class FAQViewSet(viewsets.ReadOnlyModelViewSet):
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
class DocumentViewSet(viewsets.ReadOnlyModelViewSet):
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
class JobPostingViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = JobPosting.objects.select_related("department").filter(is_open=True)
    serializer_class = ser.JobPostingSerializer


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
class ScholarshipInfoViewSet(viewsets.ReadOnlyModelViewSet):
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
