# SWAGGER IMPROVEMENT REPORT

**Project:** EduNova Global Academy — Integrated Backend
**Date:** 2026-08-07
**Scope:** drf-spectacular OpenAPI/Swagger documentation quality — duplicate operationIds, endpoint annotations, serializers, examples, auth, and pagination warnings.

---

## 1. Summary

The schema previously generated with `manage.py spectacular --validate` reported **0 errors but 9 operationId-collision warnings**, and several endpoints were missing `summary`/`description`/`tags` annotations. This pass eliminates **all 9 collisions** (`Warnings: 0`, `Errors: 0`), adds missing annotations, and documents auth/request/response serializers. No endpoint behaviour, URL, HTTP method, or existing frontend-facing `operationId` was changed.

## 2. Root cause of the operationId collisions

drf-spectacular derives the default `operationId` from the **tokenized URL path and HTTP method**, stripping `{path_params}` (e.g. `{submission_id}`), and from `@extend_schema(operation_id=...)` when explicitly set. Three view classes were mounted on **two URLs each** (a collection route *and* a detail/action route), so the same handler produced identical operationIds for both routes:

| Colliding id | Routes | Methods |
|---|---|---|
| `AdminLeaveApprovalList` | `/admin-portal/leaves/`, `/admin-portal/leaves/{leave_id}/decide/` | GET |
| `AdminLeaveDecide` | `/admin-portal/leaves/`, `/admin-portal/leaves/{leave_id}/decide/` | POST |
| `AdminUserDetail` | `/admin-portal/users/{user_id}/`, `/admin-portal/users/{user_id}/reset-password/` | PATCH |
| `AdminUserResetPassword` | `/admin-portal/users/{user_id}/`, `/admin-portal/users/{user_id}/reset-password/` | POST |
| `teacher_assignments_submissions_list` | `/teacher/assignments/{assignment_id}/submissions/`, `.../submissions/{submission_id}/` | GET |
| `teacher_assignments_submissions_partial_update` | same pair | PATCH |
| `teacher_question_bank_list` | `/teacher/question-bank/`, `/teacher/question-bank/{question_id}/` | GET |
| `teacher_question_bank_create` | same pair | POST |
| `teacher_question_bank_destroy` | same pair | DELETE |

## 3. Fix applied — route-aware `MultiRouteAutoSchema`

Added a shared schema base class `MultiRouteAutoSchema(AutoSchema)` in `portal/doc_schemas.py`. It generates the operationId from the **concrete route segments** (path params kept in place) via `_route_key()`, stripping the configured `SCHEMA_PATH_PREFIX` (`/api/`), and looks up a per-route `OPERATION_IDS` map:

- `get_operation_id()` keys on `(method, route_segments)`; falls back to drf-spectacular's default when unmapped.
- `_route_key()` normalises the path so collection vs detail routes tokenise differently.

Each multi-route view now subclasses it and is wired via the view's **`schema` attribute** (`schema = _XRouteSchema()`), because drf-spectacular resolves the schema class from `callback.cls.schema`, not `schema_class`.

### New operationIds (unique, stable, frontend-compatible)

- `TeacherAssignmentSubmissions` / `TeacherAssignmentSubmissionBulk` (list route GET/PATCH)
- `TeacherAssignmentSubmissionView` / `TeacherAssignmentSubmissionDetail` (detail route GET/PATCH)
- `TeacherQuestionBankList` / `TeacherQuestionBankCreate` / `TeacherQuestionBankRemoveAll` (collection GET/POST/DELETE)
- `TeacherQuestionBankDetail` / `TeacherQuestionBankDetailCreate` / `TeacherQuestionBankDelete` (detail GET/POST/DELETE)
- `AdminLeaveApprovalList` / `AdminLeaveDecideCreate` (leaves GET / leaves POST)
- `AdminLeaveDecideRoute` / `AdminLeaveDecide` (decide route GET / POST)
- `AdminUserDetail` / `AdminUserDetailAction` (user detail PATCH/POST)
- `AdminUserDetailViaResetPassword` / `AdminUserResetPassword` (reset-password route PATCH/POST)

