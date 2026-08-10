"""
EduNova Global Academy — Integrated Backend
Public website CMS/admissions + Student Portal + Teacher Portal.
Database target: Supabase PostgreSQL using DATABASE_URL.
"""
from datetime import timedelta
from pathlib import Path
import dj_database_url
import sys
from decouple import config
BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = config("DJANGO_SECRET_KEY", default="dev-secret-key-change-in-production")
# SAFE-BY-DEFAULT: DEBUG defaults to False. You must explicitly opt into DEBUG=True
# in your local .env for development. Never set DEBUG=True on any host reachable
# from the internet (see DEV_STATIC_OTP below for the related OTP risk).
def _cast_debug(val):
    """Accept True/False/1/0/yes/no. Anything else (e.g. 'release' from a
    system env var set by another tool) is treated as False so the server
    doesn't crash on startup."""
    if isinstance(val, bool):
        return val
    return str(val).lower() in ("true", "1", "yes")

DEBUG = config("DEBUG", default=False, cast=_cast_debug)
# `manage.py test` runs with DEBUG=False but its client speaks plain HTTP —
# the request must not be 301-redirected to HTTPS or every status assertion
# in the suite breaks. Bypass the TLS hardening below while testing.
RUNNING_TESTS = "test" in sys.argv
ALLOWED_HOSTS = [
    h.strip()
    for h in config("ALLOWED_HOSTS", default="localhost,127.0.0.1").split(",")
    if h.strip()
]

# SECURITY: separate, explicit opt-in — never tied to DEBUG. A rushed deploy
# with DEBUG=True left on would otherwise make every account reachable via a
# publicly-known static OTP ("123456"). Defaults to False; keep it False
# everywhere except your own local machine.
# Same robust casting as DEBUG: decouple's cast=bool (strtobool) crashes on
# non-boolean env values like "release" (a real production incident).
DEV_STATIC_OTP = config("DEV_STATIC_OTP", default=False, cast=_cast_debug)

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "corsheaders",
    "django_filters",
    "drf_spectacular",
    "apps.cms",
    "apps.admissions",
    "portal",
]
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    # WhiteNoise serves the collected static files (Django admin CSS/JS) on
    # platforms with no static hosting of their own (Render).
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "portal.middleware.ExceptionLoggingMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "portal.middleware.AuditTrailMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

DATABASE_URL = config("DATABASE_URL", default="")
# Reuse DB connections across requests instead of opening a fresh TCP+TLS
# connection to the (often remote) database for every request. With the
# Supabase pooler this cuts typical request latency from ~3-5s to well under
# a second. Tune via DB_CONN_MAX_AGE; keep it modest so the pooler's session
# count stays small. Workers each keep their own pooled connections.
DB_CONN_MAX_AGE = config("DB_CONN_MAX_AGE", default=60, cast=int)
if DATABASE_URL:
    # ssl_require only applies to Postgres; SQLite (used by the unit tests)
    # has no SSL option and would reject the kwarg.
    _use_ssl = config("DB_SSL_REQUIRE", default=True, cast=bool) and not DATABASE_URL.startswith("sqlite://")
    DATABASES = {
        "default": dj_database_url.parse(
            DATABASE_URL,
            conn_max_age=DB_CONN_MAX_AGE,
            ssl_require=_use_ssl,
        )
    }
    # The Supabase pooler (PgBouncer) silently drops idle sessions, which would
    # otherwise surface as "server closed the connection unexpectedly" on the
    # next reused connection. CONN_HEALTH_CHECKS runs a cheap SELECT 1 before
    # handing a pooled connection back to Django, so stale sockets are replaced
    # instead of raising 500s.
    DATABASES["default"]["CONN_HEALTH_CHECKS"] = True
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": config("DB_NAME", default="edunova"),
            "USER": config("DB_USER", default="postgres"),
            "PASSWORD": config("DB_PASSWORD", default=""),
            "HOST": config("DB_HOST", default="localhost"),
            "PORT": config("DB_PORT", default="5432"),
            # Local Postgres doesn't drop idle sessions, but keeping health
            # checks on in every environment costs one cheap SELECT per reuse.
            "CONN_HEALTH_CHECKS": True,
        }
    }

