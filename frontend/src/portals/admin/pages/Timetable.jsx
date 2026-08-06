import { useEffect, useState, useCallback } from "react";
import {
  Calendar, Plus, Trash2, Edit3, AlertTriangle, CheckCircle2, Clock,
  BookOpen, User, Building2, Coffee, Eye, EyeOff, X, RefreshCw,
  BarChart3, FileText, Bell, Shield, ClipboardList, Users, Layers,
  FlaskConical, GraduationCap, Hash, Settings, Send, Filter, Download,
  ChevronRight, Info, Zap, Home, MapPin, MessageSquare, CheckSquare,
  CircleDot, ArrowRight, ListChecks, Loader2,
} from "lucide-react";
import { Card, EmptyState, Loader, SectionTitle, Toast } from "../components/Common";
import api from "../lib/api";
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_SHORT = { Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed", Thursday: "Thu", Friday: "Fri", Saturday: "Sat", Sunday: "Sun" };
const DAY_COLORS = {
  Monday: "#3b82f6", Tuesday: "#8b5cf6", Wednesday: "#10b981",
  Thursday: "#f59e0b", Friday: "#ef4444", Saturday: "#6366f1", Sunday: "#94a3b8",
};

const EVENT_TYPES = ["Holiday", "ExamDay", "Event", "Workshop", "SportsDay"];
const DAY_TYPES = ["FullDay", "HalfDay"];
const AUDIENCES = ["all", "students", "parents", "teachers"];
const REPORT_TYPES = [
  { value: "class_timetable", label: "Class Timetable" },
  { value: "teacher_workload", label: "Teacher Workload" },
  { value: "subject_distribution", label: "Subject Distribution" },
  { value: "classroom_utilization", label: "Classroom Utilization" },
  { value: "lab_utilization", label: "Lab Utilization" },
  { value: "free_periods", label: "Free Periods" },
];
const ROOM_TYPES = ["Classroom", "Lab", "Library", "Auditorium", "Activity Room"];
const APPROVAL_BADGE = { Draft: "slate", Submitted: "blue", Approved: "green", Rejected: "red" };
const NOTIFICATION_TYPES = ["timetable_change", "substitute_assignment", "exam_schedule", "general"];

const WORKFLOW_STEPS = [
  { key: "academic_calendar", label: "Academic Calendar", icon: Calendar, tab: 1 },
  { key: "working_days", label: "Working Days", icon: Clock, tab: 2 },
  { key: "school_timings", label: "School Timings", icon: Settings, tab: 3 },
  { key: "periods", label: "Period Management", icon: Hash, tab: 4 },
  { key: "subject_allocations", label: "Subject Allocations", icon: BookOpen, tab: 5 },
  { key: "teacher_allocations", label: "Teacher Allocations", icon: GraduationCap, tab: 6 },
  { key: "classroom_allocations", label: "Classroom Allocations", icon: Building2, tab: 7 },
  { key: "timetable_entries", label: "Timetable Entries", icon: Layers, tab: 8 },
  { key: "approvals", label: "Approvals", icon: Shield, tab: 10 },
  { key: "substitutes", label: "Substitutes", icon: Users, tab: 9 },
];

const TABS = [
  { key: "dashboard", label: "Dashboard", icon: BarChart3 },
  { key: "calendar", label: "Academic Calendar", icon: Calendar },
  { key: "working-days", label: "Working Days", icon: Clock },
  { key: "school-timings", label: "School Timings", icon: Settings },
  { key: "periods", label: "Periods", icon: Hash },
  { key: "subject-alloc", label: "Subjects", icon: BookOpen },
  { key: "teacher-alloc", label: "Teachers", icon: GraduationCap },
  { key: "classroom-alloc", label: "Classrooms", icon: Building2 },
  { key: "grid", label: "Timetable Grid", icon: Layers },
  { key: "substitutes", label: "Substitutes", icon: Users },
  { key: "approvals", label: "Approvals", icon: Shield },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "reports", label: "Reports", icon: FileText },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
  { key: "audit", label: "Audit Logs", icon: ClipboardList },
];

function fmt(t) {
  if (!t) return "";
  return t.slice(0, 5);
}

function todayName() {
  return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][new Date().getDay()];
}

function Badge({ tone = "slate", children }) {
  const tones = {
    slate: "bg-slate-100 text-slate-600",
    green: "bg-emerald-100 text-emerald-700",
    orange: "bg-orange-100 text-orange-700",
    red: "bg-red-100 text-red-700",
    gold: "bg-amber-100 text-amber-700",
    blue: "bg-blue-100 text-blue-700",
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }} onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <p className="text-ink-primary font-semibold mb-4">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-ink-secondary hover:bg-slate-50">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600">Confirm</button>
        </div>
      </div>
    </div>
  );
}

function FormField({ label, children, className = "" }) {
  return (
    <div className={className}>
      <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">{label}</label>
      {children}
    </div>
  );
}

function InputField({ label, ...props }) {
  return (
    <FormField label={label}>
      <input {...props} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-academic-blue/30" />
    </FormField>
  );
}

function SelectField({ label, options = [], placeholder, ...props }) {
  return (
    <FormField label={label}>
      <select {...props} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-academic-blue/30">
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => (
          <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
        ))}
      </select>
    </FormField>
  );
}

function useToast() {
  const [toast, setToast] = useState(null);
  const show = (message, tone = "success") => setToast({ message, tone });
  const ToastEl = toast ? <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} /> : null;
  return { show, ToastEl };
}

function useConfirm() {
  const [state, setState] = useState(null);
  const confirm = (message) => new Promise(resolve => setState({ message, resolve }));
  const ConfirmEl = state ? (
    <ConfirmDialog
      message={state.message}
      onConfirm={() => { state.resolve(true); setState(null); }}
      onCancel={() => { state.resolve(false); setState(null); }}
    />
  ) : null;
  return { confirm, ConfirmEl };
}

function Spinner({ size = 20 }) {
  return <Loader2 size={size} className="animate-spin text-academic-blue" />;
}