The 4 previously hardcoded ids that were the **source** of the admin collisions (`AdminUserDetail`, `AdminUserResetPassword`, `AdminLeaveApprovalList`, `AdminLeaveDecide`) were removed from the decorators so the route-aware schema can assign per-route ids.

## 4. Endpoint annotation audit

Scanned all **224 generated operations**; after this pass every operation has `summary`, `description`, and `tags`. Added the 13 missing summaries:

**`portal/exam_extras_views.py`** — `ExamRankList`, `ExamRankListGenerate`, `ExamOverallRankList`, `ExamAdminReportCard`, `ExamStudentReportCard`.

**`portal/lms_extras_views.py`** — `LmsForumTopicList`, `LmsForumTopicCreate`, `LmsForumTopicDetail`, `LmsForumPostCreate`, `LmsDigitalNoteList`, `LmsDigitalNoteCreate`, `LmsMarkContentComplete`, `LmsCourseAnalytics`.

## 5. Serializers / request & response documentation

- **Request bodies:** 71 operations declare a `requestBody` schema (DRF serializers for CMS/admissions viewsets; `inline_serializer` request classes for the raw-SQL portal views in `portal/doc_schemas.py`).
- **Responses:** every operation declares response schemas; portal views reuse the shared `DetailErrorResponse` / `ValidationErrorResponse` components and `ERROR_RESPONSES` map.
- **Components:** the schema defines components for all model serializers and request/response inline serializers (`COMPONENT_SPLIT_REQUEST = True`).

## 6. Examples

46 operations carry `examples` (request + response examples via `OpenApiExample`). These are concentrated on the interactive flows (auth/OTP, upload, fees, leave, exports, admissions, question bank, etc.).

## 7. Authentication

- `securitySchemes.jwtAuth` (HTTP bearer, JWT) defined in `config/settings.py` `SPECTACULAR_SETTINGS` and applied globally to protected routes.
- Public endpoints (e.g. `/api/auth/login/`, contact submission, public CMS) declare `security: [{jwtAuth: []}, {}]` so they accept anonymous requests.
- Swagger UI is configured with `persistAuthorization: true` and `displayOperationId: true`.

## 8. Pagination ordering (`UnorderedObjectListWarning`)

Verified there is **no** `UnorderedObjectListWarning`: `DEFAULT_PAGINATION_CLASS = PageNumberPagination` is active, and every paginated list queryset in `apps/cms` and `apps/admissions` is backed by a model with `Meta.ordering`; the only non-read viewsets (`ContactSubmissionViewSet`, `AdmissionEnquiryViewSet`) are write-only and never paginate. No code change required.

## 9. Files modified

- `backend/portal/doc_schemas.py` — added shared `MultiRouteAutoSchema` (+ `spectacular_settings` import).
- `backend/portal/teacher_views.py` — replaced local schema base with shared `MultiRouteAutoSchema`; updated `OPERATION_IDS` maps; wired `schema = _...Schema()` on `AssignmentSubmissionsView` and `QuestionBankView`; dropped unused `AutoSchema` import.
- `backend/portal/admin_views.py` — added `_UserDetailRouteSchema` and `_LeaveApprovalRouteSchema`; removed hardcoded `operation_id` from the 4 colliding methods; wired `schema = _...Schema()` on `UserDetailView` and `LeaveApprovalListView`.
- `backend/portal/exam_extras_views.py` — added 5 summaries.
- `backend/portal/lms_extras_views.py` — added 8 summaries.
- `backend/schema.yml` — regenerated (`manage.py spectacular --file schema.yml --validate`, exit 0).

## 10. Verification

```
python manage.py spectacular --validate
Warnings: 0 (0 unique)
Errors:   0 (0 unique)
```

## 11. Remaining / optional improvements

1. `x-codeSamples` are not yet attached to any operation — could be added per endpoint for nicer Swagger UI.
2. A few query parameters (e.g. list filters) could gain `enum`/`example` hints where the frontend uses fixed values.
3. Operation-level `deprecated` flags for any legacy endpoints if the product decides to retire them.