# Use Django's default auth_user table. This matches the Supabase schema shared in this chat.
# Portal roles are stored in portal_user_profile and Django groups.

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 8}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Kolkata"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
# Where `collectstatic` gathers admin/static assets for production. Required
# by the container entrypoint (entrypoint.sh runs collectstatic --noinput);
# without it the deploy crashes with ImproperlyConfigured.
STATIC_ROOT = BASE_DIR / "staticfiles"
# Safety net: if a deploy skips collectstatic (plain-gunicorn Render start
# command instead of the Docker entrypoint), WhiteNoise falls back to Django's
# static finders so admin/Swagger CSS+JS are still served — never a plain,
# unstyled HTML page. collectstatic remains the primary path.
WHITENOISE_USE_FINDERS = True
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Cache: LocMemCache by default (single-process dev). Set REDIS_URL in
# production to share one cache across all gunicorn workers — this makes the
# 60s response cache on the public CMS/website endpoints and the OTP/throttle
# counters consistent cluster-wide instead of per-worker.
if config("REDIS_URL", default=""):
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.redis.RedisCache",
            "LOCATION": config("REDIS_URL"),
            "TIMEOUT": 300,
        }
    }
else:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "edunova-cache",
        }
    }

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.AllowAny",
    ],
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
    ),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    # OpenAPI 3 schema generation for the Swagger UI / ReDoc docs. Uses a
    # custom AutoSchema that keeps serializer-less raw-SQL portal views
    # documented (see config/schemas.py).
    "DEFAULT_SCHEMA_CLASS": "config.schemas.EduNovaAutoSchema",
    # Centralized error handling — every API returns the same JSON envelope
    # {"detail": ..., "code": ...}. Unexpected errors become generic 500s and
    # are logged with full context; IntegrityError/ValueError map to 400
    # (see portal/exceptions.py).
    "EXCEPTION_HANDLER": "portal.exceptions.edunova_exception_handler",
    # Brute-force protection on the OTP login flow. Two layers per endpoint:
    # a tight per-account limit (the real defense — caps attempts against one
    # account regardless of how many IPs an attacker spreads across) and a
    # much more generous per-IP backstop (catches one IP spraying attempts
    # across many different accounts, without punishing a whole school
    # sharing one campus WiFi/NAT egress IP the way a single shared-IP limit
    # would). These use Django's cache framework — the default LocMemCache
    # below works for a single-process dev server, but is PER-PROCESS: behind
    # Gunicorn with multiple workers, each worker has its own counter, so the
    # real effective limit is (rate x worker count). For production, point
    # CACHES at Redis so limits are enforced consistently across all workers.
    "DEFAULT_THROTTLE_RATES": {
        "otp_login_account": "5/min",
        "otp_verify_account": "5/min",
        "otp_resend_account": "3/min",
        "otp_login_ip": "40/min",
        "otp_verify_ip": "40/min",
        "otp_resend_ip": "20/min",
        # General purpose: authenticated file uploads (throttled per user).
        "upload": "30/min",
        # Public website endpoints — spam protection.
        "contact": "10/min",
        "admission_enquiry": "5/min",
        "admission_status": "30/min",
    },
}

# Upload validation bounds (see portal/views.py FileUploadView).
MAX_UPLOAD_SIZE_MB = config("MAX_UPLOAD_SIZE_MB", default=20, cast=int)
ALLOWED_UPLOAD_TYPES = (
    "image/jpeg", "image/png", "image/webp", "image/gif",
    "application/pdf", "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/zip", "text/plain", "text/markdown",
)

