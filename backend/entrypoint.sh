#!/usr/bin/env bash
# EduNova backend container entrypoint.
#
# - Applies the raw-SQL portal extension (idempotent) so a fresh container is
#   immediately usable against its configured DATABASE_URL.
# - Runs Django ORM migrations for the apps managed by Django (cms, admissions).
# - Collects static files (served by the platform/CDN in production).
# - Then hands over to the command (default: gunicorn).
set -e

echo "[entrypoint] Applying portal extension schema..."
python manage.py apply_portal_schema

echo "[entrypoint] Applying Django migrations..."
python manage.py migrate --noinput

echo "[entrypoint] Collecting static files..."
python manage.py collectstatic --noinput

echo "[entrypoint] Starting: $*"
exec "$@"
