"""EduNova centralized exception handling.

A single DRF EXCEPTION_HANDLER registered in settings so every API endpoint
returns a consistent JSON error envelope:

    {"detail": "human readable message", "code": "stable-slug"}

`detail` is preserved (the key the existing frontend already reads) and `code`
is additive, so this is backward compatible with every existing client.

Unhandled exceptions (database failures, programming errors, anything DRF does
not natively map) are converted to a generic 500 *without leaking internals*,
and are logged with full stack + request context so they stay debuggable in
production.
"""
import logging

from django.core.exceptions import (
    ObjectDoesNotExist,
    PermissionDenied as DjangoPermissionDenied,
    ValidationError as DjangoValidationError,
)
from django.db.utils import DatabaseError, IntegrityError, OperationalError, ProgrammingError
from django.http import Http404, JsonResponse
from django.views.defaults import page_not_found, server_error
from rest_framework import exceptions as drf_exceptions
from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger("edunova.errors")


def _error_code(exception):
    """Return a stable, low-cardinality slug for an exception class."""
    if isinstance(exception, drf_exceptions.ValidationError) or isinstance(
        exception, DjangoValidationError
    ):
        return "validation_error"
    if isinstance(exception, drf_exceptions.AuthenticationFailed):
        return "authentication_failed"
    if isinstance(exception, drf_exceptions.NotAuthenticated):
        return "not_authenticated"
    if isinstance(exception, drf_exceptions.PermissionDenied) or isinstance(
        exception, DjangoPermissionDenied
    ):
        return "permission_denied"
    if isinstance(exception, drf_exceptions.NotFound) or isinstance(exception, Http404):
        return "not_found"
    if isinstance(exception, drf_exceptions.MethodNotAllowed):
        return "method_not_allowed"
    if isinstance(exception, drf_exceptions.Throttled):
        return "throttled"
    if isinstance(exception, IntegrityError):
        return "integrity_error"
    if isinstance(exception, (DatabaseError, OperationalError, ProgrammingError)):
        return "database_error"
    if isinstance(exception, drf_exceptions.APIException):
        return "api_error"
    return "internal_error"


def _log_unexpected(exc, request):
    """Log a fully attributed, structured error record for ops teams."""
    user_id = None
    path = None
    method = None
    if request is not None:
        user_id = getattr(getattr(request, "user", None), "id", None)
        path = getattr(request, "path", None)
        method = getattr(request, "method", None)
    logger.exception(
        "Unhandled API exception. user_id=%s method=%s path=%s type=%s",
        user_id,
        method,
        path,
        type(exc).__name__,
    )


def _convert_db_errors(exc):
    """Map DB-level errors DRF does not understand to clean API responses.

    Returns a (Response, None) pair, or (None, None) when the exception is
    not one we convert here.
    """
    if isinstance(exc, IntegrityError):
        return Response(
            {
                "detail": "The record could not be saved: a referenced record is missing or a unique value already exists.",
                "code": "integrity_error",
            },
            status=400,
        )
    if isinstance(exc, (ObjectDoesNotExist, Http404)):
        return Response({"detail": "The requested resource was not found.", "code": "not_found"}, status=404)
    return None


def edunova_exception_handler(exc, context):
    """DRF EXCEPTION_HANDLER: consistent envelope + safe 500s + structured logs."""
    response = exception_handler(exc, context)

    if response is None:
        # Exceptions DRF does not natively understand: convert the common
        # DB-level ones (IntegrityError, DoesNotExist) to clean 400/404s;
        # everything else is an unexpected 500 (logged, never leaked).
        converted = _convert_db_errors(exc)
        if converted is not None:
            return converted
        _log_unexpected(exc, context.get("request"))
        return Response(
            {
                "detail": "An unexpected error occurred. Please try again later.",
                "code": "internal_error",
            },
            status=500,
        )

    # Attach a stable code to every mapped error. `detail` is preserved so the
    # frontend's existing error handling keeps working unchanged.
    data = getattr(response, "data", None)
    if isinstance(data, dict) and "code" not in data:
        data["code"] = _error_code(exc)
    return response


def api_json_404(request, exception=None):
    """Django handler404: keep /api/* responses JSON on unmatched routes.

    DRF views return JSON 404s via the registered EXCEPTION_HANDLER, but a
    request to a URL that matches no route never reaches DRF — Django's default
    handler would otherwise return an HTML page to API clients.
    """
    if request.path.startswith("/api/"):
        return JsonResponse(
            {"detail": "The requested resource was not found.", "code": "not_found"},
            status=404,
        )
    return page_not_found(request, exception)


def api_json_500(request, *args, **kwargs):
    """Django handler500: JSON envelope for /api/* requests, HTML otherwise."""
    if request.path.startswith("/api/"):
        logger.exception("Unhandled server error on %s %s", request.method, request.path)
        return JsonResponse(
            {
                "detail": "An unexpected server error occurred. Please try again later.",
                "code": "internal_error",
            },
            status=500,
        )
    return server_error(request)
