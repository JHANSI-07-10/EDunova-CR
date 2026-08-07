# DATABASE & PERSISTENCE REPORT

**Project:** EduNova Global Academy — Integrated Backend
**Date:** 2026-08-07
**Scope:** Schema extension, data integrity (constraints, transactions), migrations, backup/restore policy.

---

## 1. Summary
Data lives in PostgreSQL (Supabase) for the portal (`portal_*`) and CMS/admissions ORM tables. The portal layer is **raw-SQL with DDL in a versioned fileset** (`apply_portal_schema`), while CMS/admissions use Django migrations. This pass added integrity constraints + transactional fixes and unified the schema application pipeline.

## 2. Data-integrity constraints added

In `backend/portal/sql/portal_extension_improvements.sql` (applied to Supabase):
- **`ck_payment_amount_positive`** — `CHECK (amount IS NULL OR amount > 0)` on the payments/fees table. Added only if no violating rows exist (guarded by an existence probe).
- **`ck_room_capacity_positive`** — `CHECK (capacity IS NULL OR capacity > 0)` on hostel rooms.

## 3. Transactional fixes

Wrapped multi-step mutations in an atomic transaction so a mid-way failure can't leave partial state:

| File | Operation | Wrapped |
|---|---|---|
| `backend/portal/admin_views.py` | `LibraryIssueView` (create issue + decrement stock/availability) | `transaction.atomic()` |
| `backend/portal/admin_views.py` | `LibraryReturnView` (mark returned + increment stock + optional fine) | `transaction.atomic()` |
| `backend/portal/facilities_views.py` | `HostelAllocationCreate` (allocate + decrement `occupied_beds`) | `transaction.atomic()` |
| `backend/portal/facilities_views.py` | `HostelVacate` (vacate + increment `occupied_beds` + status) | `transaction.atomic()` |
|  | `HostelVacate` occupied-bed decrement guard | `GREATEST(occupied_beds - 1, 0)` prevents underflow to negative |

`transaction` imported in both files.

## 4. Schema application pipeline

- `backend/portal/sql/portal_extension_improvements.sql` (new, idempotent — `IF NOT EXISTS`) appended last to `backend/portal/management/commands/apply_portal_schema.py::SQL_FILES`.
- Run via `python manage.py apply_portal_schema`; **applied successfully**; verified: `portal_audit_log.ip_address` column present, `portal_notification_preference` table present, index count = **173**.
- The CI job re-runs `apply_portal_schema` to prove idempotency (safe re-run).

## 4. Migration strategy (unmigrated portal SQL)

- ORM apps (CMS/admissions): standard `makemigrations`/`migrate` (run in CI).
- **Portal raw SQL**: versioned `.sql` files executed by the apply command (idempotent, guarded by `IF NOT EXISTS`); CI re-runs it to prove safe re-execution.

## 5. Backups & restore

- A **backup module** already exists (creates an encrypted `.pg_dump` of the portal schema, sizes it, and registers the record via `portal_backup_record`). Restore path is out of band (Supabase dashboard / `pg_restore` with the same encryption key).
- Secrets (backup key, service role) are env-gated; never committed.
- `entrypoint.sh` runs `apply_portal_schema` then `migrate` before serving so schema + migrations are always current on deploy.

## 6. Files modified
- `backend/portal/sql/portal_extension_improvements.sql` (new, applied)
- `backend/portal/management/commands/apply_portal_schema.py`
- `backend/portal/admin_views.py`
- `backend/portal/facilities_views.py`

## 7. Remaining work / recommendations
1. Add `CHECK (enrolled <= capacity)` on classes/rooms if such a field exists (spanning cross-row invariant, currently enforced in code only).
2. Add a scheduled **automatic** backup `manage.py` command + cron/CI schedule.
3. Consider a migration-based column for the `ip_address` if the CMS app needs the same column outside `portal_*`.