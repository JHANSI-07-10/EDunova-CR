from django.contrib import admin
from django.contrib.admin.views.decorators import staff_member_required
from django.urls import path, include, re_path
from django.conf import settings
from django.views.static import serve
from drf_spectacular.renderers import OpenApiJsonRenderer, OpenApiYamlRenderer
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView,
)
from rest_framework.routers import DefaultRouter
from apps.cms.views import (
    CampusViewSet,
    CampusVisitView,
    FacultyMemberViewSet,
    WebsiteClassDetailView,
    WebsiteClassListView,
    WebsiteLevelListView,
    WebsiteStatsView,
    WebsiteSubjectDetailView,
    WebsiteSubjectListView,
)
from .status_view import status_dashboard

# Public website namespace — the frontend fetches the faculty directory from
# /api/website/faculty/ (and headline stats from the dedicated path above).
website_router = DefaultRouter()
website_router.register("faculty", FacultyMemberViewSet, basename="website-faculty")

# The Contact page also talks to the old-style /api/campuses/ URLs (list +
# visit booking). Mount the CMS campus viewset there too so those calls work.
campuses_router = DefaultRouter()
campuses_router.register("", CampusViewSet, basename="campuses")

# The status dashboard lists every API route and surfaces raw DB errors —
# only expose it publicly during local development. In production it is
# restricted to logged-in Django staff (redirected to the admin login).
_status_view = (
    status_dashboard
    if settings.DEBUG
    else staff_member_required(status_dashboard, login_url="/admin/login/")
)

urlpatterns = [
    path("", _status_view, name="status-dashboard"),
    path("admin/", admin.site.urls),
    path("api/cms/", include("apps.cms.urls")),
    # The public website frontend calls the /api/website/* namespace (faculty
    # directory, headline stats). The faculty router is mounted here too so
    # no frontend change is needed; stats is the aggregate counters object.
    path("api/website/stats/", WebsiteStatsView.as_view(), name="website-stats"),
    path("api/website/levels/", WebsiteLevelListView.as_view(), name="website-levels"),
    path("api/website/classes/", WebsiteClassListView.as_view(), name="website-classes"),
    path("api/website/classes/<int:pk>/", WebsiteClassDetailView.as_view(), name="website-class-detail"),
    path("api/website/subjects/", WebsiteSubjectListView.as_view(), name="website-subjects"),
    path("api/website/subjects/<int:pk>/", WebsiteSubjectDetailView.as_view(), name="website-subject-detail"),
    path("api/website/", include(website_router.urls)),
    # Keep the Contact page's /api/campuses/* calls working (list + visit booking).
    path("api/campuses/visit/", CampusVisitView.as_view(), name="campus-visit"),
    path("api/campuses/", include(campuses_router.urls)),
    path("api/admissions/", include("apps.admissions.urls")),
    path("api/", include("portal.urls")),
    # OpenAPI / Swagger documentation. JSON is the default representation so
    # the Swagger UI can consume it; ?format=yaml still works.
    path(
        "api/schema/",
        SpectacularAPIView.as_view(
            renderer_classes=[OpenApiJsonRenderer, OpenApiYamlRenderer]
        ),
        name="schema",
    ),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
    # Aliases matching the canonical /api/schema/... layout.
    path(
        "api/schema/swagger-ui/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui-alias",
    ),
    path(
        "api/schema/redoc/",
        SpectacularRedocView.as_view(url_name="schema"),
        name="redoc-alias",
    ),

]

# Serve uploaded media locally in every environment. In production, files
# normally live in Supabase Storage (CDN URLs), so this only serves the
# local-fallback files that actually exist under MEDIA_ROOT — e.g. seeded
# CMS images — and never interferes with CDN-backed uploads.
# NB: django.conf.urls.static.static() is a no-op when DEBUG=False (Django
# 5.1+), so mount the serve view explicitly.
urlpatterns += [
    re_path(
        r"^media/(?P<path>.*)$",
        serve,
        kwargs={"document_root": settings.MEDIA_ROOT},
    ),
]
