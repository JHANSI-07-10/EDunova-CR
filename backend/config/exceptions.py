"""Central DRF exception handler.

Without this, an unhandled exception inside an APIView returns Django's HTML
500 page — useless to a React client and, in DEBUG, leaks a full traceback.
This handler:

- turns IntegrityError (e.g. duplicate/conflicting rows) into a 400 JSON error
- turns ValueError (e.g. int(\"abc\")) into a 400 JSON error
- lets DRF handle its own APIException/Http404/PermissionDenied as before
- for anything else, logs it and returns a generic JSON 500 (in production;
  in DEBUG it returns None so developers still get Django's debug page)
"""
import logging

from django.conf import settings
from django.db import IntegrityError
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    if isinstance(exc, IntegrityError):
        return Response(
            {"detail": "This record conflicts with existing data (duplicate or integrity error)."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if isinstance(exc, ValueError):
        return Response(
            {"detail": "One of the supplied values is invalid."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    response = exception_handler(exc, context)
    if response is not None:
        return response

    # Unhandled exception inside an API view.
    if getattr(settings, "DEBUG", False):
        return None  # let Django render the debug page for local development
    logger.exception(
        "Unhandled API exception on %s %s: %s",
        context.get("request").method if context.get("request") else "?",
        context.get("request").get_full_path() if context.get("request") else "?",
        exc,
    )
    return Response(
        {"detail": "An unexpected server error occurred. Please try again."},
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
