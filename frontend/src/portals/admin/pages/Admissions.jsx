import { useEffect, useState } from "react";
import api from "../lib/api";
import { isNonEmptyString, isValidEmail, isValidPhone } from "../../../utils/validation";
import { Badge, Card, EmptyState, Loader, Toast } from "../components/Common";
import { Plus, X, UserPlus } from "lucide-react";


const TONE = {
  Registered: "slate", Verification: "blue", Screening: "gold",
  Fee_Pending: "orange", Confirmed: "green", Rejected: "red",
};
const NEXT_LABEL = {
  Registered: "Move to Verification", Verification: "Move to Screening",
  Screening: "Move to Fee Pending", Fee_Pending: "Confirm & generate logins",
};

export default function Admissions() {
  const [items, setItems] = useState(null);
  const [busy, setBusy] = useState(null);
  const [toast, setToast] = useState("");
    const [showForm, setShowForm] = useState(false);

  function load() {
    api.get("/admin-portal/admissions/").then(({ data }) => setItems(data)).catch(() => setItems([]));
  }

  useEffect(() => { load(); }, []);

  async function advance(regNo) {
    setBusy(regNo);
    try {
      const { data } = await api.post(`/admin-portal/admissions/${regNo}/action/`, { action: "advance" });
      if (data.credentials) setCredentials(data.credentials);
      setToast(`Application moved to ${data.status}.`);
      load();
    } catch (e) {
      setToast(e?.response?.data?.detail || "Could not advance application.");
    } finally {
      setBusy(null);
    }
  }

  async function reject(regNo) {
    const reason = window.prompt("Reason for rejection:");
    if (reason === null) return;
    setBusy(regNo);
    try {
      await api.post(`/admin-portal/admissions/${regNo}/action/`, { action: "reject", reason });
      setToast("Application rejected.");
      load();
    } catch {
      setToast("Could not reject application.");
    } finally {
      setBusy(null);
    }
  }

  if (!items) return <Loader rows={5} />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h2 className="font-heading font-semibold text-lg">Admissions Pipeline</h2>
          <p className="text-xs text-ink-secondary">Review public enquiries or register admissions manually.</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-academic-blue text-white rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-academic-blue/90"
        >
          <Plus size={16} /> Register Admission
        </button>
      </div>

      

      {items.length === 0 ? (
        <EmptyState label="No admission applications yet." />
      ) : (
        items.map((a) => (
          <Card key={a.registration_number}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-ink-primary">{a.applicant_name} <span className="text-xs text-ink-secondary">({a.registration_number})</span></p>
                <p className="text-xs text-ink-secondary">
                  {a.target_class} · Parent: {a.parent_name} ({a.parent_phone}) · Applied {new Date(a.submitted_at).toLocaleDateString()}
                </p>
                {a.rejection_reason && <p className="text-xs text-danger mt-1">{a.rejection_reason}</p>}
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={TONE[a.status] || "slate"}>{a.status}</Badge>
                {NEXT_LABEL[a.status] && (
                  <button
                    disabled={busy === a.registration_number}
                    onClick={() => advance(a.registration_number)}
                    className="bg-academic-blue text-white text-sm px-3 py-1.5 rounded-lg disabled:opacity-60"
                  >
                    {NEXT_LABEL[a.status]}
                  </button>
                )}
                {!["Confirmed", "Rejected"].includes(a.status) && (
                  <button
                    disabled={busy === a.registration_number}
                    onClick={() => reject(a.registration_number)}
                    className="bg-red-50 text-danger text-sm px-3 py-1.5 rounded-lg disabled:opacity-60"
                  >
                    Reject
                  </button>
                )}
              </div>
            </div>
          </Card>
        ))
      )}

      {showForm && (
        <ManualAdmissionForm
          onClose={() => setShowForm(false)}
          onSaved={(msg) => {
            setShowForm(false);
            setToast(msg);
            load();
          }}
        />
      )}
      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}

