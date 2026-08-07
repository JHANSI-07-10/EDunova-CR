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
import traceback

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
            actor_id = None
        else:
            actor_id = user.id

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
