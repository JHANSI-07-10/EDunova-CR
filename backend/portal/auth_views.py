import logging
import secrets

from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.core.cache import cache
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, SimpleRateThrottle
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView

from .doc_schemas import (
    DetailErrorSerializer,
    LoginStep1RequestSerializer,
    LoginStep1ResponseSerializer,
    ResendOtpRequestSerializer,
    TokenRefreshRequestSerializer,
    TokenRefreshResponseSerializer,
    ValidationErrorSerializer,
    VerifyOtpRequestSerializer,
    VerifyOtpResponseSerializer,
)
from .roles import log_action
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


def _client_ip(request) -> str:
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR") or request.META.get("REMOTE_HOST") or ""


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


def _otp_table_exists() -> bool:
    from django.db import connection

    try:
        with connection.cursor() as cur:
            cur.execute(
                "SELECT 1 FROM information_schema.tables "
                "WHERE table_schema = 'public' AND table_name = 'portal_login_otp'"
            )
            return cur.fetchone() is not None
    except Exception:
        return False


def _store_otp(user_id: int, otp: str) -> None:
    """Persist the OTP so verification works across every gunicorn worker.

    The DB row is the source of truth (shared by all workers even without a
    Redis cache); the in-memory cache is kept as a fast-path + fallback for
    local development where the portal_login_otp table may not exist.
    """
    expiry = getattr(settings, "OTP_EXPIRY_SECONDS", 300)
    from django.utils import timezone

    try:
        if _otp_table_exists():
            from django.db import connection

            with connection.cursor() as cur:
                cur.execute(
                    "DELETE FROM public.portal_login_otp WHERE user_id = %s",
                    [user_id],
                )
                cur.execute(
                    "INSERT INTO public.portal_login_otp (user_id, otp, expires_at) "
                    "VALUES (%s, %s, %s)",
                    [user_id, otp, timezone.now() + timezone.timedelta(seconds=expiry)],
                )
    except Exception as exc:
        logger.warning("DB OTP store failed (%s); using cache only.", exc)
    # Cache fast-path (single-process dev, and a check that mirrors the DB).
    cache.set(f"portal_login_otp:{user_id}", otp, expiry)


# ---------------------------------------------------------------------------
# Views
# ---------------------------------------------------------------------------

@extend_schema(
    operation_id="AuthLoginStep1",
    summary="Login Step 1 - Request OTP",
    description=(
        "Authenticate with email/username and password. If valid, a 6-digit one-time "
        "password (OTP) is sent to the account email and a `user_id` is returned. "
        "Use that `user_id` with `auth/verify-otp` to complete sign-in and receive "
        "JWT tokens."
    ),
    tags=["Authentication"],
    request=LoginStep1RequestSerializer,
    responses={
        200: LoginStep1ResponseSerializer,
        400: ValidationErrorSerializer,
        500: DetailErrorSerializer,
    },
)
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
    except Exception:
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
        except Exception:
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


@extend_schema(
    operation_id="AuthVerifyOtp",
    summary="Verify OTP and Obtain JWT Tokens",
    description=(
        "Verify the one-time password from `auth/login` and return JWT access and "
        "refresh tokens plus the logged-in user payload. Send the access token via "
        "the **Authorize** button for all protected endpoints."
    ),
    tags=["Authentication"],
    request=VerifyOtpRequestSerializer,
    responses={
        200: VerifyOtpResponseSerializer,
        400: ValidationErrorSerializer,
        404: DetailErrorSerializer,
    },
)
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

    # The DB row is the source of truth (shared across gunicorn workers even
    # without a Redis cache); the in-memory cache is the local-dev fallback.
    cached = cache.get(f"portal_login_otp:{user_id}")
    valid = is_static
    if not valid:
        from django.utils import timezone

        db_otp = None
        if _otp_table_exists():
            try:
                from django.db import connection

                with connection.cursor() as cur:
                    cur.execute(
                        "SELECT otp, used FROM public.portal_login_otp "
                        "WHERE user_id = %s AND expires_at > %s "
                        "ORDER BY id DESC LIMIT 1",
                        [user_id, timezone.now()],
                    )
                    db_row = cur.fetchone()
                if db_row and not db_row[1]:
                    db_otp = db_row[0]
            except Exception as exc:
                logger.warning("DB OTP read failed (%s); falling back to cache.", exc)
        expected = db_otp if db_otp is not None else (cached if cached is not None else None)
        valid = expected is not None and otp == str(expected)

    if not valid:
        return Response(
            {"detail": "Invalid or expired OTP."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Invalidate the OTP (single-use) in both stores.
    if not is_static:
        try:
            if _otp_table_exists():
                from django.db import connection

                with connection.cursor() as cur:
                    cur.execute(
                        "UPDATE public.portal_login_otp SET used = TRUE WHERE user_id = %s",
                        [user_id],
                    )
        except Exception:
            logger.warning("DB OTP invalidation failed for user_id=%s", user_id)

    User = get_user_model()
    try:
        user = User.objects.get(id=user_id, is_active=True)
    except User.DoesNotExist:
        return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

    refresh = RefreshToken.for_user(user)
    cache.delete(f"portal_login_otp:{user_id}")
    try:
        log_action(
            actor=user,
            action="auth.login",
            target_type="session",
            target_id=user.id,
            details={"user_type": get_user_role(user)},
            ip_address=_client_ip(request),
        )
    except Exception:
        logger.warning("Audit write failed during login for user_id=%s", user.id)
    return Response({
        "refresh": str(refresh),
        "access": str(refresh.access_token),
        "user": user_payload(user),
    })


@extend_schema(
    operation_id="AuthResendOtp",
    summary="Resend OTP",
    description="Re-send a fresh one-time password to the account email for the given `user_id`.",
    tags=["Authentication"],
    request=ResendOtpRequestSerializer,
    responses={
        200: DetailErrorSerializer,
        404: DetailErrorSerializer,
        500: DetailErrorSerializer,
    },
)
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

    return Response({"detail": "OTP resent successfully."})


@extend_schema_view(
    post=extend_schema(
        operation_id="AuthTokenRefresh",
        summary="Refresh JWT Access Token",
        description="Exchange a valid refresh token for a freshly signed access token.",
        tags=["Authentication"],
        request=TokenRefreshRequestSerializer,
        responses={
            200: TokenRefreshResponseSerializer,
            401: DetailErrorSerializer,
        },
    )
)
class TokenRefreshAPIView(TokenRefreshView):
    """Wraps SimpleJWT's TokenRefreshView with OpenAPI documentation only."""


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        operation_id="AuthLogout",
        summary="Logout",
        description=(
            "Invalidates the caller's session from the perspective of the audit trail. "
            "The JWT access token simply expires; clients should clear their stored tokens. "
            "Requires a valid Bearer token so the user identity is recorded."
        ),
        tags=["Authentication"],
        request=None,
        responses={
            200: DetailErrorSerializer,
            401: DetailErrorSerializer,
        },
    )
    def post(self, request):
        user = request.user
        try:
            log_action(
                actor=user,
                action="auth.logout",
                target_type="session",
                target_id=user.id,
                details={"user_type": get_user_role(user)},
                ip_address=_client_ip(request),
            )
        except Exception:
            logger.warning("Audit write failed during logout for user_id=%s", user.id)
        return Response({"detail": "Logged out successfully."})
