from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from rest_framework import viewsets, mixins
from .models import (
    SchoolSettings, Campus, AcademicProgram, Department, LeadershipMember,
    SchoolStat, WhyChooseItem, TechnologyPartner, CMSPage, NewsPost, Event,
    GalleryAlbum, GalleryImage, Achievement, Testimonial, FAQ, Document,
    JobPosting, ContactSubmission, ScholarshipInfo,
)
from . import serializers as ser


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


class SchoolSettingsViewSet(viewsets.ReadOnlyModelViewSet):
    """Singleton — frontend calls /api/cms/settings/1/ or /api/cms/settings/ and takes first result."""
    queryset = SchoolSettings.objects.all()
    serializer_class = ser.SchoolSettingsSerializer


class CampusViewSet(PublicReadViewSet):
    queryset = Campus.objects.all()
    serializer_class = ser.CampusSerializer


class AcademicProgramViewSet(PublicReadViewSet):
    queryset = AcademicProgram.objects.all()
    serializer_class = ser.AcademicProgramSerializer


class DepartmentViewSet(PublicReadViewSet):
    queryset = Department.objects.all()
    serializer_class = ser.DepartmentSerializer


class LeadershipMemberViewSet(PublicReadViewSet):
    queryset = LeadershipMember.objects.all()
    serializer_class = ser.LeadershipMemberSerializer


class SchoolStatViewSet(PublicReadViewSet):
    queryset = SchoolStat.objects.all()
    serializer_class = ser.SchoolStatSerializer


class WhyChooseItemViewSet(PublicReadViewSet):
    queryset = WhyChooseItem.objects.all()
    serializer_class = ser.WhyChooseItemSerializer


class TechnologyPartnerViewSet(PublicReadViewSet):
    queryset = TechnologyPartner.objects.all()
    serializer_class = ser.TechnologyPartnerSerializer


class CMSPageViewSet(PublicReadViewSet):
    queryset = CMSPage.objects.all()
    serializer_class = ser.CMSPageSerializer
    lookup_field = "slug"


class NewsPostViewSet(PublicReadViewSet):
    queryset = NewsPost.objects.filter(is_published=True)
    serializer_class = ser.NewsPostSerializer
    lookup_field = "slug"


class EventViewSet(PublicReadViewSet):
    queryset = Event.objects.all()
    serializer_class = ser.EventSerializer


class GalleryAlbumViewSet(PublicReadViewSet):
    queryset = GalleryAlbum.objects.all()
    serializer_class = ser.GalleryAlbumSerializer


class GalleryImageViewSet(PublicReadViewSet):
    queryset = GalleryImage.objects.all()
    serializer_class = ser.GalleryImageSerializer


class AchievementViewSet(PublicReadViewSet):
    queryset = Achievement.objects.all()
    serializer_class = ser.AchievementSerializer


class TestimonialViewSet(PublicReadViewSet):
    queryset = Testimonial.objects.filter(is_featured=True)
    serializer_class = ser.TestimonialSerializer


class FAQViewSet(PublicReadViewSet):
    queryset = FAQ.objects.all()
    serializer_class = ser.FAQSerializer


class DocumentViewSet(PublicReadViewSet):
    serializer_class = ser.DocumentSerializer

    def get_queryset(self):
        qs = Document.objects.all()
        audience = self.request.query_params.get("audience")
        if audience:
            qs = qs.filter(audience=audience)
        return qs


class JobPostingViewSet(PublicReadViewSet):
    queryset = JobPosting.objects.filter(is_open=True)
    serializer_class = ser.JobPostingSerializer


class ScholarshipInfoViewSet(PublicReadViewSet):
    queryset = ScholarshipInfo.objects.all()
    serializer_class = ser.ScholarshipInfoSerializer


class ContactSubmissionViewSet(mixins.CreateModelMixin, viewsets.GenericViewSet):
    """Public: write-only. Contact page POSTs here; nothing is exposed to read publicly."""
    queryset = ContactSubmission.objects.all()
    serializer_class = ser.ContactSubmissionSerializer
