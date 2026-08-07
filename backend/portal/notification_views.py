"""Notification preferences.

Each authenticated user may enable/disable the delivery channels they receive
(Email / SMS / Push / In-app). Stored in ``portal_notification_preference``
(one row per user). The row is created on first write; users who never touch
this endpoint keep the default (all channels except SMS) behaviour.
"""
import logging

from django.db import connection
from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from drf_spectacular.utils import extend_schema, inline_serializer

logger = logging.getLogger("edunova")

_DEFAULTS = {
    "email_enabled": True,
    "sms_enabled": False,
    "push_enabled": True,
    "in_app_enabled": True,
}


def _table_exists(name):
    with connection.cursor() as cur:
        cur.execute(
            "SELECT EXISTS (SELECT 1 FROM information_schema.tables "
            "WHERE table_schema='public' AND table_name=%s)",
            [name],
        )
        return cur.fetchone()[0]


def _read_row(user_id):
    with connection.cursor() as cur:
        cur.execute(
            "SELECT email_enabled, sms_enabled, push_enabled, in_app_enabled "
            "FROM portal_notification_preference WHERE user_id=%s",
            [user_id],
        )
        cols = [c[0] for c in cur.description]
        row = cur.fetchone()
    return dict(zip(cols, row)) if row else None


_ResponseSerializer = inline_serializer(
    name="NotificationPreferencesResponse",
    fields={k: serializers.BooleanField() for k in _DEFAULTS},
)

_UpdateRequestSerializer = inline_serializer(
    name="NotificationPreferencesUpdateRequest",
    fields={k: serializers.BooleanField(required=False) for k in _DEFAULTS},
)


class NotificationPreferenceSerializer(serializers.Serializer):
    email_enabled = serializers.BooleanField(required=False)
    sms_enabled = serializers.BooleanField(required=False)
    push_enabled = serializers.BooleanField(required=False)
    in_app_enabled = serializers.BooleanField(required=False)


class NotificationPreferencesView(APIView):
    permission_classes = [IsAuthenticated]

    def _effective(self, user_id):
        prefs = dict(_DEFAULTS)
        if _table_exists("portal_notification_preference"):
            row = _read_row(user_id)
            if row:
                for key in prefs:
                    if row.get(key) is not None:
                        prefs[key] = row[key]
        return prefs

    @extend_schema(
        operation_id="NotificationPreferencesGet",
        summary="Get my notification preferences",
        description="Returns the caller's Email/SMS/Push/In-app notification preferences.",
        tags=["Notifications"],
        responses={200: _ResponseSerializer},
    )
    def get(self, request):
        return Response(self._effective(request.user.id))

    @extend_schema(
        operation_id="NotificationPreferencesUpdate",
        summary="Update my notification preferences",
        description="Enable or disable any subset of the email, SMS, push and in-app channels.",
        tags=["Notifications"],
        request=_UpdateRequestSerializer,
        responses={200: _ResponseSerializer},
    )
    def put(self, request):
        if not _table_exists("portal_notification_preference"):
            return Response(
                {"detail": "Portal schema has not been applied."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = NotificationPreferenceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO portal_notification_preference
                    (user_id, email_enabled, sms_enabled, push_enabled, in_app_enabled)
                VALUES (%s, COALESCE(%s,true), COALESCE(%s,false), COALESCE(%s,true), COALESCE(%s,true))
                ON CONFLICT (user_id) DO UPDATE SET
                    email_enabled = COALESCE(EXCLUDED.email_enabled, portal_notification_preference.email_enabled),
                    sms_enabled = COALESCE(EXCLUDED.sms_enabled, portal_notification_preference.sms_enabled),
                    push_enabled = COALESCE(EXCLUDED.push_enabled, portal_notification_preference.push_enabled),
                    in_app_enabled = COALESCE(EXCLUDED.in_app_enabled, portal_notification_preference.in_app_enabled),
                    updated_at = now()
                """,
                [request.user.id, data.get("email_enabled"), data.get("sms_enabled"),
                 data.get("push_enabled"), data.get("in_app_enabled")],
            )
        return Response(self._effective(request.user.id))