SPECTACULAR_SETTINGS = {
    "TITLE": "EduNova Global Academy API",
    "DESCRIPTION": (
        "Integrated API for EduNova Global Academy. Covers the public website "
        "(CMS + admissions enquiries), the student, teacher and parent portals, "
        "and the admin portal (admissions, academics, library, hostel, transport, "
        "timetable, finance, payroll, scholarship, reports and system modules).\n\n"
        "Authentication uses the OTP login flow: call `auth/login` with your "
        "credentials to receive a one-time password, then `auth/verify-otp` to "
        "obtain JWT access and refresh tokens. Click **Authorize** and paste your "
        "Bearer access token to call protected endpoints."
    ),
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "COMPONENT_SPLIT_REQUEST": True,
    # Strip the /api prefix from paths so tags group cleanly (admin-portal,
    # teacher, auth, cms, admissions, ...).
    "SCHEMA_PATH_PREFIX": r"/api/",
    "SWAGGER_UI_SETTINGS": {
        "deepLinking": True,
        "persistAuthorization": True,
        "displayOperationId": True,
        "docExpansion": "none",
    },
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=6),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "AUTH_HEADER_TYPES": ("Bearer",),
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
}
def _split_csv_env(var_name, default):
    """Parse a comma-separated env var into a list of origins; fall back to
    `default` when the var is unset/empty. Lets operators change the allowed
    frontend origins on Render/Supabase without a code deploy."""
    raw = config(var_name, default="").strip()
    if not raw:
        return list(default)
    return [item.strip() for item in raw.split(",") if item.strip()]


CORS_ALLOWED_ORIGINS = _split_csv_env(
    "CORS_ALLOWED_ORIGINS",
    ["https://edunova-school-iumy.vercel.app"],
)
CSRF_TRUSTED_ORIGINS = _split_csv_env(
    "CSRF_TRUSTED_ORIGINS",
    ["https://edunova-school-iumy.vercel.app"],
)
# Local dev servers can always talk to the API without extra env config.
if DEBUG:
    for _origin in ("http://localhost:5173", "http://127.0.0.1:5173"):
        if _origin not in CORS_ALLOWED_ORIGINS:
            CORS_ALLOWED_ORIGINS.append(_origin)
        if _origin not in CSRF_TRUSTED_ORIGINS:
            CSRF_TRUSTED_ORIGINS.append(_origin)
CORS_ALLOW_CREDENTIALS = True

# Supabase Storage/API — server-side only. Never place service role keys in frontend.
SUPABASE_URL = config("SUPABASE_URL", default="")
SUPABASE_SERVICE_ROLE_KEY = config("SUPABASE_SERVICE_ROLE_KEY", default="")
SUPABASE_BUCKET_LMS = "lms-resources"
SUPABASE_BUCKET_SUBMISSIONS = "assignmentsubmissions"
SUPABASE_BUCKET_CERTS = "officialdocuments"
SUPABASE_BUCKET_AVATARS = "studentavatars"
SUPABASE_BUCKET_BACKUPS = "database-backups"

# Use Supabase Storage as the default storage backend
DEFAULT_FILE_STORAGE = "config.storage.SupabaseStorage"
_STORAGE_MISCONFIGURED = not (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)

# ---------------------------------------------------------------------------
# Production TLS / security hardening. Every flag defaults off so local
# development over http://localhost is unaffected; enable them in production.
# Skipped while running the test suite (RUNNING_TESTS) so the plain-HTTP test
# client is not redirected to HTTPS (production defaults are unchanged).
# ---------------------------------------------------------------------------
if not DEBUG and not RUNNING_TESTS:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SECURE_SSL_REDIRECT = config("SECURE_SSL_REDIRECT", default=True, cast=bool)
    SESSION_COOKIE_SECURE = config("SESSION_COOKIE_SECURE", default=True, cast=bool)
    CSRF_COOKIE_SECURE = config("CSRF_COOKIE_SECURE", default=True, cast=bool)
    # HSTS on by default (1 year) — override SECURE_HSTS_SECONDS=0 to disable.
    SECURE_HSTS_SECONDS = config("SECURE_HSTS_SECONDS", default=31536000, cast=int)
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"
else:
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_REFERRER_POLICY = "same-origin"

