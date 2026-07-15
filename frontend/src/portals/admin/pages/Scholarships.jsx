import { useEffect, useState } from "react";
import api from "../lib/api";
import { Badge, Card, EmptyState, Loader, SectionTitle, Toast } from "../components/Common";
import {
  Award, Trash2, CheckCircle2, XCircle, Clock, Info, Send, Plus, Loader2,
  ShieldCheck, RefreshCw, BarChart3, Users, FileCheck, AlertTriangle
} from "lucide-react";
import { isNonEmptyString } from "../../../utils/validation";

const STATUS_CONFIG = {
  Pending:  { tone: "gold",  icon: Clock,        label: "Pending Review" },
  Verified: { tone: "blue",  icon: ShieldCheck,   label: "Verified" },
  Approved: { tone: "green", icon: CheckCircle2,  label: "Approved" },
  Rejected: { tone: "red",   icon: XCircle,       label: "Rejected" },
};

export default function Scholarships() {
  const [tab, setTab] = useState("schemes");
  const [programs, setPrograms] = useState(null);
  const [applications, setApplications] = useState(null);
  const [renewals, setRenewals] = useState(null);
  const [toast, setToast] = useState("");

  // Create Program Form
  const [form, setForm] = useState({ name: "", description: "", eligibility: "", coverage_percent: 50 });
  const [submittingProgram, setSubmittingProgram] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [actionLoading, setActionLoading] = useState(null);

  function loadSchemes() {
    api.get("/cms/scholarships/")
      .then(({ data }) => setPrograms(data || []))
      .catch(() => setPrograms([]));
  }

  function loadApplications() {
    api.get("/admin-portal/scholarships/")
      .then(({ data }) => setApplications(data || []))
      .catch(() => setApplications([]));
  }

  function loadRenewals() {
    api.get("/admin-portal/scholarships/renew/")
      .then(({ data }) => setRenewals(data || []))
      .catch(() => setRenewals([]));
  }

  useEffect(() => {
    loadSchemes();
    loadApplications();
    loadRenewals();
  }, []);

  async function handleAddProgram(e) {
    e.preventDefault();
    const errors = {};
    if (!isNonEmptyString(form.name)) errors.name = "Program name is required.";
    if (!isNonEmptyString(form.description)) errors.description = "Program description is required.";
    if (!isNonEmptyString(form.eligibility)) errors.eligibility = "Eligibility criteria details are required.";
    if (Object.keys(errors).length > 0) { setValidationErrors(errors); return; }

    setValidationErrors({});
    setSubmittingProgram(true);
    try {
      await api.post("/cms/scholarships/", form);
      setToast("Scholarship program created successfully.");
      setForm({ name: "", description: "", eligibility: "", coverage_percent: 50 });
      loadSchemes();
    } catch { setToast("Failed to create scholarship program."); }
    finally { setSubmittingProgram(false); }
  }

  async function handleDeleteProgram(id) {
    if (!window.confirm("Are you sure you want to delete this scholarship program?")) return;
    try {
      await api.delete(`/cms/scholarships/?id=${id}`);
      setToast("Scholarship program deleted.");
      loadSchemes();
    } catch { setToast("Failed to delete program."); }
  }

  async function handleApplicationAction(app, action, reason = "") {
    setActionLoading(app.id);
    try {
      await api.post("/admin-portal/scholarships/", { id: app.id, action, rejection_reason: reason });
      setToast(`Application ${action.toLowerCase()}${action === "Verify" ? "d" : "ed"} successfully.`);
      loadApplications();
    } catch { setToast("Failed to process action."); }
    finally { setActionLoading(null); }
  }

  async function handleRenewalAction(renewal, action) {
    setActionLoading(`r-${renewal.id}`);
    try {
      await api.patch("/admin-portal/scholarships/renew/", { id: renewal.id, action });
      setToast(`Renewal ${action.toLowerCase()}d successfully.`);
      loadRenewals();
    } catch { setToast("Failed to process renewal action."); }
    finally { setActionLoading(null); }
  }

  // Analytics
  const stats = applications ? {
    total: applications.length,
    pending: applications.filter(a => a.status === "Pending").length,
    verified: applications.filter(a => a.status === "Verified").length,
    approved: applications.filter(a => a.status === "Approved").length,
    rejected: applications.filter(a => a.status === "Rejected").length,
  } : null;

  const tabs = [
    { id: "schemes", label: "Schemes", icon: Award },
    { id: "applications", label: "Applications", icon: FileCheck, count: stats?.pending + stats?.verified },
    { id: "renewals", label: "Renewals", icon: RefreshCw, count: renewals?.filter(r => r.status === "Pending").length },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
  ];

  return (
    <div className="space-y-6">
      {/* Tab Bar */}
      <div className="flex items-center gap-1 bg-slate-50 rounded-xl p-1 border border-slate-100">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              tab === t.id
                ? "bg-white text-ink-primary shadow-sm"
                : "text-ink-secondary hover:text-ink-primary"
            }`}
          >
            <t.icon size={13} />
            {t.label}
            {t.count > 0 && (
              <span className="bg-danger text-white text-[9px] font-bold rounded-full px-1.5 py-0.5 min-w-[16px] text-center">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ─── SCHEMES TAB ─── */}
      {tab === "schemes" && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card className="h-full">
              <SectionTitle>New Scholarship Program</SectionTitle>
              <form onSubmit={handleAddProgram} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 block">Program Name:</label>
                  <input type="text" required value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="E.g., STEM Excellence Grant"
                    className={`w-full rounded-xl border px-3 py-2 text-xs focus-ring outline-none ${validationErrors.name ? "border-danger" : "border-slate-200"}`}
                  />
                  {validationErrors.name && <p className="text-[10px] text-danger font-semibold">{validationErrors.name}</p>}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 block">Description:</label>
                  <textarea rows={3} required value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Describe program objectives and details..."
                    className={`w-full rounded-xl border px-3 py-2 text-xs focus-ring outline-none resize-none ${validationErrors.description ? "border-danger" : "border-slate-200"}`}
                  />
                  {validationErrors.description && <p className="text-[10px] text-danger font-semibold">{validationErrors.description}</p>}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 block">Eligibility Criteria:</label>
                  <input type="text" required value={form.eligibility}
                    onChange={(e) => setForm({ ...form, eligibility: e.target.value })}
                    placeholder="E.g., GPA > 9.0 or family income threshold"
                    className={`w-full rounded-xl border px-3 py-2 text-xs focus-ring outline-none ${validationErrors.eligibility ? "border-danger" : "border-slate-200"}`}
                  />
                  {validationErrors.eligibility && <p className="text-[10px] text-danger font-semibold">{validationErrors.eligibility}</p>}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 block">Coverage Waiver %:</label>
                  <select value={form.coverage_percent}
                    onChange={(e) => setForm({ ...form, coverage_percent: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus-ring outline-none cursor-pointer"
                  >
                    {[25, 40, 50, 75, 100].map(pct => (
                      <option key={pct} value={pct}>{pct}% Waiver</option>
                    ))}
                  </select>
                </div>
                <button type="submit" disabled={submittingProgram}
                  className="w-full flex items-center justify-center gap-1.5 bg-bg-dark hover:bg-bg-dark/90 disabled:opacity-60 text-white rounded-xl py-2.5 text-xs font-bold shadow-sm transition-all"
                >
                  {submittingProgram ? <><Loader2 size={12} className="animate-spin" /> Creating program...</> : <><Plus size={12} /> Add Program</>}
                </button>
              </form>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card>
              <SectionTitle>Active Institutional Scholarship Schemes</SectionTitle>
              {!programs ? <Loader rows={4} /> : programs.length === 0 ? <EmptyState label="No scholarship programs registered." /> : (
                <div className="space-y-4">
                  {programs.map((p) => (
                    <div key={p.id} className="border border-slate-100 rounded-xl p-4 flex justify-between items-start gap-4">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-heading font-bold text-sm text-ink-primary">{p.name}</h4>
                          <Badge tone="green">{p.coverage_percent}% Waiver</Badge>
                        </div>
                        <p className="text-xs text-ink-secondary leading-relaxed">{p.description}</p>
                        <div className="flex items-start gap-1 text-[11px] text-slate-500">
                          <Info size={12} className="shrink-0 mt-0.5 text-academic-blue" />
                          <span><strong>Eligibility:</strong> {p.eligibility}</span>
                        </div>
                      </div>
                      <button onClick={() => handleDeleteProgram(p.id)}
                        className="text-slate-400 hover:text-danger p-1 rounded-lg hover:bg-slate-50 transition-colors"
                        title="Delete Scholarship Program"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* ─── APPLICATIONS TAB ─── */}
      {tab === "applications" && (
        <Card>
          <SectionTitle>Scholarship Application Verification Queue</SectionTitle>
          {!applications ? <Loader rows={5} /> : applications.length === 0 ? (
            <EmptyState label="No scholarship applications received yet." />
          ) : (
            <div className="space-y-4">
              {applications.map(app => {
                const cfg = STATUS_CONFIG[app.status] || STATUS_CONFIG.Pending;
                const StatusIcon = cfg.icon;
                const isProcessing = actionLoading === app.id;

                return (
                  <div key={app.id} className="border border-slate-100 rounded-xl p-5 space-y-4">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-heading font-bold text-sm text-ink-primary">{app.student_name || "Student"}</h4>
                          {app.admission_number && <span className="text-[10px] text-slate-400 font-mono">#{app.admission_number}</span>}
                        </div>
                        <p className="text-xs text-ink-secondary">
                          Applied for <strong className="text-ink-primary">{app.scheme_name}</strong>
                          {app.class_name && <> · Class {app.class_name}</>}
                        </p>
                      </div>
                      <Badge tone={cfg.tone}>
                        <StatusIcon size={11} className="mr-1" />{cfg.label}
                      </Badge>
                    </div>

                    {/* Verification Checklist */}
                    <div className="grid sm:grid-cols-3 gap-3">
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100/50 text-center">
                        <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Academic GPA</p>
                        <p className="text-lg font-heading font-bold text-ink-primary">{parseFloat(app.academic_gpa || 0).toFixed(2)}</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100/50 text-center">
                        <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Attendance</p>
                        <p className="text-lg font-heading font-bold text-ink-primary">{parseFloat(app.attendance_percentage || 0).toFixed(1)}%</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100/50 text-center">
                        <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Fee Waiver</p>
                        <p className="text-lg font-heading font-bold text-emerald-600">{app.coverage_percent}%</p>
                      </div>
                    </div>

                    {/* Documents */}
                    <div className="flex flex-wrap gap-2 text-[11px]">
                      {app.income_certificate_url && (
                        <a href={app.income_certificate_url} target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg px-2.5 py-1 hover:bg-blue-100 transition-colors"
                        >📄 Income Certificate</a>
                      )}
                      {app.other_certificate_url && (
                        <a href={app.other_certificate_url} target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg px-2.5 py-1 hover:bg-purple-100 transition-colors"
                        >📎 Supporting Document</a>
                      )}
                      {!app.income_certificate_url && !app.other_certificate_url && (
                        <span className="inline-flex items-center gap-1 text-slate-400 italic">
                          <AlertTriangle size={11} /> No documents uploaded
                        </span>
                      )}
                    </div>

                    {/* Rejection reason */}
                    {app.status === "Rejected" && app.rejection_reason && (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">
                        <strong>Rejection Reason:</strong> {app.rejection_reason}
                      </div>
                    )}

                    {/* Action Buttons */}
                    {(app.status === "Pending" || app.status === "Verified") && (
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                        {app.status === "Pending" && (
                          <button onClick={() => handleApplicationAction(app, "Verify")} disabled={isProcessing}
                            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg px-3 py-1.5 text-xs font-bold shadow-sm transition-colors"
                          >
                            {isProcessing ? <Loader2 size={11} className="animate-spin" /> : <ShieldCheck size={11} />} Mark Verified
                          </button>
                        )}
                        <button onClick={() => handleApplicationAction(app, "Approve")} disabled={isProcessing}
                          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-lg px-3 py-1.5 text-xs font-bold shadow-sm transition-colors"
                        >
                          {isProcessing ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />} Approve & Apply Fee Waiver
                        </button>
                        <button
                          onClick={() => {
                            const reason = window.prompt("Please provide a reason for rejection:");
                            if (reason !== null) handleApplicationAction(app, "Reject", reason);
                          }}
                          disabled={isProcessing}
                          className="flex items-center gap-1.5 bg-danger hover:bg-danger/90 disabled:opacity-60 text-white rounded-lg px-3 py-1.5 text-xs font-bold shadow-sm transition-colors"
                        >
                          <XCircle size={11} /> Reject
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* ─── RENEWALS TAB ─── */}
      {tab === "renewals" && (
        <Card>
          <SectionTitle>Scholarship Renewal Requests</SectionTitle>
          {!renewals ? <Loader rows={4} /> : renewals.length === 0 ? (
            <EmptyState label="No renewal requests submitted yet." />
          ) : (
            <div className="space-y-4">
              {renewals.map(r => {
                const isProcessing = actionLoading === `r-${r.id}`;
                return (
                  <div key={r.id} className="border border-slate-100 rounded-xl p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-heading font-bold text-sm text-ink-primary">{r.student_name}</h4>
                        <p className="text-xs text-ink-secondary">Scheme: <strong>{r.scheme_name}</strong></p>
                      </div>
                      <Badge tone={r.status === "Approved" ? "green" : r.status === "Rejected" ? "red" : "gold"}>
                        {r.status}
                      </Badge>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100/50 text-center">
                        <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Updated GPA</p>
                        <p className="text-lg font-heading font-bold text-ink-primary">{parseFloat(r.academic_gpa || 0).toFixed(2)}</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100/50 text-center">
                        <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Attendance</p>
                        <p className="text-lg font-heading font-bold text-ink-primary">{parseFloat(r.attendance_percentage || 0).toFixed(1)}%</p>
                      </div>
                    </div>
                    {r.status === "Pending" && (
                      <div className="flex gap-2 pt-2 border-t border-slate-100">
                        <button onClick={() => handleRenewalAction(r, "Approve")} disabled={isProcessing}
                          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-lg px-3 py-1.5 text-xs font-bold shadow-sm transition-colors"
                        >
                          {isProcessing ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />} Approve Renewal
                        </button>
                        <button onClick={() => handleRenewalAction(r, "Reject")} disabled={isProcessing}
                          className="flex items-center gap-1.5 bg-danger hover:bg-danger/90 disabled:opacity-60 text-white rounded-lg px-3 py-1.5 text-xs font-bold shadow-sm transition-colors"
                        >
                          <XCircle size={11} /> Reject
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* ─── ANALYTICS TAB ─── */}
      {tab === "analytics" && (
        <div className="space-y-6">
          {stats ? (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                  { label: "Total Applications", val: stats.total, color: "bg-slate-100 text-slate-700" },
                  { label: "Pending", val: stats.pending, color: "bg-amber-50 text-amber-700" },
                  { label: "Verified", val: stats.verified, color: "bg-blue-50 text-blue-700" },
                  { label: "Approved", val: stats.approved, color: "bg-emerald-50 text-emerald-700" },
                  { label: "Rejected", val: stats.rejected, color: "bg-red-50 text-red-700" },
                ].map((s, i) => (
                  <Card key={i} className={`${s.color} border-0 text-center`}>
                    <p className="text-[10px] font-bold uppercase opacity-70 mb-1">{s.label}</p>
                    <p className="text-2xl font-heading font-bold">{s.val}</p>
                  </Card>
                ))}
              </div>

              <Card>
                <SectionTitle>Beneficiary Distribution</SectionTitle>
                {stats.total === 0 ? <EmptyState label="No data to display yet." /> : (
                  <div className="space-y-3 mt-4">
                    {["Approved", "Verified", "Pending", "Rejected"].map(status => {
                      const count = stats[status.toLowerCase()];
                      const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                      const cfg = STATUS_CONFIG[status];
                      return (
                        <div key={status}>
                          <div className="flex justify-between items-center text-xs mb-1">
                            <span className="font-bold text-ink-primary">{status}</span>
                            <span className="text-ink-secondary">{count} ({pct}%)</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2.5">
                            <div
                              className={`h-2.5 rounded-full transition-all ${
                                status === "Approved" ? "bg-emerald-500" :
                                status === "Verified" ? "bg-blue-500" :
                                status === "Pending" ? "bg-amber-400" : "bg-red-400"
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </>
          ) : <Loader rows={4} />}
        </div>
      )}

      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}
