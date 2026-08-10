"""
portal/middleware.py

ExceptionLoggingMiddleware is referenced from config/settings.py MIDDLEWARE.
It logs unhandled exceptions (with full tracebacks) so production errors
surface in the host's logs (Render) instead of disappearing.

Note: returning None from `process_exception` never swallows the exception —
it just lets Django finish its normal error handling (a 500 response when
DEBUG=False, the debug page when DEBUG=True).
"""
import logging
import time
import traceback
import uuid

from .roles import log_action

logger = logging.getLogger(__name__)


class ExceptionLoggingMiddleware:
    """Log every unhandled exception with its traceback."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        return self.get_response(request)

    def process_exception(self, request, exception):
        logger.error(
            "Unhandled exception on %s %s: %s\n%s",
            request.method,
            request.get_full_path(),
            exception,
            traceback.format_exc(),
        )
        return None


audit_logger = logging.getLogger("edunova.audit")

_MUTATING_METHODS = {"POST", "PATCH", "PUT", "DELETE"}
_ACTION_BY_METHOD = {"POST": "create", "PATCH": "update", "PUT": "update", "DELETE": "delete"}


def get_client_ip(request):
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR") or request.META.get("REMOTE_HOST") or ""


class AuditTrailMiddleware:
    """Centralized audit-trail middleware.

    Records every mutating API request (POST/PATCH/PUT/DELETE under /api/) into
    ``portal_audit_log`` with the acting user, action, target, IP address and the
    resulting HTTP status. Auth endpoints (/api/auth/*) are intentionally excluded
    here because they are logged explicitly with richer detail in auth_views.

    This is a best-effort observer: if the portal extension table is missing the
    write is skipped (see portal.roles.log_action), and an audit-write failure must
    never take down the actual request.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        try:
            self._record(request, response)
        except Exception:  # pragma: no cover - auditing must never break requests
            audit_logger.exception("Audit write failed for %s %s", request.method, request.path)
        return response

    def _record(self, request, response):
        if request.method not in _MUTATING_METHODS:
            return
        path = request.path or ""
        if not path.startswith("/api/") or path.startswith("/api/auth/"):
            return

        user = getattr(request, "user", None)
        if user is None or not getattr(user, "is_authenticated", False):
            user = None

        # Derive a readable target like "teacher/assignments/123" from the path.
        parts = [p for p in path.strip("/").split("/") if p]
        if parts and parts[0] == "api":
            parts = parts[1:]
        target_type = "/".join(parts)
        target_id = parts[-1] if parts and parts[-1].isdigit() else ""

        log_action(
            actor=user,
            action=_ACTION_BY_METHOD.get(request.method, "mutate"),
            target_type=target_type,
            target_id=target_id,
            details={"method": request.method, "status": response.status_code},
            ip_address=get_client_ip(request),
        )


_HTML_CONTENT_TYPES = ("text/html", "application/xhtml+xml")


def _is_html_response(response) -> bool:
    content_type = response.get("Content-Type", "")
    return any(content_type.startswith(ct) for ct in _HTML_CONTENT_TYPES)


class SecurityHeadersMiddleware:
    """Emit Content-Security-Policy, Permissions-Policy and
    X-Permitted-Cross-Domain-Policies on every response.

    The policy set used depends on the content type: machine-readable responses
    (/api/* JSON, OpenAPI schema) get the strict policy (no unsafe-inline, no
    external origins), while HTML pages (Swagger UI, Django admin, the branded
    landing page) get the lenient policy that their inline scripts/styles need.
    Both policies are configured in ``config.settings`` and can be disabled with
    ``SECURITY_CSP=off`` (see settings for the exact values).
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        from django.conf import settings

        policy = settings.CSP_API_POLICY if not _is_html_response(response) else settings.CSP_HTML_POLICY
        if policy:
            response["Content-Security-Policy"] = policy
        response["X-Permitted-Cross-Domain-Policies"] = "none"
        if settings.SECURITY_PERMISSIONS_POLICY:
            response["Permissions-Policy"] = settings.SECURITY_PERMISSIONS_POLICY
        return response


class RequestLoggingMiddleware:
    """Structured access log for every /api/* request.

    Records method, path (query-string stripped), status code, duration and a
    request id (echoed back as ``X-Request-ID`` for request correlation).
    Never logs request bodies, headers, cookies or query strings, so the log
    line cannot leak OTPs, JWTs or PII.
    """

    logger = logging.getLogger("edunova.request")

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if not request.path.startswith("/api/"):
            return self.get_response(request)

        request_id = getattr(request, "request_id", None)
        if not request_id:
            request_id = uuid.uuid4().hex[:12]
            request.request_id = request_id

        start = time.perf_counter()
        try:
            response = self.get_response(request)
        except Exception:
            # Still surface the failure in the access log even though the
            # exception propagates to the 500 handler.
            duration_ms = round((time.perf_counter() - start) * 1000)
            self.logger.info(
                'ACCESS method=%s path=%s status=500 duration_ms=%s request_id=%s',
                request.method, request.path, duration_ms, request_id,
            )
            raise

        duration_ms = round((time.perf_counter() - start) * 1000)
        response["X-Request-ID"] = request_id
        self.logger.info(
            "ACCESS method=%s path=%s status=%s duration_ms=%s request_id=%s",
            request.method,
            request.path,
            response.status_code,
            duration_ms,
            request_id,
        )
        return response
