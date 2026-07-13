import { useEffect, useState } from "react";
import api from "../lib/api";
import { Badge, Card, EmptyState, Loader, SectionTitle, Toast } from "../components/Common";
import {
  Award, Trash2, CheckCircle2, XCircle, Clock, Info, Send, Plus, Loader2
} from "lucide-react";
import { isNonEmptyString } from "../../../utils/validation";

export default function Scholarships() {
  const [programs, setPrograms] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [toast, setToast] = useState("");
  
  // Create Program Form
  const [form, setForm] = useState({ name: "", description: "", eligibility: "", coverage_percent: 50 });
  const [submittingProgram, setSubmittingProgram] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  function load() {
    api.get("/cms/scholarships/")
      .then(({ data }) => setPrograms(data || []))
      .catch(() => setPrograms([]));

    // Fetch messages to find pending scholarship application tickets
    setLoadingApps(true);
    api.get("/teacher/messages/")
      .then(({ data }) => {
        // Find messages matching application formats
        const apps = [];
        data.forEach(m => {
          const text = m.message_text || "";
          const isStudentApp = text.startsWith("[Scholarship Application]");
          const isParentApp = text.startsWith("[Parent Scholarship Application]");
          
          if (isStudentApp || isParentApp) {
            // Parse message text
            // E.g.: [Scholarship Application] Program: ... | Coverage: ... | Statement: ... | Academics: ...
            // E.g.: [Parent Scholarship Application] Child: ... | Program: ... | Justification: ... | Academics: ...
            const fields = {};
            text.split("|").forEach(part => {
              const [k, ...v] = part.split(":");
              if (k && v.length) {
                fields[k.trim().toLowerCase().replace("[scholarship application] ", "").replace("[parent scholarship application] ", "")] = v.join(":").trim();
              }
            });

            apps.push({
              id: m.id,
              senderId: m.sender,
              senderName: m.sender_name,
              isParent: isParentApp,
              childName: fields.child || "Student",
              programName: fields.program || "General Grant",
              justification: fields.statement || fields.justification || "None provided",
              academics: fields.academics || "GPA N/A",
              createdAt: new Date(m.created_at).toLocaleDateString(),
              rawText: text
            });
          }
        });
        setApplications(apps);
      })
      .catch(() => setApplications([]))
      .finally(() => setLoadingApps(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAddProgram(e) {
    e.preventDefault();
    
    // Validations
    const errors = {};
    if (!isNonEmptyString(form.name)) {
      errors.name = "Program name is required.";
    }
    if (!isNonEmptyString(form.description)) {
      errors.description = "Program description is required.";
    }
    if (!isNonEmptyString(form.eligibility)) {
      errors.eligibility = "Eligibility criteria details are required.";
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors({});
    setSubmittingProgram(true);

    try {
      await api.post("/cms/scholarships/", form);
      setToast("Scholarship program created successfully.");
      setForm({ name: "", description: "", eligibility: "", coverage_percent: 50 });
      load();
    } catch (err) {
      setToast("Failed to create scholarship program.");
    } finally {
      setSubmittingProgram(false);
    }
  }

  async function handleDeleteProgram(id) {
    if (!window.confirm("Are you sure you want to delete this scholarship program?")) return;
    try {
      await api.delete(`/cms/scholarships/?id=${id}`);
      setToast("Scholarship program deleted.");
      load();
    } catch (err) {
      setToast("Failed to delete program.");
    }
  }

  async function handleDecideApplication(app, status) {
    try {
      const decisionMsg = `[Scholarship Decision] Program: ${app.programName} | Status: ${status} | Evaluated by: Registrar Admin`;
      
      // Reply back to sender with decision message
      await api.post("/teacher/messages/", {
        receiver: app.senderId,
        message_text: decisionMsg
      });

      setToast(`Application ${status.toLowerCase()} successfully.`);
      
      // Remove from the visual queue
      setApplications(applications.filter(a => a.id !== app.id));
    } catch (err) {
      setToast("Failed to process decision request.");
    }
  }

  return (
    <div className="space-y-6">
      
      {/* Create Program Box */}
      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* Creation Column */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <SectionTitle>New Scholarship Program</SectionTitle>
            <form onSubmit={handleAddProgram} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 block">Program Name:</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="E.g., STEM Excellence Grant"
                  className={`w-full rounded-xl border px-3 py-2 text-xs focus-ring outline-none ${
                    validationErrors.name ? "border-danger" : "border-slate-200"
                  }`}
                />
                {validationErrors.name && (
                  <p className="text-[10px] text-danger font-semibold">{validationErrors.name}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 block">Description:</label>
                <textarea
                  rows={3}
                  required
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe program objectives and details..."
                  className={`w-full rounded-xl border px-3 py-2 text-xs focus-ring outline-none resize-none ${
                    validationErrors.description ? "border-danger" : "border-slate-200"
                  }`}
                />
                {validationErrors.description && (
                  <p className="text-[10px] text-danger font-semibold">{validationErrors.description}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 block">Eligibility Criteria:</label>
                <input
                  type="text"
                  required
                  value={form.eligibility}
                  onChange={(e) => setForm({ ...form, eligibility: e.target.value })}
                  placeholder="E.g., GPA > 9.0 or family income threshold"
                  className={`w-full rounded-xl border px-3 py-2 text-xs focus-ring outline-none ${
                    validationErrors.eligibility ? "border-danger" : "border-slate-200"
                  }`}
                />
                {validationErrors.eligibility && (
                  <p className="text-[10px] text-danger font-semibold">{validationErrors.eligibility}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 block">Coverage Waiver %:</label>
                <select
                  value={form.coverage_percent}
                  onChange={(e) => setForm({ ...form, coverage_percent: Number(e.target.value) })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus-ring outline-none cursor-pointer"
                >
                  {[25, 40, 50, 75, 100].map(pct => (
                    <option key={pct} value={pct}>{pct}% Waiver</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={submittingProgram}
                className="w-full flex items-center justify-center gap-1.5 bg-bg-dark hover:bg-bg-dark/90 disabled:opacity-60 text-white rounded-xl py-2.5 text-xs font-bold shadow-sm transition-all"
              >
                {submittingProgram ? (
                  <>
                    <Loader2 size={12} className="animate-spin" /> Creating program...
                  </>
                ) : (
                  <>
                    <Plus size={12} /> Add Program
                  </>
                )}
              </button>
            </form>
          </Card>
        </div>

        {/* Existing Programs list */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <SectionTitle>Active Institutional Scholarship Schemes</SectionTitle>
            {!programs ? (
              <Loader rows={4} />
            ) : programs.length === 0 ? (
              <EmptyState label="No scholarship programs registered." />
            ) : (
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
                    <button
                      onClick={() => handleDeleteProgram(p.id)}
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

          {/* Scholarship Application queue */}
          <Card>
            <SectionTitle>Pending Applications Queue</SectionTitle>
            {loadingApps ? (
              <Loader rows={3} />
            ) : applications.length === 0 ? (
              <EmptyState label="No pending scholarship requests to evaluate." />
            ) : (
              <div className="space-y-4 divide-y divide-slate-100">
                {applications.map((app) => (
                  <div key={app.id} className="pt-4 first:pt-0 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                        <span className="font-bold text-ink-primary">
                          {app.isParent ? `Parent of ${app.childName}` : app.senderName}
                        </span>
                        <span className="text-slate-400">({app.createdAt})</span>
                        <Badge tone={app.isParent ? "gold" : "blue"}>
                          {app.isParent ? "Parent Submission" : "Student Submission"}
                        </Badge>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/50 space-y-1.5 text-xs">
                        <p>Program: <strong className="text-ink-primary">{app.programName}</strong></p>
                        <p>Qualifications: <strong className="text-ink-primary">{app.academics}</strong></p>
                        <p className="text-ink-secondary leading-relaxed italic mt-1">"{app.justification}"</p>
                      </div>
                    </div>

                    <div className="flex sm:flex-col gap-2 shrink-0 self-end sm:self-auto">
                      <button
                        onClick={() => handleDecideApplication(app, "Approved")}
                        className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-3 py-1.5 text-xs font-bold shadow-sm transition-colors"
                      >
                        <CheckCircle2 size={12} /> Approve
                      </button>
                      <button
                        onClick={() => handleDecideApplication(app, "Rejected")}
                        className="flex items-center justify-center gap-1.5 bg-danger hover:bg-danger/90 text-white rounded-lg px-3 py-1.5 text-xs font-bold shadow-sm transition-colors"
                      >
                        <XCircle size={12} /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

      </div>

      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}
