import { useEffect, useState } from "react";
import api from "../lib/api";
import { Badge, Card, EmptyState, Loader, SectionTitle, Toast } from "../components/Common";
import { isNonEmptyString, isValidDateRange } from "../utils/validation";
import { useAuth } from "../context/AuthContext";

const TONE = { Pending: "orange", Approved: "green", Rejected: "red" };

export default function LeaveRequests() {
  const { activeChildId } = useAuth();
  const [items, setItems] = useState(null);
  const [form, setForm] = useState({ leave_type: "Casual", start_date: "", end_date: "", reason: "" });
  const [toast, setToast] = useState("");
  const [validationErrors, setValidationErrors] = useState({});


  function load() {
    api.get(`/parent/leaves/?child_id=${activeChildId}`).then(({ data }) => setItems(data)).catch(() => setItems([]));
  }

  useEffect(() => {
    if (!activeChildId) return;
    setItems(null);
    load();
  }, [activeChildId]);

  async function submit(e) {
    e.preventDefault();
    const errs = {};
    if (!isNonEmptyString(form.reason)) {
      errs.reason = "Reason is required.";
    }
    if (!isValidDateRange(form.start_date, form.end_date)) {
      errs.end_date = "End date must be on or after the start date.";
    }
    if (Object.keys(errs).length > 0) {
      setValidationErrors(errs);
      return;
    }
    setValidationErrors({});
    try {
      await api.post("/parent/leaves/", { ...form, child_id: activeChildId });
      setToast("Leave request submitted.");
      setForm({ leave_type: "Casual", start_date: "", end_date: "", reason: "" });
      load();
    } catch {
      setToast("Could not submit leave request.");
    }
  }

  if (!activeChildId) return <EmptyState label="Select a child from the top bar to request leave." />;

  return (
    <div className="space-y-6">
      <Card>
        <SectionTitle>New leave request</SectionTitle>
        <form onSubmit={submit} className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-ink-secondary block mb-1">Leave Type</label>
            <select
              value={form.leave_type}
              onChange={(e) => setForm({ ...form, leave_type: e.target.value })}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm w-full"
            >
              {["Casual", "Sick", "Earned", "Academic"].map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div />
          <div>
            <label className="text-xs text-ink-secondary block mb-1">Start Date</label>
            <input required type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-sm w-full font-sub outline-none focus-ring" />
          </div>
          <div>
            <label className="text-xs text-ink-secondary block mb-1">End Date</label>
            <input required type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              className={`rounded-xl border px-3 py-2 text-sm w-full font-sub outline-none focus-ring ${
                validationErrors.end_date ? "border-danger" : "border-slate-200"
              }`} />
            {validationErrors.end_date && (
              <p className="text-xs text-danger mt-1">{validationErrors.end_date}</p>
            )}
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-ink-secondary block mb-1">Reason</label>
            <textarea required placeholder="Reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}
              className={`w-full rounded-xl border px-3 py-2 text-sm outline-none focus-ring resize-none ${
                validationErrors.reason ? "border-danger" : "border-slate-200"
              }`} rows={3} />
            {validationErrors.reason && (
              <p className="text-xs text-danger mt-1">{validationErrors.reason}</p>
            )}
          </div>
          <button className="sm:col-span-2 bg-academic-green text-white rounded-xl py-2.5 font-medium">Submit request</button>
        </form>
      </Card>

      <Card>
        <SectionTitle>History</SectionTitle>
        {!items ? <Loader rows={3} /> : items.length === 0 ? (
          <EmptyState label="No leave requests yet." />
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map((l) => (
              <div key={l.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-ink-primary">{l.leave_type} leave</p>
                  <p className="text-xs text-ink-secondary">{l.start_date} → {l.end_date}</p>
                </div>
                <Badge tone={TONE[l.status] || "slate"}>{l.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}
