# CI/CD REPORT

**Project:** EduNova Global Academy — Integrated Backend
**Date:** 2026-08-07
**Scope:** Continuous integration, containerized deployment, and release pipeline.

---

## 1. CI pipeline (GitHub Actions)

**File:** `.github/workflows/ci.yml`

Triggers on push and PR to branches, filtered to backend paths. Steps:
1. Checkout + set up Python 3.10 with pip cache.
2. Install `requirements.txt`.
3. `python -m compileall .` — rejects syntax errors early.
4. Lint: `ruff check .` (non-fatal today, `continue-on-error`).
5. `python manage.py check` — Django system checks.
6. `python manage.py spectacular --validate` — OpenAPI schema validity (`Errors: 0`).
7. `python manage.py test` — Django test suite.
8. `python manage.py apply_portal_schema` — applies the SQL changeset against the CI **Postgres 16 service** and proves idempotency (re-runnable).
9. Service container: `postgres:16`; `DB_SSL_REQUIRE: 'False'` since the CI DB is local.

## 2. Containerized app (Docker)

**Files:** `backend/Dockerfile`, `backend/entrypoint.sh`, `backend/.dockerignore`, `docker-compose.yml`.

- `Dockerfile`:
  - Non-root runtime user `appuser`.
  - `HEALTHCHECK` (`/healthz`-style via wget on gunicorn).
  - `ENTRYPOINT ["/app/entrypoint.sh"]`.
  - Gunicorn with 3 workers, access + error logs (log to stdout for container logging).
- `entrypoint.sh` (runs at container start):
  1. `python manage.py apply_portal_schema` (idempotent SQL).
  2. `python manage.py migrate --noinput`.
  3. `python manage.py collectstatic --noinput`.
  4. `exec gunicorn …` (replaces the shell, forwards signals).
- `docker-compose.yml`:
  - `db` service: `postgres:16`, healthcheck `pg_isready -U …`.
  - `backend`: `depends_on: db: condition: service_healthy`; healthcheck calls the API schema endpoint; config via `env_file: .env`.

## 3. Deployment flow

Build the image → push to a container registry → any container runtime runs it. On boot, `entrypoint.sh` applies schema+migrations, collects static files, then serves via gunicorn. `.dockerignore` keeps images lean (excludes venv, caches, tests).

## 4. Files added/modified
- `.github/workflows/ci.yml` (new)
- `backend/Dockerfile` (new)
- `backend/entrypoint.sh` (new)
- `backend/.dockerignore` (new)
- `backend/docker-compose.yml` (new/updated: healthchecks, env_file, service_healthy ordering)

## 5. Remaining work / recommendations
1. **Secrets**: set `DJANGO_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `BACKUP_ENCRYPTION_KEY` as GitHub Actions *encrypted secrets* (not plaintext) for the deploy job.
2. **CI-only env**: the pipeline uses a local Postgres; add a separate `deploy.yml` for production using the real Supabase URL/role key.
3. **Container cache**: add docker layer caching (`docker/build-push-action` with `cache-from/to`) to speed up rebuilds.
4. **Smoke test in CI**: after `apply_portal_schema`, hit `/api/schema/` to confirm the API boots (the compose healthcheck already does this pattern).