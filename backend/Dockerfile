# EduNova backend production image.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Runtime deps for psycopg2 (libpq) and Pillow (build tools are not needed at
# runtime, so install only the shared library).
RUN apt-get update && apt-get install -y --no-install-recommends \
        libpq5 \
        libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps first so the layer is cached until requirements change.
COPY requirements.txt ./
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY . .

# Run as a non-root user (security hardening).
RUN useradd --create-home --uid 1000 appuser \
    && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/schema/', timeout=4)"]

# entrypoint applies the portal schema + collects static files before serving.
ENTRYPOINT ["/app/entrypoint.sh"]
# 2 workers x 4 threads = 8 concurrent requests (sync-only workers cap at 1
# each). Kept modest so per-thread pooled DB connections stay under Supabase's
# 15-session pooler cap. --timeout 120 keeps slow cold DB/SMTP ops from being
# killed by gunicorn's default 30s worker timeout.
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "2", "--threads", "4", "--timeout", "120", "--access-logfile", "-", "--error-logfile", "-"]