# Symmetric key (Fernet, 32 url-safe base64 bytes) used to encrypt the local
# JSON backup file before it's written to disk / uploaded to Supabase
# Storage. Generate one with:
#   python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
# There is deliberately no default — an empty/missing key means
# backup_database will refuse to run rather than silently write an
# unencrypted dump of every student's fee, medical, and contact data.
BACKUP_ENCRYPTION_KEY = config("BACKUP_ENCRYPTION_KEY", default="")

EMAIL_BACKEND = config("EMAIL_BACKEND", default="django.core.mail.backends.console.EmailBackend")
EMAIL_HOST = config("EMAIL_HOST", default="")
EMAIL_PORT = config("EMAIL_PORT", default=587, cast=int)
EMAIL_USE_TLS = config("EMAIL_USE_TLS", default=True, cast=bool)
EMAIL_HOST_USER = config("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = config("EMAIL_HOST_PASSWORD", default="")
# Fail the SMTP attempt after this many seconds instead of letting the OS
# hang for the default (often 2+ minutes). Prevents a dead Brevo connection
# from pinning a gunicorn worker until the platform kills it (HTML 500).
EMAIL_TIMEOUT = config("EMAIL_TIMEOUT", default=15, cast=int)
DEFAULT_FROM_EMAIL = config("DEFAULT_FROM_EMAIL", default="EduNova Academy <mandugulajhansilakshmi@gmail.com>")

# Brevo HTTPS API (api.brevo.com:443) delivery. Preferred over SMTP in
# production: many PaaS providers (Render) cannot reach smtp-relay.brevo.com
# on port 587 (blocked/times out), while the HTTPS API works from anywhere.
# The API key is the "xkeysib-..." API key from Brevo > SMTP & API > API Keys
# (NOT the SMTP relay password). When unset, email_service falls back to the
# configured EMAIL_BACKEND (SMTP/console) for local development.
BREVO_API_KEY = config("BREVO_API_KEY", default="")
# Hard cap for the Brevo HTTPS API call so a dead network can never pin a
# gunicorn worker the way a hung SMTP connection can.
BREVO_API_TIMEOUT = config("BREVO_API_TIMEOUT", default=15, cast=int)

OTP_EXPIRY_SECONDS = 300
OTP_LENGTH = 6

# Startup diagnostics — loud, actionable warnings for the two most common
# production misconfigurations that silently break OTP login. Written to
# stderr so they always surface in the host's logs (Render, Railway, ...).
# ---------------------------------------------------------------------------
def _startup_warn(message: str) -> None:
    print(f"\n[EduNova config warning] {message}\n", file=sys.stderr)


_db_host = str(DATABASES.get("default", {}).get("HOST") or "").lower()
if _db_host.endswith(".supabase.co"):
    # New Supabase projects only publish an IPv6 AAAA record for the direct
    # host (db.<ref>.supabase.co). Render and most PaaS providers have no IPv6
    # egress, so Django can never connect -> the app can't serve login.
    _startup_warn(
        f"DATABASE_URL host '{_db_host}' is a Supabase DIRECT host, which is "
        "IPv6-only for new projects. If this server has no IPv6 (e.g. Render), "
        "use the IPv4 POOLER host instead:\n"
        "  postgresql://postgres.<PROJECT_REF>:<DB_PASSWORD>@aws-0-<REGION>.pooler.supabase.com:5432/postgres\n"
        "(find the exact string under Supabase Dashboard > Project Settings > "
        "Database > Connection string > Pooler, port 5432 session mode.)"
    )

if "console" in str(EMAIL_BACKEND).lower() and not DEBUG:
    _startup_warn(
        "EMAIL_BACKEND is the console backend in a non-DEBUG environment. "
        "OTP login codes would only be printed to the server log and never "
        "emailed, so users cannot complete login. Set EMAIL_BACKEND="
        "django.core.mail.backends.smtp.EmailBackend plus EMAIL_HOST/"
        "EMAIL_HOST_USER/EMAIL_HOST_PASSWORD (Brevo or Gmail app password)."
    )

if (
    not DEBUG
    and "smtp" in str(EMAIL_BACKEND).lower()
    and not BREVO_API_KEY
):
    _startup_warn(
        "EMAIL_BACKEND is SMTP but BREVO_API_KEY is empty. From many PaaS "
        "hosts (e.g. Render) the SMTP connection to smtp-relay.brevo.com:587 "
        "times out and OTP emails never arrive. Set BREVO_API_KEY to your "
        "Brevo API key (Settings > SMTP & API > API Keys, starts with "
        "'xkeysib-') to send OTP emails via the Brevo HTTPS API instead."
    )

_local_hosts = {"localhost", "127.0.0.1", "::1"}
if not DEBUG and set(ALLOWED_HOSTS) <= _local_hosts:
    _startup_warn(
        "ALLOWED_HOSTS is still the local default (localhost,127.0.0.1). In a "
        "non-DEBUG deployment Django rejects every request with '400 "
        "DisallowedHost'. Set ALLOWED_HOSTS on the host, e.g. "
        "ALLOWED_HOSTS=edunova-cr-ax7h.onrender.com"
    )

if DEBUG and any(h not in _local_hosts for h in ALLOWED_HOSTS):
    _startup_warn(
        "DEBUG=True with a non-local ALLOWED_HOSTS. Never run with DEBUG on a "
        "reachable host: Django serves the full debug traceback (source code, "
        "secrets) to anyone who triggers an error."
    )

if DEV_STATIC_OTP:
    _startup_warn(
        "DEV_STATIC_OTP is True: every OTP login code is the public value "
        "'123456'. This must NEVER be enabled on a reachable server — anyone "
        "can log in to any account."
    )

if _STORAGE_MISCONFIGURED and not DEBUG:
    _startup_warn(
        "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not configured. Uploaded "
        "files (CMS images, admissions documents, portal uploads) fall back to "
        "local disk, which is EPHEMERAL on Render and will be lost on redeploy. "
        "Set both vars and pre-create the storage buckets in the Supabase project."
    )

# ---------------------------------------------------------------------------
# Structured logging
# ---------------------------------------------------------------------------
# Logs are emitted as JSON-safe key=value lines to stdout (captured by the
# container/PaaS log pipeline) and, when LOG_FILE is set, also appended to a
# rotating file. Never log secrets: OTPs, passwords and tokens are excluded by
# construction from the message strings used in this project.
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "structured": {
            "format": "%(asctime)s level=%(levelname)s logger=%(name)s "
                      "msg=%(message)s",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "structured",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": config("LOG_LEVEL", default="INFO").upper(),
    },
    "loggers": {
        "django.request": {
            "handlers": ["console"],
            "level": "ERROR",
            "propagate": False,
        },
        "django.db.backends": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
        "edunova": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
        "edunova.errors": {
            "handlers": ["console"],
            "level": "ERROR",
            "propagate": False,
        },
    },
}

LOG_FILE = config("LOG_FILE", default="")
if LOG_FILE:
    LOGGING["handlers"]["file"] = {
        "class": "logging.handlers.RotatingFileHandler",
        "filename": LOG_FILE,
        "maxBytes": 5 * 1024 * 1024,
        "backupCount": 3,
        "formatter": "structured",
    }
    for _logger in list(LOGGING["loggers"]):
        LOGGING["loggers"][_logger]["handlers"].append("file")
