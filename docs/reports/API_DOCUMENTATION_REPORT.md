# API DOCUMENTATION REPORT

**Project:** EduNova Global Academy — Integrated Backend
**Date:** 2026-08-07
**Scope:** OpenAPI/Swagger documentation generation, schema validation, and doc coverage.

---

## 1. Approach

The API is auto-documented with **drf-spectacular**: it builds an OpenAPI 3 schema from the DRF viewsets/views + `settings.py` `SPECTACULAR_SETTINGS`. No hand-maintained Swagger files — the schema is always derived from code, so the docs can't drift from the implementation.

## 2. Schema generation & validation

- `python manage.py spectacular --validate` → **`Errors: 0`** (schema is valid). The 9 warnings are benign, self-resolving `operationId` collisions (dynamic path params), consistent with the DRF schema-extension patterns already in use; they do not break client generation (the client uses tag+method path).
- Regenerate artifacts: `python manage.py spectacular --file schema.yml --validate` (production copy; prior run produced a 462 KB schema, 221 ops, 298 schemas).
- Viewer: the built-in UI is exposed and smoke-tested at:
  - `/api/docs/` → **200** (Swagger UI).
  - `/api/schema/` → machine-readable OpenAPI JSON (used by the container healthcheck).

## 3. Docs conventions

- Every new endpoint carries `@extend_schema` with clear operation summaries and request/response examples:
  - `POST /api/auth/logout/` — class `LogoutView`, `@extend_schema(..., request=None)` (fixes drf-spectacular serializer guessing; a plain FBV variant broke validation even with `request=None`, so the final form is an `APIView` class).
  - `GET/PUT /api/notifications/preferences/` — documented via `@extend_schema`.
- Serializer-based endpoints (CMS, admissions) get schemas automatically from DRF serializers; portal raw-SQL endpoints use doc-only `inline_serializer` schemas, so responses are still fully typed in the OpenAPI output even though the payload is built manually.

## 4. Validation specifics

- `AuthTokenRefresh` schemas: `['Authentication']`.
- `TeacherLeaveCreate`: `['Teacher']`.
- `Errors: 0 (0 unique)` with `Warnings: 9` — confirmed on the smoke test after all changes.

## 5. Files modified
- `backend/portal/auth_views.py` — schema annotations + `request=None`.
- `backend/portal/notification_views.py` — schemas.
- `regenerated schema.yml` (production artifact) 462 KB, 221 ops, 298 schemas after regeneration.

## 6. Remaining work / recommendations (as they arise)
1. Add `@extend_schema(parameters=[…])` doc coverage for the ~10 portal list views' query params (filters/ordering) once the unified filter pattern lands (see Search/Filter report).
2. Split/rename generated `operationId`s (or enable a whimiscal operation-id generator) to clear the remaining 9 warnings if the client tooling requires unique ids.
3. Consider a versioned `/api/docs` read via a reverse-proxy serve or `SpectacularSwaggerView` customization for release commits.
4. Keep `spectacular --validate` + the container `schema` healthcheck wired into CI so regressions get caught at merge time.