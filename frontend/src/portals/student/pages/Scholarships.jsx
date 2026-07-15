import { Award, CheckCircle2, ChevronRight, FileText, Info, Loader2, Send, Clock, ShieldCheck, XCircle, RefreshCw, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { Card, EmptyState, Loader, Toast, Badge, SectionTitle } from "../components/Common";
import api from "../lib/api";

const STATUS_CONFIG = {
  Pending:  { tone: "gold",  icon: Clock,        label: "Under Review" },
  Verified: { tone: "blue",  icon: ShieldCheck,   label: "Verified" },
  Approved: { tone: "green", icon: CheckCircle2,  label: "Approved" },
  Rejected: { tone: "red",   icon: XCircle,       label: "Rejected" },
};

export default function Scholarships() {
  const [data, setData] = useState(null);
  const [renewals, setRenewals] = useState(null);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [renewalApp, setRenewalApp] = useState(null);
  const [toast, setToast] = useState("");
  
  // Application Form states
  const [form, setForm] = useState({ academic_gpa: "", attendance_percentage: "", income_certificate_url: "", other_certificate_url: "" });
  const [submitting, setSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  // Renewal Form states
  const [renewForm, setRenewForm] = useState({ academic_gpa: "", attendance_percentage: "", documents_url: "" });
  const [renewSubmitting, setRenewSubmitting] = useState(false);

  function load() {
    api.get("/student/scholarships/")
      .then(({ data }) => setData(data || { schemes: [], applications: [] }))
      .catch(() => setData({ schemes: [], applications: [] }));
    
    api.get("/student/scholarships/renew/")
      .then(({ data }) => setRenewals(data || []))
      .catch(() => setRenewals([]));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleApply(e) {
    e.preventDefault();
    
    const errors = {};
    if (!form.academic_gpa || isNaN(form.academic_gpa)) errors.gpa = "Valid GPA is required.";
    if (!form.attendance_percentage || isNaN(form.attendance_percentage)) errors.attendance = "Valid attendance % is required.";
    if (Object.keys(errors).length > 0) { setValidationErrors(errors); return; }

    setValidationErrors({});
    setSubmitting(true);

    try {
      await api.post("/student/scholarships/", {
        scheme_id: selectedProgram.id,
        academic_gpa: Number(form.academic_gpa),
        attendance_percentage: Number(form.attendance_percentage),
        income_certificate_url: form.income_certificate_url,
        other_certificate_url: form.other_certificate_url
      });
      setToast("Scholarship application submitted successfully!");
      setForm({ academic_gpa: "", attendance_percentage: "", income_certificate_url: "", other_certificate_url: "" });
      setSelectedProgram(null);
      load();
    } catch (err) {
      setToast(err.response?.data?.detail || "Failed to submit application.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRenew(e) {
    e.preventDefault();
    setRenewSubmitting(true);
    try {
      await api.post("/student/scholarships/renew/", {
        application_id: renewalApp.id,
        academic_gpa: Number(renewForm.academic_gpa),
        attendance_percentage: Number(renewForm.attendance_percentage),
        documents_url: renewForm.documents_url
      });
      setToast("Renewal request submitted successfully!");
      setRenewForm({ academic_gpa: "", attendance_percentage: "", documents_url: "" });
      setRenewalApp(null);
      load();
    } catch (err) {
      setToast(err.response?.data?.detail || "Failed to submit renewal request.");
    } finally {
      setRenewSubmitting(false);
    }
  }

  if (!data) return <Loader rows={5} />;

  const { schemes, applications } = data;

  return (
    <div className="space-y-6">
      
      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* Main Programs Column */}
        <div className="lg:col-span-2 space-y-4">
          <SectionTitle>Available Scholarship Programs</SectionTitle>
          
          {!schemes.length ? (
            <EmptyState label="No scholarship schemes active right now." />
          ) : (
            <div className="space-y-4">
              {schemes.map((p) => {
                const hasApplied = applications.some(a => a.scheme_id === p.id);
                return (
                  <Card 
                    key={p.id}
                    className={`border border-slate-100 transition-all p-5 ${
                      selectedProgram?.id === p.id ? "ring-2 ring-academic-blue/30 bg-blue-50/5" : "hover:border-academic-blue/40 hover:shadow-raised"
                    } ${hasApplied ? "opacity-75 bg-slate-50" : ""}`}
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <h4 className="font-heading font-bold text-base text-ink-primary">{p.name}</h4>
                          {hasApplied && <Badge tone="gold">Applied</Badge>}
                        </div>
                        <p className="text-xs text-ink-secondary leading-relaxed">{p.description}</p>
                      </div>
                      <span className="shrink-0 inline-flex items-center text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-3 py-1">
                        {p.coverage_percent}% Waiver
                      </span>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-start gap-1.5 text-slate-500 max-w-md">
                        <Info size={14} className="shrink-0 mt-0.5 text-academic-blue" />
                        <span><strong>Eligibility:</strong> {p.eligibility}</span>
                      </div>
                      
                      {!hasApplied && (
                        <button
                          onClick={() => {
                            setSelectedProgram(p);
                            setRenewalApp(null);
                            setValidationErrors({});
                          }}
                          className="shrink-0 flex items-center justify-center gap-1.5 bg-academic-blue text-white font-semibold rounded-xl px-4 py-2 hover:bg-academic-blue/90 shadow-sm transition-colors text-xs self-end sm:self-auto"
                        >
                          Apply Now <ChevronRight size={14} />
                        </button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* RENEWALS LIST */}
          {renewals && renewals.length > 0 && (
            <div className="pt-6">
              <SectionTitle>Renewal History</SectionTitle>
              <div className="space-y-3">
                {renewals.map(r => (
                  <div key={r.id} className="p-4 bg-white rounded-xl border border-slate-200 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-bold text-ink-primary">{r.scheme_name} (Renewal)</p>
                      <p className="text-xs text-slate-500 mt-1">Submitted: {new Date(r.submitted_at).toLocaleDateString()} · GPA: {r.academic_gpa}</p>
                    </div>
                    <Badge tone={r.status === "Approved" ? "green" : r.status === "Rejected" ? "red" : "gold"}>{r.status}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tracking & Applications Sidebar */}
        <div className="space-y-6">
          
          {/* Active Application Modal/Box */}
          {selectedProgram ? (
            <Card className="border border-academic-blue animate-[fadeIn_.2s_ease]">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 mb-4">
                <p className="font-heading font-bold text-sm text-ink-primary">Apply: {selectedProgram.name}</p>
                <button onClick={() => setSelectedProgram(null)} className="text-xs text-ink-secondary hover:text-ink-primary font-semibold">Cancel</button>
              </div>

              <form onSubmit={handleApply} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 block">Current GPA / %:</label>
                    <input type="number" step="0.01" required value={form.academic_gpa}
                      onChange={(e) => setForm({ ...form, academic_gpa: e.target.value })}
                      placeholder="e.g. 9.4"
                      className={`w-full rounded-xl border px-3 py-2 text-xs focus-ring outline-none ${validationErrors.gpa ? "border-danger" : "border-slate-200"}`}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 block">Attendance %:</label>
                    <input type="number" step="0.01" required value={form.attendance_percentage}
                      onChange={(e) => setForm({ ...form, attendance_percentage: e.target.value })}
                      placeholder="e.g. 95"
                      className={`w-full rounded-xl border px-3 py-2 text-xs focus-ring outline-none ${validationErrors.attendance ? "border-danger" : "border-slate-200"}`}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 block">Income Certificate URL (Optional):</label>
                  <input type="url" value={form.income_certificate_url}
                    onChange={(e) => setForm({ ...form, income_certificate_url: e.target.value })}
                    placeholder="https://... (Link to doc)"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus-ring outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 block">Other Documents URL (Optional):</label>
                  <input type="url" value={form.other_certificate_url}
                    onChange={(e) => setForm({ ...form, other_certificate_url: e.target.value })}
                    placeholder="https://... (Sports, Medical, etc.)"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus-ring outline-none"
                  />
                </div>

                <button type="submit" disabled={submitting}
                  className="w-full flex items-center justify-center gap-1.5 bg-academic-blue hover:bg-academic-blue/90 disabled:opacity-60 text-white rounded-xl py-2.5 text-xs font-bold shadow-sm transition-all"
                >
                  {submitting ? <><Loader2 size={14} className="animate-spin" /> Submitting...</> : <><Send size={14} /> Submit Application</>}
                </button>
              </form>
            </Card>
          ) : renewalApp ? (
            <Card className="border border-purple-500 animate-[fadeIn_.2s_ease]">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 mb-4">
                <p className="font-heading font-bold text-sm text-ink-primary">Renew: {renewalApp.scheme_name}</p>
                <button onClick={() => setRenewalApp(null)} className="text-xs text-ink-secondary hover:text-ink-primary font-semibold">Cancel</button>
              </div>

              <form onSubmit={handleRenew} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 block">Current GPA:</label>
                    <input type="number" step="0.01" required value={renewForm.academic_gpa}
                      onChange={(e) => setRenewForm({ ...renewForm, academic_gpa: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus-ring outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 block">Attendance %:</label>
                    <input type="number" step="0.01" required value={renewForm.attendance_percentage}
                      onChange={(e) => setRenewForm({ ...renewForm, attendance_percentage: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus-ring outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 block">Documents URL (Optional):</label>
                  <input type="url" value={renewForm.documents_url}
                    onChange={(e) => setRenewForm({ ...renewForm, documents_url: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus-ring outline-none"
                  />
                </div>
                <button type="submit" disabled={renewSubmitting}
                  className="w-full flex items-center justify-center gap-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white rounded-xl py-2.5 text-xs font-bold shadow-sm transition-all"
                >
                  {renewSubmitting ? <><Loader2 size={14} className="animate-spin" /> Submitting...</> : <><RefreshCw size={14} /> Request Renewal</>}
                </button>
              </form>
            </Card>
          ) : (
            <Card className="bg-slate-50 border border-dashed border-slate-200 p-6 text-center text-slate-400">
              <Award size={28} className="mx-auto mb-2 opacity-55 text-academic-blue" />
              <p className="text-xs leading-relaxed">Select a scholarship program from the list to begin your application form submission.</p>
            </Card>
          )}

          {/* Submitted Applications log */}
          <Card>
            <h4 className="font-heading font-semibold text-ink-primary text-sm mb-3">My Applications</h4>
            
            {!applications.length ? (
              <p className="text-xs text-ink-secondary italic text-center py-2">No applications submitted yet.</p>
            ) : (
              <div className="space-y-3.5">
                {applications.map((app) => {
                  const cfg = STATUS_CONFIG[app.status] || STATUS_CONFIG.Pending;
                  const StatusIcon = cfg.icon;
                  const hasPendingRenewal = renewals?.some(r => r.application_id === app.id && r.status === "Pending");

                  return (
                    <div key={app.id} className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <p className="text-sm font-bold text-ink-primary line-clamp-1">{app.scheme_name}</p>
                          <span className="text-[10px] text-slate-400 font-medium">Applied: {new Date(app.applied_at).toLocaleDateString()}</span>
                        </div>
                        <Badge tone={cfg.tone}><StatusIcon size={10} className="mr-1" />{app.status}</Badge>
                      </div>
                      
                      <div className="bg-slate-50 p-2 rounded-lg text-[10px] flex justify-around border border-slate-100">
                        <span className="text-slate-500">GPA: <strong className="text-ink-primary">{app.academic_gpa}</strong></span>
                        <span className="text-slate-500">Att: <strong className="text-ink-primary">{app.attendance_percentage}%</strong></span>
                        <span className="text-emerald-600 font-bold">{app.coverage_percent}% Waiver</span>
                      </div>

                      {app.status === "Rejected" && app.rejection_reason && (
                        <div className="text-[10px] text-red-600 bg-red-50 p-2 rounded border border-red-100">
                          <strong>Reason:</strong> {app.rejection_reason}
                        </div>
                      )}

                      {app.status === "Approved" && (
                        <button
                          onClick={() => {
                            setSelectedProgram(null);
                            setRenewalApp(app);
                          }}
                          disabled={hasPendingRenewal}
                          className="mt-1 flex items-center justify-center gap-1 bg-purple-50 text-purple-700 hover:bg-purple-100 disabled:opacity-50 border border-purple-200 rounded-lg py-1.5 px-3 text-xs font-bold transition-colors w-full"
                        >
                          <RefreshCw size={12} /> {hasPendingRenewal ? "Renewal Pending" : "Request Renewal"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
          
        </div>
      </div>

      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}
