#!/bin/sh
# Startup script for Render/Docker deployments.
# Runs Django migrations + portal schema extension before starting gunicorn.
set -e

echo "=== Running Django migrations ==="
python manage.py migrate --noinput

echo "=== Applying portal extension schema (idempotent) ==="
python manage.py apply_portal_schema

echo "=== Starting gunicorn ==="
exec gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 2 --timeout 120