function DataTable({ columns, data, emptyLabel, onRowClick }) {
  if (!data) return <Loader rows={4} />;
  if (data.length === 0) return <EmptyState label={emptyLabel || "No data found."} />;
  return (
    <div className="overflow-x-auto -mx-5">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            {columns.map((col, i) => (
              <th key={i} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, ri) => (
            <tr key={row.id || ri} className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors ${onRowClick ? "cursor-pointer" : ""}`} onClick={() => onRowClick?.(row)}>
              {columns.map((col, ci) => (
                <td key={ci} className="px-5 py-3 text-ink-primary whitespace-nowrap">
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
// ═══════════════════════════════════════════════════════════════════════════════
// TAB 0: WORKFLOW DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
function TabWorkflowDashboard({ onNavigate }) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get("/admin-portal/timetable/workflow-config/")
      .then(({ data }) => setConfig(data))
      .catch(() => setConfig({}))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader rows={5} />;

  const completedCount = WORKFLOW_STEPS.filter(s => {
    const val = config?.[s.key];
    if (typeof val === "number") return val > 0;
    if (typeof val === "boolean") return val;
    return !!val;
  }).length;
  const progress = Math.round((completedCount / WORKFLOW_STEPS.length) * 100);

  return (
    <div className="space-y-6">
      <Card>
        <SectionTitle>Timetable Setup Progress</SectionTitle>
        <div className="mb-4">
          <div className="flex justify-between text-xs text-ink-secondary mb-1">
            <span>{completedCount} of {WORKFLOW_STEPS.length} steps completed</span>
            <span className="font-semibold">{progress}%</span>
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-academic-blue to-emerald-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        {WORKFLOW_STEPS.map((step) => {
          const val = config?.[step.key];
          const done = (typeof val === "number" ? val > 0 : typeof val === "boolean" ? val : !!val);
          const Icon = step.icon;
          return (
            <button
              key={step.key}
              onClick={() => onNavigate(step.tab)}
              className="flex items-center gap-4 p-4 bg-white rounded-card shadow-card hover:shadow-raised transition-all text-left group"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${done ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
                {done ? <CheckCircle2 size={20} /> : <Icon size={20} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-ink-primary">{step.label}</p>
                <p className="text-xs text-ink-secondary">{done ? "Completed" : "Not started"}</p>
              </div>
              <ChevronRight size={16} className="text-slate-300 group-hover:text-academic-blue transition-colors shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 1: ACADEMIC CALENDAR
// ═══════════════════════════════════════════════════════════════════════════════
function TabAcademicCalendar({ toast }) {
  const [calendars, setCalendars] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ academic_year: "", term_name: "", start_date: "", end_date: "", is_current: false });
  const [selectedCal, setSelectedCal] = useState(null);
  const [events, setEvents] = useState(null);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [editEvent, setEditEvent] = useState(null);
  const [eventForm, setEventForm] = useState({ event_date: "", event_name: "", event_type: "Holiday", is_working_day: false });
  const [savingEvent, setSavingEvent] = useState(false);
  const { confirm, ConfirmEl } = useConfirm();

  const load = useCallback(() => {
    setLoading(true);
    api.get("/admin-portal/timetable/calendar/")
      .then(({ data }) => setCalendars(Array.isArray(data) ? data : data.results || []))
      .catch(() => setCalendars([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadEvents = useCallback((calId) => {
    setLoadingEvents(true);
    api.get(`/admin-portal/timetable/calendar/events/?calendar_id=${calId}`)
      .then(({ data }) => setEvents(Array.isArray(data) ? data : data.results || []))
      .catch(() => setEvents([]))
      .finally(() => setLoadingEvents(false));
  }, []);

  useEffect(() => {
    if (selectedCal) loadEvents(selectedCal);
  }, [selectedCal, loadEvents]);

  function openForm(item = null) {
    if (item) {
      setEditItem(item);
      setForm({ academic_year: item.academic_year, term_name: item.term_name || "", start_date: item.start_date || "", end_date: item.end_date || "", is_current: item.is_current || false });
    } else {
      setEditItem(null);
      setForm({ academic_year: "", term_name: "", start_date: "", end_date: "", is_current: false });
    }
    setShowForm(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editItem) {
        await api.put(`/admin-portal/timetable/calendar/${editItem.id}/`, form);
        toast.show("Calendar updated.");
      } else {
        await api.post("/admin-portal/timetable/calendar/", form);
        toast.show("Calendar created.");
      }
      setShowForm(false);
      load();
    } catch (err) {
      toast.show(err?.response?.data?.detail || "Failed to save.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    const ok = await confirm("Delete this academic year and all its events?");
    if (!ok) return;
    try {
      await api.delete(`/admin-portal/timetable/calendar/${id}/`);
      toast.show("Deleted.");
      if (selectedCal === id) { setSelectedCal(null); setEvents(null); }
      load();
    } catch (err) {
      toast.show(err?.response?.data?.detail || "Delete failed.", "error");
    }
  }

  function openEventForm(item = null) {
    if (item) {
      setEditEvent(item);
      setEventForm({ event_date: item.event_date || "", event_name: item.event_name || "", event_type: item.event_type || "Holiday", is_working_day: item.is_working_day || false });
    } else {
      setEditEvent(null);
      setEventForm({ event_date: "", event_name: "", event_type: "Holiday", is_working_day: false });
    }
    setShowEventForm(true);
  }

  async function handleSaveEvent(e) {
    e.preventDefault();
    setSavingEvent(true);
    try {
      const payload = { ...eventForm, calendar: selectedCal };
      if (editEvent) {
        await api.put(`/admin-portal/timetable/calendar/events/${editEvent.id}/`, payload);
        toast.show("Event updated.");
      } else {
        await api.post("/admin-portal/timetable/calendar/events/", payload);
        toast.show("Event added.");
      }
      setShowEventForm(false);
      loadEvents(selectedCal);
    } catch (err) {
      toast.show(err?.response?.data?.detail || "Failed to save event.", "error");
    } finally {
      setSavingEvent(false);
    }
  }

  async function handleDeleteEvent(id) {
    const ok = await confirm("Delete this event?");
    if (!ok) return;
    try {
      await api.delete(`/admin-portal/timetable/calendar/events/${id}/`);
      toast.show("Event deleted.");
      loadEvents(selectedCal);
    } catch (err) {
      toast.show(err?.response?.data?.detail || "Delete failed.", "error");
    }
  }

  return (
    <div className="space-y-6">
      {ConfirmEl}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <SectionTitle>Academic Years</SectionTitle>
          <button onClick={() => openForm()} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-academic-blue text-white text-sm font-semibold hover:bg-academic-blue/90 transition-colors">
            <Plus size={16} /> Add Academic Year
          </button>
        </div>
        <DataTable
          columns={[
            { key: "academic_year", label: "Year", render: r => <span className="font-semibold">{r.academic_year}</span> },
            { key: "term_name", label: "Term" },
            { key: "start_date", label: "Start Date" },
            { key: "end_date", label: "End Date" },
            { key: "is_current", label: "Status", render: r => r.is_current ? <Badge tone="green">Current</Badge> : <Badge tone="slate">Inactive</Badge> },
            {
              key: "actions", label: "", render: r => (
                <div className="flex gap-1">
                  <button onClick={(e) => { e.stopPropagation(); openForm(r); }} className="p-1.5 rounded-lg text-slate-400 hover:text-academic-blue hover:bg-blue-50"><Edit3 size={14} /></button>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50"><Trash2 size={14} /></button>
                  <button onClick={(e) => { e.stopPropagation(); setSelectedCal(selectedCal === r.id ? null : r.id); }} className={`p-1.5 rounded-lg ${selectedCal === r.id ? "text-academic-blue bg-blue-50" : "text-slate-400 hover:text-academic-blue hover:bg-blue-50"}`}><Calendar size={14} /></button>
                </div>
              )
            },
          ]}
          data={calendars}
          emptyLabel="No academic years defined."
        />
      </Card>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }} onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="bg-academic-blue px-6 py-4 flex items-center justify-between shrink-0">
              <p className="font-bold text-white text-base">{editItem ? "Edit" : "Add"} Academic Year</p>
              <button onClick={() => setShowForm(false)} className="text-white/70 hover:text-white"><X size={18} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <InputField label="Academic Year" required value={form.academic_year} onChange={e => setForm(f => ({ ...f, academic_year: e.target.value }))} placeholder="2025-26" />
                <InputField label="Term Name" value={form.term_name} onChange={e => setForm(f => ({ ...f, term_name: e.target.value }))} placeholder="Term 1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <InputField label="Start Date" required type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
                <InputField label="End Date" required type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.is_current} onChange={e => setForm(f => ({ ...f, is_current: e.target.checked }))} className="rounded border-slate-300" />
                <span className="text-sm font-medium text-ink-primary">Set as current academic year</span>
              </label>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-ink-secondary hover:bg-slate-50">Cancel</button>
                <button disabled={saving} className="flex-1 rounded-xl bg-academic-blue text-white py-2.5 text-sm font-semibold hover:bg-academic-blue/90 disabled:opacity-60">
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedCal && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <SectionTitle>Calendar Events</SectionTitle>
            <button onClick={() => openEventForm()} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-academic-blue text-white text-sm font-semibold hover:bg-academic-blue/90 transition-colors">
              <Plus size={16} /> Add Event
            </button>
          </div>
          {loadingEvents ? <Loader rows={3} /> : (
            <DataTable
              columns={[
                { key: "event_date", label: "Date" },
                { key: "event_name", label: "Event", render: r => <span className="font-semibold">{r.event_name}</span> },
                { key: "event_type", label: "Type", render: r => {
                  const t = { Holiday: "red", ExamDay: "gold", Event: "blue", Workshop: "orange", SportsDay: "green" };
                  return <Badge tone={t[r.event_type] || "slate"}>{r.event_type}</Badge>;
                }},
                { key: "is_working_day", label: "Working Day", render: r => r.is_working_day ? <Badge tone="green">Yes</Badge> : <Badge tone="slate">No</Badge> },
                {
                  key: "actions", label: "", render: r => (
                    <div className="flex gap-1">
                      <button onClick={(e) => { e.stopPropagation(); openEventForm(r); }} className="p-1.5 rounded-lg text-slate-400 hover:text-academic-blue hover:bg-blue-50"><Edit3 size={14} /></button>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteEvent(r.id); }} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50"><Trash2 size={14} /></button>
                    </div>
                  )
                },
              ]}
              data={events}
              emptyLabel="No events for this calendar."
            />
          )}
        </Card>
      )}

      {showEventForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }} onClick={e => e.target === e.currentTarget && setShowEventForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="bg-academic-blue px-6 py-4 flex items-center justify-between shrink-0">
              <p className="font-bold text-white text-base">{editEvent ? "Edit" : "Add"} Event</p>
              <button onClick={() => setShowEventForm(false)} className="text-white/70 hover:text-white"><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveEvent} className="p-6 space-y-4 overflow-y-auto">
              <InputField label="Event Date" required type="date" value={eventForm.event_date} onChange={e => setEventForm(f => ({ ...f, event_date: e.target.value }))} />
              <InputField label="Event Name" required value={eventForm.event_name} onChange={e => setEventForm(f => ({ ...f, event_name: e.target.value }))} placeholder="Republic Day" />
              <SelectField label="Event Type" value={eventForm.event_type} onChange={e => setEventForm(f => ({ ...f, event_type: e.target.value }))} options={EVENT_TYPES.map(t => ({ value: t, label: t }))} />
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={eventForm.is_working_day} onChange={e => setEventForm(f => ({ ...f, is_working_day: e.target.checked }))} className="rounded border-slate-300" />
                <span className="text-sm font-medium text-ink-primary">Is working day?</span>
              </label>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowEventForm(false)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-ink-secondary hover:bg-slate-50">Cancel</button>
                <button disabled={savingEvent} className="flex-1 rounded-xl bg-academic-blue text-white py-2.5 text-sm font-semibold hover:bg-academic-blue/90 disabled:opacity-60">
                  {savingEvent ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
// ═══════════════════════════════════════════════════════════════════════════════
// TAB 2: WORKING DAYS
// ═══════════════════════════════════════════════════════════════════════════════
function TabWorkingDays({ toast, academicYear }) {
  const [days, setDays] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get(`/admin-portal/timetable/working-days/?academic_year=${academicYear}`)
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : data.results || [];
        const mapped = DAYS.map(d => {
          const found = list.find(x => x.day_of_week === d);
          return found || { day_of_week: d, is_working: ["Saturday", "Sunday"].indexOf(d) === -1, is_half_day: false, start_time: "08:00", end_time: "15:00" };
        });
        setDays(mapped);
      })
      .catch(() => setDays(DAYS.map(d => ({ day_of_week: d, is_working: ["Saturday", "Sunday"].indexOf(d) === -1, is_half_day: false, start_time: "08:00", end_time: "15:00" }))))
      .finally(() => setLoading(false));
  }, [academicYear]);

  function toggleField(index, field) {
    setDays(prev => prev.map((d, i) => i === index ? { ...d, [field]: !d[field] } : d));
  }

  function setField(index, field, value) {
    setDays(prev => prev.map((d, i) => i === index ? { ...d, [field]: value } : d));
  }

  async function handleSaveAll() {
    setSaving(true);
    try {
      await api.post("/admin-portal/timetable/working-days/bulk-update/", { academic_year: academicYear, days });
      toast.show("Working days saved.");
    } catch (err) {
      toast.show(err?.response?.data?.detail || "Failed to save.", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loader rows={4} />;

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center justify-between mb-4">
          <SectionTitle>Working Days Configuration</SectionTitle>
          <button onClick={handleSaveAll} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-academic-blue text-white text-sm font-semibold hover:bg-academic-blue/90 disabled:opacity-60 transition-colors">
            {saving ? <Spinner size={16} /> : <CheckCircle2 size={16} />}
            {saving ? "Saving..." : "Save All"}
          </button>
        </div>
        <div className="overflow-x-auto -mx-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Day</th>
                <th className="px-5 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Working</th>
                <th className="px-5 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Half Day</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Start Time</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">End Time</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              {days.map((d, i) => (
                <tr key={d.day_of_week} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="px-5 py-3 font-semibold text-ink-primary">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: DAY_COLORS[d.day_of_week] }} />
                      {d.day_of_week}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <button onClick={() => toggleField(i, "is_working")} className={`w-11 h-6 rounded-full transition-colors flex items-center px-1 ${d.is_working ? "bg-emerald-500" : "bg-slate-200"}`}>
                      <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${d.is_working ? "translate-x-5" : ""}`} />
                    </button>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <button disabled={!d.is_working} onClick={() => toggleField(i, "is_half_day")} className={`w-11 h-6 rounded-full transition-colors flex items-center px-1 ${d.is_half_day ? "bg-amber-400" : "bg-slate-200"} ${!d.is_working ? "opacity-40" : ""}`}>
                      <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${d.is_half_day ? "translate-x-5" : ""}`} />
                    </button>
                  </td>
                  <td className="px-5 py-3">
                    <input type="time" value={d.start_time} onChange={e => setField(i, "start_time", e.target.value)} disabled={!d.is_working} className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-academic-blue/30 disabled:opacity-40" />
                  </td>
                  <td className="px-5 py-3">
                    <input type="time" value={d.end_time} onChange={e => setField(i, "end_time", e.target.value)} disabled={!d.is_working} className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-academic-blue/30 disabled:opacity-40" />
                  </td>
                  <td className="px-5 py-3">
                    {!d.is_working ? <Badge tone="slate">Holiday</Badge> : d.is_half_day ? <Badge tone="gold">Half Day</Badge> : <Badge tone="green">Full Day</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 3: SCHOOL TIMINGS
// ═══════════════════════════════════════════════════════════════════════════════
function TabSchoolTimings({ toast, academicYear }) {
  const [timings, setTimings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ academic_year: academicYear, day_type: "FullDay", opening_time: "08:00", closing_time: "15:00", assembly_time: "", lunch_start: "12:00", lunch_end: "12:45", tea_break_start: "", tea_break_end: "" });
  const { confirm, ConfirmEl } = useConfirm();

  const load = useCallback(() => {
    setLoading(true);
    api.get("/admin-portal/timetable/school-timings/")
      .then(({ data }) => setTimings(Array.isArray(data) ? data : data.results || []))
      .catch(() => setTimings([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  function openForm(item = null) {
    if (item) {
      setEditItem(item);
      setForm({
        academic_year: item.academic_year || academicYear, day_type: item.day_type || "FullDay",
        opening_time: item.opening_time || "08:00", closing_time: item.closing_time || "15:00",
        assembly_time: item.assembly_time || "", lunch_start: item.lunch_start || "12:00", lunch_end: item.lunch_end || "12:45",
        tea_break_start: item.tea_break_start || "", tea_break_end: item.tea_break_end || "",
      });
    } else {
      setEditItem(null);
      setForm({ academic_year: academicYear, day_type: "FullDay", opening_time: "08:00", closing_time: "15:00", assembly_time: "", lunch_start: "12:00", lunch_end: "12:45", tea_break_start: "", tea_break_end: "" });
    }
    setShowForm(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editItem) {
        await api.put(`/admin-portal/timetable/school-timings/${editItem.id}/`, form);
        toast.show("Timing updated.");
      } else {
        await api.post("/admin-portal/timetable/school-timings/", form);
        toast.show("Timing created.");
      }
      setShowForm(false);
      load();
    } catch (err) {
      toast.show(err?.response?.data?.detail || "Failed to save.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    const ok = await confirm("Delete this timing configuration?");
    if (!ok) return;
    try {
      await api.delete(`/admin-portal/timetable/school-timings/${id}/`);
      toast.show("Deleted.");
      load();
    } catch (err) {
      toast.show(err?.response?.data?.detail || "Delete failed.", "error");
    }
  }

  return (
    <div className="space-y-4">
      {ConfirmEl}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <SectionTitle>School Timings</SectionTitle>
          <button onClick={() => openForm()} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-academic-blue text-white text-sm font-semibold hover:bg-academic-blue/90 transition-colors">
            <Plus size={16} /> Add Timing
          </button>
        </div>
        <DataTable
          columns={[
            { key: "academic_year", label: "Year" },
            { key: "day_type", label: "Day Type", render: r => <Badge tone={r.day_type === "FullDay" ? "green" : "gold"}>{r.day_type}</Badge> },
            { key: "opening_time", label: "Opens", render: r => fmt(r.opening_time) },
            { key: "closing_time", label: "Closes", render: r => fmt(r.closing_time) },
            { key: "assembly_time", label: "Assembly", render: r => fmt(r.assembly_time) || "\u2014" },
            { key: "lunch_start", label: "Lunch", render: r => `${fmt(r.lunch_start)}\u2013${fmt(r.lunch_end)}` },
            { key: "tea_break_start", label: "Tea Break", render: r => r.tea_break_start ? `${fmt(r.tea_break_start)}\u2013${fmt(r.tea_break_end)}` : "\u2014" },
            {
              key: "actions", label: "", render: r => (
                <div className="flex gap-1">
                  <button onClick={(e) => { e.stopPropagation(); openForm(r); }} className="p-1.5 rounded-lg text-slate-400 hover:text-academic-blue hover:bg-blue-50"><Edit3 size={14} /></button>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50"><Trash2 size={14} /></button>
                </div>
              )
            },
          ]}
          data={timings}
          emptyLabel="No school timings defined."
        />
      </Card>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }} onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="bg-academic-blue px-6 py-4 flex items-center justify-between shrink-0">
              <p className="font-bold text-white text-base">{editItem ? "Edit" : "Add"} School Timing</p>
              <button onClick={() => setShowForm(false)} className="text-white/70 hover:text-white"><X size={18} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <InputField label="Academic Year" required value={form.academic_year} onChange={e => setForm(f => ({ ...f, academic_year: e.target.value }))} />
                <SelectField label="Day Type" value={form.day_type} onChange={e => setForm(f => ({ ...f, day_type: e.target.value }))} options={DAY_TYPES.map(t => ({ value: t, label: t }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <InputField label="Opening Time" type="time" required value={form.opening_time} onChange={e => setForm(f => ({ ...f, opening_time: e.target.value }))} />
                <InputField label="Closing Time" type="time" required value={form.closing_time} onChange={e => setForm(f => ({ ...f, closing_time: e.target.value }))} />
              </div>
              <InputField label="Assembly Time" type="time" value={form.assembly_time} onChange={e => setForm(f => ({ ...f, assembly_time: e.target.value }))} />
              <div className="grid grid-cols-2 gap-3">
                <InputField label="Lunch Start" type="time" value={form.lunch_start} onChange={e => setForm(f => ({ ...f, lunch_start: e.target.value }))} />
                <InputField label="Lunch End" type="time" value={form.lunch_end} onChange={e => setForm(f => ({ ...f, lunch_end: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <InputField label="Tea Break Start" type="time" value={form.tea_break_start} onChange={e => setForm(f => ({ ...f, tea_break_start: e.target.value }))} />
                <InputField label="Tea Break End" type="time" value={form.tea_break_end} onChange={e => setForm(f => ({ ...f, tea_break_end: e.target.value }))} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-ink-secondary hover:bg-slate-50">Cancel</button>
                <button disabled={saving} className="flex-1 rounded-xl bg-academic-blue text-white py-2.5 text-sm font-semibold hover:bg-academic-blue/90 disabled:opacity-60">
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 4: PERIOD MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════
function TabPeriods({ toast, academicYear }) {
  const [periods, setPeriods] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [form, setForm] = useState({ period_number: 1, period_name: "", start_time: "08:00", end_time: "08:45", is_break: false, is_active: true });
  const { confirm, ConfirmEl } = useConfirm();

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/admin-portal/timetable/periods/?academic_year=${academicYear}`)
      .then(({ data }) => setPeriods(Array.isArray(data) ? data : data.results || []))
      .catch(() => setPeriods([]))
      .finally(() => setLoading(false));
  }, [academicYear]);

  useEffect(() => { load(); }, [load]);

  function openForm(item = null) {
    if (item) {
      setEditItem(item);
      setForm({ period_number: item.period_number || 1, period_name: item.period_name || "", start_time: fmt(item.start_time) || "08:00", end_time: fmt(item.end_time) || "08:45", is_break: item.is_break || false, is_active: item.is_active !== false });
    } else {
      setEditItem(null);
      setForm({ period_number: (periods?.length || 0) + 1, period_name: "", start_time: "08:00", end_time: "08:45", is_break: false, is_active: true });
    }
    setShowForm(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, academic_year: academicYear };
      if (editItem) {
        await api.put(`/admin-portal/timetable/periods/${editItem.id}/`, payload);
        toast.show("Period updated.");
      } else {
        await api.post("/admin-portal/timetable/periods/", payload);
        toast.show("Period added.");
      }
      setShowForm(false);
      load();
    } catch (err) {
      toast.show(err?.response?.data?.detail || "Failed to save.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    const ok = await confirm("Delete this period?");
    if (!ok) return;
    try {
      await api.delete(`/admin-portal/timetable/periods/${id}/`);
      toast.show("Deleted.");
      load();
    } catch (err) {
      toast.show(err?.response?.data?.detail || "Delete failed.", "error");
    }
  }

  async function handleGenerateDefaults() {
    const ok = await confirm("Generate default periods for this academic year?");
    if (!ok) return;
    setGenerating(true);
    try {
      await api.post("/admin-portal/timetable/periods/generate-defaults/", { academic_year: academicYear });
      toast.show("Default periods generated.");
      load();
    } catch (err) {
      toast.show(err?.response?.data?.detail || "Failed to generate.", "error");
    } finally {
      setGenerating(false);
    }
  }

  async function handleToggleActive(item) {
    try {
      await api.put(`/admin-portal/timetable/periods/${item.id}/`, { is_active: !item.is_active });
      load();
    } catch (err) {
      toast.show("Failed to toggle.", "error");
    }
  }

  return (
    <div className="space-y-4">
      {ConfirmEl}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <SectionTitle>Period Configuration</SectionTitle>
          <div className="flex gap-2">
            <button onClick={handleGenerateDefaults} disabled={generating} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-ink-primary hover:bg-slate-50 disabled:opacity-60 transition-colors">
              {generating ? <Spinner size={16} /> : <Zap size={16} />}
              {generating ? "Generating..." : "Generate Defaults"}
            </button>
            <button onClick={() => openForm()} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-academic-blue text-white text-sm font-semibold hover:bg-academic-blue/90 transition-colors">
              <Plus size={16} /> Add Period
            </button>
          </div>
        </div>
        <DataTable
          columns={[
            { key: "period_number", label: "#", render: r => <span className="font-mono font-bold text-academic-blue">P{r.period_number}</span> },
            { key: "period_name", label: "Name", render: r => r.period_name || (r.is_break ? "Break" : `Period ${r.period_number}`) },
            { key: "start_time", label: "Start", render: r => fmt(r.start_time) },
            { key: "end_time", label: "End", render: r => fmt(r.end_time) },
            { key: "is_break", label: "Type", render: r => r.is_break ? <Badge tone="gold">Break</Badge> : <Badge tone="blue">Period</Badge> },
            { key: "is_active", label: "Active", render: r => (
              <button onClick={(e) => { e.stopPropagation(); handleToggleActive(r); }} className={`w-11 h-6 rounded-full transition-colors flex items-center px-1 ${r.is_active ? "bg-emerald-500" : "bg-slate-200"}`}>
                <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${r.is_active ? "translate-x-5" : ""}`} />
              </button>
            )},
            {
              key: "actions", label: "", render: r => (
                <div className="flex gap-1">
                  <button onClick={(e) => { e.stopPropagation(); openForm(r); }} className="p-1.5 rounded-lg text-slate-400 hover:text-academic-blue hover:bg-blue-50"><Edit3 size={14} /></button>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50"><Trash2 size={14} /></button>
                </div>
              )
            },
          ]}
          data={periods}
          emptyLabel="No periods defined."
        />
      </Card>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }} onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="bg-academic-blue px-6 py-4 flex items-center justify-between shrink-0">
              <p className="font-bold text-white text-base">{editItem ? "Edit" : "Add"} Period</p>
              <button onClick={() => setShowForm(false)} className="text-white/70 hover:text-white"><X size={18} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto">
              <label className="flex items-center gap-3 cursor-pointer">
                <div onClick={() => setForm(f => ({ ...f, is_break: !f.is_break }))} className={`w-11 h-6 rounded-full transition-colors flex items-center px-1 cursor-pointer ${form.is_break ? "bg-amber-400" : "bg-slate-200"}`}>
                  <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${form.is_break ? "translate-x-5" : ""}`} />
                </div>
                <span className="text-sm font-medium text-ink-primary">This is a break / recess</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <InputField label="Period #" required type="number" min={1} max={20} value={form.period_number} onChange={e => setForm(f => ({ ...f, period_number: Number(e.target.value) }))} />
                <InputField label="Name" value={form.period_name} onChange={e => setForm(f => ({ ...f, period_name: e.target.value }))} placeholder={form.is_break ? "Lunch" : "Period 1"} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <InputField label="Start Time" type="time" required value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} />
                <InputField label="End Time" type="time" required value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-ink-secondary hover:bg-slate-50">Cancel</button>
                <button disabled={saving} className="flex-1 rounded-xl bg-academic-blue text-white py-2.5 text-sm font-semibold hover:bg-academic-blue/90 disabled:opacity-60">
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
// ═══════════════════════════════════════════════════════════════════════════════
// TAB 5: SUBJECT ALLOCATION
// ═══════════════════════════════════════════════════════════════════════════════
function TabSubjectAllocation({ toast, meta }) {
  const [allocations, setAllocations] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ academic_year: "", class_id: "", subject_id: "", weekly_periods: 5, is_mandatory: true, is_elective: false });
  const { confirm, ConfirmEl } = useConfirm();

  const load = useCallback(() => {
    setLoading(true);
    api.get("/admin-portal/timetable/subject-allocations/")
      .then(({ data }) => setAllocations(Array.isArray(data) ? data : data.results || []))
      .catch(() => setAllocations([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  function openForm(item = null) {
    if (item) {
      setEditItem(item);
      setForm({ academic_year: item.academic_year || "", class_id: item.class_id || "", subject_id: item.subject_id || "", weekly_periods: item.weekly_periods || 5, is_mandatory: item.is_mandatory !== false, is_elective: item.is_elective || false });
    } else {
      setEditItem(null);
      setForm({ academic_year: meta?.academic_years?.[0] || "", class_id: meta?.classes?.[0]?.id || "", subject_id: "", weekly_periods: 5, is_mandatory: true, is_elective: false });
    }
    setShowForm(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editItem) {
        await api.put(`/admin-portal/timetable/subject-allocations/${editItem.id}/`, form);
        toast.show("Allocation updated.");
      } else {
        await api.post("/admin-portal/timetable/subject-allocations/", form);
        toast.show("Allocation created.");
      }
      setShowForm(false);
      load();
    } catch (err) {
      toast.show(err?.response?.data?.detail || "Failed to save.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    const ok = await confirm("Delete this allocation?");
    if (!ok) return;
    try {
      await api.delete(`/admin-portal/timetable/subject-allocations/${id}/`);
      toast.show("Deleted.");
      load();
    } catch (err) {
      toast.show(err?.response?.data?.detail || "Delete failed.", "error");
    }
  }

  return (
    <div className="space-y-4">
      {ConfirmEl}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <SectionTitle>Subject Allocations</SectionTitle>
          <button onClick={() => openForm()} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-academic-blue text-white text-sm font-semibold hover:bg-academic-blue/90 transition-colors">
            <Plus size={16} /> Add Allocation
          </button>
        </div>
        <DataTable
          columns={[
            { key: "class_name", label: "Class", render: r => r.class_name || r.class_label || `Class ${r.class_id}` },
            { key: "subject_name", label: "Subject", render: r => <span className="font-semibold">{r.subject_name || r.subject_label || `Subject ${r.subject_id}`}</span> },
            { key: "weekly_periods", label: "Weekly Periods", render: r => <span className="font-mono font-bold">{r.weekly_periods}</span> },
            { key: "is_mandatory", label: "Mandatory", render: r => r.is_mandatory ? <Badge tone="blue">Mandatory</Badge> : <Badge tone="slate">Optional</Badge> },
            { key: "is_elective", label: "Elective", render: r => r.is_elective ? <Badge tone="gold">Elective</Badge> : "\u2014" },
            {
              key: "actions", label: "", render: r => (
                <div className="flex gap-1">
                  <button onClick={(e) => { e.stopPropagation(); openForm(r); }} className="p-1.5 rounded-lg text-slate-400 hover:text-academic-blue hover:bg-blue-50"><Edit3 size={14} /></button>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50"><Trash2 size={14} /></button>
                </div>
              )
            },
          ]}
          data={allocations}
          emptyLabel="No subject allocations defined."
        />
      </Card>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }} onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="bg-academic-blue px-6 py-4 flex items-center justify-between shrink-0">
              <p className="font-bold text-white text-base">{editItem ? "Edit" : "Add"} Subject Allocation</p>
              <button onClick={() => setShowForm(false)} className="text-white/70 hover:text-white"><X size={18} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto">
              <InputField label="Academic Year" required value={form.academic_year} onChange={e => setForm(f => ({ ...f, academic_year: e.target.value }))} placeholder="2025-26" />
              <SelectField label="Class" required placeholder="Select class" value={form.class_id} onChange={e => setForm(f => ({ ...f, class_id: e.target.value }))} options={(meta?.classes || []).map(c => ({ value: c.id, label: c.label }))} />
              <SelectField label="Subject" required placeholder="Select subject" value={form.subject_id} onChange={e => setForm(f => ({ ...f, subject_id: e.target.value }))} options={(meta?.subjects || []).map(s => ({ value: s.id, label: s.label }))} />
              <InputField label="Weekly Periods" required type="number" min={1} max={20} value={form.weekly_periods} onChange={e => setForm(f => ({ ...f, weekly_periods: Number(e.target.value) }))} />
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.is_mandatory} onChange={e => setForm(f => ({ ...f, is_mandatory: e.target.checked }))} className="rounded border-slate-300" />
                  <span className="text-sm font-medium text-ink-primary">Mandatory</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.is_elective} onChange={e => setForm(f => ({ ...f, is_elective: e.target.checked }))} className="rounded border-slate-300" />
                  <span className="text-sm font-medium text-ink-primary">Elective</span>
                </label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-ink-secondary hover:bg-slate-50">Cancel</button>
                <button disabled={saving} className="flex-1 rounded-xl bg-academic-blue text-white py-2.5 text-sm font-semibold hover:bg-academic-blue/90 disabled:opacity-60">
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 6: TEACHER ALLOCATION
// ═══════════════════════════════════════════════════════════════════════════════
function TabTeacherAllocation({ toast, meta }) {
  const [allocations, setAllocations] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ academic_year: "", class_id: "", subject_id: "", teacher_id: "", max_periods_per_week: 25 });
  const { confirm, ConfirmEl } = useConfirm();

  const load = useCallback(() => {
    setLoading(true);
    api.get("/admin-portal/timetable/teacher-allocations/")
      .then(({ data }) => setAllocations(Array.isArray(data) ? data : data.results || []))
      .catch(() => setAllocations([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  function openForm(item = null) {
    if (item) {
      setEditItem(item);
      setForm({ academic_year: item.academic_year || "", class_id: item.class_id || "", subject_id: item.subject_id || "", teacher_id: item.teacher_id || "", max_periods_per_week: item.max_periods_per_week || 25 });
    } else {
      setEditItem(null);
      setForm({ academic_year: meta?.academic_years?.[0] || "", class_id: meta?.classes?.[0]?.id || "", subject_id: "", teacher_id: "", max_periods_per_week: 25 });
    }
    setShowForm(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editItem) {
        await api.put(`/admin-portal/timetable/teacher-allocations/${editItem.id}/`, form);
        toast.show("Allocation updated.");
      } else {
        await api.post("/admin-portal/timetable/teacher-allocations/", form);
        toast.show("Allocation created.");
      }
      setShowForm(false);
      load();
    } catch (err) {
      toast.show(err?.response?.data?.detail || "Failed to save.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    const ok = await confirm("Delete this allocation?");
    if (!ok) return;
    try {
      await api.delete(`/admin-portal/timetable/teacher-allocations/${id}/`);
      toast.show("Deleted.");
      load();
    } catch (err) {
      toast.show(err?.response?.data?.detail || "Delete failed.", "error");
    }
  }

  function getWorkloadWarning(item) {
    if (!item) return null;
    const assigned = item.assigned_periods || 0;
    const max = item.max_periods_per_week || 25;
    const pct = max > 0 ? (assigned / max) * 100 : 0;
    if (pct >= 100) return <Badge tone="red">Overloaded</Badge>;
    if (pct >= 80) return <Badge tone="gold">Near Max</Badge>;
    return null;
  }

  return (
    <div className="space-y-4">
      {ConfirmEl}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <SectionTitle>Teacher Allocations</SectionTitle>
          <button onClick={() => openForm()} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-academic-blue text-white text-sm font-semibold hover:bg-academic-blue/90 transition-colors">
            <Plus size={16} /> Add Allocation
          </button>
        </div>
        <DataTable
          columns={[
            { key: "teacher_name", label: "Teacher", render: r => <span className="font-semibold">{r.teacher_name || r.teacher_label || `Teacher ${r.teacher_id}`}</span> },
            { key: "class_name", label: "Class", render: r => r.class_name || r.class_label || `Class ${r.class_id}` },
            { key: "subject_name", label: "Subject", render: r => r.subject_name || r.subject_label || `Subject ${r.subject_id}` },
            { key: "max_periods_per_week", label: "Max Periods/Week", render: r => <span className="font-mono">{r.max_periods_per_week || 25}</span> },
            { key: "workload", label: "Workload", render: r => getWorkloadWarning(r) || <Badge tone="green">OK</Badge> },
            {
              key: "actions", label: "", render: r => (
                <div className="flex gap-1">
                  <button onClick={(e) => { e.stopPropagation(); openForm(r); }} className="p-1.5 rounded-lg text-slate-400 hover:text-academic-blue hover:bg-blue-50"><Edit3 size={14} /></button>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50"><Trash2 size={14} /></button>
                </div>
              )
            },
          ]}
          data={allocations}
          emptyLabel="No teacher allocations defined."
        />
      </Card>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }} onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="bg-academic-blue px-6 py-4 flex items-center justify-between shrink-0">
              <p className="font-bold text-white text-base">{editItem ? "Edit" : "Add"} Teacher Allocation</p>
              <button onClick={() => setShowForm(false)} className="text-white/70 hover:text-white"><X size={18} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto">
              <InputField label="Academic Year" required value={form.academic_year} onChange={e => setForm(f => ({ ...f, academic_year: e.target.value }))} placeholder="2025-26" />
              <SelectField label="Class" required placeholder="Select class" value={form.class_id} onChange={e => setForm(f => ({ ...f, class_id: e.target.value }))} options={(meta?.classes || []).map(c => ({ value: c.id, label: c.label }))} />
              <SelectField label="Subject" required placeholder="Select subject" value={form.subject_id} onChange={e => setForm(f => ({ ...f, subject_id: e.target.value }))} options={(meta?.subjects || []).map(s => ({ value: s.id, label: s.label }))} />
              <SelectField label="Teacher" required placeholder="Select teacher" value={form.teacher_id} onChange={e => setForm(f => ({ ...f, teacher_id: e.target.value }))} options={(meta?.teachers || []).map(t => ({ value: t.id, label: t.label }))} />
              <InputField label="Max Periods per Week" required type="number" min={1} max={50} value={form.max_periods_per_week} onChange={e => setForm(f => ({ ...f, max_periods_per_week: Number(e.target.value) }))} />
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-ink-secondary hover:bg-slate-50">Cancel</button>
                <button disabled={saving} className="flex-1 rounded-xl bg-academic-blue text-white py-2.5 text-sm font-semibold hover:bg-academic-blue/90 disabled:opacity-60">
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 7: CLASSROOM ALLOCATION
// ═══════════════════════════════════════════════════════════════════════════════
function TabClassroomAllocation({ toast, meta }) {
  const [allocations, setAllocations] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ academic_year: "", class_id: "", room_number: "", room_type: "Classroom", capacity: 40, is_lab: false });
  const { confirm, ConfirmEl } = useConfirm();

  const load = useCallback(() => {
    setLoading(true);
    api.get("/admin-portal/timetable/classroom-allocations/")
      .then(({ data }) => setAllocations(Array.isArray(data) ? data : data.results || []))
      .catch(() => setAllocations([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  function openForm(item = null) {
    if (item) {
      setEditItem(item);
      setForm({ academic_year: item.academic_year || "", class_id: item.class_id || "", room_number: item.room_number || "", room_type: item.room_type || "Classroom", capacity: item.capacity || 40, is_lab: item.is_lab || false });
    } else {
      setEditItem(null);
      setForm({ academic_year: meta?.academic_years?.[0] || "", class_id: meta?.classes?.[0]?.id || "", room_number: "", room_type: "Classroom", capacity: 40, is_lab: false });
    }
    setShowForm(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editItem) {
        await api.put(`/admin-portal/timetable/classroom-allocations/${editItem.id}/`, form);
        toast.show("Allocation updated.");
      } else {
        await api.post("/admin-portal/timetable/classroom-allocations/", form);
        toast.show("Allocation created.");
      }
      setShowForm(false);
      load();
    } catch (err) {
      toast.show(err?.response?.data?.detail || "Failed to save.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    const ok = await confirm("Delete this allocation?");
    if (!ok) return;
    try {
      await api.delete(`/admin-portal/timetable/classroom-allocations/${id}/`);
      toast.show("Deleted.");
      load();
    } catch (err) {
      toast.show(err?.response?.data?.detail || "Delete failed.", "error");
    }
  }

  return (
    <div className="space-y-4">
      {ConfirmEl}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <SectionTitle>Classroom Allocations</SectionTitle>
          <button onClick={() => openForm()} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-academic-blue text-white text-sm font-semibold hover:bg-academic-blue/90 transition-colors">
            <Plus size={16} /> Add Allocation
          </button>
        </div>
        <DataTable
          columns={[
            { key: "class_name", label: "Class", render: r => r.class_name || r.class_label || `Class ${r.class_id}` },
            { key: "room_number", label: "Room", render: r => <span className="font-semibold">{r.room_number}</span> },
            { key: "room_type", label: "Type", render: r => <Badge tone={r.room_type === "Lab" ? "gold" : "blue"}>{r.room_type}</Badge> },
            { key: "capacity", label: "Capacity", render: r => <span className="font-mono">{r.capacity}</span> },
            { key: "is_lab", label: "Lab", render: r => r.is_lab ? <Badge tone="gold">Lab</Badge> : "\u2014" },
            {
              key: "actions", label: "", render: r => (
                <div className="flex gap-1">
                  <button onClick={(e) => { e.stopPropagation(); openForm(r); }} className="p-1.5 rounded-lg text-slate-400 hover:text-academic-blue hover:bg-blue-50"><Edit3 size={14} /></button>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50"><Trash2 size={14} /></button>
                </div>
              )
            },
          ]}
          data={allocations}
          emptyLabel="No classroom allocations defined."
        />
      </Card>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }} onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="bg-academic-blue px-6 py-4 flex items-center justify-between shrink-0">
              <p className="font-bold text-white text-base">{editItem ? "Edit" : "Add"} Classroom Allocation</p>
              <button onClick={() => setShowForm(false)} className="text-white/70 hover:text-white"><X size={18} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto">
              <InputField label="Academic Year" required value={form.academic_year} onChange={e => setForm(f => ({ ...f, academic_year: e.target.value }))} placeholder="2025-26" />
              <SelectField label="Class" required placeholder="Select class" value={form.class_id} onChange={e => setForm(f => ({ ...f, class_id: e.target.value }))} options={(meta?.classes || []).map(c => ({ value: c.id, label: c.label }))} />
              <div className="grid grid-cols-2 gap-3">
                <InputField label="Room Number" required value={form.room_number} onChange={e => setForm(f => ({ ...f, room_number: e.target.value }))} placeholder="A-101" />
                <SelectField label="Room Type" value={form.room_type} onChange={e => setForm(f => ({ ...f, room_type: e.target.value, is_lab: e.target.value === "Lab" }))} options={ROOM_TYPES.map(t => ({ value: t, label: t }))} />
              </div>
              <InputField label="Capacity" type="number" min={1} value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: Number(e.target.value) }))} />
              <label className="flex items-center gap-3 cursor-pointer">
                <div onClick={() => setForm(f => ({ ...f, is_lab: !f.is_lab }))} className={`w-11 h-6 rounded-full transition-colors flex items-center px-1 cursor-pointer ${form.is_lab ? "bg-amber-400" : "bg-slate-200"}`}>
                  <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${form.is_lab ? "translate-x-5" : ""}`} />
                </div>
                <span className="text-sm font-medium text-ink-primary">Is Lab</span>
              </label>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-ink-secondary hover:bg-slate-50">Cancel</button>
                <button disabled={saving} className="flex-1 rounded-xl bg-academic-blue text-white py-2.5 text-sm font-semibold hover:bg-academic-blue/90 disabled:opacity-60">
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
// ═══════════════════════════════════════════════════════════════════════════════
// TAB 8: TIMETABLE GRID
// ═══════════════════════════════════════════════════════════════════════════════
function PeriodCard({ entry, onEdit, onDelete, isPublished }) {
  if (entry.is_break) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200">
        <Coffee size={14} className="text-amber-500 shrink-0" />
        <span className="text-xs font-medium text-amber-700">{entry.break_label || "Break"}</span>
        <span className="text-xs text-amber-500 ml-auto font-mono">{fmt(entry.start_time)}\u2013{fmt(entry.end_time)}</span>
        {!isPublished && (
          <button onClick={() => onDelete(entry.id)} className="ml-1 text-amber-400 hover:text-red-500 transition-colors"><X size={12} /></button>
        )}
      </div>
    );
  }
  return (
    <div className="group rounded-xl border border-slate-200 bg-white p-3 hover:shadow-md transition-all hover:border-academic-blue/30">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-bold text-academic-blue truncate">P{entry.period_number} \u00b7 {fmt(entry.start_time)}\u2013{fmt(entry.end_time)}</p>
          <p className="text-sm font-semibold text-ink-primary truncate mt-0.5">{entry.subject_name || <span className="italic text-slate-400">No subject</span>}</p>
          <p className="text-xs text-slate-500 flex items-center gap-1 mt-1 truncate"><User size={10} className="shrink-0" />{entry.teacher_name || "\u2014"}</p>
          {entry.room_number && <p className="text-xs text-slate-400 flex items-center gap-1 truncate"><Building2 size={10} className="shrink-0" />{entry.room_number}</p>}
        </div>
        {!isPublished && (
          <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onEdit(entry)} className="p-1 rounded-lg text-slate-400 hover:text-academic-blue hover:bg-blue-50 transition-colors"><Edit3 size={13} /></button>
            <button onClick={() => onDelete(entry.id)} className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={13} /></button>
          </div>
        )}
      </div>
    </div>
  );
}

function TabTimetableGrid({ toast, meta }) {
  const [selectedClass, setSelectedClass] = useState("");
  const [academicYear, setAcademicYear] = useState("2025-26");
  const [entries, setEntries] = useState(null);
  const [isPublished, setIsPublished] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [activeDay, setActiveDay] = useState(todayName());

  useEffect(() => {
    if (meta?.classes?.length && !selectedClass) {
      setSelectedClass(String(meta.classes[0].id));
    }
  }, [meta, selectedClass]);

  const loadEntries = useCallback(() => {
    if (!selectedClass) return;
    setEntries(null);
    api.get(`/admin-portal/timetable/?class_id=${selectedClass}&academic_year=${academicYear}`)
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : data.results || [];
        setEntries(list);
        setIsPublished(list.length > 0 && list.every(e => e.is_published));
      })
      .catch(() => setEntries([]));
  }, [selectedClass, academicYear]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  async function handleDelete(id) {
    if (!window.confirm("Remove this period?")) return;
    try {
      await api.delete(`/admin-portal/timetable/${id}/`);
      toast.show("Period removed.");
      loadEntries();
    } catch {
      toast.show("Could not delete period.", "error");
    }
  }

  async function handlePublish() {
    setPublishing(true);
    try {
      const publish = !isPublished;
      await api.post("/admin-portal/timetable/publish/", { class_id: selectedClass, academic_year: academicYear, publish });
      setIsPublished(publish);
      toast.show(publish ? "Timetable published!" : "Timetable unpublished.", publish ? "success" : "info");
      loadEntries();
    } catch {
      toast.show("Could not update publish status.", "error");
    } finally {
      setPublishing(false);
    }
  }

  function handleModalSave() {
    setShowModal(false);
    setEditEntry(null);
    loadEntries();
    toast.show("Period saved successfully.");
  }

  const byDay = DAYS.filter(d => d !== "Sunday").map(day => ({
    day,
    entries: (entries || []).filter(e => e.day_of_week === day).sort((a, b) => (a.start_time || "").localeCompare(b.start_time || "")),
  }));

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap gap-4 items-end">
          <div className="min-w-[200px]">
            <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Class</label>
            {!meta ? <div className="h-9 rounded-xl bg-slate-100 animate-pulse" /> : (
              <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-academic-blue/30">
                {meta.classes.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            )}
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Academic Year</label>
            <select value={academicYear} onChange={e => setAcademicYear(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-academic-blue/30">
              {(meta?.academic_years || ["2025-26"]).map(y => <option key={y}>{y}</option>)}
            </select>
          </div>
          {isPublished && (
            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm font-medium">
              <CheckCircle2 size={15} /> Published
            </div>
          )}
          <div className="ml-auto flex gap-2">
            <button onClick={() => { setEditEntry(null); setShowModal(true); }} disabled={isPublished} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-academic-blue text-white text-sm font-semibold hover:bg-academic-blue/90 disabled:opacity-50 transition-colors">
              <Plus size={16} /> Add Period
            </button>
            <button onClick={handlePublish} disabled={publishing || !entries?.length} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 ${isPublished ? "bg-amber-500 text-white hover:bg-amber-600" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}>
              {publishing ? <RefreshCw size={16} className="animate-spin" /> : isPublished ? <EyeOff size={16} /> : <Eye size={16} />}
              {publishing ? "Updating..." : isPublished ? "Unpublish" : "Publish"}
            </button>
          </div>
        </div>
      </Card>

      {!entries ? <Loader rows={4} /> : entries.length === 0 ? (
        <Card>
          <div className="text-center py-14">
            <Calendar size={44} className="mx-auto text-slate-300 mb-3" />
            <p className="font-semibold text-slate-500">No timetable entries yet.</p>
            <p className="text-sm text-slate-400 mt-1">Click "Add Period" to start building the schedule.</p>
          </div>
        </Card>
      ) : (
        <>
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
            {DAYS.filter(d => d !== "Sunday").map(day => (
              <button key={day} onClick={() => setActiveDay(day)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeDay === day ? "bg-white text-academic-blue shadow-sm" : "text-slate-500 hover:text-ink-primary"}`}>
                <div className="w-2 h-2 rounded-full" style={{ background: DAY_COLORS[day] }} />
                {DAY_SHORT[day]}
              </button>
            ))}
          </div>
          {byDay.filter(d => d.day === activeDay).map(({ day, entries: dayEntries }) => (
            <div key={day} className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full" style={{ background: DAY_COLORS[day] }} />
                <h3 className="font-heading font-bold text-ink-primary text-lg">{day}</h3>
                <span className="text-xs text-slate-400">{dayEntries.length} slot{dayEntries.length !== 1 ? "s" : ""}</span>
                {activeDay === todayName() && <span className="text-[10px] font-bold bg-academic-blue text-white px-2 py-0.5 rounded-full">TODAY</span>}
              </div>
              {dayEntries.length === 0 ? (
                <Card><p className="text-xs text-slate-400 italic text-center py-6">No classes scheduled for {day}</p></Card>
              ) : (
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {dayEntries.map(entry => (
                    <PeriodCard key={entry.id} entry={entry} isPublished={isPublished} onEdit={e => { setEditEntry(e); setShowModal(true); }} onDelete={handleDelete} />
                  ))}
                </div>
              )}
              {!isPublished && (
                <button onClick={() => { setEditEntry({ day_of_week: day, is_break: false }); setShowModal(true); }} className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-slate-200 text-xs text-slate-400 hover:border-academic-blue/40 hover:text-academic-blue transition-colors">
                  <Plus size={12} /> Add to {day}
                </button>
              )}
            </div>
          ))}
        </>
      )}

      {showModal && meta && (
        <PeriodModal meta={meta} classId={selectedClass} academicYear={academicYear} editEntry={editEntry} onSave={handleModalSave} onClose={() => { setShowModal(false); setEditEntry(null); }} />
      )}
    </div>
  );
}

function PeriodModal({ meta, classId, academicYear, editEntry, onSave, onClose }) {
  const isEdit = !!(editEntry?.id);
  const [form, setForm] = useState({
    class_id: classId, day_of_week: editEntry?.day_of_week || "Monday",
    period_number: editEntry?.period_number || 1,
    start_time: editEntry?.start_time ? fmt(editEntry.start_time) : "08:00",
    end_time: editEntry?.end_time ? fmt(editEntry.end_time) : "08:45",
    subject_id: editEntry?.subject_id || "", teacher_id: editEntry?.teacher_id || "",
    room_number: editEntry?.room_number || "", meeting_link: editEntry?.meeting_link || "",
    is_break: editEntry?.is_break || false, break_label: editEntry?.break_label || "Break",
    academic_year: academicYear,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (isEdit) {
        await api.put(`/admin-portal/timetable/${editEntry.id}/`, form);
      } else {
        await api.post("/admin-portal/timetable/", form);
      }
      onSave();
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to save period.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
        <div className="bg-academic-blue px-6 py-4 flex items-center justify-between shrink-0">
          <p className="font-bold text-white text-base">{isEdit ? "Edit Period" : "Add Period / Break"}</p>
          <button onClick={onClose} className="text-white/70 hover:text-white"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-start gap-2">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />{error}
            </div>
          )}
          <label className="flex items-center gap-3 cursor-pointer">
            <div onClick={() => setForm(f => ({ ...f, is_break: !f.is_break }))} className={`w-11 h-6 rounded-full transition-colors flex items-center px-1 cursor-pointer ${form.is_break ? "bg-amber-400" : "bg-slate-200"}`}>
              <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${form.is_break ? "translate-x-5" : ""}`} />
            </div>
            <span className="text-sm font-medium text-ink-primary">This is a break / recess</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Day *</label>
              <select required value={form.day_of_week} onChange={e => setForm(f => ({ ...f, day_of_week: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-academic-blue/30">
                {DAYS.filter(d => d !== "Sunday").map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            {!form.is_break ? (
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Period #</label>
                <input type="number" min={1} max={12} value={form.period_number} onChange={e => setForm(f => ({ ...f, period_number: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-academic-blue/30" />
              </div>
            ) : (
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Break Label</label>
                <input value={form.break_label} onChange={e => setForm(f => ({ ...f, break_label: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-academic-blue/30" placeholder="Lunch Break" />
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Start Time *</label>
              <input required type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-academic-blue/30" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">End Time *</label>
              <input required type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-academic-blue/30" />
            </div>
          </div>
          {!form.is_break && (
            <>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Subject</label>
                <select value={form.subject_id} onChange={e => setForm(f => ({ ...f, subject_id: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-academic-blue/30">
                  <option value="">\u2014 Select subject \u2014</option>
                  {meta.subjects.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Teacher</label>
                <select value={form.teacher_id} onChange={e => setForm(f => ({ ...f, teacher_id: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-academic-blue/30">
                  <option value="">\u2014 Select teacher \u2014</option>
                  {meta.teachers.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Room / Lab</label>
                  <input value={form.room_number} onChange={e => setForm(f => ({ ...f, room_number: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-academic-blue/30" placeholder="e.g. A101" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Online Link</label>
                  <input value={form.meeting_link} onChange={e => setForm(f => ({ ...f, meeting_link: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-academic-blue/30" placeholder="https://..." />
                </div>
              </div>
            </>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-ink-secondary hover:bg-slate-50">Cancel</button>
            <button disabled={loading} className="flex-1 rounded-xl bg-academic-blue text-white py-2.5 text-sm font-semibold hover:bg-academic-blue/90 disabled:opacity-60 transition-colors">
              {loading ? "Saving..." : isEdit ? "Update Period" : "Add Period"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
// ═══════════════════════════════════════════════════════════════════════════════
// TAB 9: SUBSTITUTE TEACHERS
// ═══════════════════════════════════════════════════════════════════════════════
function TabSubstitutes({ toast, meta }) {
  const [substitutes, setSubstitutes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ timetable_entry_id: "", substitute_teacher_id: "", substitute_date: "", reason: "" });
  const { confirm, ConfirmEl } = useConfirm();

  const load = useCallback(() => {
    setLoading(true);
    api.get("/admin-portal/timetable/substitutes/")
      .then(({ data }) => setSubstitutes(Array.isArray(data) ? data : data.results || []))
      .catch(() => setSubstitutes([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  function openForm() {
    setForm({ timetable_entry_id: "", substitute_teacher_id: "", substitute_date: "", reason: "" });
    setShowForm(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/admin-portal/timetable/substitutes/", form);
      toast.show("Substitute assigned.");
      setShowForm(false);
      load();
    } catch (err) {
      toast.show(err?.response?.data?.detail || "Failed to save.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    const ok = await confirm("Remove this substitute?");
    if (!ok) return;
    try {
      await api.delete(`/admin-portal/timetable/substitutes/${id}/`);
      toast.show("Removed.");
      load();
    } catch (err) {
      toast.show(err?.response?.data?.detail || "Delete failed.", "error");
    }
  }

  return (
    <div className="space-y-4">
      {ConfirmEl}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <SectionTitle>Substitute Teachers</SectionTitle>
          <button onClick={openForm} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-academic-blue text-white text-sm font-semibold hover:bg-academic-blue/90 transition-colors">
            <Plus size={16} /> Assign Substitute
          </button>
        </div>
        <DataTable
          columns={[
            { key: "substitute_date", label: "Date" },
            { key: "original_teacher_name", label: "Original Teacher", render: r => <span className="font-semibold">{r.original_teacher_name || r.teacher_name || "\u2014"}</span> },
            { key: "substitute_teacher_name", label: "Substitute", render: r => <span className="font-semibold text-academic-blue">{r.substitute_teacher_name || "Teacher " + r.substitute_teacher_id}</span> },
            { key: "reason", label: "Reason", render: r => <span className="text-ink-secondary">{r.reason || "\u2014"}</span> },
            { key: "notified", label: "Notified", render: r => r.notified ? <Badge tone="green">Yes</Badge> : <Badge tone="slate">Pending</Badge> },
            {
              key: "actions", label: "", render: r => (
                <button onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50"><Trash2 size={14} /></button>
              )
            },
          ]}
          data={substitutes}
          emptyLabel="No substitute assignments."
        />
      </Card>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }} onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="bg-academic-blue px-6 py-4 flex items-center justify-between shrink-0">
              <p className="font-bold text-white text-base">Assign Substitute</p>
              <button onClick={() => setShowForm(false)} className="text-white/70 hover:text-white"><X size={18} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto">
              <InputField label="Timetable Entry ID" required type="number" value={form.timetable_entry_id} onChange={e => setForm(f => ({ ...f, timetable_entry_id: e.target.value }))} placeholder="Enter entry ID" />
              <SelectField label="Substitute Teacher" required placeholder="Select teacher" value={form.substitute_teacher_id} onChange={e => setForm(f => ({ ...f, substitute_teacher_id: e.target.value }))} options={(meta?.teachers || []).map(t => ({ value: t.id, label: t.label }))} />
              <InputField label="Date" required type="date" value={form.substitute_date} onChange={e => setForm(f => ({ ...f, substitute_date: e.target.value }))} />
              <FormField label="Reason">
                <textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} rows={3} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-academic-blue/30 resize-none" placeholder="Optional reason..." />
              </FormField>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-ink-secondary hover:bg-slate-50">Cancel</button>
                <button disabled={saving} className="flex-1 rounded-xl bg-academic-blue text-white py-2.5 text-sm font-semibold hover:bg-academic-blue/90 disabled:opacity-60">
                  {saving ? "Saving..." : "Assign"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 10: TIMETABLE APPROVAL
// ═══════════════════════════════════════════════════════════════════════════════
function TabApprovals({ toast }) {
  const [approvals, setApprovals] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectItem, setRejectItem] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const params = statusFilter ? `?status=${statusFilter}` : "";
    api.get(`/admin-portal/timetable/approvals/${params}`)
      .then(({ data }) => setApprovals(Array.isArray(data) ? data : data.results || []))
      .catch(() => setApprovals([]))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  async function handleSubmitForApproval(item) {
    setProcessing(true);
    try {
      await api.post(`/admin-portal/timetable/approvals/${item.id}/submit/`);
      toast.show("Submitted for approval.");
      load();
    } catch (err) {
      toast.show(err?.response?.data?.detail || "Failed to submit.", "error");
    } finally {
      setProcessing(false);
    }
  }

  async function handleApprove(item) {
    setProcessing(true);
    try {
      await api.post(`/admin-portal/timetable/approvals/${item.id}/approve/`);
      toast.show("Approved!");
      load();
    } catch (err) {
      toast.show(err?.response?.data?.detail || "Failed to approve.", "error");
    } finally {
      setProcessing(false);
    }
  }

  async function handleReject() {
    if (!rejectItem) return;
    setProcessing(true);
    try {
      await api.post(`/admin-portal/timetable/approvals/${rejectItem.id}/reject/`, { reason: rejectReason });
      toast.show("Rejected.");
      setShowRejectModal(false);
      setRejectItem(null);
      setRejectReason("");
      load();
    } catch (err) {
      toast.show(err?.response?.data?.detail || "Failed to reject.", "error");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center justify-between mb-4">
          <SectionTitle>Timetable Approvals</SectionTitle>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-slate-400" />
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-academic-blue/30">
              <option value="">All Statuses</option>
              {["Draft", "Submitted", "Approved", "Rejected"].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <DataTable
          columns={[
            { key: "class_name", label: "Class", render: r => <span className="font-semibold">{r.class_name || r.class_label || `Class ${r.class_id}`}</span> },
            { key: "academic_year", label: "Year" },
            { key: "status", label: "Status", render: r => <Badge tone={APPROVAL_BADGE[r.status] || "slate"}>{r.status}</Badge> },
            { key: "submitted_by", label: "Submitted By", render: r => r.submitted_by_name || r.submitted_by || "\u2014" },
            { key: "approved_by", label: "Approved By", render: r => r.approved_by_name || r.approved_by || "\u2014" },
            {
              key: "actions", label: "", render: r => (
                <div className="flex gap-1">
                  {r.status === "Draft" && (
                    <button onClick={(e) => { e.stopPropagation(); handleSubmitForApproval(r); }} disabled={processing} className="px-3 py-1.5 rounded-lg bg-blue-500 text-white text-xs font-semibold hover:bg-blue-600 disabled:opacity-50">Submit</button>
                  )}
                  {r.status === "Submitted" && (
                    <>
                      <button onClick={(e) => { e.stopPropagation(); handleApprove(r); }} disabled={processing} className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 disabled:opacity-50">Approve</button>
                      <button onClick={(e) => { e.stopPropagation(); setRejectItem(r); setShowRejectModal(true); }} disabled={processing} className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-semibold hover:bg-red-600 disabled:opacity-50">Reject</button>
                    </>
                  )}
                </div>
              )
            },
          ]}
          data={approvals}
          emptyLabel="No approvals found."
        />
      </Card>

      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }} onClick={e => e.target === e.currentTarget && setShowRejectModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <p className="font-bold text-ink-primary mb-2">Reject Timetable</p>
            <p className="text-sm text-ink-secondary mb-4">Provide a reason for rejection:</p>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-academic-blue/30 resize-none mb-4" placeholder="Reason for rejection..." />
            <div className="flex gap-3">
              <button onClick={() => { setShowRejectModal(false); setRejectItem(null); }} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-ink-secondary hover:bg-slate-50">Cancel</button>
              <button onClick={handleReject} disabled={processing || !rejectReason.trim()} className="flex-1 rounded-xl bg-red-500 text-white py-2.5 text-sm font-semibold hover:bg-red-600 disabled:opacity-60">
                {processing ? "Rejecting..." : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 11: NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════════
function TabNotifications({ toast, meta }) {
  const [notifications, setNotifications] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(null);
  const [form, setForm] = useState({ class_id: "", notification_type: "timetable_change", title: "", message: "", target_audience: "all" });
  const { confirm, ConfirmEl } = useConfirm();

  const load = useCallback(() => {
    setLoading(true);
    api.get("/admin-portal/timetable/notifications/")
      .then(({ data }) => setNotifications(Array.isArray(data) ? data : data.results || []))
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  function openForm() {
    setForm({ class_id: meta?.classes?.[0]?.id || "", notification_type: "timetable_change", title: "", message: "", target_audience: "all" });
    setShowForm(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/admin-portal/timetable/notifications/", form);
      toast.show("Notification created.");
      setShowForm(false);
      load();
    } catch (err) {
      toast.show(err?.response?.data?.detail || "Failed to save.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleSend(id) {
    setSending(id);
    try {
      await api.post(`/admin-portal/timetable/notifications/${id}/send/`);
      toast.show("Notification sent!");
      load();
    } catch (err) {
      toast.show(err?.response?.data?.detail || "Failed to send.", "error");
    } finally {
      setSending(null);
    }
  }

  async function handleDelete(id) {
    const ok = await confirm("Delete this notification?");
    if (!ok) return;
    try {
      await api.delete(`/admin-portal/timetable/notifications/${id}/`);
      toast.show("Deleted.");
      load();
    } catch (err) {
      toast.show(err?.response?.data?.detail || "Delete failed.", "error");
    }
  }

  return (
    <div className="space-y-4">
      {ConfirmEl}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <SectionTitle>Notifications</SectionTitle>
          <button onClick={openForm} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-academic-blue text-white text-sm font-semibold hover:bg-academic-blue/90 transition-colors">
            <Plus size={16} /> Create Notification
          </button>
        </div>
        <DataTable
          columns={[
            { key: "notification_type", label: "Type", render: r => <Badge tone="blue">{r.notification_type}</Badge> },
            { key: "title", label: "Title", render: r => <span className="font-semibold">{r.title}</span> },
            { key: "message", label: "Message", render: r => <span className="text-ink-secondary max-w-[200px] truncate inline-block">{r.message}</span> },
            { key: "target_audience", label: "Audience", render: r => <Badge tone="gold">{r.target_audience}</Badge> },
            { key: "is_sent", label: "Status", render: r => r.is_sent ? <Badge tone="green">Sent</Badge> : <Badge tone="slate">Draft</Badge> },
            { key: "sent_at", label: "Sent At", render: r => r.sent_at || "\u2014" },
            {
              key: "actions", label: "", render: r => (
                <div className="flex gap-1">
                  {!r.is_sent && (
                    <button onClick={(e) => { e.stopPropagation(); handleSend(r.id); }} disabled={sending === r.id} className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 disabled:opacity-50 flex items-center gap-1">
                      {sending === r.id ? <Spinner size={12} /> : <Send size={12} />} Send
                    </button>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50"><Trash2 size={14} /></button>
                </div>
              )
            },
          ]}
          data={notifications}
          emptyLabel="No notifications."
        />
      </Card>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }} onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="bg-academic-blue px-6 py-4 flex items-center justify-between shrink-0">
              <p className="font-bold text-white text-base">Create Notification</p>
              <button onClick={() => setShowForm(false)} className="text-white/70 hover:text-white"><X size={18} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto">
              <SelectField label="Class" placeholder="Select class" value={form.class_id} onChange={e => setForm(f => ({ ...f, class_id: e.target.value }))} options={(meta?.classes || []).map(c => ({ value: c.id, label: c.label }))} />
              <SelectField label="Notification Type" value={form.notification_type} onChange={e => setForm(f => ({ ...f, notification_type: e.target.value }))} options={NOTIFICATION_TYPES.map(t => ({ value: t, label: t }))} />
              <InputField label="Title" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Timetable Updated" />
              <FormField label="Message">
                <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} rows={4} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-academic-blue/30 resize-none" placeholder="Notification message..." />
              </FormField>
              <SelectField label="Target Audience" value={form.target_audience} onChange={e => setForm(f => ({ ...f, target_audience: e.target.value }))} options={AUDIENCES.map(a => ({ value: a, label: a.charAt(0).toUpperCase() + a.slice(1) }))} />
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-ink-secondary hover:bg-slate-50">Cancel</button>
                <button disabled={saving} className="flex-1 rounded-xl bg-academic-blue text-white py-2.5 text-sm font-semibold hover:bg-academic-blue/90 disabled:opacity-60">
                  {saving ? "Saving..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
// ═══════════════════════════════════════════════════════════════════════════════
// TAB 12: REPORTS
// ═══════════════════════════════════════════════════════════════════════════════
function TabReports({ toast }) {
  const [reportType, setReportType] = useState("class_timetable");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [academicYear, setAcademicYear] = useState("2025-26");

  function loadReport() {
    setLoading(true);
    setData(null);
    api.get(`/admin-portal/timetable/reports/?type=${reportType}&academic_year=${academicYear}`)
      .then(({ data: res }) => setData(Array.isArray(res) ? res : res.results || res.data || []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadReport(); }, [reportType, academicYear]);

  const columns = {
    class_timetable: [
      { key: "class_name", label: "Class" },
      { key: "day_of_week", label: "Day" },
      { key: "period_number", label: "Period" },
      { key: "subject_name", label: "Subject" },
      { key: "teacher_name", label: "Teacher" },
      { key: "room_number", label: "Room" },
      { key: "start_time", label: "Start", render: r => fmt(r.start_time) },
      { key: "end_time", label: "End", render: r => fmt(r.end_time) },
    ],
    teacher_workload: [
      { key: "teacher_name", label: "Teacher", render: r => <span className="font-semibold">{r.teacher_name || r.teacher}</span> },
      { key: "total_periods", label: "Total Periods", render: r => <span className="font-mono font-bold">{r.total_periods}</span> },
      { key: "classes_taught", label: "Classes" },
      { key: "subjects_taught", label: "Subjects" },
      { key: "utilization", label: "Utilization", render: r => r.utilization ? <Badge tone={r.utilization > 80 ? "gold" : "green"}>{r.utilization}%</Badge> : "\u2014" },
    ],
    subject_distribution: [
      { key: "subject_name", label: "Subject", render: r => <span className="font-semibold">{r.subject_name || r.subject}</span> },
      { key: "total_periods", label: "Total Periods" },
      { key: "classes_covered", label: "Classes" },
      { key: "teachers_assigned", label: "Teachers" },
    ],
    classroom_utilization: [
      { key: "room_number", label: "Room" },
      { key: "room_type", label: "Type" },
      { key: "total_slots", label: "Total Slots" },
      { key: "used_slots", label: "Used Slots" },
      { key: "utilization", label: "Utilization", render: r => r.utilization ? <Badge tone={r.utilization > 80 ? "gold" : "green"}>{r.utilization}%</Badge> : "\u2014" },
    ],
    lab_utilization: [
      { key: "room_number", label: "Lab" },
      { key: "total_slots", label: "Total Slots" },
      { key: "used_slots", label: "Used Slots" },
      { key: "subjects_in_lab", label: "Subjects" },
      { key: "utilization", label: "Utilization", render: r => r.utilization ? <Badge tone={r.utilization > 80 ? "gold" : "green"}>{r.utilization}%</Badge> : "\u2014" },
    ],
    free_periods: [
      { key: "class_name", label: "Class" },
      { key: "day_of_week", label: "Day" },
      { key: "period_number", label: "Period" },
      { key: "start_time", label: "Start", render: r => fmt(r.start_time) },
      { key: "end_time", label: "End", render: r => fmt(r.end_time) },
    ],
  };

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap gap-4 items-end">
          <SelectField label="Report Type" value={reportType} onChange={e => setReportType(e.target.value)} options={REPORT_TYPES} className="min-w-[220px]" />
          <InputField label="Academic Year" value={academicYear} onChange={e => setAcademicYear(e.target.value)} placeholder="2025-26" className="min-w-[160px]" />
          <button onClick={loadReport} disabled={loading} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-academic-blue text-white text-sm font-semibold hover:bg-academic-blue/90 disabled:opacity-60 transition-colors">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </Card>

      <Card>
        <SectionTitle>{REPORT_TYPES.find(r => r.value === reportType)?.label || "Report"}</SectionTitle>
        <DataTable columns={columns[reportType] || []} data={data} emptyLabel="No report data available." />
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 13: ANALYTICS DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
function TabAnalytics({ toast }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get("/admin-portal/timetable/analytics/")
      .then(({ data }) => setAnalytics(data))
      .catch(() => setAnalytics({}))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader rows={4} />;

  const stats = [
    { label: "Classes Scheduled Today", value: analytics?.classes_scheduled_today ?? 0, icon: Calendar, accent: "blue" },
    { label: "Teacher Workload Avg", value: analytics?.teacher_workload_avg ?? "\u2014", icon: GraduationCap, accent: "green" },
    { label: "Classroom Occupancy", value: analytics?.classroom_occupancy ?? "\u2014", icon: Building2, accent: "orange" },
    { label: "Free Classrooms", value: analytics?.free_classrooms ?? 0, icon: Home, accent: "slate" },
    { label: "Subject Coverage", value: analytics?.subject_coverage ?? "\u2014", icon: BookOpen, accent: "blue" },
    { label: "Approval Pending", value: analytics?.approval_pending ?? 0, icon: Shield, accent: "gold" },
    { label: "Substitutes Today", value: analytics?.substitutes_today ?? 0, icon: Users, accent: "red" },
    { label: "Lab Sessions", value: analytics?.lab_sessions ?? 0, icon: FlaskConical, accent: "green" },
  ];

  return (
    <div className="space-y-6">
      <SectionTitle>Timetable Analytics</SectionTitle>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => {
          const Icon = s.icon;
          const accentColors = {
            blue: "bg-academic-blue/10 text-academic-blue",
            green: "bg-emerald-100 text-emerald-600",
            orange: "bg-orange-100 text-orange-600",
            slate: "bg-slate-100 text-slate-600",
            gold: "bg-amber-100 text-amber-600",
            red: "bg-red-100 text-red-600",
          };
          return (
            <div key={i} className="bg-white rounded-card shadow-card p-5 flex items-start gap-4 hover:shadow-raised transition-shadow">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${accentColors[s.accent]}`}>
                <Icon size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-ink-secondary text-xs font-medium uppercase tracking-wide">{s.label}</p>
                <p className="text-2xl font-bold text-ink-primary leading-tight">{s.value}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 14: AUDIT LOGS
// ═══════════════════════════════════════════════════════════════════════════════
function TabAuditLogs({ toast }) {
  const [logs, setLogs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    const params = actionFilter ? `?action=${actionFilter}` : "";
    api.get(`/admin-portal/timetable/audit-logs/${params}`)
      .then(({ data }) => setLogs(Array.isArray(data) ? data : data.results || []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [actionFilter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center justify-between mb-4">
          <SectionTitle>Audit Logs</SectionTitle>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-slate-400" />
            <select value={actionFilter} onChange={e => setActionFilter(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-academic-blue/30">
              <option value="">All Actions</option>
              {["create", "update", "delete", "publish", "unpublish", "approve", "reject", "submit"].map(a => (
                <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>
        <DataTable
          columns={[
            { key: "created_at", label: "Date/Time", render: r => <span className="font-mono text-xs">{r.created_at || r.timestamp || "\u2014"}</span> },
            { key: "action", label: "Action", render: r => {
              const actionColors = { create: "green", update: "blue", delete: "red", publish: "green", unpublish: "gold", approve: "green", reject: "red", submit: "blue" };
              return <Badge tone={actionColors[r.action] || "slate"}>{r.action}</Badge>;
            }},
            { key: "action_by_name", label: "By", render: r => <span className="font-semibold">{r.action_by_name || r.action_by || "\u2014"}</span> },
            { key: "class_name", label: "Class", render: r => r.class_name || r.class_label || "\u2014" },
            { key: "details", label: "Details", render: r => (
              <span className="text-xs font-mono text-ink-secondary max-w-[300px] truncate inline-block">
                {r.details ? (typeof r.details === "string" ? r.details : JSON.stringify(r.details)) : "\u2014"}
              </span>
            )},
          ]}
          data={logs}
          emptyLabel="No audit logs found."
        />
      </Card>
    </div>
  );
}
// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function Timetable() {
  const [tab, setTab] = useState("dashboard");
  const [meta, setMeta] = useState(null);
  const [academicYear, setAcademicYear] = useState("2025-26");
  const { show, ToastEl } = useToast();

  useEffect(() => {
    api.get("/admin-portal/timetable/meta/")
      .then(({ data }) => {
        setMeta(data);
        if (data.academic_year) setAcademicYear(data.academic_year);
      })
      .catch(() => setMeta({ classes: [], subjects: [], teachers: [], academic_years: ["2025-26"] }));
  }, []);

  function navigateToTab(tabIndex) {
    setTab(TABS[tabIndex]?.key || "dashboard");
  }

  const toast = { show };

  const tabContent = () => {
    switch (tab) {
      case "dashboard":
        return <TabWorkflowDashboard onNavigate={navigateToTab} />;
      case "calendar":
        return <TabAcademicCalendar toast={toast} />;
      case "working-days":
        return <TabWorkingDays toast={toast} academicYear={academicYear} />;
      case "school-timings":
        return <TabSchoolTimings toast={toast} academicYear={academicYear} />;
      case "periods":
        return <TabPeriods toast={toast} academicYear={academicYear} />;
      case "subject-alloc":
        return <TabSubjectAllocation toast={toast} meta={meta} />;
      case "teacher-alloc":
        return <TabTeacherAllocation toast={toast} meta={meta} />;
      case "classroom-alloc":
        return <TabClassroomAllocation toast={toast} meta={meta} />;
      case "grid":
        return <TabTimetableGrid toast={toast} meta={meta} />;
      case "substitutes":
        return <TabSubstitutes toast={toast} meta={meta} />;
      case "approvals":
        return <TabApprovals toast={toast} />;
      case "notifications":
        return <TabNotifications toast={toast} meta={meta} />;
      case "reports":
        return <TabReports toast={toast} />;
      case "analytics":
        return <TabAnalytics toast={toast} />;
      case "audit":
        return <TabAuditLogs toast={toast} />;
      default:
        return <TabWorkflowDashboard onNavigate={navigateToTab} />;
    }
  };

  return (
    <div className="space-y-6">
      {ToastEl}

      <div className="flex flex-wrap items-start gap-4 justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-ink-primary">Timetable Management</h1>
          <p className="text-sm text-ink-secondary mt-1">
            Build, manage and publish class schedules across all modules.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-500 uppercase">Year</label>
          <select value={academicYear} onChange={e => setAcademicYear(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-academic-blue/30">
            {(meta?.academic_years || ["2025-26"]).map(y => <option key={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto bg-slate-100 rounded-xl p-1 w-fit">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              tab === key ? "bg-white text-academic-blue shadow-sm" : "text-slate-500 hover:text-ink-primary"
            }`}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {tabContent()}
    </div>
  );
}