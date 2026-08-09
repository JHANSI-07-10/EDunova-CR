"""
portal/services/email_service.py

Single place for all OTP email delivery.
Views call send_login_otp_email() — nothing else.

The OTP is ALWAYS generated upstream (portal/auth_views._generate_otp), stored
with its expiry, and later verified — this module NEVER generates, stores or
verifies OTPs. It only DELIVERS the OTP value it is given.

Delivery channel:
  1. Brevo HTTPS API (api.brevo.com:443) — used in production when
     BREVO_API_KEY is set. HTTPS port 443 works from every cloud provider,
     unlike SMTP port 587 which many PaaS hosts (e.g. Render) cannot reach.
  2. Django EMAIL_BACKEND (SMTP/console) — fallback when BREVO_API_KEY is
     unset (local development).
"""
import json
import logging
import re
from typing import TYPE_CHECKING, Tuple
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string

if TYPE_CHECKING:
    from django.contrib.auth.models import AbstractBaseUser

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Brevo HTTPS API delivery
# ---------------------------------------------------------------------------

def _parse_from_email(from_email: str) -> Tuple[str, str]:
    """Split 'Name <email@example.com>' into (name, email)."""
    match = re.match(r"^\s*(.*?)\s*<([^<>]+)>\s*$", from_email or "")
    if match:
        return match.group(1).strip(), match.group(2).strip()
    return "", (from_email or "").strip()


def _send_via_brevo_api(
    subject: str,
    from_email: str,
    to_email: str,
    to_name: str,
    text_body: str,
    html_body: str,
) -> bool:
    """Send an email through the Brevo HTTPS API (POST /v3/smtp/email).

    Returns True when the message was accepted by Brevo (HTTP 201 with a
    messageId). Raises on network failure or non-2xx so the caller surfaces
    a clean error. Returns False when no BREVO_API_KEY is configured so the
    caller falls back to the configured EMAIL_BACKEND.

    Uses the Python standard library (urllib) on purpose: zero extra runtime
    dependencies, explicit timeout, works identically on every host.
    """
    api_key = getattr(settings, "BREVO_API_KEY", "") or ""
    if not api_key:
        return False

    sender_name, sender_email = _parse_from_email(from_email)
    payload = {
        "sender": {
            "name": sender_name or "EduNova Global Academy",
            "email": sender_email,
        },
        "to": [{"email": to_email, "name": to_name}],
        "subject": subject,
        "textContent": text_body,
        "htmlContent": html_body,
    }
    data = json.dumps(payload).encode("utf-8")
    request = Request(
        "https://api.brevo.com/v3/smtp/email",
        data=data,
        headers={
            "api-key": api_key,
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        method="POST",
    )
    timeout = getattr(settings, "BREVO_API_TIMEOUT", 15)
    try:
        with urlopen(request, timeout=timeout) as response:
            if response.status >= 400:
                raise RuntimeError(f"Brevo API returned HTTP {response.status}")
        return True
    except HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")[:300]
        logger.error("Brevo API HTTP %s: %s", exc.code, body)
        raise RuntimeError("Unable to send verification email.") from exc
    except URLError as exc:
        logger.error("Brevo API network error: %s", exc.reason)
        raise RuntimeError("Unable to send verification email.") from exc


def _deliver(
    subject: str,
    from_email: str,
    to_email: str,
    to_name: str,
    text_body: str,
    html_body: str,
) -> None:
    """Deliver via Brevo HTTPS API when configured, otherwise the Django
    EMAIL_BACKEND. Raises RuntimeError on delivery failure."""
    delivered = _send_via_brevo_api(
        subject, from_email, to_email, to_name, text_body, html_body
    )
    if delivered:
        return

    msg = EmailMultiAlternatives(subject, text_body, from_email, [to_email])
    msg.attach_alternative(html_body, "text/html")
    msg.send(fail_silently=False)


def send_login_otp_email(user: "AbstractBaseUser", otp: str) -> None:
    """
    Send the login OTP to user.email via the configured EMAIL_BACKEND.

    Raises RuntimeError on SMTP failure so the caller can return HTTP 500.
    Never logs or exposes the OTP value.
    """
    expiry_minutes: int = getattr(settings, "OTP_EXPIRY_SECONDS", 300) // 60
    full_name: str = user.get_full_name().strip() or user.username  # type: ignore[attr-defined]

    context = {
        "name": full_name,
        "expiry_minutes": expiry_minutes,
        "otp": otp,
        "school_name": "EduNova Global Academy",
    }

    subject = "EduNova Login Verification Code"
    from_email = settings.DEFAULT_FROM_EMAIL
    to_email = user.email  # type: ignore[attr-defined]

    text_body = render_to_string("emails/login_otp.txt", context)
    html_body = render_to_string("emails/login_otp.html", context)

    try:
        _deliver(subject, from_email, to_email, full_name, text_body, html_body)
    except Exception as exc:
        logger.exception("OTP email delivery failed for user_id=%s", user.pk)  # type: ignore[attr-defined]
        raise RuntimeError("Unable to send verification email.") from exc


def send_reset_password_email(user: "AbstractBaseUser", temp_password: str) -> None:
    """
    Send the temporary password to user.email via the configured EMAIL_BACKEND.

    Raises RuntimeError on SMTP failure.
    """
    full_name: str = user.get_full_name().strip() or user.username  # type: ignore[attr-defined]

    context = {
        "name": full_name,
        "username": user.username,  # type: ignore[attr-defined]
        "temp_password": temp_password,
        "school_name": "EduNova Global Academy",
    }

    subject = "EduNova Account Password Reset"
    from_email = settings.DEFAULT_FROM_EMAIL
    to_email = user.email  # type: ignore[attr-defined]

    text_body = render_to_string("emails/reset_password.txt", context)
    html_body = render_to_string("emails/reset_password.html", context)

    try:
        _deliver(subject, from_email, to_email, full_name, text_body, html_body)
    except Exception as exc:
        logger.exception("Password reset email delivery failed for user_id=%s", user.pk)  # type: ignore[attr-defined]
        raise RuntimeError("Unable to send password reset email.") from exc
