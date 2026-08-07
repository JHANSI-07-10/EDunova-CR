from django.contrib import admin
from django.contrib.admin.views.decorators import staff_member_required
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.renderers import OpenApiJsonRenderer, OpenApiYamlRenderer
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView,
)
from .status_view import status_dashboard

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

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
