# ERROR HANDLING REPORT

**Project:** EduNova Global Academy — Integrated Backend
**Date:** 2026-08-07
**Scope:** Centralize exception handling, standardize JSON error responses, add structured logging.

---

## 1. Summary

Previously every view hand-rolled `{"detail": ...}` responses, unexpected database/HTTP errors surfaced through DRF defaults, and there was effectively **no structured logging** (a handful of `print()` calls). A single exception handler is now registered and every unexpected error is logged with full request context.

## 2. Error response format

Every API error now uses a consistent JSON envelope:

```json
{
  "detail": "Human readable message",
  "code": "validation_error | not_found | permission_denied | authentication_failed | ..."
}
```

- `detail` is **unchanged** from before — the existing frontend continues to read it with no changes.
- `code` is a new, additive, stable slug for programmatic handling.

| HTTP | `code` | Typical cause |
|---|---|---|
| 400 | `validation_error` | DRF `ValidationError` / Django `ValidationError` |
| 401 | `not_authenticated` | Missing/invalid JWT |
| 401 | `authentication_failed` | SimpleJWT auth failure |
| 403 | `permission_denied` | RBAC / DRF permission denied |
| 404 | `not_found` | `Http404`, `NotFound`, missing record |
| 405 | `method_not_allowed` | Wrong HTTP verb |
| 429 | `throttled` | Rate limit exceeded |
| 400 | `integrity_error` | Unique/constraint violation |
| 500 | `database_error` | Postgres operational/programming error |
| 500 | `internal_error` | Any unexpected exception |

## 3. Files modified

| File | Change |
|---|---|
| `backend/portal/exceptions.py` | **New.** `edunova_exception_handler` = DRF handler + stable `code` injection + generic-500 conversion + structured logging. |
| `backend/config/settings.py` | Registered `REST_FRAMEWORK["EXCEPTION_HANDLER"]`; added `LOGGING` config (`edunova`, `edunova.errors`, `django.request`, `django.db.backends` loggers; console + optional rotating file via `LOG_FILE`; `LOG_LEVEL` env). |
| `backend/portal/views.py` | Replaced `print()` in `FileUploadView` with `logger.exception(...)`; added `logger.info` for uploads. |
| `backend/portal/teacher_views.py` | Kept targeted 400/404 responses (unchanged); PDF-scan/Gemini `print()` replaced with structured logging during the session's annotation work. |
| `backend/portal/auth_views.py` | Logging already present for OTP/DB failures; retained. |

## 4. Exceptions handled centrally

- **Validation errors** — DRF `ValidationError` (incl. the new admissions id-proof validation) → 400 `validation_error`.
- **Database exceptions** — `IntegrityError`, `DatabaseError`, `OperationalError`, `ProgrammingError` → 500 `database_error` / 400 `integrity_error`, never leaking SQL.
- **Permission errors** — `PermissionDenied` → 403 `permission_denied`.
- **Authentication failures** — `NotAuthenticated`/`AuthenticationFailed` → 401.
- **Not found** — `Http404`/`NotFound` → 404 `not_found`.
- **Method not allowed / throttled** → 405 / 429.
- **Unexpected exceptions** — anything DRF can't map → generic **500** `internal_error` with full traceback logged (`user_id`, `method`, `path`, exception type) and **no internals leaked to the client** (prevents stack traces in production responses).

## 5. Logging improvements

- New `LOGGING` block in settings: structured `asctime level= logger= msg=` lines to stdout, captured by container/PaaS pipelines; optional `RotatingFileHandler` (5 MB × 3) when `LOG_FILE` is set.
- `edunova` logger used across portal modules; `edunova.errors` dedicated to the 500 path.
- Sensitive values (OTPs, passwords, tokens) are **never** logged — verified in the OTP/auth flows.

## 6. Remaining work

- **Reduce duplicated try/except**: 4 low-value `try/except Exception: pass` blocks remain in `views.py` (quiz JSON parsing, grading) and `teacher_views.py` (grade calc). They are intentionally lenient (best-effort grading); converting them to raise would change behavior, so they were left as-is and are flagged for review rather than touched.
- **`code` documentation**: the `ValidationErrorResponse` OpenAPI schema advertises a `field_errors` key that no code path emits; the docs were left compatible by keeping `detail` authoritative. Consider either emitting `field_errors` from the handler for DRF validation errors or updating the schema.
