import logging
import secrets
import sys

from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.core.cache import cache
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, SimpleRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken

from .services.email_service import send_login_otp_email


logger = logging.getLogger(__name__)


def _email_is_console_only() -> bool:
    """True when the configured EMAIL_BACKEND is the console backend and we
    are NOT in DEBUG. In that state an OTP email would only be printed to the
    server log and never delivered, so login must refuse loudly instead of
    pretending the OTP was sent."""
    if getattr(settings, "DEBUG", False):
        return False
    return "console" in str(getattr(settings, "EMAIL_BACKEND", "")).lower()


def _email_not_configured_response():
    return Response(
        {
            "detail": "Verification email service is not configured on this server. "
            "Please contact the administrator (SMTP/EMAIL_BACKEND env vars)."
        },
        status=status.HTTP_503_SERVICE_UNAVAILABLE,
    )


def _static_otp_enabled() -> bool:
    """Static OTP (\"123456\") is a LOCAL-DEV ONLY escape hatch.

    It is honored only when BOTH DEBUG and DEV_STATIC_OTP are true, so a
    production server can never accept the public code even if the env var
    is accidentally left on a host. Production login always requires a real
    emailed OTP.
    """
    return bool(
        getattr(settings, "DEBUG", False)
        and getattr(settings, "DEV_STATIC_OTP", False)
    )

# ---------------------------------------------------------------------------
# Throttle classes (unchanged)
# ---------------------------------------------------------------------------

class _PerAccountThrottle(SimpleRateThrottle):
    account_field = "user_id"

    def get_cache_key(self, request, view):
        ident = request.data.get(self.account_field)
        if not ident:
            return None
        return self.cache_format % {"scope": self.scope, "ident": f"{self.scope}:{ident}"}

class LoginAccountThrottle(_PerAccountThrottle):
    scope = "otp_login_account"

    def get_cache_key(self, request, view):
        ident = request.data.get("email") or request.data.get("username")
        if not ident:
            return None
        return self.cache_format % {"scope": self.scope, "ident": f"{self.scope}:{ident}"}


class OtpVerifyAccountThrottle(_PerAccountThrottle):
    scope = "otp_verify_account"
    account_field = "user_id"


class OtpResendAccountThrottle(_PerAccountThrottle):
    scope = "otp_resend_account"
    account_field = "user_id"


class LoginIPThrottle(AnonRateThrottle):
    scope = "otp_login_ip"


class OtpVerifyIPThrottle(AnonRateThrottle):
    scope = "otp_verify_ip"


class OtpResendIPThrottle(AnonRateThrottle):
    scope = "otp_resend_ip"


# ---------------------------------------------------------------------------
# Helpers (unchanged signatures)
# ---------------------------------------------------------------------------

def get_user_role(user):
    from .roles import get_role
    return get_role(user)


def user_payload(user) -> dict:
    full_name = user.get_full_name().strip() or user.username
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "name": full_name,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "user_type": get_user_role(user),
    }


def _find_user_by_email_or_username(identifier: str):
    User = get_user_model()
    if not identifier:
        return None
    try:
        if "@" in identifier:
            return User.objects.filter(email__iexact=identifier).first()
        return User.objects.filter(username__iexact=identifier).first()
    except Exception as exc:
        logger.error("Error finding user by identifier '%s': %s", identifier, exc)
        return None


def _generate_otp() -> str:
    """Cryptographically secure 6-digit OTP. Never logged, never returned."""
    return str(secrets.randbelow(900000) + 100000)


def _store_otp(user_id: int, otp: str) -> None:
    expiry = getattr(settings, "OTP_EXPIRY_SECONDS", 300)
    cache.set(f"portal_login_otp:{user_id}", otp, expiry)


# ---------------------------------------------------------------------------
# Views
# ---------------------------------------------------------------------------

