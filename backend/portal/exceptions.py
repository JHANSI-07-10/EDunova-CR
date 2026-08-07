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
    PermissionDenied as DjangoPermissionDenied,
    ValidationError as DjangoValidationError,
)
from django.db.utils import DatabaseError, IntegrityError, OperationalError, ProgrammingError
from django.http import Http404
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


def edunova_exception_handler(exc, context):
    """DRF EXCEPTION_HANDLER: consistent envelope + safe 500s + structured logs."""
    response = exception_handler(exc, context)

    if response is None:
        # DRF could not map this exception -> unexpected 500.
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
