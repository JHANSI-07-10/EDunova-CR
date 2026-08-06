import { useEffect, useState, useCallback } from "react";
import api from "../lib/api";
import { isNonEmptyString, isValidEmail, isValidPhone, isTextOnly, isExact10Digits, isGmail } from "../../../utils/validation";
import { Badge, Card, EmptyState, Loader, Toast } from "../components/Common";
import {
  Plus, X, UserPlus, ChevronDown, ChevronRight, Search,
  FileText, CheckCircle2, XCircle, Clock, Users, Calendar,
  CreditCard, GraduationCap, Bus, Home, BookOpen, Bell,
  BarChart3, Filter, Eye, ArrowRight, ShieldCheck, AlertTriangle,
  Upload, Trash2, Download,
} from "lucide-react";

const STATUS_TONES = {
  Enquiry: "slate",
  Registered: "blue",
  Counselling_Pending: "gold",
  Counselling_Done: "gold",
  Verification: "blue",
  Eligibility_Check: "blue",
  Screening: "gold",
  Interview_Pending: "orange",
  Interview_Done: "orange",
  Seat_Available: "green",
  Seat_Waitlisted: "gold",
  Fee_Pending: "orange",
  Approved: "green",
  Confirmed: "green",
  Rejected: "red",
  Withdrawn: "red",
};

const STATUS_LABELS = {
  Enquiry: "Enquiry",
  Registered: "Registered",
  Counselling_Pending: "Counselling Pending",
  Counselling_Done: "Counselling Done",
  Verification: "Verification",
  Eligibility_Check: "Eligibility Check",
  Screening: "Screening",
  Interview_Pending: "Interview Pending",
  Interview_Done: "Interview Done",
  Seat_Available: "Seat Available",
  Seat_Waitlisted: "Waitlisted",
  Fee_Pending: "Fee Pending",
  Approved: "Approved",
  Confirmed: "Confirmed",
  Rejected: "Rejected",
  Withdrawn: "Withdrawn",
};

const WORKFLOW_STEPS = [
  { status: "Enquiry", label: "Enquiry" },
  { status: "Registered", label: "Registered" },
  { status: "Counselling_Done", label: "Counselling" },
  { status: "Verification", label: "Verification" },
  { status: "Eligibility_Check", label: "Eligibility" },
  { status: "Screening", label: "Screening" },
  { status: "Interview_Done", label: "Interview" },
  { status: "Seat_Available", label: "Seat" },
  { status: "Fee_Pending", label: "Fee" },
  { status: "Approved", label: "Approved" },
  { status: "Confirmed", label: "Confirmed" },
];

const getWorkflowIndex = (status) => {
  if (status === "Rejected" || status === "Withdrawn") return -1;
  const idx = WORKFLOW_STEPS.findIndex((s) => s.status === status);
  return idx >= 0 ? idx : WORKFLOW_STEPS.findIndex((s) => s.status === "Registered");
};

