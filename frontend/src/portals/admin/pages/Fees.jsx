import { useEffect, useState, useCallback } from "react";
import {
  CalendarDays, ChevronDown, ChevronUp, CheckCircle2, Clock, Download,
  FilePlus2, Filter, GraduationCap, IndianRupee, LayoutList,
  Loader2, Percent, Plus, RefreshCw, Tag, Trash2, TrendingUp,
  UserCheck, Users, Wallet, X, AlertTriangle, BookOpen,
  BadgePercent, FileText, Eye, BarChart2, PlusCircle, Settings2,
} from "lucide-react";
import api from "../lib/api";
import {
  Badge, Card, EmptyState, Loader, SectionTitle, StatCard, Toast,
} from "../components/Common";
import { isValidDateRange, isNonEmptyString } from "../../../utils/validation";

// ─── helpers ───────────────────────────────────────────────────────────────
const INR = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const fmt = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const daysLeft = (due) => {
  if (!due) return null;
  const diff = Math.ceil((new Date(due) - new Date()) / 86400000);
  return diff;
};

const STATUS_TONE = { Paid: "green", Unpaid: "slate", Partial: "gold", Overdue: "red" };
const CONCESSION_TYPES = ["Scholarship", "Merit", "Sibling", "Staff", "Disability", "Discount", "Other"];
const PAYMENT_METHODS = [
  { key: "UPI", label: "UPI", icon: "₿" },
  { key: "Card", label: "Credit / Debit Card", icon: "💳" },
  { key: "NetBanking", label: "Net Banking", icon: "🏦" },
  { key: "Wallet", label: "Wallet", icon: "👛" },
];

const TABS = [
  { key: "overview",    label: "Overview",           icon: LayoutList },
  { key: "structures",  label: "Fee Structures",      icon: Wallet },
  { key: "assign",      label: "Assign",              icon: UserCheck },
  { key: "concessions", label: "Concessions",         icon: BadgePercent },
  { key: "ledger",      label: "Student Ledger",      icon: BookOpen },
  { key: "payments",    label: "Payments",            icon: IndianRupee },
  { key: "reports",     label: "Reports",             icon: BarChart2 },
  { key: "categories",  label: "Fee Categories",      icon: Tag },
];

