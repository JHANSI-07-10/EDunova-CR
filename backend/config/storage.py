"""
config/storage.py

SupabaseStorage — the file backend referenced by settings.DEFAULT_FILE_STORAGE
("config.storage.SupabaseStorage"). It was previously missing from the repo,
so every file upload (CMS images, admissions documents, portal uploads) would
crash with ImportError.

Behaviour:
- When SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are configured (production),
  files are uploaded to Supabase Storage and served from its public CDN URL,
  so uploads survive ephemeral host filesystems (Render) and redeploys.
- When the credentials are absent (local dev, CI, first boot), it transparently
  falls back to Django's local FileSystemStorage under MEDIA_ROOT, keeping
  development working with zero configuration.
- Any single Supabase operation that fails (bucket not created yet, network
  blip) degrades to local storage rather than failing the request.

Bucket selection maps common upload paths to the buckets configured in
settings.py; anything unmapped uses the default LMS bucket. Tune the mapping
if your Supabase project uses different bucket names.
"""
import logging
import mimetypes

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import FileSystemStorage, Storage

logger = logging.getLogger(__name__)

# path prefix -> settings attribute holding the bucket name
_BUCKET_BY_PREFIX = (
    ("lms/", "SUPABASE_BUCKET_LMS"),
    ("assignments/", "SUPABASE_BUCKET_SUBMISSIONS"),
    ("certificates/", "SUPABASE_BUCKET_CERTS"),
    ("avatars/", "SUPABASE_BUCKET_AVATARS"),
    ("backups/", "SUPABASE_BUCKET_BACKUPS"),
)


class SupabaseStorage(Storage):
    def __init__(self, **kwargs):
        self._supabase_url = str(getattr(settings, "SUPABASE_URL", "") or "").rstrip("/")
        self._service_key = str(getattr(settings, "SUPABASE_SERVICE_ROLE_KEY", "") or "")
        self._fallback = FileSystemStorage(
            location=settings.MEDIA_ROOT,
            base_url=settings.MEDIA_URL,
        )
        self._client = None
        if self._supabase_url and self._service_key:
            try:
                from supabase import create_client

                self._client = create_client(self._supabase_url, self._service_key)
            except Exception as exc:  # pragma: no cover - defensive
                logger.exception("Failed to initialise Supabase storage client: %s", exc)
                self._client = None

    # ------------------------------------------------------------------ #
    # helpers
    # ------------------------------------------------------------------ #
    def _uses_supabase(self) -> bool:
        return self._client is not None

    def _clean_name(self, name: str) -> str:
        return (name or "").replace("\\", "/").lstrip("/")

    def _bucket_name(self, name: str) -> str:
        default = getattr(settings, "SUPABASE_BUCKET_LMS", "lms-resources")
        path = self._clean_name(name)
        for prefix, setting_name in _BUCKET_BY_PREFIX:
            if path.startswith(prefix):
                return getattr(settings, setting_name, "") or default
        return default

    # ------------------------------------------------------------------ #
    # Django Storage protocol
    # ------------------------------------------------------------------ #
    def _save(self, name, content):
        name = self._clean_name(name)
        if not self._uses_supabase():
            return self._fallback.save(name, content)

        data = content.read()
        bucket = self._bucket_name(name)
        # Supabase stores objects with the content-type they were uploaded
        # with; without this, every upload defaults to text/plain and browsers
        # refuse to render PDFs/images served from the public CDN URL.
        content_type = mimetypes.guess_type(name)[0] or "application/octet-stream"
        try:
            self._client.storage.from_(bucket).upload(
                name, data, {"content-type": content_type}
            )
            return name
        except Exception as exc:
            logger.warning(
                "Supabase upload to bucket '%s' failed (%s); using local storage.",
                bucket,
                exc,
            )
            return self._fallback.save(name, ContentFile(data))

    def open(self, name, mode="rb"):
        name = self._clean_name(name)
        if not self._uses_supabase():
            return self._fallback.open(name, mode)
        bucket = self._bucket_name(name)
        try:
            data = self._client.storage.from_(bucket).download(name)
            return ContentFile(data)
        except Exception as exc:
            logger.warning("Supabase download of '%s' failed (%s); local fallback.", name, exc)
            return self._fallback.open(name, mode)

    def exists(self, name):
        name = self._clean_name(name)
        if not self._uses_supabase():
            return self._fallback.exists(name)
        bucket = self._bucket_name(name)
        try:
            self._client.storage.from_(bucket).info(name)
            return True
        except Exception:
            return self._fallback.exists(name)

    def delete(self, name):
        name = self._clean_name(name)
        if not self._uses_supabase():
            return self._fallback.delete(name)
        bucket = self._bucket_name(name)
        try:
            self._client.storage.from_(bucket).remove([name])
        except Exception as exc:
            logger.warning("Supabase delete of '%s' failed (%s); local fallback.", name, exc)
            self._fallback.delete(name)

    def size(self, name):
        name = self._clean_name(name)
        if not self._uses_supabase():
            return self._fallback.size(name)
        bucket = self._bucket_name(name)
        try:
            info = self._client.storage.from_(bucket).info(name)
            return int((info.get("metadata") or {}).get("size", 0) or 0)
        except Exception:
            return self._fallback.size(name)

    def url(self, name):
        name = self._clean_name(name)
        if not self._uses_supabase():
            return self._fallback.url(name)
        bucket = self._bucket_name(name)
        return f"{self._supabase_url}/storage/v1/object/public/{bucket}/{name}"

    def path(self, name):
        # Supabase has no local path. Only the local fallback can provide one;
        # otherwise mirror the base Storage behaviour and raise, so callers
        # never receive a path that points at a file that doesn't exist.
        if not self._uses_supabase():
            return self._fallback.path(self._clean_name(name))
        raise NotImplementedError("SupabaseStorage has no local filesystem path.")
