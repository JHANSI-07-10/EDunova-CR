# SECURITY HARDENING REPORT

**Project:** EduNova Global Academy — Integrated Backend
**Date:** 2026-08-07
**Scope:** Backend security audit + hardening without breaking existing APIs.

---

## 1. Vulnerabilities addressed

| # | Severity | Finding | Fix |
|---|---|---|---|
| 1 | **Critical** | `FileUploadView` was `AllowAny` (global default) — anyone could upload arbitrary files to Supabase Storage / local media anonymously. | Now requires a valid JWT (`IsAuthenticated`). Public frontend admissions uploads go through the admissions endpoint directly, not `/api/upload/`, so this does not break the public flow. |
| 2 | **High** | No user-controlled file type/size validation on uploads. | `FileUploadView` validates MIME type against `ALLOWED_UPLOAD_TYPES` and size against `MAX_UPLOAD_SIZE_MB` (default 20 MB) before uploading. |
| 3 | **High** | Public admission status lookup (`GET …/{register/}`) exposed parent PII via a guessed/bruteforced registration number with no throttling. | Added per-method throttles: `admission_enquiry` (5/min) on POST, `admission_status` (30/min) on GET. |
| 4 | **High** | Public `ContactSubmission` endpoint had no spam protection. | Added `ScopedRateThrottle` scope `contact` (10/min). |
| 5 | **High** | Unauthenticated admission id-proof upload accepted any file type. | `AdmissionEnquirySerializer.validate_id_proof_document` now rejects files over 20 MB and disallowed extensions. |
| 6 | **Medium** | No rate limiting on the general upload endpoint. | `upload` throttle scope (30/min per user). |
| 7 | **Medium** | TLS/cookie hardening not configured for production. | Added environment-gated settings: `SECURE_PROXY_SSL_HEADER`, `SECURE_SSL_REDIRECT`, `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`, `SECURE_HSTS_SECONDS(optional)`, `SECURE_HSTS_INCLUDE_SUBDOMAINS`, `SECURE_HSTS_PRELOAD`, `SECURE_CONTENT_TYPE_NOSNIFF`, `SECURE_REFERRER_POLICY`. Defaults are safe (apply when `DEBUG=False`), so local dev over http is unaffected. |
| 8 | **Medium** | Unexpected errors returned raw internals. | Generic 500 handler now returns a sanitized message (see Error Handling report). |
| 9 | **Medium** | `X-FRAME-OPTIONS`/clickjacking relied on middleware default. | Confirmed `XFrameOptionsMiddleware` present (DENY). |

## 2. Already-secure (verified, retained)

- **Authentication**: OTP login (6-digit `secrets`-generated codes, 5-min cache TTL, never logged) → JWT (SimpleJWT, `ACCESS 6h`/`REFRESH 7d`, Bearer-only). `DEV_STATIC_OTP` is opt-in and default-off.
- **Brute-force**: two-layer per-account (5/min) + per-IP (40/min) throttling on login/OTP endpoints.
- **SQL injection**: all raw-SQL values use parameterized `%s`; only table/column names from closed class constants are ever interpolated.
- **Secrets**: `DJANGO_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `BACKUP_ENCRYPTION_KEY` come only from env; repo `.gitignore` excludes `.env`; backup encryption key has **no default**.
- **Password hashing**: Django defaults (`PBKDF2`); validators require min length 8 + not-common/numeric/similarity.
- **CORS**: `CORS_ALLOW_ALL_ORIGINS = DEBUG`; a locked origin allow-list in production; `CORS_ALLOW_CREDENTIALS=True`.
- **CSRF**: JWT APIs are header-auth (CSRF-exempt by design); admin keeps CSRF middleware.

## 3. Files modified

- `backend/config/settings.py` — throttle scopes, upload bounds, TLS/security block, logging.
- `backend/portal/views.py` — `FileUploadView` authentication + type/size validation + throttle + logging.
- `backend/apps/admissions/views.py` + `serializers.py` — endpoint throttling + id-proof upload validation.
- `backend/apps/cms/views.py` — contact throttle.
- `backend/portal/exceptions.py` — sanitized 500s.
- `backend/.env.example` — documented new vars.

## 4. Security improvements summary

- Authenticated uploads, validated by type and size.
- Public endpoints throttled to resist scraping/abuse/brute force.
- Consistent, leak-free error handling.
- Production TLS/HSTS/secure-cookie defaults behind `DEBUG=False`.

## 5. Recommendations

1. **Point `CACHES` at Redis in production** — current `LocMemCache` is per-process, so rate-limit and OTP counters are per-worker; Redis enforces globally.
2. **Restrict `SECURE_HSTS_SECONDS`** to a real production value (e.g. 31536000) when TLS is confirmed.
3. **Rate-limit the remaining public CMS list endpoints** (`news`, `events`, `documents`, `admissions` reads) if traffic warrants — one shared IP-scope (e.g. `public_read`) can be added easily.
4. **Review `CMSPage.content_html` / `NewsPost.content`** — stored rich HTML. It is admin-authored (safe today), but if it ever becomes user-contributed, sanitize it (e.g. with a bleach-style allow-list) to prevent stored XSS.
5. **Strengthen admission status lookup** (optional): add a short per-request owner token or HMAC to the status URL to remove residual brute-force of registration numbers.
6. **`.env` hygiene**: never commit `BACKUP_ENCRYPTION_KEY`/`SUPABASE_SERVICE_ROLE_KEY`; rotate if anything was ever committed.