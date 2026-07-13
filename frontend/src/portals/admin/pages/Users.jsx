import { useEffect, useState } from "react";
import api from "../lib/api";
import { Badge, Card, EmptyState, Loader, SectionTitle, Toast } from "../components/Common";

const ROLES = ["Student", "Teacher", "Parent", "Admin", "Employee"];
const ROLE_TONE = { Student: "blue", Teacher: "green", Parent: "gold", Admin: "red", Employee: "slate" };

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
  const [toast, setToast] = useState("");
  const [created, setCreated] = useState(null);

  function load() {
    api.get(`/admin-portal/users/${roleFilter ? `?role=${roleFilter}` : ""}`).then(({ data }) => setUsers(data)).catch(() => setUsers([]));
  }

  useEffect(() => {
    load();
    api.get("/admin-portal/classes/").then(({ data }) => setClasses(data)).catch(() => {});
  }, [roleFilter]);

  async function createUser(e) {
    e.preventDefault();
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
      setToast(err?.response?.data?.detail || "Could not create user.");
    }
  }

  async function toggleActive(u) {
    await api.patch(`/admin-portal/users/${u.id}/`, { is_active: !u.is_active });
    load();
  }

  async function resetPassword(u) {
    const { data } = await api.post(`/admin-portal/users/${u.id}/reset-password/`, {});
    setToast(`New temp password for ${u.username}: ${data.temp_password}`);
  }

  return (
    <div className="space-y-6">
      {created && (
        <Card className="border-2 border-academic-green">
          <p className="font-semibold text-academic-green mb-1">User created</p>
          <p className="text-sm">Username: <b>{created.username}</b> · Temp password: <b>{created.temp_password}</b> · Role: {created.role}</p>
          <button onClick={() => setCreated(null)} className="mt-2 text-xs text-ink-secondary hover:underline">Dismiss</button>
        </Card>
      )}

      <Card>
        <SectionTitle>Create a user</SectionTitle>
        <form onSubmit={createUser} className="space-y-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Role</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus-ring">
                {ROLES.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">First Name</label>
              <input required placeholder="First name" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus-ring" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Last Name</label>
              <input placeholder="Last name" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus-ring" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Email Address</label>
              <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus-ring" />
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
                    <label className="text-xs font-semibold text-slate-500 uppercase">Parent Email (Links Accounts)</label>
                    <input
                      type="email"
                      placeholder="parent@email.com"
                      value={form.parent_email}
                      onChange={(e) => setForm({ ...form, parent_email: e.target.value })}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus-ring"
                    />
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

          <button className="w-full bg-academic-blue text-white rounded-xl py-2.5 font-medium hover:bg-academic-blue/90 transition-colors">Create User</button>
        </form>
      </Card>

      <Card>
        <SectionTitle
          action={
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="rounded-lg border border-slate-200 px-2 py-1 text-sm">
              <option value="">All roles</option>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          }
        >
          All users
        </SectionTitle>
        {!users ? <Loader rows={4} /> : users.length === 0 ? (
          <EmptyState label="No users found." />
        ) : (
          <div className="divide-y divide-slate-100">
            {users.map((u) => (
              <div key={u.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-ink-primary truncate">{u.name}</p>
                  <p className="text-xs text-ink-secondary truncate">{u.username} · {u.email}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge tone={ROLE_TONE[u.role] || "slate"}>{u.role}</Badge>
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
                  <button onClick={() => resetPassword(u)} className="text-xs text-academic-blue hover:underline">Reset PW</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}