@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([LoginAccountThrottle, LoginIPThrottle])
def login_step1(request):
    identifier = (request.data.get("email") or request.data.get("username") or "").strip()
    password = request.data.get("password") or ""

    User = get_user_model()
    user = None

    try:
        if "@" in identifier:
            matching_users = User.objects.filter(email__iexact=identifier)
            for u in matching_users:
                auth_user = authenticate(username=u.username, password=password)
                if auth_user:
                    user = auth_user
                    break
        else:
            user_obj = User.objects.filter(username__iexact=identifier).first()
            if user_obj:
                user = authenticate(username=user_obj.username, password=password)
    except Exception as exc:
        logger.exception("Database query failed during login")
        return Response(
            {"detail": "Database connection error. Please try again in a few moments."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    if not user:
        return Response(
            {"detail": "Invalid email/username or password."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not user.is_active:
        return Response(
            {"detail": "User account is inactive."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    static_otp = _static_otp_enabled()
    if static_otp:
        otp = "123456"
    else:
        otp = _generate_otp()

    _store_otp(user.id, otp)

    if static_otp:
        # Local-dev escape hatch only (DEBUG must be True). Production never
        # takes this path, so real OTP emails are always required there.
        return Response({
            "user_id": user.id,
            "user_type": get_user_role(user),
            "email_sent": False,
            "email_error": "Static OTP enabled locally (DEV_STATIC_OTP). Use 123456 — no email was sent.",
            "detail": "Static OTP active (dev only).",
        })
    elif _email_is_console_only():
        return _email_not_configured_response()
    else:
        try:
            send_login_otp_email(user, otp)
        except Exception as e:
            logger.exception("Failed to send OTP email")
            if settings.DEBUG:
                print("\n" + "="*50)
                print(f"DEBUG OTP FOR {user.username} ({user.email}): {otp}")
                print("="*50 + "\n")
                return Response({
                    "user_id": user.id,
                    "user_type": get_user_role(user),
                    "email_sent": False,
                    "email_error": "OTP email could not be delivered (SMTP refused from this server/IP). Check the Brevo SMTP IP allowlist and sender verification.",
                    "detail": f"OTP generated in debug mode (check console: {otp}).",
                })
            return Response(
                {"detail": "Unable to send verification email."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    return Response({
        "user_id": user.id,
        "user_type": get_user_role(user),
        "email_sent": True,
        "detail": "OTP sent successfully.",
    })


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([OtpVerifyAccountThrottle, OtpVerifyIPThrottle])
def login_step2_verify_otp(request):
    """Unchanged — verifies cached OTP and returns JWT."""
    user_id = request.data.get("user_id")
    otp = str(request.data.get("otp") or "").strip()

    if not user_id or not otp:
        return Response(
            {"detail": "User ID and OTP are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Static OTP is honored only when DEBUG is also True (local dev escape
    # hatch). In production the public code 123456 can never verify, even if
    # DEV_STATIC_OTP is accidentally left in the env — real emailed OTP only.
    is_static = _static_otp_enabled() and otp == "123456"

    cached = cache.get(f"portal_login_otp:{user_id}")
    if not is_static and (not cached or otp != str(cached)):
        return Response(
            {"detail": "Invalid or expired OTP."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    User = get_user_model()
    try:
        user = User.objects.get(id=user_id, is_active=True)
    except User.DoesNotExist:
        return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

    refresh = RefreshToken.for_user(user)
    cache.delete(f"portal_login_otp:{user_id}")
    return Response({
        "refresh": str(refresh),
        "access": str(refresh.access_token),
        "user": user_payload(user),
    })


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([OtpResendAccountThrottle, OtpResendIPThrottle])
def resend_otp(request):
    user_id = request.data.get("user_id")
    User = get_user_model()
    try:
        user = User.objects.get(id=user_id, is_active=True)
    except User.DoesNotExist:
        return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

    cache.delete(f"portal_login_otp:{user.id}")

    static_otp = _static_otp_enabled()
    if static_otp:
        otp = "123456"
        _store_otp(user.id, otp)
        return Response({"detail": "Static OTP active (dev only).", "email_sent": False})
    elif _email_is_console_only():
        return _email_not_configured_response()
    else:
        otp = _generate_otp()
        _store_otp(user.id, otp)
        try:
            send_login_otp_email(user, otp)
        except Exception:
            logger.exception("Failed to send OTP email")
            if settings.DEBUG:
                print("\n" + "=" * 50)
                print(f"DEBUG OTP FOR {user.username} ({user.email}): {otp}")
                print("=" * 50 + "\n")
                return Response({
                    "detail": "OTP resent successfully (check console).",
                    "email_sent": False,
                })
            return Response(
                {"detail": "Unable to send verification email."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    return Response({"detail": "OTP resent successfully.", "email_sent": True})
