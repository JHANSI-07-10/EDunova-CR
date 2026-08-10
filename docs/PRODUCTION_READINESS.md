# EduNova — Production Readiness Checklist

Go-live gate for the EduNova Global Academy platform (public website + 4
portals + Django API). Every box must be ticked before real student/parent
data goes in. Items marked **(env)** are configuration on your hosting
accounts and cannot be fixed from the codebase alone.

Status legend: `[ ]` pending · `[x]` done · `[!]` blocked

---

## 0. Blocker — the deployed backend must actually run

- [ ] **(env)** `DATABASE_URL` on Render/Supabase uses the **IPv4 pooler** host
      (`aws-0-<REGION>.pooler.supabase.com:5432`, user `postgres.<REF>`), NOT
      the IPv6-only direct host `db.<REF>.supabase.co`.
- [ ] **(env)** `ALLOWED_HOSTS` on the host includes the backend domain
      (e.g. `edunova-cr-ax7h.onrender.com`) — otherwise every request 400s.
- [ ] **(env)** SMTP email configured (`EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend`
      + `EMAIL_HOST`/`EMAIL_HOST_USER`/`EMAIL_HOST_PASSWORD`) — OTP login
      refuses with 503 until this is set.
- [ ] **(env)** `CORS_ALLOWED_ORIGINS` (and `CSRF_TRUSTED_ORIGINS`) list every
      deployed frontend origin.
- [ ] Deploy and confirm `GET {API}/api/auth/login/` returns 400 for bad
      credentials (not 502/500).
- [ ] Startup log shows **no** `[EduNova config warning]` lines.

## 1. Security hardening

- [x] Status dashboard at `/` is now **staff-only** outside DEBUG (route map +
      DB errors no longer public).
- [x] Startup warnings added for `DEBUG` on a non-local host, `DEV_STATIC_OTP`,
      local-only `ALLOWED_HOSTS`, console email backend, and the IPv6
      Supabase direct host.
- [x] File storage backend (`config/storage.py`) restored — uploads no longer
      crash; Supabase Storage in prod, local `MEDIA_ROOT` fallback in dev.
- [ ] **(env)** Rotate the Supabase DB password + regenerate the service-role
      key if any past delivery shipped them (SETUP.md §0).
- [ ] **(env)** Change all demo credentials (`student@edunova.edu` etc.) or
      delete demo accounts; never enable `DEV_STATIC_OTP`.
- [ ] `DJANGO_SECRET_KEY` set to a long random value on the host.
- [ ] `BACKUP_ENCRYPTION_KEY` set (backup command refuses to run without it).

## 2. Operational reliability

- [ ] Backend serves behind HTTPS with a real domain (Render/Cloudflare).
- [ ] **Multi-worker decision:** OTP + rate limits use Django's in-process
      cache — pin Gunicorn to **1 worker**, or point `CACHES` at Redis /
      move OTP storage to the DB. (1 worker is fine for launch scale.)
- [ ] Scheduled `python manage.py backup_database` (cron) with the encrypted
      output landing in Supabase Storage.
- [ ] Monitoring/alerting: at minimum a UptimeRobot/Healthchecks ping on
      `/api/auth/login/` so a 502 (like the one found on launch day) is
      noticed automatically.
- [ ] Automated regression gate in CI (see `.github/workflows/ci.yml`): backend
      tests + `manage.py check` + frontend build run on every push.

## 3. Data & schema integrity

- [ ] `apps/cms` has **no migrations** — generate and review one
      (`python manage.py makemigrations cms`), then `migrate --fake-initial`
      against the real DB so a fresh environment can reproduce the schema.
- [ ] `portal_*` tables are hand-applied SQL — record the applied state with
      `python manage.py apply_portal_schema --check` and keep the SQL files
      versioned with any changes.
- [ ] Verify `python manage.py migrate` runs cleanly against the pooler DB.

## 4. Content & accounts (site owner)

- [ ] Real CMS content seeded (news, events, FAQs, faculty, gallery) via
      `seed_public_data` or admin UI.
- [ ] Superuser/admin accounts created; staff roles assigned deliberately
      (`is_staff` ≠ Admin Portal access — use the Admin group or
      `portal_user_profile.user_type`).
- [ ] Payment gateway configured for real transactions (currently sandbox).

## 5. Final acceptance

- [ ] Run the full audit per `AUDIT_WORKFLOW.md` (§11 smoke + full pass) and
      close every Critical/Major finding.
- [ ] Record the deployed frontend + backend commit SHAs.
- [ ] Confirm privacy/terms pages reflect the real operator and contact info.

---

*See `AUDIT_WORKFLOW.md` for how to verify each item. Items marked **(env)**
need action in the Render / Supabase / Vercel dashboards.*
