import { ShieldCheck, UserCheck, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge, Card, EmptyState, Loader, Toast } from "../components/Common";
import api from "../lib/api";

const STATUS_TONE = { Verification: "gold", Screening: "blue" };

export default function AdmissionsReview() {
  const [items, setItems] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [toast, setToast] = useState("");

  function load() {
    api.get("/teacher/admissions-review/")
      .then(({ data }) => setItems(data))
      .catch(() => setItems([]));
  }
  useEffect(load, []);

  if (!items) return <Loader rows={3} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-10 h-10 rounded-xl bg-academic-blue/10 text-academic-blue flex items-center justify-center">
          <ShieldCheck size={20} />
        </div>
        <div>
          <h2 className="font-heading font-semibold text-lg">Assigned Admission Enquiries</h2>
          <p className="text-xs text-ink-secondary">Conduct interviews, provide counselling feedback, and make recommendations.</p>
        </div>
      </div>

      {items.length ? (
        <div className="grid md:grid-cols-2 gap-4">
          {items.map((enquiry) => (
            <Card
              key={enquiry.registration_number}
              className="flex flex-col justify-between hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedItem(enquiry)}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <h3 className="font-semibold text-ink-primary text-md">{enquiry.applicant_name}</h3>
                    <p className="text-xs text-ink-secondary">Reg: {enquiry.registration_number}</p>
                  </div>
                  <Badge tone={STATUS_TONE[enquiry.status] || "slate"}>
                    {enquiry.status}
                  </Badge>
                </div>
                <div className="text-xs space-y-1 text-ink-secondary mt-3">
                  <p><strong>Target Program:</strong> {enquiry.target_class}</p>
                  <p><strong>Parent:</strong> {enquiry.parent_name} ({enquiry.parent_phone})</p>
                  {enquiry.rejection_reason && (
                    <p className="mt-2 p-1.5 bg-slate-50 border border-slate-100 rounded text-slate-600 truncate">
                      {enquiry.rejection_reason}
                    </p>
                  )}
                </div>
              </div>
              <button
                className="mt-4 w-full bg-academic-blue/5 text-academic-blue text-xs font-semibold rounded-lg py-2 hover:bg-academic-blue/10"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedItem(enquiry);
                }}
              >
                Conduct Interview
              </button>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState label="No pending interview or counselling tasks assigned." />
      )}

      {selectedItem && (
        <ReviewModal
          enquiry={selectedItem}
          onClose={() => setSelectedItem(null)}
          onSaved={(msg) => {
            setSelectedItem(null);
            setToast(msg);
            load();
          }}
        />
      )}
      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}

function ReviewModal({ enquiry, onClose, onSaved }) {
  const [remarks, setRemarks] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(action) {
    setBusy(true);
    setError("");
    try {
      const response = await api.post("/teacher/admissions-review/", {
        registration_number: enquiry.registration_number,
        action,
        remarks,
      });
      onSaved(response.data.detail || "Recommendation recorded successfully.");
    } catch (err) {
      setError(err?.response?.data?.detail || "Could not save recommendations.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-card w-full max-w-lg p-6 shadow-raised max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
          <div>
            <p className="font-heading font-semibold text-lg">Interview & Counselling</p>
            <p className="text-xs text-ink-secondary">Applicant: {enquiry.applicant_name}</p>
          </div>
          <button onClick={onClose} className="text-ink-secondary"><X size={18} /></button>
        </div>

        {error && <div className="mb-3 text-sm text-danger bg-red-50 rounded-xl px-3 py-2">{error}</div>}

        <div className="space-y-4 mb-5 text-sm text-ink-primary">
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
            <div>
              <p className="text-xs text-ink-secondary">Registration No</p>
              <p className="font-medium">{enquiry.registration_number}</p>
            </div>
            <div>
              <p className="text-xs text-ink-secondary">Current Stage</p>
              <p className="font-medium">{enquiry.status}</p>
            </div>
            <div>
              <p className="text-xs text-ink-secondary">Target Class</p>
              <p className="font-medium">{enquiry.target_class}</p>
            </div>
            <div>
              <p className="text-xs text-ink-secondary">Date of Birth</p>
              <p className="font-medium">{enquiry.date_of_birth}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-ink-secondary">Parent Details</p>
              <p className="font-medium">{enquiry.parent_name} · {enquiry.parent_phone} · {enquiry.parent_email}</p>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-ink-secondary uppercase">Interview Remarks & Feedback (*)</label>
            <textarea
              required
              rows={4}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Record counseling notes, evaluation observations, or interview comments..."
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus-ring outline-none resize-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
          <button
            disabled={busy || !remarks.trim()}
            onClick={() => submit("recommend_reject")}
            className="w-full bg-rose-50 text-rose-700 border border-rose-200 rounded-xl py-2.5 font-medium hover:bg-rose-100 disabled:opacity-50"
          >
            Recommend Rejection
          </button>
          <button
            disabled={busy || !remarks.trim()}
            onClick={() => submit("recommend_advance")}
            className="w-full bg-academic-blue text-white rounded-xl py-2.5 font-medium hover:bg-academic-blue/90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <UserCheck size={16} /> Recommend Advancement
          </button>
        </div>
      </div>
    </div>
  );
}