function ManualAdmissionForm({ onClose, onSaved }) {
  const [form, setForm] = useState({
    applicant_name: "",
    date_of_birth: "",
    gender: "Male",
    target_class: "Class 1",
    parent_name: "",
    parent_phone: "",
    parent_email: "",
    address: "",
    scholarship_applied: false,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState({});

  async function submit(e) {
    e.preventDefault();
    const errs = {};
    if (!isNonEmptyString(form.applicant_name)) {
      errs.applicant_name = "Applicant name is required.";
    }
    if (!form.date_of_birth) {
      errs.date_of_birth = "Date of birth is required.";
    } else {
      const dob = new Date(form.date_of_birth);
      if (dob > new Date()) {
        errs.date_of_birth = "Date of birth cannot be in the future.";
      }
    }
    if (!isNonEmptyString(form.parent_name)) {
      errs.parent_name = "Parent name is required.";
    }
    if (!isValidPhone(form.parent_phone)) {
      errs.parent_phone = "Please enter a valid phone number (7-15 digits).";
    }
    if (!isValidEmail(form.parent_email)) {
      errs.parent_email = "Please enter a valid email address.";
    }
    if (!isNonEmptyString(form.address)) {
      errs.address = "Address is required.";
    }

    if (Object.keys(errs).length > 0) {
      setValidationErrors(errs);
      return;
    }
    setValidationErrors({});
    setBusy(true);
    setError("");
    try {
      await api.post("/admin-portal/admissions/", form);
      onSaved("Admission registered successfully under status 'Registered'.");
    } catch (err) {
      setError(err?.response?.data?.detail || "Could not register admission.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-card w-full max-w-lg p-6 shadow-raised max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <UserPlus size={20} className="text-academic-blue" />
            <p className="font-heading font-semibold text-lg">Register Manual Admission</p>
          </div>
          <button onClick={onClose} className="text-ink-secondary"><X size={18} /></button>
        </div>

        {error && <div className="mb-3 text-sm text-danger bg-red-50 rounded-xl px-3 py-2">{error}</div>}

        <form onSubmit={submit} className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1 col-span-2">
              <label className="text-xs font-semibold text-slate-500 uppercase">Applicant Name (*)</label>
              <input
                required
                type="text"
                value={form.applicant_name}
                onChange={(e) => setForm({ ...form, applicant_name: e.target.value })}
                placeholder="Full Name"
                className={`w-full rounded-xl border px-3 py-2 text-sm outline-none focus-ring ${
                  validationErrors.applicant_name ? "border-danger" : "border-slate-200"
                }`}
              />
              {validationErrors.applicant_name && (
                <p className="text-xs text-danger">{validationErrors.applicant_name}</p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Date of Birth (*)</label>
              <input
                required
                type="date"
                value={form.date_of_birth}
                onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
                className={`w-full rounded-xl border px-3 py-2 text-sm outline-none focus-ring ${
                  validationErrors.date_of_birth ? "border-danger" : "border-slate-200"
                }`}
              />
              {validationErrors.date_of_birth && (
                <p className="text-xs text-danger">{validationErrors.date_of_birth}</p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Gender</label>
              <select
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus-ring"
              >
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </div>

            <div className="flex flex-col gap-1 col-span-2">
              <label className="text-xs font-semibold text-slate-500 uppercase">Target Program/Class</label>
              <select
                value={form.target_class}
                onChange={(e) => setForm({ ...form, target_class: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus-ring"
              >
                {Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`).map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-3">
            <h3 className="font-semibold text-sm text-ink-primary">Parent / Guardian Details</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1 col-span-2">
                <label className="text-xs font-semibold text-slate-500 uppercase">Parent Name (*)</label>
                <input
                  required
                  type="text"
                  value={form.parent_name}
                  onChange={(e) => setForm({ ...form, parent_name: e.target.value })}
                  placeholder="Parent/Guardian Full Name"
                  className={`w-full rounded-xl border px-3 py-2 text-sm outline-none focus-ring ${
                    validationErrors.parent_name ? "border-danger" : "border-slate-200"
                  }`}
                />
                {validationErrors.parent_name && (
                  <p className="text-xs text-danger">{validationErrors.parent_name}</p>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">Parent Phone (*)</label>
                <input
                  required
                  type="tel"
                  value={form.parent_phone}
                  onChange={(e) => setForm({ ...form, parent_phone: e.target.value })}
                  placeholder="e.g. +91 9876543210"
                  className={`w-full rounded-xl border px-3 py-2 text-sm outline-none focus-ring ${
                    validationErrors.parent_phone ? "border-danger" : "border-slate-200"
                  }`}
                />
                {validationErrors.parent_phone && (
                  <p className="text-xs text-danger">{validationErrors.parent_phone}</p>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">Parent Email (*)</label>
                <input
                  required
                  type="email"
                  value={form.parent_email}
                  onChange={(e) => setForm({ ...form, parent_email: e.target.value })}
                  placeholder="email@example.com"
                  className={`w-full rounded-xl border px-3 py-2 text-sm outline-none focus-ring ${
                    validationErrors.parent_email ? "border-danger" : "border-slate-200"
                  }`}
                />
                {validationErrors.parent_email && (
                  <p className="text-xs text-danger">{validationErrors.parent_email}</p>
                )}
              </div>

              <div className="flex flex-col gap-1 col-span-2">
                <label className="text-xs font-semibold text-slate-500 uppercase">Residential Address (*)</label>
                <textarea
                  required
                  rows={2}
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Complete Address"
                  className={`w-full rounded-xl border px-3 py-2 text-sm outline-none focus-ring resize-none ${
                    validationErrors.address ? "border-danger" : "border-slate-200"
                  }`}
                />
                {validationErrors.address && (
                  <p className="text-xs text-danger">{validationErrors.address}</p>
                )}
              </div>

              <div className="col-span-2 flex items-center gap-2 mt-1">
                <input
                  type="checkbox"
                  id="scholarship"
                  checked={form.scholarship_applied}
                  onChange={(e) => setForm({ ...form, scholarship_applied: e.target.checked })}
                  className="w-4 h-4 text-academic-blue"
                />
                <label htmlFor="scholarship" className="text-xs font-medium text-slate-600 cursor-pointer">
                  Scholarship support requested
                </label>
              </div>
            </div>
          </div>

          <button
            disabled={busy}
            className="w-full bg-academic-blue text-white rounded-xl py-2.5 font-medium hover:bg-academic-blue/90 disabled:opacity-60"
          >
            {busy ? "Registering..." : "Submit Registration"}
          </button>
        </form>
      </div>
    </div>
  );
}
