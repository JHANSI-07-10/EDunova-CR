"""Send a test email through the configured EMAIL_BACKEND.

Purpose: verify that OTP emails can actually be delivered from this server
(production Render box, local dev, CI). The login flow itself never returns
the OTP in production, so this is the one-command way to prove the Brevo
SMTP credentials + IP allowlist + sender verification are all working.

Usage:
    python manage.py send_test_email [recipient@example.com]

If no recipient is given, the email is sent to DEFAULT_FROM_EMAIL.
"""
from django.conf import settings
from django.core.mail import send_mail
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Send a test email via the configured EMAIL_BACKEND to verify OTP delivery works."

    def add_arguments(self, parser):
        parser.add_argument(
            "recipient",
            nargs="?",
            default=None,
            help="Email address to send the test to (defaults to DEFAULT_FROM_EMAIL).",
        )

    def handle(self, *args, **options):
        recipient = (options.get("recipient") or "").strip() or settings.DEFAULT_FROM_EMAIL
        backend = str(getattr(settings, "EMAIL_BACKEND", ""))
        self.stdout.write(f"EMAIL_BACKEND   : {backend}")
        self.stdout.write(f"EMAIL_HOST      : {getattr(settings, 'EMAIL_HOST', '')}")
        self.stdout.write(f"EMAIL_PORT      : {getattr(settings, 'EMAIL_PORT', '')}")
        self.stdout.write(f"EMAIL_USE_TLS   : {getattr(settings, 'EMAIL_USE_TLS', '')}")
        self.stdout.write(f"EMAIL_HOST_USER : {getattr(settings, 'EMAIL_HOST_USER', '')}")
        self.stdout.write(f"DEFAULT_FROM    : {getattr(settings, 'DEFAULT_FROM_EMAIL', '')}")
        self.stdout.write(f"Recipient       : {recipient}")
        self.stdout.write("")

        if "console" in backend.lower():
            self.stdout.write(
                self.style.WARNING(
                    "WARNING: EMAIL_BACKEND is the console backend — the email will only be "
                    "printed to the server log, not delivered. Set the SMTP vars to actually send."
                )
            )

        try:
            sent = send_mail(
                subject="EduNova — SMTP test email",
                message=(
                    "This is a test email from the EduNova backend.\n\n"
                    "If you received this, OTP verification emails will be delivered too.\n"
                    "The login OTP is a fresh random 6-digit code emailed to the user; "
                    "there is no static/universal code in production.\n"
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[recipient],
                fail_silently=False,
            )
        except Exception as exc:  # noqa: BLE001 - surface the SMTP error to the operator
            raise CommandError(
                f"FAILED to send test email: {exc.__class__.__name__}: {exc}\n\n"
                "Check: 1) Brevo SMTP key is valid, 2) this server's IP is in the Brevo "
                "SMTP IP allowlist (Settings > SMTP & API > SMTP > 'Restrict access to the "
                "following IPs' — add the Render egress IP or disable restriction), "
                "3) the sender address is verified in Brevo (Settings > Senders & IPs)."
            ) from exc

        self.stdout.write(self.style.SUCCESS(f"OK — test email accepted for delivery to {recipient} ({sent} message(s))."))