// ─── main component ─────────────────────────────────────────────────────────
export default function Fees() {
  const [tab, setTab] = useState("overview");
  const [toast, setToast] = useState({ msg: "", tone: "success" });
  const showToast = (msg, tone = "success") => setToast({ msg, tone });

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-xl text-ink-primary">Fee Management</h1>
          <p className="text-xs text-ink-secondary mt-0.5">Configure, assign and track all school fees</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 flex-wrap bg-white rounded-xl shadow-card p-1.5 border border-slate-100">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all
              ${tab === key
                ? "bg-academic-blue text-white shadow-sm"
                : "text-ink-secondary hover:bg-slate-50 hover:text-ink-primary"}`}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "overview"    && <OverviewTab showToast={showToast} />}
      {tab === "structures"  && <StructuresTab showToast={showToast} />}
      {tab === "assign"      && <AssignTab showToast={showToast} />}
      {tab === "concessions" && <ConcessionsTab showToast={showToast} />}
      {tab === "ledger"      && <LedgerTab showToast={showToast} />}
      {tab === "payments"    && <PaymentsTab showToast={showToast} />}
      {tab === "reports"     && <ReportsTab showToast={showToast} />}
      {tab === "categories"  && <CategoriesTab showToast={showToast} />}

      <Toast message={toast.msg} tone={toast.tone} onClose={() => setToast({ msg: "" })} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// OVERVIEW TAB
// ═══════════════════════════════════════════════════════════════════════════
function OverviewTab({ showToast }) {
  const [reports, setReports] = useState(null);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState("");
  const [ayForm, setAyForm] = useState({ name: "", start_date: "", end_date: "", is_active: false });
  const [showAyForm, setShowAyForm] = useState(false);

  const load = useCallback(() => {
    const q = selectedYear ? `?academic_year_id=${selectedYear}` : "";
    api.get(`/admin-portal/fee-reports/${q}`).then(({ data }) => setReports(data)).catch(() => setReports({}));
    api.get("/admin-portal/academic-years/").then(({ data }) => setAcademicYears(data)).catch(() => {});
  }, [selectedYear]);

  useEffect(() => { load(); }, [load]);

  async function createAcademicYear(e) {
    e.preventDefault();
    if (!isNonEmptyString(ayForm.name)) { showToast("Academic year name is required.", "error"); return; }
    if (!ayForm.start_date || !ayForm.end_date) { showToast("Start and end dates are required.", "error"); return; }
    if (!isValidDateRange(ayForm.start_date, ayForm.end_date)) { showToast("End date must be after start date.", "error"); return; }
    try {
      await api.post("/admin-portal/academic-years/", ayForm);
      showToast("Academic year created.");
      setAyForm({ name: "", start_date: "", end_date: "", is_active: false });
      setShowAyForm(false);
      load();
    } catch { showToast("Failed to create academic year.", "error"); }
  }

  async function setActiveYear(id) {
    try {
      await api.patch("/admin-portal/academic-years/", { id, is_active: true });
      showToast("Active year updated.");
      load();
    } catch { showToast("Failed.", "error"); }
  }

  const summary = reports?.summary || {};

  return (
    <div className="space-y-5">
      {/* Academic Years */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <SectionTitle>Academic Years</SectionTitle>
          <button
            onClick={() => setShowAyForm(!showAyForm)}
            className="flex items-center gap-1.5 text-xs bg-academic-blue text-white px-3 py-1.5 rounded-lg hover:bg-academic-blue/90 transition-colors"
          >
            <Plus size={12} /> New Year
          </button>
        </div>
        {showAyForm && (
          <form onSubmit={createAcademicYear} className="grid sm:grid-cols-4 gap-3 mb-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <input required placeholder="e.g. 2025-26 (*)" value={ayForm.name}
              onChange={(e) => setAyForm({ ...ayForm, name: e.target.value })}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            <input required type="date" value={ayForm.start_date}
              onChange={(e) => setAyForm({ ...ayForm, start_date: e.target.value })}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            <input required type="date" value={ayForm.end_date}
              onChange={(e) => setAyForm({ ...ayForm, end_date: e.target.value })}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            <button className="bg-academic-blue text-white rounded-xl py-2 text-sm font-medium">Create</button>
          </form>
        )}
        {academicYears.length === 0 ? (
          <EmptyState label="No academic years configured yet." />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {academicYears.map((ay) => (
              <div key={ay.id} className={`rounded-xl border p-4 flex items-center justify-between
                ${ay.is_active ? "border-academic-blue bg-academic-blue/5" : "border-slate-200"}`}>
                <div>
                  <p className="font-semibold text-sm">{ay.name}</p>
                  <p className="text-xs text-ink-secondary mt-0.5">{fmt(ay.start_date)} – {fmt(ay.end_date)}</p>
                </div>
                {ay.is_active
                  ? <Badge tone="blue">Active</Badge>
                  : (
                    <button onClick={() => setActiveYear(ay.id)}
                      className="text-xs text-academic-blue font-medium hover:underline">
                      Set Active
                    </button>
                  )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Stats */}
      {!reports ? <Loader rows={2} /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={IndianRupee} label="Total Collected" value={INR(summary.total_collected)} accent="green" />
          <StatCard icon={TrendingUp} label="This Month" value={INR(summary.collected_this_month)} accent="blue" />
          <StatCard icon={Users} label="Unique Payers" value={summary.unique_payers ?? "—"} accent="orange" />
          <StatCard icon={CheckCircle2} label="Transactions" value={summary.total_transactions ?? "—"} accent="blue" />
        </div>
      )}

      {/* Filter by year */}
      <div className="flex items-center gap-3">
        <Filter size={14} className="text-ink-secondary" />
        <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5">
          <option value="">All Academic Years</option>
          {academicYears.map((ay) => <option key={ay.id} value={ay.id}>{ay.name}</option>)}
        </select>
      </div>

      {/* Fee structures summary */}
      {reports?.structures?.length > 0 && (
        <Card>
          <SectionTitle>Fee Structures Overview</SectionTitle>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-ink-secondary border-b border-slate-100">
                  <th className="text-left py-2 pr-4 font-medium">Term</th>
                  <th className="text-left py-2 pr-4 font-medium">Class</th>
                  <th className="text-right py-2 pr-4 font-medium">Amount</th>
                  <th className="text-right py-2 pr-4 font-medium">Collected</th>
                  <th className="text-right py-2 pr-4 font-medium">Due Date</th>
                  <th className="text-right py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {reports.structures.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 pr-4 font-medium">{s.term_name}</td>
                    <td className="py-2.5 pr-4 text-ink-secondary">{s.class_name || "—"} {s.section || ""}</td>
                    <td className="py-2.5 pr-4 text-right font-numeric">{INR(s.total_amount)}</td>
                    <td className="py-2.5 pr-4 text-right font-numeric text-academic-green">{INR(s.amount_collected)}</td>
                    <td className="py-2.5 pr-4 text-right text-ink-secondary">{fmt(s.due_date)}</td>
                    <td className="py-2.5 text-right">
                      <Badge tone={s.is_published ? "green" : "slate"}>
                        {s.is_published ? "Published" : "Draft"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STRUCTURES TAB
// ═══════════════════════════════════════════════════════════════════════════
function StructuresTab({ showToast }) {
  const [structures, setStructures] = useState(null);
  const [classes, setClasses] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    class_id: "", term_name: "", academic_year_id: "", due_date: "", late_fine_per_day: 0,
    tuition_fee: 0, admission_fee: 0, transport_fee: 0, hostel_fee: 0,
    library_fee: 0, exam_fee: 0, misc_fee: 0, description: "", is_published: false,
  });

  const total = ["tuition_fee","admission_fee","transport_fee","hostel_fee","library_fee","exam_fee","misc_fee"]
    .reduce((s, k) => s + parseFloat(form[k] || 0), 0);

  function load() {
    api.get("/admin-portal/fee-structures/").then(({ data }) => setStructures(data)).catch(() => setStructures([]));
    api.get("/admin-portal/classes/").then(({ data }) => setClasses(data)).catch(() => {});
    api.get("/admin-portal/academic-years/").then(({ data }) => setAcademicYears(data)).catch(() => {});
  }
  useEffect(load, []);

  function startEdit(s) {
    setEditing(s);
    setForm({ ...s, is_published: s.is_published || false });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditing(null);
    setForm({ class_id: "", term_name: "", academic_year_id: "", due_date: "", late_fine_per_day: 0,
      tuition_fee: 0, admission_fee: 0, transport_fee: 0, hostel_fee: 0,
      library_fee: 0, exam_fee: 0, misc_fee: 0, description: "", is_published: false });
    setShowForm(false);
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.class_id) { showToast("Please select a class.", "error"); return; }
    if (!isNonEmptyString(form.term_name)) { showToast("Term name is required.", "error"); return; }
    const feeFields = ["tuition_fee","admission_fee","transport_fee","hostel_fee","library_fee","exam_fee","misc_fee"];
    for (const k of feeFields) {
      const v = parseFloat(form[k]);
      if (isNaN(v) || v < 0) { showToast(`Invalid amount for ${k.replace(/_/g, " ")}.`, "error"); return; }
    }
    try {
      if (editing) {
        await api.patch("/admin-portal/fee-structures/", { ...form, id: editing.id });
        showToast("Fee structure updated.");
      } else {
        await api.post("/admin-portal/fee-structures/", form);
        showToast("Fee structure created.");
      }
      resetForm();
      load();
    } catch { showToast("Failed to save fee structure.", "error"); }
  }

  async function deleteFee(id) {
    if (!confirm("Delete this fee structure? This cannot be undone.")) return;
    try {
      await api.delete(`/admin-portal/fee-structures/?id=${id}`);
      showToast("Deleted.");
      load();
    } catch { showToast("Failed to delete.", "error"); }
  }

  async function togglePublish(s) {
    try {
      await api.patch("/admin-portal/fee-structures/", { id: s.id, ...s, is_published: !s.is_published });
      showToast(s.is_published ? "Unpublished." : "Published to students.");
      load();
    } catch { showToast("Failed.", "error"); }
  }

  const fld = (k) => ({ type: "number", min: 0, value: form[k], onChange: (e) => setForm({ ...form, [k]: e.target.value }) });

  return (
    <div className="space-y-5">
      {/* Form */}
      {showForm ? (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <SectionTitle>{editing ? "Edit Fee Structure" : "Create Fee Structure"}</SectionTitle>
            <button onClick={resetForm}><X size={18} className="text-ink-secondary" /></button>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-ink-secondary mb-1 block">Class * (*)</label>
                <select required value={form.class_id} onChange={(e) => setForm({ ...form, class_id: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  <option value="">Select class</option>
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.name} – {c.section}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-ink-secondary mb-1 block">Term Name * (*)</label>
                <input required placeholder="e.g. Term 1 – 2025 (*)" value={form.term_name}
                  onChange={(e) => setForm({ ...form, term_name: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-ink-secondary mb-1 block">Academic Year</label>
                <select value={form.academic_year_id} onChange={(e) => setForm({ ...form, academic_year_id: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  <option value="">None</option>
                  {academicYears.map((ay) => <option key={ay.id} value={ay.id}>{ay.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-ink-secondary mb-1 block">Due Date</label>
                <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-ink-secondary mb-1 block">Late Fine / Day (₹)</label>
                <input {...fld("late_fine_per_day")} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
                    className="w-4 h-4 rounded accent-academic-blue" />
                  Publish immediately
                </label>
              </div>
            </div>

            {/* Fee breakdown */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <p className="text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-3">Fee Breakdown</p>
              <div className="grid sm:grid-cols-4 gap-3">
                {[
                  ["tuition_fee", "Tuition Fee"],
                  ["admission_fee", "Admission Fee"],
                  ["transport_fee", "Transport Fee"],
                  ["hostel_fee", "Hostel Fee"],
                  ["library_fee", "Library Fee"],
                  ["exam_fee", "Examination Fee"],
                  ["misc_fee", "Miscellaneous"],
                ].map(([k, label]) => (
                  <div key={k}>
                    <label className="text-xs text-ink-secondary mb-1 block">{label}</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-sm text-ink-secondary">₹</span>
                      <input {...fld(k)} className="w-full rounded-xl border border-slate-200 pl-7 pr-3 py-2 text-sm" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between">
                <span className="text-sm font-medium text-ink-secondary">Calculated Total</span>
                <span className="font-numeric text-xl font-bold text-academic-blue">{INR(total)}</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-ink-secondary mb-1 block">Description / Notes</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm resize-none" />
            </div>

            <div className="flex gap-3">
              <button type="submit"
                className="bg-academic-blue text-white px-6 py-2.5 rounded-xl font-medium text-sm hover:bg-academic-blue/90 transition-colors">
                {editing ? "Update Structure" : "Create Structure"}
              </button>
              <button type="button" onClick={resetForm}
                className="border border-slate-200 text-ink-secondary px-6 py-2.5 rounded-xl font-medium text-sm hover:bg-slate-50">
                Cancel
              </button>
            </div>
          </form>
        </Card>
      ) : (
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-academic-blue text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-academic-blue/90 transition-colors">
          <FilePlus2 size={16} /> New Fee Structure
        </button>
      )}

      {/* List */}
      <Card>
        <SectionTitle>All Fee Structures</SectionTitle>
        {!structures ? <Loader rows={4} /> : structures.length === 0 ? <EmptyState label="No fee structures yet." /> : (
          <div className="space-y-3">
            {structures.map((s) => (
              <div key={s.id}
                className="rounded-xl border border-slate-100 p-4 hover:border-slate-200 hover:shadow-sm transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-semibold text-ink-primary">{s.term_name}</p>
                      <Badge tone={s.is_published ? "green" : "slate"}>
                        {s.is_published ? "Published" : "Draft"}
                      </Badge>
                      {s.academic_year_name && <Badge tone="blue">{s.academic_year_name}</Badge>}
                    </div>
                    <p className="text-xs text-ink-secondary">
                      {s.class_name ? `${s.class_name} ${s.section}` : `Class #${s.class_id}`}
                      {s.due_date && ` · Due: ${fmt(s.due_date)}`}
                      {s.late_fine_per_day > 0 && ` · Fine: ₹${s.late_fine_per_day}/day`}
                    </p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-2 text-xs text-ink-secondary">
                      {s.tuition_fee > 0   && <span>Tuition: {INR(s.tuition_fee)}</span>}
                      {s.admission_fee > 0 && <span>Admission: {INR(s.admission_fee)}</span>}
                      {s.transport_fee > 0 && <span>Transport: {INR(s.transport_fee)}</span>}
                      {s.hostel_fee > 0    && <span>Hostel: {INR(s.hostel_fee)}</span>}
                      {s.library_fee > 0   && <span>Library: {INR(s.library_fee)}</span>}
                      {s.exam_fee > 0      && <span>Exam: {INR(s.exam_fee)}</span>}
                      {s.misc_fee > 0      && <span>Misc: {INR(s.misc_fee)}</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-numeric font-bold text-xl text-ink-primary">{INR(s.total_amount)}</p>
                    <div className="flex items-center gap-2 mt-2 justify-end">
                      <button onClick={() => togglePublish(s)}
                        className={`text-xs px-2 py-1 rounded-lg font-medium transition-colors ${
                          s.is_published
                            ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            : "bg-academic-green/10 text-academic-green hover:bg-academic-green/20"
                        }`}>
                        {s.is_published ? "Unpublish" : "Publish"}
                      </button>
                      <button onClick={() => startEdit(s)}
                        className="text-xs px-2 py-1 rounded-lg bg-slate-50 text-ink-secondary hover:bg-slate-100">
                        Edit
                      </button>
                      <button onClick={() => deleteFee(s.id)}
                        className="text-danger hover:text-danger/70 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ASSIGN TAB
// ═══════════════════════════════════════════════════════════════════════════
function AssignTab({ showToast }) {
  const [structures, setStructures] = useState([]);
  const [selectedFs, setSelectedFs] = useState("");
  const [assignments, setAssignments] = useState(null);
  const [students, setStudents] = useState([]);
  const [studentId, setStudentId] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get("/admin-portal/fee-structures/").then(({ data }) => setStructures(data)).catch(() => {});
    api.get("/admin-portal/users/?type=student").then(({ data }) => setStudents(Array.isArray(data) ? data : data.results || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedFs) { setAssignments(null); return; }
    api.get(`/admin-portal/fee-assignments/?fee_structure_id=${selectedFs}`)
      .then(({ data }) => setAssignments(data)).catch(() => setAssignments([]));
  }, [selectedFs]);

  async function assignClass() {
    if (!selectedFs) return;
    setBusy(true);
    try {
      const { data } = await api.post("/admin-portal/fee-assignments/", { fee_structure_id: selectedFs, assign_class: true });
      showToast(data.detail);
      loadAssignments();
    } catch { showToast("Failed.", "error"); }
    finally { setBusy(false); }
  }

  async function assignStudent() {
    if (!selectedFs || !studentId) return;
    setBusy(true);
    try {
      await api.post("/admin-portal/fee-assignments/", { fee_structure_id: selectedFs, student_id: studentId });
      showToast("Student assigned.");
      setStudentId("");
      loadAssignments();
    } catch { showToast("Failed.", "error"); }
    finally { setBusy(false); }
  }

  function loadAssignments() {
    api.get(`/admin-portal/fee-assignments/?fee_structure_id=${selectedFs}`)
      .then(({ data }) => setAssignments(data)).catch(() => {});
  }

  async function removeAssignment(id) {
    try {
      await api.delete(`/admin-portal/fee-assignments/?id=${id}`);
      showToast("Removed.");
      loadAssignments();
    } catch { showToast("Failed.", "error"); }
  }

  return (
    <div className="space-y-5">
      <Card>
        <SectionTitle>Assign Fee Structure to Students</SectionTitle>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-ink-secondary mb-1 block">Select Fee Structure</label>
            <select value={selectedFs} onChange={(e) => setSelectedFs(e.target.value)}
              className="w-full sm:w-80 rounded-xl border border-slate-200 px-3 py-2 text-sm">
              <option value="">— choose —</option>
              {structures.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.term_name} {s.class_name ? `(${s.class_name} ${s.section})` : ""}
                </option>
              ))}
            </select>
          </div>

          {selectedFs && (
            <div className="flex flex-wrap gap-4 items-end">
              {/* Bulk assign */}
              <div>
                <p className="text-xs text-ink-secondary mb-1">Bulk assign all class students</p>
                <button onClick={assignClass} disabled={busy}
                  className="flex items-center gap-2 bg-academic-blue text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-academic-blue/90 disabled:opacity-60">
                  {busy ? <Loader2 size={14} className="animate-spin" /> : <Users size={14} />}
                  Assign Entire Class
                </button>
              </div>
              {/* Individual assign */}
              <div>
                <p className="text-xs text-ink-secondary mb-1">Or assign a specific student</p>
                <div className="flex gap-2">
                  <select value={studentId} onChange={(e) => setStudentId(e.target.value)}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                    <option value="">Select student</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.first_name} {s.last_name} ({s.username})
                      </option>
                    ))}
                  </select>
                  <button onClick={assignStudent} disabled={!studentId || busy}
                    className="bg-academic-green text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-academic-green/90 disabled:opacity-60">
                    Assign
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {selectedFs && (
        <Card>
          <SectionTitle>Students Assigned to This Structure</SectionTitle>
          {!assignments ? <Loader rows={3} /> : assignments.length === 0 ? (
            <EmptyState label="No students assigned yet." />
          ) : (
            <div className="divide-y divide-slate-100">
              {assignments.map((a) => (
                <div key={a.id} className="py-2.5 flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">{a.student_name}</p>
                    <p className="text-xs text-ink-secondary">{a.admission_number || "—"}</p>
                  </div>
                  <button onClick={() => removeAssignment(a.id)} className="text-danger hover:text-danger/70">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CONCESSIONS TAB
// ═══════════════════════════════════════════════════════════════════════════
function ConcessionsTab({ showToast }) {
  const [structures, setStructures] = useState([]);
  const [students, setStudents] = useState([]);
  const [concessions, setConcessions] = useState(null);
  const [form, setForm] = useState({
    student_id: "", fee_structure_id: "", concession_type: "Scholarship",
    discount_amount: 0, discount_percent: 0, reason: "",
  });

  useEffect(() => {
    api.get("/admin-portal/fee-structures/").then(({ data }) => setStructures(data)).catch(() => {});
    api.get("/admin-portal/users/?type=student").then(({ data }) => setStudents(Array.isArray(data) ? data : data.results || [])).catch(() => {});
    loadConcessions();
  }, []);

  function loadConcessions() {
    api.get("/admin-portal/fee-concessions/").then(({ data }) => setConcessions(data)).catch(() => setConcessions([]));
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.student_id) { showToast("Please select a student.", "error"); return; }
    if (!form.fee_structure_id) { showToast("Please select a fee structure.", "error"); return; }
    const discountAmt = parseFloat(form.discount_amount);
    const discountPct = parseFloat(form.discount_percent);
    if (discountAmt < 0 || isNaN(discountAmt)) { showToast("Discount amount must be non-negative.", "error"); return; }
    if (discountPct < 0 || discountPct > 100 || isNaN(discountPct)) { showToast("Discount percent must be between 0 and 100.", "error"); return; }
    if (discountAmt === 0 && discountPct === 0) { showToast("Please enter a discount amount or percentage.", "error"); return; }
    try {
      await api.post("/admin-portal/fee-concessions/", form);
      showToast("Concession applied.");
      setForm({ student_id: "", fee_structure_id: "", concession_type: "Scholarship", discount_amount: 0, discount_percent: 0, reason: "" });
      loadConcessions();
    } catch { showToast("Failed.", "error"); }
  }

  async function remove(id) {
    try {
      await api.delete(`/admin-portal/fee-concessions/?id=${id}`);
      showToast("Removed.");
      loadConcessions();
    } catch { showToast("Failed.", "error"); }
  }

  return (
    <div className="space-y-5">
      <Card>
        <SectionTitle>Apply Concession / Scholarship / Discount</SectionTitle>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-ink-secondary mb-1 block">Student * (*)</label>
              <select required value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                <option value="">Select student</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-ink-secondary mb-1 block">Fee Structure * (*)</label>
              <select required value={form.fee_structure_id} onChange={(e) => setForm({ ...form, fee_structure_id: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                <option value="">Select structure</option>
                {structures.map((s) => <option key={s.id} value={s.id}>{s.term_name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-ink-secondary mb-1 block">Concession Type</label>
              <select value={form.concession_type} onChange={(e) => setForm({ ...form, concession_type: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                {CONCESSION_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-ink-secondary mb-1 block">Flat Discount (₹)</label>
              <input type="number" min="0" value={form.discount_amount}
                onChange={(e) => setForm({ ...form, discount_amount: e.target.value, discount_percent: 0 })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-ink-secondary mb-1 block">OR Percentage (%)</label>
              <input type="number" min="0" max="100" value={form.discount_percent}
                onChange={(e) => setForm({ ...form, discount_percent: e.target.value, discount_amount: 0 })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-ink-secondary mb-1 block">Reason / Notes</label>
              <input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </div>
          </div>
          <button type="submit"
            className="bg-academic-blue text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-academic-blue/90">
            Apply Concession
          </button>
        </form>
      </Card>

      <Card>
        <SectionTitle>All Concessions</SectionTitle>
        {!concessions ? <Loader rows={3} /> : concessions.length === 0 ? (
          <EmptyState label="No concessions applied yet." />
        ) : (
          <div className="divide-y divide-slate-100">
            {concessions.map((c) => (
              <div key={c.id} className="py-3 flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">{c.student_name}</p>
                  <p className="text-xs text-ink-secondary">
                    {c.term_name} · {c.concession_type}
                    {c.reason && ` · ${c.reason}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-numeric font-semibold text-academic-green">
                    {c.discount_percent > 0 ? `${c.discount_percent}%` : INR(c.discount_amount)}
                  </span>
                  <button onClick={() => remove(c.id)} className="text-danger hover:text-danger/70">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// LEDGER TAB
// ═══════════════════════════════════════════════════════════════════════════
function LedgerTab({ showToast }) {
  const [structures, setStructures] = useState([]);
  const [ledger, setLedger] = useState(null);
  const [selectedFs, setSelectedFs] = useState("");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    api.get("/admin-portal/fee-structures/").then(({ data }) => setStructures(data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedFs) { setLedger(null); return; }
    api.get(`/admin-portal/fee-ledger/?fee_structure_id=${selectedFs}`)
      .then(({ data }) => setLedger(data)).catch(() => setLedger([]));
  }, [selectedFs]);

  async function generateLedger() {
    if (!selectedFs) return;
    setGenerating(true);
    try {
      const { data } = await api.post("/admin-portal/fee-ledger/", { fee_structure_id: selectedFs });
      showToast(data.detail);
      const res = await api.get(`/admin-portal/fee-ledger/?fee_structure_id=${selectedFs}`);
      setLedger(res.data);
    } catch { showToast("Failed.", "error"); }
    finally { setGenerating(false); }
  }

  const totals = ledger ? {
    gross:     ledger.reduce((s, r) => s + parseFloat(r.gross_amount || 0), 0),
    conc:      ledger.reduce((s, r) => s + parseFloat(r.concession_amount || 0), 0),
    fine:      ledger.reduce((s, r) => s + parseFloat(r.fine_amount || 0), 0),
    paid:      ledger.reduce((s, r) => s + parseFloat(r.amount_paid || 0), 0),
    balance:   ledger.reduce((s, r) => s + parseFloat(r.balance_due || 0), 0),
  } : null;

  return (
    <div className="space-y-5">
      <Card>
        <SectionTitle>Generate / View Student Ledger</SectionTitle>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs font-medium text-ink-secondary mb-1 block">Fee Structure</label>
            <select value={selectedFs} onChange={(e) => setSelectedFs(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm w-72">
              <option value="">— choose —</option>
              {structures.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.term_name} {s.class_name ? `(${s.class_name} ${s.section})` : ""}
                </option>
              ))}
            </select>
          </div>
          <button onClick={generateLedger} disabled={!selectedFs || generating}
            className="flex items-center gap-2 bg-academic-orange text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-academic-orange/90 disabled:opacity-60">
            {generating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Generate Ledger
          </button>
        </div>
      </Card>

      {selectedFs && (
        <Card>
          {totals && (
            <div className="grid grid-cols-5 gap-3 mb-4 p-3 bg-slate-50 rounded-xl">
              {[
                ["Gross", totals.gross, ""],
                ["Concession", totals.conc, "text-academic-green"],
                ["Fine", totals.fine, "text-danger"],
                ["Paid", totals.paid, "text-academic-blue"],
                ["Balance", totals.balance, "text-amber-600"],
              ].map(([l, v, cls]) => (
                <div key={l} className="text-center">
                  <p className="text-xs text-ink-secondary">{l}</p>
                  <p className={`font-numeric font-bold text-sm mt-0.5 ${cls}`}>{INR(v)}</p>
                </div>
              ))}
            </div>
          )}
          <SectionTitle>Student Ledger</SectionTitle>
          {!ledger ? <Loader rows={4} /> : ledger.length === 0 ? (
            <EmptyState label="No ledger entries. Generate ledger to populate." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-ink-secondary border-b border-slate-100">
                    <th className="text-left py-2 pr-3 font-medium">Student</th>
                    <th className="text-right py-2 pr-3 font-medium">Gross</th>
                    <th className="text-right py-2 pr-3 font-medium">Concession</th>
                    <th className="text-right py-2 pr-3 font-medium">Fine</th>
                    <th className="text-right py-2 pr-3 font-medium">Net Payable</th>
                    <th className="text-right py-2 pr-3 font-medium">Paid</th>
                    <th className="text-right py-2 pr-3 font-medium">Balance</th>
                    <th className="text-right py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {ledger.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 pr-3">
                        <p className="font-medium">{r.student_name}</p>
                        <p className="text-xs text-ink-secondary">{r.admission_number || "—"}</p>
                      </td>
                      <td className="py-2.5 pr-3 text-right font-numeric">{INR(r.gross_amount)}</td>
                      <td className="py-2.5 pr-3 text-right font-numeric text-academic-green">{INR(r.concession_amount)}</td>
                      <td className="py-2.5 pr-3 text-right font-numeric text-danger">{INR(r.fine_amount)}</td>
                      <td className="py-2.5 pr-3 text-right font-numeric font-semibold">{INR(r.net_payable)}</td>
                      <td className="py-2.5 pr-3 text-right font-numeric text-academic-blue">{INR(r.amount_paid)}</td>
                      <td className="py-2.5 pr-3 text-right font-numeric font-semibold">{INR(r.balance_due)}</td>
                      <td className="py-2.5 text-right">
                        <Badge tone={STATUS_TONE[r.status] || "slate"}>{r.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PAYMENTS TAB
// ═══════════════════════════════════════════════════════════════════════════
function PaymentsTab({ showToast }) {
  const [payments, setPayments] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.get("/admin-portal/payments/").then(({ data }) => setPayments(data)).catch(() => setPayments([]));
  }, []);

  const filtered = payments?.filter((p) =>
    !search ||
    p.student_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.transaction_id?.toLowerCase().includes(search.toLowerCase()) ||
    p.term_name?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <SectionTitle>Payment History</SectionTitle>
          <input placeholder="Search student / transaction…" value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm w-64" />
        </div>
        {!payments ? <Loader rows={6} /> : filtered.length === 0 ? <EmptyState label="No payments found." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-ink-secondary border-b border-slate-100">
                  <th className="text-left py-2 pr-3 font-medium">Student</th>
                  <th className="text-left py-2 pr-3 font-medium">Term</th>
                  <th className="text-left py-2 pr-3 font-medium">Transaction ID</th>
                  <th className="text-left py-2 pr-3 font-medium">Method</th>
                  <th className="text-right py-2 pr-3 font-medium">Amount</th>
                  <th className="text-right py-2 pr-3 font-medium">Date</th>
                  <th className="text-right py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 pr-3">
                      <p className="font-medium">{p.student_name}</p>
                      <p className="text-xs text-ink-secondary">{p.admission_number || ""} {p.class_name ? `· ${p.class_name} ${p.section}` : ""}</p>
                    </td>
                    <td className="py-2.5 pr-3 text-ink-secondary">{p.term_name}</td>
                    <td className="py-2.5 pr-3 font-mono text-xs">{p.transaction_id}</td>
                    <td className="py-2.5 pr-3 text-ink-secondary">{p.payment_method || "Online"}</td>
                    <td className="py-2.5 pr-3 text-right font-numeric font-semibold">{INR(p.amount_paid)}</td>
                    <td className="py-2.5 pr-3 text-right text-ink-secondary text-xs">{fmt(p.paid_at)}</td>
                    <td className="py-2.5 text-right">
                      <Badge tone={p.status === "Success" ? "green" : p.status === "Pending" ? "gold" : "red"}>
                        {p.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// REPORTS TAB
// ═══════════════════════════════════════════════════════════════════════════
function ReportsTab({ showToast }) {
  const [reports, setReports] = useState(null);

  useEffect(() => {
    api.get("/admin-portal/fee-reports/").then(({ data }) => setReports(data)).catch(() => setReports({}));
  }, []);

  const maxMonth = reports?.monthly?.length
    ? Math.max(...reports.monthly.map((m) => m.collected))
    : 1;

  return (
    <div className="space-y-5">
      {!reports ? <Loader rows={5} /> : (
        <>
          {/* Monthly chart */}
          {reports.monthly?.length > 0 && (
            <Card>
              <SectionTitle>Monthly Fee Collection (Last 12 Months)</SectionTitle>
              <div className="flex items-end gap-1 h-40 mt-4">
                {reports.monthly.map((m) => (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-1 group">
                    <div className="relative w-full">
                      <div
                        style={{ height: `${Math.max(4, (m.collected / maxMonth) * 120)}px` }}
                        className="bg-academic-blue/80 rounded-t-lg group-hover:bg-academic-blue transition-colors w-full"
                      />
                    </div>
                    <p className="text-[9px] text-ink-secondary leading-tight text-center">{m.month}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Pending by status */}
          {reports.pending?.length > 0 && (
            <Card>
              <SectionTitle>Outstanding Fee Summary</SectionTitle>
              <div className="grid sm:grid-cols-3 gap-4">
                {reports.pending.map((p) => (
                  <div key={p.status} className={`rounded-xl border p-4 ${
                    p.status === "Overdue" ? "border-danger/30 bg-danger/5" :
                    p.status === "Partial" ? "border-amber-300/40 bg-amber-50" :
                    "border-slate-200"
                  }`}>
                    <Badge tone={STATUS_TONE[p.status] || "slate"}>{p.status}</Badge>
                    <p className="font-numeric text-2xl font-bold mt-2">{INR(p.total_balance)}</p>
                    <p className="text-xs text-ink-secondary mt-1">{p.count} student{p.count !== 1 ? "s" : ""}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Fee structure performance */}
          {reports.structures?.length > 0 && (
            <Card>
              <SectionTitle>Collection by Fee Structure</SectionTitle>
              <div className="space-y-3">
                {reports.structures.map((s) => {
                  const pct = s.total_amount > 0 ? Math.min(100, (s.amount_collected / s.total_amount) * 100) : 0;
                  return (
                    <div key={s.id}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium">{s.term_name} <span className="text-xs text-ink-secondary">{s.class_name ? `(${s.class_name} ${s.section})` : ""}</span></span>
                        <span className="font-numeric text-ink-secondary text-xs">{INR(s.amount_collected)} / {INR(s.total_amount)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          style={{ width: `${pct}%` }}
                          className="h-full bg-academic-blue rounded-full transition-all"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORIES TAB
// ═══════════════════════════════════════════════════════════════════════════
function CategoriesTab({ showToast }) {
  const [categories, setCategories] = useState(null);
  const [form, setForm] = useState({ name: "", description: "", sort_order: 99 });

  function load() {
    api.get("/admin-portal/fee-categories/").then(({ data }) => setCategories(data)).catch(() => setCategories([]));
  }
  useEffect(load, []);

  async function submit(e) {
    e.preventDefault();
    try {
      await api.post("/admin-portal/fee-categories/", form);
      showToast("Category added.");
      setForm({ name: "", description: "", sort_order: 99 });
      load();
    } catch { showToast("Failed.", "error"); }
  }

  async function toggleActive(cat) {
    try {
      await api.patch("/admin-portal/fee-categories/", { id: cat.id, ...cat, is_active: !cat.is_active });
      showToast("Updated.");
      load();
    } catch { showToast("Failed.", "error"); }
  }

  async function remove(id) {
    if (!confirm("Delete this category?")) return;
    try {
      await api.delete(`/admin-portal/fee-categories/?id=${id}`);
      showToast("Removed.");
      load();
    } catch { showToast("Failed.", "error"); }
  }

  return (
    <div className="space-y-5">
      <Card>
        <SectionTitle>Add Fee Category</SectionTitle>
        <form onSubmit={submit} className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-medium text-ink-secondary mb-1 block">Category Name * (*)</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Sports Fee"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-secondary mb-1 block">Description</label>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <div className="flex items-end">
            <button type="submit"
              className="bg-academic-blue text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-academic-blue/90 w-full">
              Add Category
            </button>
          </div>
        </form>
      </Card>

      <Card>
        <SectionTitle>Fee Categories</SectionTitle>
        {!categories ? <Loader rows={4} /> : categories.length === 0 ? <EmptyState label="No categories." /> : (
          <div className="divide-y divide-slate-100">
            {categories.map((c) => (
              <div key={c.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-academic-blue/10 flex items-center justify-center">
                    <Tag size={14} className="text-academic-blue" />
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${!c.is_active ? "line-through text-ink-secondary" : ""}`}>{c.name}</p>
                    {c.description && <p className="text-xs text-ink-secondary">{c.description}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={c.is_active ? "green" : "slate"}>{c.is_active ? "Active" : "Inactive"}</Badge>
                  <button onClick={() => toggleActive(c)} className="text-xs text-ink-secondary hover:text-ink-primary">
                    {c.is_active ? "Disable" : "Enable"}
                  </button>
                  <button onClick={() => remove(c.id)} className="text-danger hover:text-danger/70">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