export default function Admissions() {
  const [items, setItems] = useState(null);
  const [busy, setBusy] = useState(null);
  const [toast, setToast] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [detail, setDetail] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [activeTab, setActiveTab] = useState("pipeline");

  function load() {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (search) params.set("search", search);
    api.get(`/admin-portal/admissions/enquiries/?${params}`).then(({ data }) => setItems(data)).catch(() => setItems([]));
  }

  useEffect(() => { load(); }, [statusFilter, search]);

  const loadDetail = useCallback(async (regNo) => {
    try {
      const { data } = await api.get(`/admin-portal/admissions/${regNo}/application/`);
      setDetail(data);
    } catch {
      setToast("Could not load application details.");
    }
  }, []);

  async function advance(regNo) {
    setBusy(regNo);
    try {
      const { data } = await api.post(`/admin-portal/admissions/${regNo}/action/`, { action: "advance" });
      if (data.credentials) setToast(`Confirmed! Student: ${data.credentials.student_username}`);
      else setToast(`Advanced to ${data.status}.`);
      load();
    } catch (e) {
      setToast(e?.response?.data?.detail || "Could not advance.");
    } finally { setBusy(null); }
  }

  async function reject(regNo) {
    const reason = window.prompt("Reason for rejection:");
    if (reason === null) return;
    setBusy(regNo);
    try {
      await api.post(`/admin-portal/admissions/${regNo}/action/`, { action: "reject", reason });
      setToast("Application rejected.");
      load();
    } catch { setToast("Could not reject."); } finally { setBusy(null); }
  }

  if (!items) return <Loader rows={5} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h2 className="font-heading font-semibold text-lg">Admission Workflow</h2>
          <p className="text-xs text-ink-secondary">Complete 18-phase admission pipeline management.</p>
        </div>
        <div className="flex items-center gap-2">
          <a href={`${import.meta.env.VITE_API_URL}/admin-portal/admissions/report/`} target="_blank" rel="noopener noreferrer"
             className="flex items-center gap-2 border border-slate-200 text-slate-700 rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-slate-50">
            <Download size={16} /> Download Report
          </a>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-academic-blue text-white rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-academic-blue/90">
            <Plus size={16} /> Register Admission
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 pb-0">
        {["pipeline", "reports"].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
              activeTab === tab
                ? "border-academic-blue text-academic-blue bg-academic-blue/5"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}>
            {tab === "pipeline" ? "Admission Pipeline" : "Reports & Analytics"}
          </button>
        ))}
      </div>

      {activeTab === "pipeline" && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email, reg no..."
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-academic-blue" />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none">
              <option value="">All Statuses</option>
              {Object.entries(STATUS_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>

          {items.length === 0 ? (
            <EmptyState label="No admission applications found." />
          ) : (
            <div className="space-y-3">
              {items.map((a) => (
                <Card key={a.registration_number}>
                  <AdmissionCard
                    app={a}
                    busy={busy === a.registration_number}
                    onAdvance={() => advance(a.registration_number)}
                    onReject={() => reject(a.registration_number)}
                    onViewDetail={() => loadDetail(a.registration_number)}
                  />
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === "reports" && <AdmissionReports />}

      {showForm && <ManualAdmissionForm onClose={() => setShowForm(false)} onSaved={(msg) => { setShowForm(false); setToast(msg); load(); }} />}
      {detail && <ApplicationDetailModal detail={detail} onClose={() => setDetail(null)} onAction={(msg) => { setDetail(null); setToast(msg); load(); }} />}
      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}

function AdmissionCard({ app, busy, onAdvance, onReject, onViewDetail }) {
  const [expanded, setExpanded] = useState(false);
  const wIdx = getWorkflowIndex(app.status);
  const isTerminal = ["Confirmed", "Rejected", "Withdrawn"].includes(app.status);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-ink-primary truncate">{app.applicant_name}</p>
            <span className="text-xs text-ink-secondary">({app.registration_number})</span>
          </div>
          <p className="text-xs text-ink-secondary mt-0.5">
            {app.target_class} · {app.curriculum || 'CBSE'} · Parent: {app.parent_name} ({app.parent_phone})
            {app.preferred_branch && ` · Branch: ${app.preferred_branch}`}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge tone={STATUS_TONES[app.status] || "slate"}>{STATUS_LABELS[app.status] || app.status}</Badge>
          {!isTerminal && (
            <button onClick={onAdvance} disabled={busy}
              className="bg-academic-blue text-white text-xs px-3 py-1.5 rounded-lg disabled:opacity-60 hover:bg-academic-blue/90">
              {busy ? "Processing..." : "Advance"}
            </button>
          )}
          {!isTerminal && (
            <button onClick={onReject} disabled={busy}
              className="bg-red-50 text-danger text-xs px-3 py-1.5 rounded-lg disabled:opacity-60">
              Reject
            </button>
          )}
          <button onClick={() => setExpanded(!expanded)} className="text-slate-400 hover:text-slate-600">
            <ChevronDown size={16} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {/* Workflow Progress Bar */}
      <div className="mt-3 flex items-center gap-0.5">
        {WORKFLOW_STEPS.map((ws, i) => (
          <div key={ws.status} className="flex-1 flex items-center">
            <div className={`h-1.5 flex-1 rounded-full ${
              i <= wIdx ? "bg-academic-blue" : "bg-slate-100"
            }`} title={ws.label} />
          </div>
        ))}
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div><p className="text-ink-secondary">Source</p><p className="font-medium">{app.source_of_enquiry || 'N/A'}</p></div>
          <div><p className="text-ink-secondary">Counselling</p><p className="font-medium">{app.counselling_status || 'Pending'}</p></div>
          <div><p className="text-ink-secondary">Eligibility</p><p className="font-medium">{app.is_eligible ? 'Eligible' : 'Not Checked'}</p></div>
          <div><p className="text-ink-secondary">Interview</p><p className="font-medium">{app.interview_required ? (app.interview_result || 'Required') : 'Not Required'}</p></div>
          <div><p className="text-ink-secondary">Seat</p><p className="font-medium">{app.seat_allocated ? `${app.allocated_class}-${app.allocated_section}` : (app.is_waitlisted ? 'Waitlisted' : 'Not Allocated')}</p></div>
          <div><p className="text-ink-secondary">Fee Paid</p><p className="font-medium">{app.fee_paid ? 'Yes' : 'No'}</p></div>
          <div><p className="text-ink-secondary">Applied</p><p className="font-medium">{new Date(app.submitted_at).toLocaleDateString()}</p></div>
          <div><p className="text-ink-secondary">Action</p>
            <button onClick={onViewDetail} className="text-academic-blue hover:underline font-medium flex items-center gap-1">
              <Eye size={12} /> View Details
            </button>
          </div>
          {app.rejection_reason && (
            <div className="col-span-2 sm:col-span-4"><p className="text-ink-secondary">Rejection Reason</p><p className="font-medium text-red-600">{app.rejection_reason}</p></div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Application Detail Modal — Full workflow actions
// ---------------------------------------------------------------------------
function ApplicationDetailModal({ detail, onClose, onAction }) {
  const [activePanel, setActivePanel] = useState("overview");
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({});

  const regNo = detail.registration_number;

  async function postAction(endpoint, payload, successMsg) {
    setLoading(true);
    try {
      await api.post(`/admin-portal/admissions/${regNo}/${endpoint}/`, payload);
      onAction(successMsg);
    } catch (e) {
      onAction(e?.response?.data?.detail || "Action failed.");
    } finally { setLoading(false); }
  }

  const panels = [
    { id: "overview", label: "Overview", icon: Eye },
    { id: "counselling", label: "Counselling", icon: Users },
    { id: "documents", label: "Documents", icon: FileText },
    { id: "eligibility", label: "Eligibility", icon: ShieldCheck },
    { id: "interview", label: "Interview", icon: Calendar },
    { id: "seat", label: "Seat Allocation", icon: Home },
    { id: "fee", label: "Fee Payment", icon: CreditCard },
    { id: "allocation", label: "Academic", icon: GraduationCap },
    { id: "modules", label: "Modules", icon: Bus },
    { id: "notifications", label: "Notifications", icon: Bell },
  ];

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <div>
            <h3 className="font-heading font-semibold text-lg">{detail.applicant_name}</h3>
            <p className="text-xs text-ink-secondary">{regNo} · {detail.status}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="flex border-b border-slate-100 overflow-x-auto">
            {panels.map((p) => (
              <button key={p.id} onClick={() => setActivePanel(p.id)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activePanel === p.id ? "border-academic-blue text-academic-blue" : "border-transparent text-slate-500 hover:text-slate-700"
                }`}>
                <p.icon size={14} /> {p.label}
              </button>
            ))}
          </div>

          <div className="p-5">
            {activePanel === "overview" && <OverviewPanel detail={detail} />}
            {activePanel === "counselling" && <CounsellingPanel regNo={regNo} detail={detail} postAction={postAction} loading={loading} />}
            {activePanel === "documents" && <DocumentsPanel regNo={regNo} detail={detail} postAction={postAction} loading={loading} />}
            {activePanel === "eligibility" && <EligibilityPanel regNo={regNo} detail={detail} postAction={postAction} loading={loading} />}
            {activePanel === "interview" && <InterviewPanel regNo={regNo} detail={detail} postAction={postAction} loading={loading} />}
            {activePanel === "seat" && <SeatPanel regNo={regNo} detail={detail} postAction={postAction} loading={loading} />}
            {activePanel === "fee" && <FeePanel regNo={regNo} detail={detail} postAction={postAction} loading={loading} />}
            {activePanel === "allocation" && <AllocationPanel regNo={regNo} detail={detail} postAction={postAction} loading={loading} />}
            {activePanel === "modules" && <ModulesPanel regNo={regNo} detail={detail} postAction={postAction} loading={loading} />}
            {activePanel === "notifications" && <NotificationsPanel regNo={regNo} detail={detail} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function OverviewPanel({ detail }) {
  return (
    <div className="space-y-6">
      <div>
        <h4 className="font-semibold text-sm mb-3">Applicant Info</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <div><p className="text-xs text-ink-secondary">Applicant</p><p className="font-semibold">{detail.applicant_name}</p></div>
          <div><p className="text-xs text-ink-secondary">Target Class</p><p className="font-semibold">{detail.target_class}</p></div>
          <div><p className="text-xs text-ink-secondary">Gender</p><p className="font-semibold">{detail.gender}</p></div>
          <div><p className="text-xs text-ink-secondary">Date of Birth</p><p className="font-semibold">{detail.date_of_birth}</p></div>
          <div><p className="text-xs text-ink-secondary">Curriculum</p><p className="font-semibold">{detail.curriculum || 'CBSE'}</p></div>
          <div><p className="text-xs text-ink-secondary">Status</p><Badge tone={STATUS_TONES[detail.status]}>{STATUS_LABELS[detail.status]}</Badge></div>
        </div>
      </div>

      <hr className="border-slate-100" />
      <div>
        <h4 className="font-semibold text-sm mb-3">Parent / Guardian Details</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <div><p className="text-xs text-ink-secondary">Father Name</p><p className="font-semibold">{detail.father_name || '-'}</p></div>
          <div><p className="text-xs text-ink-secondary">Father Phone</p><p className="font-semibold">{detail.father_phone || '-'}</p></div>
          <div><p className="text-xs text-ink-secondary">Mother Name</p><p className="font-semibold">{detail.mother_name || '-'}</p></div>
          <div><p className="text-xs text-ink-secondary">Mother Phone</p><p className="font-semibold">{detail.mother_phone || '-'}</p></div>
          <div className="col-span-2"><p className="text-xs text-ink-secondary">Address</p><p className="font-semibold">{detail.address} {detail.city} {detail.state} {detail.pincode}</p></div>
        </div>
      </div>

      <hr className="border-slate-100" />
      <div>
        <h4 className="font-semibold text-sm mb-3">Medical & Previous School</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><p className="text-xs text-ink-secondary">Medical Conditions</p><p className="font-semibold">{detail.has_medical_conditions ? 'Yes' : 'No'}</p></div>
          <div><p className="text-xs text-ink-secondary">Blood Group</p><p className="font-semibold">{detail.blood_group || '-'}</p></div>
          <div><p className="text-xs text-ink-secondary">Prev School</p><p className="font-semibold">{detail.prev_school_name || '-'}</p></div>
          <div><p className="text-xs text-ink-secondary">Prev Grade</p><p className="font-semibold">{detail.prev_school_grade || '-'}</p></div>
        </div>
      </div>
    </div>
  );
}

function CounsellingPanel({ regNo, detail, postAction, loading }) {
  const [notes, setNotes] = useState("");
  return (
    <div className="space-y-4">
      <h4 className="font-semibold text-sm">Phase 2: Counselling</h4>
      <p className="text-xs text-ink-secondary">Current status: <Badge tone="gold">{detail.counselling_status || 'Pending'}</Badge></p>
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Counselling notes..."
        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-academic-blue" />
      <div className="flex gap-2">
        <button disabled={loading} onClick={() => postAction("counselling", { action: "assign_counsellor", counsellor_id: null, notes }, "Counsellor assigned.")}
          className="bg-academic-blue text-white text-sm px-4 py-2 rounded-xl disabled:opacity-60">Assign Counsellor</button>
        <button disabled={loading} onClick={() => postAction("counselling", { action: "complete_counselling", notes }, "Counselling completed.")}
          className="bg-emerald-500 text-white text-sm px-4 py-2 rounded-xl disabled:opacity-60">Complete Counselling</button>
      </div>
    </div>
  );
}

function DocumentsPanel({ regNo, detail, postAction, loading }) {
  const docFields = [
    { key: 'doc_birth_certificate', label: 'Birth Certificate' },
    { key: 'doc_aadhaar_card', label: 'Aadhaar Card' },
    { key: 'doc_passport_photo', label: 'Passport Photo' },
    { key: 'doc_parent_id', label: 'Parent ID Proof' },
    { key: 'doc_address_proof', label: 'Address Proof' },
    { key: 'doc_previous_marks', label: 'Previous Marks Card' },
    { key: 'doc_transfer_certificate', label: 'Transfer Certificate' },
  ];
  
  const uploadedDocs = docFields.filter(d => detail[d.key]);

  return (
    <div className="space-y-4">
      <h4 className="font-semibold text-sm">Phase 5: Submitted Documents</h4>
      {uploadedDocs.length === 0 ? (
        <p className="text-sm text-ink-secondary">No documents uploaded yet.</p>
      ) : (
        <div className="space-y-2">
          {uploadedDocs.map((d) => (
            <div key={d.key} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-academic-blue" />
                <div>
                  <p className="text-xs font-semibold">{d.label}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a href={detail[d.key]} target="_blank" rel="noopener noreferrer"
                  className="text-xs flex items-center gap-1 bg-academic-blue text-white px-3 py-1.5 rounded-lg hover:bg-academic-blue/90">
                  <Download size={14} /> Download
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EligibilityPanel({ regNo, detail, postAction, loading }) {
  const [result, setResult] = useState(null);
  async function runCheck() {
    try {
      const { data } = await api.post(`/admin-portal/admissions/${regNo}/eligibility/`);
      setResult(data);
      onAction?.("Eligibility check completed.");
    } catch { /* */ }
  }
  return (
    <div className="space-y-4">
      <h4 className="font-semibold text-sm">Phase 6: Eligibility Validation</h4>
      <p className="text-xs text-ink-secondary">Current: {detail.is_eligible ? <Badge tone="green">Eligible</Badge> : <Badge tone="red">Not Checked</Badge>}</p>
      <button disabled={loading} onClick={runCheck}
        className="bg-academic-blue text-white text-sm px-4 py-2 rounded-xl disabled:opacity-60">Run Eligibility Check</button>
      {result && (
        <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
          <div className="flex items-center gap-2">
            {result.age_eligible ? <CheckCircle2 size={14} className="text-emerald-500" /> : <XCircle size={14} className="text-red-500" />}
            <span>{result.age_reason}</span>
          </div>
          <div className="flex items-center gap-2">
            {result.academic_eligible ? <CheckCircle2 size={14} className="text-emerald-500" /> : <XCircle size={14} className="text-red-500" />}
            <span>{result.academic_reason}</span>
          </div>
          <div className="flex items-center gap-2">
            {result.documents_eligible ? <CheckCircle2 size={14} className="text-emerald-500" /> : <XCircle size={14} className="text-red-500" />}
            <span>{result.documents_reason}</span>
          </div>
          {result.duplicate_check && <p className="text-red-600 text-xs">Duplicate admission found!</p>}
          <p className="font-semibold mt-2">Overall: {result.overall_eligible ? 'Eligible' : 'Not Eligible'}</p>
        </div>
      )}
    </div>
  );
}

function InterviewPanel({ regNo, detail, postAction, loading }) {
  const [interviewDate, setInterviewDate] = useState("");
  const [marks, setMarks] = useState("");
  const [recommendation, setRecommendation] = useState("Recommended");
  const [remarks, setRemarks] = useState("");
  return (
    <div className="space-y-4">
      <h4 className="font-semibold text-sm">Phase 8: Interview / Assessment</h4>
      <p className="text-xs text-ink-secondary">Interview: {detail.interview_required ? (detail.interview_result || 'Required') : 'Not Required'}</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-slate-500">Interview Date</label>
          <input type="datetime-local" value={interviewDate} onChange={(e) => setInterviewDate(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500">Marks (out of 100)</label>
          <input type="number" value={marks} onChange={(e) => setMarks(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500">Recommendation</label>
          <select value={recommendation} onChange={(e) => setRecommendation(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none">
            <option value="Recommended">Recommended</option>
            <option value="Recommended_Conditions">Recommended with Conditions</option>
            <option value="Not_Recommended">Not Recommended</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500">Remarks</label>
          <input value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Interview remarks"
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none" />
        </div>
      </div>
      <div className="flex gap-2">
        <button disabled={loading} onClick={() => postAction("interview", { action: "schedule", interview_date: interviewDate }, "Interview scheduled.")}
          className="bg-academic-blue text-white text-sm px-4 py-2 rounded-xl disabled:opacity-60">Schedule Interview</button>
        <button disabled={loading} onClick={() => postAction("interview", { action: "complete", marks_obtained: marks, recommendation, remarks }, "Interview completed.")}
          className="bg-emerald-500 text-white text-sm px-4 py-2 rounded-xl disabled:opacity-60">Complete Interview</button>
      </div>
    </div>
  );
}

function SeatPanel({ regNo, detail, postAction, loading }) {
  const [section, setSection] = useState("A");
  return (
    <div className="space-y-4">
      <h4 className="font-semibold text-sm">Phase 9: Seat Allocation</h4>
      <p className="text-xs text-ink-secondary">Seat: {detail.seat_allocated ? <Badge tone="green">{detail.allocated_class} - {detail.allocated_section}</Badge> : (detail.is_waitlisted ? <Badge tone="gold">Waitlisted</Badge> : <Badge>Not Allocated</Badge>)}</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-slate-500">Section</label>
          <select value={section} onChange={(e) => setSection(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none">
            {["A", "B", "C", "D"].map((s) => <option key={s} value={s}>Section {s}</option>)}
          </select>
        </div>
      </div>
      <div className="flex gap-2">
        <button disabled={loading} onClick={() => postAction("seat", { action: "allocate", section }, "Seat allocated.")}
          className="bg-academic-blue text-white text-sm px-4 py-2 rounded-xl disabled:opacity-60">Allocate Seat</button>
        <button disabled={loading} onClick={() => postAction("seat", { action: "waitlist" }, "Student waitlisted.")}
          className="bg-amber-500 text-white text-sm px-4 py-2 rounded-xl disabled:opacity-60">Waitlist</button>
      </div>
    </div>
  );
}

function FeePanel({ regNo, detail, postAction, loading }) {
  const [feeAmount, setFeeAmount] = useState("50000");
  const [discount, setDiscount] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState("Online");
  return (
    <div className="space-y-4">
      <h4 className="font-semibold text-sm">Phase 11: Fee Payment</h4>
      <p className="text-xs text-ink-secondary">Fee: {detail.fee_paid ? <Badge tone="green">Paid</Badge> : <Badge tone="orange">Pending</Badge>}</p>
      {detail.fee && (
        <div className="bg-slate-50 rounded-xl p-3 text-sm space-y-1">
          <p>Total: ₹{detail.fee.total_amount}</p>
          <p>Discount: ₹{detail.fee.scholarship_discount}</p>
          <p className="font-semibold">Net: ₹{detail.fee.net_amount}</p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-slate-500">Fee Amount (₹)</label>
          <input type="number" value={feeAmount} onChange={(e) => setFeeAmount(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500">Scholarship Discount (₹)</label>
          <input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none" />
        </div>
      </div>
      <div className="flex gap-2">
        <button disabled={loading} onClick={() => postAction("decision", { action: "approve", fee_amount: feeAmount, scholarship_discount: discount }, "Admission approved. Fee pending.")}
          className="bg-emerald-500 text-white text-sm px-4 py-2 rounded-xl disabled:opacity-60">Approve & Generate Invoice</button>
        <button disabled={loading} onClick={() => postAction("fee", { action: "pay", payment_method: paymentMethod }, "Payment recorded.")}
          className="bg-academic-blue text-white text-sm px-4 py-2 rounded-xl disabled:opacity-60">Record Payment</button>
      </div>
      <div className="flex gap-2">
        <button disabled={loading} onClick={() => postAction("confirm", {}, "Admission confirmed! Accounts generated.")}
          className="bg-green-600 text-white text-sm px-4 py-2 rounded-xl disabled:opacity-60">Confirm Admission & Generate Accounts</button>
      </div>
    </div>
  );
}

function AllocationPanel({ regNo, detail, postAction, loading }) {
  const [classId, setClassId] = useState("");
  const [section, setSection] = useState("A");
  const [house, setHouse] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  return (
    <div className="space-y-4">
      <h4 className="font-semibold text-sm">Phase 14: Academic Allocation</h4>
      {detail.allocation ? (
        <div className="bg-slate-50 rounded-xl p-3 text-sm">
          <p>Class ID: {detail.allocation.class_id} · Section: {detail.allocation.section} · House: {detail.allocation.house || 'N/A'} · Roll: {detail.allocation.roll_number || 'N/A'}</p>
        </div>
      ) : (
        <p className="text-xs text-ink-secondary">No allocation yet.</p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-slate-500">Class ID</label>
          <input type="number" value={classId} onChange={(e) => setClassId(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500">Section</label>
          <select value={section} onChange={(e) => setSection(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none">
            {["A", "B", "C", "D"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500">House</label>
          <select value={house} onChange={(e) => setHouse(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none">
            <option value="">Select house</option>
            {["Red", "Blue", "Green", "Yellow"].map((h) => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500">Roll Number</label>
          <input type="number" value={rollNumber} onChange={(e) => setRollNumber(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none" />
        </div>
      </div>
      <button disabled={loading} onClick={() => postAction("allocation", { class_id: classId, section, house, roll_number: rollNumber }, "Academic allocation saved.")}
        className="bg-academic-blue text-white text-sm px-4 py-2 rounded-xl disabled:opacity-60">Save Allocation</button>
    </div>
  );
}

function ModulesPanel({ regNo, detail, postAction, loading }) {
  return (
    <div className="space-y-4">
      <h4 className="font-semibold text-sm">Phase 15: Optional Module Allocation</h4>
      <div className="grid grid-cols-2 gap-3">
        {["Transport", "Hostel", "Library", "LMS"].map((mod) => (
          <button key={mod} disabled={loading}
            onClick={() => postAction("modules", { module_type: mod, allocation_data: {} }, `${mod} allocated.`)}
            className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-100 disabled:opacity-60 flex items-center gap-2">
            {mod === "Transport" && <Bus size={16} />}
            {mod === "Hostel" && <Home size={16} />}
            {mod === "Library" && <BookOpen size={16} />}
            {mod === "LMS" && <GraduationCap size={16} />}
            Allocate {mod}
          </button>
        ))}
      </div>
    </div>
  );
}

function NotificationsPanel({ regNo }) {
  const [notifications, setNotifications] = useState([]);
  useEffect(() => {
    api.get(`/admin-portal/admissions/${regNo}/notifications/`).then(({ data }) => setNotifications(data)).catch(() => {});
  }, [regNo]);
  return (
    <div className="space-y-4">
      <h4 className="font-semibold text-sm">Phase 16: Notifications</h4>
      {notifications.length === 0 ? (
        <p className="text-xs text-ink-secondary">No notifications sent yet.</p>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div key={n.id} className="p-3 bg-slate-50 rounded-xl text-sm">
              <div className="flex items-center gap-2">
                <Badge tone={n.is_sent ? "green" : "slate"}>{n.channel}</Badge>
                <span className="font-semibold">{n.title}</span>
              </div>
              <p className="text-xs text-ink-secondary mt-1">{n.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reports & Analytics
// ---------------------------------------------------------------------------
function AdmissionReports() {
  const [data, setData] = useState(null);
  useEffect(() => {
    api.get("/admin-portal/admissions/reports/?type=overview").then(({ data }) => setData(data)).catch(() => {});
  }, []);

  if (!data) return <Loader rows={4} />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <p className="text-xs text-ink-secondary">Total Enquiries</p>
          <p className="text-2xl font-bold">{data.total_enquiries || 0}</p>
        </Card>
        <Card>
          <p className="text-xs text-ink-secondary">Fee Collected</p>
          <p className="text-2xl font-bold">₹{Number(data.fee_collected || 0).toLocaleString()}</p>
        </Card>
        <Card>
          <p className="text-xs text-ink-secondary">Confirmed</p>
          <p className="text-2xl font-bold text-emerald-600">{data.status_counts?.Confirmed || 0}</p>
        </Card>
        <Card>
          <p className="text-xs text-ink-secondary">Rejected</p>
          <p className="text-2xl font-bold text-red-600">{data.status_counts?.Rejected || 0}</p>
        </Card>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Card>
          <h4 className="font-semibold text-sm mb-3">Status Pipeline</h4>
          <div className="space-y-2">
            {Object.entries(data.status_counts || {}).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Badge tone={STATUS_TONES[status]}>{STATUS_LABELS[status]}</Badge>
                </div>
                <span className="font-semibold">{count}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h4 className="font-semibold text-sm mb-3">Source Breakdown</h4>
          <div className="space-y-2">
            {Object.entries(data.source_counts || {}).map(([source, count]) => (
              <div key={source} className="flex items-center justify-between text-sm">
                <span>{source}</span>
                <span className="font-semibold">{count}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h4 className="font-semibold text-sm mb-3">Gender Distribution</h4>
          <div className="space-y-2">
            {Object.entries(data.gender_counts || {}).map(([gender, count]) => (
              <div key={gender} className="flex items-center justify-between text-sm">
                <span>{gender}</span>
                <span className="font-semibold">{count}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h4 className="font-semibold text-sm mb-3">Curriculum</h4>
          <div className="space-y-2">
            {Object.entries(data.curriculum_counts || {}).map(([curr, count]) => (
              <div key={curr} className="flex items-center justify-between text-sm">
                <span>{curr}</span>
                <span className="font-semibold">{count}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Manual Admission Form
// ---------------------------------------------------------------------------
function ManualAdmissionForm({ onClose, onSaved }) {
  const [form, setForm] = useState({
    applicant_name: "",
    date_of_birth: "",
    gender: "Male",
    target_class: "Class 1",
    curriculum: "CBSE",
    father_name: "",
    father_phone: "",
    father_email: "",
    address: "",
    source_of_enquiry: "Walk-in",
    preferred_branch: "",
    scholarship_applied: false,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState({});

  async function submit(e) {
    e.preventDefault();
    const errs = {};
    if (!isNonEmptyString(form.applicant_name) || !isTextOnly(form.applicant_name)) errs.applicant_name = "Valid text required";
    if (!form.date_of_birth) errs.date_of_birth = "Required";
    if (!isNonEmptyString(form.father_name) || !isTextOnly(form.father_name)) errs.father_name = "Valid text required";
    if (!isExact10Digits(form.father_phone)) errs.father_phone = "Valid 10-digit phone required";
    if (!isGmail(form.father_email)) errs.father_email = "Valid gmail required";
    if (!isNonEmptyString(form.address)) errs.address = "Required";
    if (form.preferred_branch && !isTextOnly(form.preferred_branch)) errs.preferred_branch = "Valid text required";
    if (Object.keys(errs).length > 0) { setValidationErrors(errs); return; }
    setValidationErrors({});
    setBusy(true); setError("");
    try {
      await api.post("/admin-portal/admissions/enquiries/", form);
      onSaved("Admission registered successfully.");
    } catch (err) {
      setError(err?.response?.data?.detail || "Could not register.");
    } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-card w-full max-w-lg p-6 shadow-raised max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <UserPlus size={20} className="text-academic-blue" />
            <p className="font-heading font-semibold text-lg">Register Admission</p>
          </div>
          <button onClick={onClose} className="text-ink-secondary"><X size={18} /></button>
        </div>
        {error && <div className="mb-3 text-sm text-danger bg-red-50 rounded-xl px-3 py-2">{error}</div>}
        <form onSubmit={submit} className="space-y-3 text-sm">
          <input required placeholder="Applicant name (*)" value={form.applicant_name}
            onChange={(e) => setForm({ ...form, applicant_name: e.target.value })}
            className={`w-full rounded-xl border px-3 py-2 ${validationErrors.applicant_name ? "border-danger" : "border-slate-200"}`} />
          <div className="grid grid-cols-2 gap-3">
            <input required type="date" value={form.date_of_birth}
              onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
              className={`w-full rounded-xl border px-3 py-2 ${validationErrors.date_of_birth ? "border-danger" : "border-slate-200"}`} />
            <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2">
              <option>Male</option><option>Female</option><option>Other</option>
            </select>
          </div>
          <select value={form.target_class} onChange={(e) => setForm({ ...form, target_class: e.target.value })}
            className="w-full rounded-xl border border-slate-200 px-3 py-2">
            {Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`).map((c) => (<option key={c}>{c}</option>))}
          </select>
          <select value={form.curriculum} onChange={(e) => setForm({ ...form, curriculum: e.target.value })}
            className="w-full rounded-xl border border-slate-200 px-3 py-2">
            <option value="CBSE">CBSE</option><option value="Cambridge">Cambridge</option><option value="IB">IB</option><option value="State_Board">State Board</option>
          </select>
          <hr className="border-slate-100" />
          <input required placeholder="Parent name (*)" value={form.father_name}
            onChange={(e) => setForm({ ...form, father_name: e.target.value })}
            className={`w-full rounded-xl border px-3 py-2 ${validationErrors.father_name ? "border-danger" : "border-slate-200"}`} />
          <div className="grid grid-cols-2 gap-3">
            <input required placeholder="Phone (*)" value={form.father_phone}
              onChange={(e) => setForm({ ...form, father_phone: e.target.value })}
              className={`w-full rounded-xl border px-3 py-2 ${validationErrors.father_phone ? "border-danger" : "border-slate-200"}`} />
            <input required type="email" placeholder="Email (*)" value={form.father_email}
              onChange={(e) => setForm({ ...form, father_email: e.target.value })}
              className={`w-full rounded-xl border px-3 py-2 ${validationErrors.father_email ? "border-danger" : "border-slate-200"}`} />
          </div>
          <textarea required rows={2} placeholder="Address (*)" value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className={`w-full rounded-xl border px-3 py-2 resize-none ${validationErrors.address ? "border-danger" : "border-slate-200"}`} />
          <select value={form.source_of_enquiry} onChange={(e) => setForm({ ...form, source_of_enquiry: e.target.value })}
            className="w-full rounded-xl border border-slate-200 px-3 py-2">
            <option value="Walk-in">Walk-in</option><option value="Phone">Phone</option><option value="Email">Email</option>
            <option value="Website">Website</option><option value="Referral">Referral</option><option value="Social_Media">Social Media</option>
          </select>
          <input placeholder="Preferred branch" value={form.preferred_branch}
            onChange={(e) => setForm({ ...form, preferred_branch: e.target.value })}
            className={`w-full rounded-xl border px-3 py-2 ${validationErrors.preferred_branch ? "border-danger" : "border-slate-200"}`} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.scholarship_applied}
              onChange={(e) => setForm({ ...form, scholarship_applied: e.target.checked })} className="w-4 h-4" />
            Scholarship requested
          </label>
          <button disabled={busy}
            className="w-full bg-academic-blue text-white rounded-xl py-2.5 font-medium hover:bg-academic-blue/90 disabled:opacity-60">
            {busy ? "Registering..." : "Submit Registration"}
          </button>
        </form>
      </div>
    </div>
  );
}
