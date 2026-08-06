import { useEffect, useState } from "react";
import api from "../lib/api";
import { Badge, Card, EmptyState, Loader, SectionTitle, Toast } from "../components/Common";
import { isNonEmptyString, isValidEmail } from "../../../utils/validation";

const ROLES = ["Student", "Teacher", "Parent", "Admin", "Employee"];
const ROLE_TONE = { Student: "blue", Teacher: "green", Parent: "gold", Admin: "red", Employee: "slate" };

// ── Confirmation Modal ──────────────────────────────────────────────────────
function ConfirmResetModal({ user, onConfirm, onCancel, loading }) {
  if (!user) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.45)" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0 text-amber-700 text-xl font-bold">!</div>
          <div>
            <p className="font-bold text-amber-900 text-base">Reset Password?</p>
            <p className="text-sm text-amber-700 mt-0.5">This will immediately invalidate the current password.</p>
          </div>
        </div>
        {/* Body */}
        <div className="px-6 py-5">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4">
            <p className="text-xs text-slate-500 uppercase font-semibold tracking-wide mb-1">User</p>
            <p className="font-semibold text-slate-800">{user.name}</p>
            <p className="text-sm text-slate-500">{user.username} · {user.email}</p>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            A new <strong>temporary password</strong> will be generated and sent to&nbsp;
            <span className="text-academic-blue font-medium">{user.email}</span>.
            The user must change it after logging in.
          </p>
        </div>
        {/* Actions */}
        <div className="px-6 pb-5 flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors disabled:opacity-70 flex items-center gap-2"
          >
            {loading && (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            )}
            {loading ? "Resetting…" : "Yes, Reset Password"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Success Modal ───────────────────────────────────────────────────────────
function PasswordResetSuccessModal({ result, onClose }) {
  const [copied, setCopied] = useState(false);
  if (!result) return null;

  function copyPassword() {
    navigator.clipboard.writeText(result.temp_password).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.45)" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 text-emerald-600 text-xl font-bold">✓</div>
          <div>
            <p className="font-bold text-emerald-900 text-base">Password Reset Successfully</p>
            <p className="text-sm text-emerald-700 mt-0.5">
              {result.email_error
                ? "⚠️ Password reset but email could not be sent. Share credentials manually."
                : "📧 Email with credentials sent to user."}
            </p>
          </div>
        </div>
        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* User info */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500 uppercase font-semibold tracking-wide mb-1">User</p>
            <p className="font-semibold text-slate-800">{result.user?.name}</p>
            <p className="text-sm text-slate-500">{result.user?.username} · {result.user?.email}</p>
          </div>

          {/* Temp Password display */}
          <div>
            <p className="text-xs text-slate-500 uppercase font-semibold tracking-wide mb-2">Temporary Password</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-slate-900 rounded-xl px-4 py-3">
                <code className="text-emerald-400 font-mono font-bold text-lg tracking-widest select-all">
                  {result.temp_password}
                </code>
              </div>
              <button
                onClick={copyPassword}
                className={`shrink-0 px-4 py-3 rounded-xl text-sm font-semibold border transition-all ${
                  copied
                    ? "bg-emerald-100 text-emerald-700 border-emerald-300"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              🔒 User must change this password after next login.
            </p>
          </div>

          {result.email_error && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
              <strong>Note:</strong> Email delivery failed. Please share the temporary password with the user manually or check your email settings.
            </div>
          )}
        </div>
        {/* Footer */}
        <div className="px-6 pb-5 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-academic-blue text-white text-sm font-semibold hover:bg-academic-blue/90 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function Users() {
  const [users, setUsers] = useState(null);
  const [roleFilter, setRoleFilter] = useState("");
  const [classes, setClasses] = useState([]);
  const [form, setForm] = useState({
    role: "Student",
    first_name: "",
    last_name: "",
    email: "",
    class_id: "",
    roll_number: "",
    parent_name: "",
    parent_email: "",
    parent_phone: "",
  });
  const [toast, setToast] = useState({ message: "", tone: "success" });
  const [created, setCreated] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  // Reset-password flow state
  const [confirmUser, setConfirmUser] = useState(null);  // user awaiting confirmation
  const [resetting, setResetting]     = useState(false); // loading flag
  const [resetResult, setResetResult] = useState(null);  // success modal data

  function load() {
    api
      .get(`/admin-portal/users/${roleFilter ? `?role=${roleFilter}` : ""}`)
      .then(({ data }) => setUsers(data))
      .catch(() => setUsers([]));
  }

  useEffect(() => {
    load();
    api.get("/admin-portal/classes/").then(({ data }) => setClasses(data)).catch(() => {});
  }, [roleFilter]);

  async function createUser(e) {
    e.preventDefault();
    const errs = {};
    if (!isNonEmptyString(form.first_name)) errs.first_name = "First name is required.";
    if (!isValidEmail(form.email)) errs.email = "Please enter a valid email address.";
    if (form.role === "Student") {
      if (!isValidEmail(form.parent_email)) errs.parent_email = "Valid parent email is required.";
    }
    if (Object.keys(errs).length > 0) { setValidationErrors(errs); return; }
    setValidationErrors({});
    try {
      const { data } = await api.post("/admin-portal/users/", form);
      setCreated(data);
      setForm({
        role: "Student",
        first_name: "",
        last_name: "",
        email: "",
        class_id: "",
        roll_number: "",
        parent_name: "",
        parent_email: "",
        parent_phone: "",
      });
      load();
    } catch (err) {
      setToast({ message: err?.response?.data?.detail || "Could not create user.", tone: "error" });
    }
  }

  async function toggleActive(u) {
    await api.patch(`/admin-portal/users/${u.id}/`, { is_active: !u.is_active });
    load();
  }

  /** Step 1: show confirmation modal */
  function promptResetPassword(u) {
    setConfirmUser(u);
  }

  /** Step 2: admin confirmed — call backend */
  async function doResetPassword() {
    if (!confirmUser) return;
    setResetting(true);
    try {
      const { data } = await api.post(`/admin-portal/users/${confirmUser.id}/reset-password/`, {});
      setResetResult({ ...data, user: confirmUser });
      setConfirmUser(null);
    } catch (err) {
      setToast({
        message: err?.response?.data?.detail || "Failed to reset password. Please try again.",
        tone: "error",
      });
      setConfirmUser(null);
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Modals */}
      <ConfirmResetModal
        user={confirmUser}
        onConfirm={doResetPassword}
        onCancel={() => setConfirmUser(null)}
        loading={resetting}
      />
      <PasswordResetSuccessModal
        result={resetResult}
        onClose={() => setResetResult(null)}
      />

      {created && (() => {
        const portalMap = {
          Student: "/student/login",
          Teacher: "/teacher/login",
          Parent: "/parent/login",
          Admin: "/admin/login",
          Employee: "/teacher/login",
        };
        const loginPath = portalMap[created.role] || "/login";
        return (
          <Card className="border-2 border-academic-green bg-emerald-50">
            <p className="font-bold text-academic-green text-base mb-3">✅ User Created Successfully</p>
            <div className="grid sm:grid-cols-2 gap-3 text-sm mb-3">
              <div className="bg-white rounded-xl p-3 border border-emerald-200">
                <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Username</p>
                <p className="font-mono font-bold text-slate-800 select-all">{created.username}</p>
              </div>
              <div className="bg-white rounded-xl p-3 border border-emerald-200">
                <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Temporary Password</p>
                <p className="font-mono font-bold text-slate-800 select-all">{created.temp_password}</p>
              </div>
              <div className="bg-white rounded-xl p-3 border border-emerald-200">
                <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Role</p>
                <p className="font-semibold text-slate-800">{created.role}</p>
              </div>
              <div className="bg-white rounded-xl p-3 border border-emerald-200">
                <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Login Portal</p>
                <a
                  href={loginPath}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-academic-blue hover:underline text-sm"
                >
                  {window.location.origin}{loginPath}
                </a>
              </div>
            </div>
            <p className="text-xs text-slate-500 mb-2">⚠️ Share these credentials with the user. The temporary password must be changed after first login.</p>
            <button onClick={() => setCreated(null)} className="text-xs text-ink-secondary hover:underline">
              Dismiss
            </button>
          </Card>
        );
      })()}

      {/* Create User Form */}
      <Card>
        <SectionTitle>Create a user</SectionTitle>
        <form onSubmit={createUser} className="space-y-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus-ring"
              >
                {ROLES.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">First Name (*)</label>
              <input
                required
                placeholder="First name (*)"
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                className={`rounded-xl border px-3 py-2 text-sm outline-none focus-ring ${validationErrors.first_name ? "border-danger" : "border-slate-200"}`}
              />
              {validationErrors.first_name && <p className="text-xs text-danger">{validationErrors.first_name}</p>}
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Last Name</label>
              <input
                placeholder="Last name"
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus-ring"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Email Address (*)</label>
              <input
                required
                type="email"
                placeholder="Email (*)"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={`rounded-xl border px-3 py-2 text-sm outline-none focus-ring ${validationErrors.email ? "border-danger" : "border-slate-200"}`}
              />
              {validationErrors.email && <p className="text-xs text-danger">{validationErrors.email}</p>}
            </div>
          </div>

          {form.role === "Student" && (
            <>
              <div className="grid sm:grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Enroll in Class (Optional)</label>
                  <select
                    value={form.class_id}
                    onChange={(e) => setForm({ ...form, class_id: e.target.value })}
                    className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus-ring"
                  >
                    <option value="">-- No Class / Delay Enrollment --</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}-{c.section} ({c.curriculum})</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Roll Number (Optional)</label>
                  <input
                    type="number"
                    placeholder="e.g. 15"
                    value={form.roll_number}
                    onChange={(e) => setForm({ ...form, roll_number: e.target.value })}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus-ring"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-3 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-700 uppercase">Parent / Guardian Details</h4>
                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase">Parent Name</label>
                    <input
                      placeholder="Parent Name"
                      value={form.parent_name}
                      onChange={(e) => setForm({ ...form, parent_name: e.target.value })}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus-ring"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase">Parent Email (*)</label>
                    <input
                      required
                      type="email"
                      placeholder="parent@email.com (*)"
                      value={form.parent_email}
                      onChange={(e) => setForm({ ...form, parent_email: e.target.value })}
                      className={`rounded-xl border px-3 py-2 text-sm outline-none focus-ring ${validationErrors.parent_email ? "border-danger" : "border-slate-200"}`}
                    />
                    {validationErrors.parent_email && <p className="text-xs text-danger">{validationErrors.parent_email}</p>}
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase">Parent Phone</label>
                    <input
                      placeholder="Parent Phone"
                      value={form.parent_phone}
                      onChange={(e) => setForm({ ...form, parent_phone: e.target.value })}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus-ring"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          <button className="w-full bg-academic-blue text-white rounded-xl py-2.5 font-medium hover:bg-academic-blue/90 transition-colors">
            Create User
          </button>
        </form>
      </Card>

      {/* Users List */}
      <Card>
        <SectionTitle
          action={
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
            >
              <option value="">All roles</option>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          }
        >
          All users
        </SectionTitle>

        {!users ? (
          <Loader rows={4} />
        ) : users.length === 0 ? (
          <EmptyState label="No users found." />
        ) : (
          <div className="divide-y divide-slate-100">
            {users.map((u) => (
              <div key={u.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-ink-primary truncate">{u.name}</p>
                  <p className="text-xs text-ink-secondary truncate">{u.username} &middot; {u.email} &middot; Pass: <span className="font-mono">{u.temp_password || "***"}</span></p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge tone={ROLE_TONE[u.role] || "slate"}>{u.role}</Badge>

                  {/* Active / Deactivated toggle */}
                  <button
                    onClick={() => toggleActive(u)}
                    title={u.is_active ? "Click to deactivate user" : "Click to activate user"}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                      u.is_active
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:text-emerald-800"
                        : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 hover:text-rose-800"
                    }`}
                  >
                    {u.is_active ? "Active" : "Deactivated"}
                  </button>

                  {/* Reset Password button */}
                  <button
                    onClick={() => promptResetPassword(u)}
                    title="Reset this user's password"
                    className="px-3 py-1 rounded-full text-xs font-semibold border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800 transition-all cursor-pointer"
                  >
                    Reset PW
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Toast
        message={toast.message}
        tone={toast.tone}
        onClose={() => setToast({ message: "", tone: "success" })}
      />
    </div>
  );
}
