"""Custom drf-spectacular AutoSchema for EduNova.

A large share of the portal API is plain APIView classes (and @api_view
functions) that return hand-built dictionaries via raw SQL — they have no
DRF serializer. drf-spectacular's default AutoSchema logs an
"unable to guess serializer" error for every one of those (once for the
request side and once for the response side) and leaves their schemas
undocumented. This subclass reproduces the same serializer resolution logic
without the error branch: when no serializer can be found it falls back to a
generic `object` schema, so every endpoint stays documented and the schema
generation output is clean. Serializer-backed endpoints (CMS, admissions,
...) keep their precise schemas.
"""
import logging

from drf_spectacular.openapi import AutoSchema, build_serializer_context
from rest_framework import serializers
from rest_framework.generics import GenericAPIView
from rest_framework.views import APIView

logger = logging.getLogger(__name__)


class _GenericObjectSerializer(serializers.Serializer):
    """Placeholder used when a view has no serializer at all. Appears in the
    docs as a generic `object` request/response schema."""


class EduNovaAutoSchema(AutoSchema):
    """AutoSchema that keeps serializer-less raw-SQL views documented."""

    def _get_serializer(self):
        view = self.view
        context = build_serializer_context(view)
        try:
            if isinstance(view, GenericAPIView):
                # GenericAPIView.get_serializer() may fail without a request
                # when get_queryset() depends on it; only call it when the
                # view has not overridden it (mirrors upstream behaviour).
                if view.__class__.get_serializer == GenericAPIView.get_serializer:
                    return view.get_serializer_class()(context=context)
                return view.get_serializer(context=context)
            if isinstance(view, APIView):
                if callable(getattr(view, "get_serializer", None)):
                    return view.get_serializer(context=context)
                if callable(getattr(view, "get_serializer_class", None)):
                    return view.get_serializer_class()(context=context)
                if hasattr(view, "serializer_class"):
                    return view.serializer_class
        except Exception as exc:
            # Upstream logs a warning here; we keep the view documented but
            # still surface the problem at debug level so real view bugs are
            # not silently hidden during schema generation.
            logger.debug("Serializer introspection failed for %s: %s", type(view).__name__, exc)
        # Raw-SQL APIView without a serializer: fall back to a generic object
        # schema instead of dropping the endpoint from the API docs.
        return _GenericObjectSerializer()
