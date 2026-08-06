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
