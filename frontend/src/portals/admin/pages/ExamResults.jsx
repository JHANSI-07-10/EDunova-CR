import { useState, useEffect, useCallback } from "react";
import api from "../lib/api";
import { Card, EmptyState, Loader, SectionTitle, Toast, Badge, StatCard } from "../components/Common";
import {
  BarChart3, FileText, Calendar, MapPin, CheckCircle, Award, Clock, Users,
  Plus, Trash2, RefreshCw, ShieldAlert, BookOpen, UserCheck, Bell, ListOrdered,
  ClipboardCheck, GraduationCap, Settings, Hash, Eye, Send, ChevronDown, ChevronUp,
  FileBarChart, Layers, Printer
} from "lucide-react";

const EXAM_NAME_CHOICES = [
  "Unit_Test_1", "Unit_Test_2", "Unit_Test_3", "Unit_Test_4",
  "Mid_Term", "Final_Term", "Pre_Board", "Board_Exam"
];

const REPORT_TYPES = [
  "student_performance", "class_analysis", "subject_analysis",
  "pass_fail_summary", "toppers", "grade_distribution"
];

const NOTIFICATION_TYPES = ["Exam_Schedule", "Hall_Ticket", "Result_Published", "Revaluation", "Supplementary"];

export default function ExamResults() {
  const [tab, setTab] = useState(0);
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {[
          [0, "Dashboard", BarChart3],
          [1, "Exam Types", Settings],
          [2, "Planning & Schedule", Calendar],
          [3, "Subject Config", BookOpen],
          [4, "Seating", MapPin],
          [5, "Invigilators", UserCheck],
          [6, "Hall Tickets", Printer],
          [7, "Marks Entry", ClipboardCheck],
          [8, "Grade Config", Award],
          [9, "Result Processing", Layers],
          [10, "Rank Lists", ListOrdered],
          [11, "Report Cards", FileText],
          [12, "Revaluation", RefreshCw],
          [13, "Notifications", Bell],
          [14, "Reports", FileBarChart],
        ].map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm ${
              tab === key
                ? "bg-academic-blue text-white shadow-md scale-[1.02]"
                : "bg-white text-ink-secondary hover:text-ink-primary hover:bg-slate-50"
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {tab === 0 && <ExamDashboard onError={setToast} />}
      {tab === 1 && <ExamTypes onError={setToast} />}
      {tab === 2 && <ExamPlanning onError={setToast} />}
      {tab === 3 && <SubjectConfig onError={setToast} />}
      {tab === 4 && <SeatingArrangement onError={setToast} />}
      {tab === 5 && <InvigilatorAllocation onError={setToast} />}
      {tab === 6 && <HallTickets onError={setToast} />}
      {tab === 7 && <MarksEntryVerification onError={setToast} />}
      {tab === 8 && <GradeConfig onError={setToast} />}
      {tab === 9 && <ResultProcessing onError={setToast} />}
      {tab === 10 && <RankLists onError={setToast} />}
      {tab === 11 && <ReportCards onError={setToast} />}
      {tab === 12 && <RevaluationSupplementary onError={setToast} />}
      {tab === 13 && <NotificationsTab onError={setToast} />}
      {tab === 14 && <ReportsTab onError={setToast} />}

      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}

function ExamDashboard({ onError }) {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/admin-portal/exam-workflow/analytics/");
        setAnalytics(data);
      } catch {
        onError("Failed to load exam analytics.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <Loader rows={4} />;
  if (!analytics) return <EmptyState label="No analytics data available." />;

  return (
    <div className="space-y-6">
      <SectionTitle icon={BarChart3}>Exam Dashboard</SectionTitle>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <StatCard icon={FileText} label="Total Exams" value={analytics.total_exams ?? 0} accent="blue" />
        <StatCard icon={Users} label="Total Students" value={analytics.total_students ?? 0} accent="green" />
        <StatCard icon={CheckCircle} label="Passed" value={analytics.passed ?? 0} accent="green" />
        <StatCard icon={ShieldAlert} label="Failed" value={analytics.failed ?? 0} accent="red" />
        <StatCard icon={BarChart3} label="Pass %" value={`${analytics.pass_percentage ?? 0}%`} accent="blue" />
        <StatCard icon={Award} label="Average Marks" value={analytics.average_marks ?? 0} accent="orange" />
        <StatCard icon={Clock} label="Pending Evaluations" value={analytics.pending_evaluations ?? 0} accent="gold" />
      </div>
    </div>
  );
}

function ExamTypes({ onError }) {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", description: "", sort_order: 0, is_active: true });
  const [editId, setEditId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin-portal/exam-workflow/types/");
      setTypes(data);
    } catch {
      onError("Failed to load exam types.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSave(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      onError("Type name is required.");
      return;
    }
    try {
      if (editId) {
        await api.patch(`/admin-portal/exam-workflow/types/?id=${editId}`, form);
        setToast("Exam type updated.");
      } else {
        await api.post("/admin-portal/exam-workflow/types/", form);
        setToast("Exam type created.");
      }
      setForm({ name: "", description: "", sort_order: 0, is_active: true });
      setEditId(null);
      load();
    } catch (err) {
      onError(err.response?.data?.detail || "Could not save exam type.");
    }
  }

  function handleEdit(t) {
    setForm({ name: t.name, description: t.description || "", sort_order: t.sort_order || 0, is_active: t.is_active });
    setEditId(t.id);
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this exam type?")) return;
    try {
      await api.delete(`/admin-portal/exam-workflow/types/?id=${id}`);
      setToast("Exam type deleted.");
      load();
    } catch {
      onError("Could not delete exam type.");
    }
  }

  function setToast(msg) { onError(msg); }

  if (loading) return <Loader rows={4} />;

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-1 h-fit">
        <SectionTitle icon={Plus}>{editId ? "Edit Exam Type" : "Add Exam Type"}</SectionTitle>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">Name (*)</label>
            <input
              type="text"
              required
              placeholder="e.g. Continuous Assessment"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:border-academic-blue"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">Description</label>
            <textarea
              rows={2}
              placeholder="Brief description..."
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white outline-none resize-none focus:border-academic-blue"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">Sort Order</label>
              <input
                type="number"
                value={form.sort_order}
                onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
                className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:border-academic-blue"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">Active</label>
              <select
                value={form.is_active ? "true" : "false"}
                onChange={e => setForm({ ...form, is_active: e.target.value === "true" })}
                className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:border-academic-blue"
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
          </div>
          <button className="w-full bg-academic-blue hover:bg-academic-blue/90 text-white rounded-xl py-2.5 font-bold transition-colors">
            {editId ? "Update Type" : "Create Type"}
          </button>
          {editId && (
            <button type="button" onClick={() => { setEditId(null); setForm({ name: "", description: "", sort_order: 0, is_active: true }); }} className="w-full border rounded-xl py-2 font-medium text-ink-secondary hover:bg-slate-50">
              Cancel Edit
            </button>
          )}
        </form>
      </Card>

      <Card className="lg:col-span-2">
        <SectionTitle icon={Settings}>Exam Types ({types.length})</SectionTitle>
        {types.length === 0 ? (
          <EmptyState label="No exam types configured." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-secondary text-xs uppercase tracking-wide border-b">
                  <th className="py-3">Name</th>
                  <th className="py-3">Description</th>
                  <th className="py-3">Order</th>
                  <th className="py-3">Active</th>
                  <th className="py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {types.map(t => (
                  <tr key={t.id}>
                    <td className="py-3 font-semibold text-ink-primary">{t.name}</td>
                    <td className="py-3 text-xs text-ink-secondary truncate max-w-xs">{t.description || "—"}</td>
                    <td className="py-3 text-xs text-ink-secondary">{t.sort_order}</td>
                    <td className="py-3">
                      <Badge tone={t.is_active ? "green" : "slate"}>{t.is_active ? "Active" : "Inactive"}</Badge>
                    </td>
                    <td className="py-3 text-right space-x-2">
                      <button onClick={() => handleEdit(t)} className="text-xs text-academic-blue hover:underline font-semibold">Edit</button>
                      <button onClick={() => handleDelete(t.id)} className="text-xs text-danger hover:underline font-semibold">Delete</button>
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

function ExamPlanning({ onError }) {
  const [exams, setExams] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    exam_name: "Unit_Test_1", exam_type: "Unit Test",
    exam_date: new Date().toISOString().split("T")[0],
    start_time: "09:00", duration_minutes: 60, max_marks: 100,
    passing_marks: 40, internal_weightage: 20, practical_weightage: 0,
    class_id: "", subject_id: "", teacher_id: ""
  });

  async function loadAll() {
    setLoading(true);
    try {
      const [examRes, classRes, subRes, userRes] = await Promise.all([
        api.get("/admin-portal/exams/"),
        api.get("/admin-portal/classes/"),
        api.get("/admin-portal/subjects/"),
        api.get("/admin-portal/users/")
      ]);
      setExams(examRes.data);
      setClasses(classRes.data);
      setSubjects(subRes.data);
      setTeachers(userRes.data.filter(u => u.role === "Teacher" || u.user_type === "Teacher"));
    } catch {
      onError("Error loading planning data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.class_id || !form.subject_id) {
      onError("Please select a valid class and subject.");
      return;
    }
    try {
      await api.post("/admin-portal/exams/", form);
      onError("Exam scheduled successfully.");
      setForm({
        exam_name: "Unit_Test_1", exam_type: "Unit Test",
        exam_date: new Date().toISOString().split("T")[0],
        start_time: "09:00", duration_minutes: 60, max_marks: 100,
        passing_marks: 40, internal_weightage: 20, practical_weightage: 0,
        class_id: "", subject_id: "", teacher_id: ""
      });
      loadAll();
    } catch (err) {
      onError(err.response?.data?.detail || "Could not schedule exam.");
    }
  }

  async function handleAction(examId, action) {
    try {
      await api.post(`/admin-portal/exams/${examId}/action/`, { action });
      onError(`Exam results ${action === "Publish" ? "published" : "returned"} successfully.`);
      loadAll();
    } catch {
      onError("Could not update exam status.");
    }
  }

  if (loading) return <Loader rows={5} />;

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-1 h-fit">
        <SectionTitle icon={Plus}>Schedule Exam</SectionTitle>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">Exam Cycle</label>
            <select
              value={form.exam_name}
              onChange={e => setForm({ ...form, exam_name: e.target.value })}
              className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:border-academic-blue"
            >
              {EXAM_NAME_CHOICES.map(n => <option key={n} value={n}>{n.replace(/_/g, " ")}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">Exam Type</label>
            <select
              value={form.exam_type}
              onChange={e => setForm({ ...form, exam_type: e.target.value })}
              className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:border-academic-blue"
            >
              <option>Unit Test</option>
              <option>Mid-Term</option>
              <option>Final</option>
              <option>Practical</option>
              <option>Online Assessment</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">Class (*)</label>
              <select
                required
                value={form.class_id}
                onChange={e => setForm({ ...form, class_id: e.target.value })}
                className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:border-academic-blue"
              >
                <option value="">Select Class</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}{c.section ? `-${c.section}` : ""}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">Subject (*)</label>
              <select
                required
                value={form.subject_id}
                onChange={e => setForm({ ...form, subject_id: e.target.value })}
                className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:border-academic-blue"
              >
                <option value="">Select Subject</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">Date (*)</label>
              <input type="date" required value={form.exam_date} onChange={e => setForm({ ...form, exam_date: e.target.value })}
                className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-academic-blue" />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">Start Time (*)</label>
              <input type="time" required value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })}
                className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-academic-blue" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">Duration</label>
              <input type="number" value={form.duration_minutes} onChange={e => setForm({ ...form, duration_minutes: parseInt(e.target.value) || 0 })}
                className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-academic-blue" />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">Max Marks</label>
              <input type="number" value={form.max_marks} onChange={e => setForm({ ...form, max_marks: parseInt(e.target.value) || 0 })}
                className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-academic-blue" />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">Passing</label>
              <input type="number" value={form.passing_marks} onChange={e => setForm({ ...form, passing_marks: parseInt(e.target.value) || 0 })}
                className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-academic-blue" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">Teacher</label>
            <select
              value={form.teacher_id}
              onChange={e => setForm({ ...form, teacher_id: e.target.value })}
              className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:border-academic-blue"
            >
              <option value="">Select Teacher</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
            </select>
          </div>
          <button className="w-full bg-academic-blue hover:bg-academic-blue/90 text-white rounded-xl py-2.5 font-bold transition-colors">
            Schedule Exam
          </button>
        </form>
      </Card>

      <Card className="lg:col-span-2">
        <SectionTitle icon={Calendar}>Exam Schedule ({exams.length})</SectionTitle>
        {exams.length === 0 ? (
          <EmptyState label="No exams scheduled." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-secondary text-xs uppercase tracking-wide border-b">
                  <th className="py-3">Exam</th>
                  <th className="py-3">Class / Subject</th>
                  <th className="py-3">Date & Time</th>
                  <th className="py-3">Marks</th>
                  <th className="py-3">Status</th>
                  <th className="py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {exams.map(e => (
                  <tr key={e.id}>
                    <td className="py-3">
                      <p className="font-semibold text-ink-primary">{e.exam_name?.replace(/_/g, " ")}</p>
                      <span className="text-xs text-slate-500">{e.exam_type}</span>
                    </td>
                    <td className="py-3">
                      <p className="font-semibold text-ink-primary">{e.class_name}</p>
                      <span className="text-xs text-slate-500">{e.subject_name}</span>
                    </td>
                    <td className="py-3">
                      <p className="text-xs font-semibold text-ink-primary">{e.exam_date}</p>
                      <p className="text-xs text-ink-secondary">{e.start_time} ({e.duration_minutes}m)</p>
                    </td>
                    <td className="py-3 text-xs text-ink-secondary">
                      <p>Max: <strong>{e.max_marks}</strong></p>
                      <p>Pass: <strong>{e.passing_marks}</strong></p>
                    </td>
                    <td className="py-3">
                      <Badge tone={e.status === "Published" ? "green" : e.status === "Submitted" ? "blue" : e.status === "Returned" ? "red" : "gold"}>
                        {e.status}
                      </Badge>
                    </td>
                    <td className="py-3 text-right">
                      {e.status === "Submitted" ? (
                        <div className="flex justify-end gap-1.5">
                          <button onClick={() => handleAction(e.id, "Publish")} className="bg-academic-green hover:bg-academic-green/90 text-white text-xs px-2.5 py-1.5 rounded-lg font-bold transition-all">Publish</button>
                          <button onClick={() => handleAction(e.id, "Return")} className="bg-danger hover:bg-danger/90 text-white text-xs px-2.5 py-1.5 rounded-lg font-bold transition-all">Return</button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
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

function SubjectConfig({ onError }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [form, setForm] = useState({ exam_schedule_id: "", subject_id: "", exam_date: new Date().toISOString().split("T")[0], start_time: "09:00", duration: 60, max_marks: 100, passing_marks: 40 });
  const [editId, setEditId] = useState(null);

  async function loadAll() {
    setLoading(true);
    try {
      const [itemRes, examRes, subRes] = await Promise.all([
        api.get("/admin-portal/exam-workflow/subjects/"),
        api.get("/admin-portal/exams/"),
        api.get("/admin-portal/subjects/")
      ]);
      setItems(itemRes.data);
      setExams(examRes.data);
      setSubjects(subRes.data);
    } catch {
      onError("Failed to load subject configuration data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  async function handleSave(e) {
    e.preventDefault();
    if (!form.exam_schedule_id || !form.subject_id) {
      onError("Please select exam schedule and subject.");
      return;
    }
    try {
      if (editId) {
        await api.patch(`/admin-portal/exam-workflow/subjects/?id=${editId}`, form);
        onError("Subject configuration updated.");
      } else {
        await api.post("/admin-portal/exam-workflow/subjects/", form);
        onError("Subject configuration created.");
      }
      setForm({ exam_schedule_id: "", subject_id: "", exam_date: new Date().toISOString().split("T")[0], start_time: "09:00", duration: 60, max_marks: 100, passing_marks: 40 });
      setEditId(null);
      loadAll();
    } catch (err) {
      onError(err.response?.data?.detail || "Could not save subject configuration.");
    }
  }

  function handleEdit(item) {
    setForm({
      exam_schedule_id: item.exam_schedule_id, subject_id: item.subject_id,
      exam_date: item.exam_date, start_time: item.start_time,
      duration: item.duration, max_marks: item.max_marks, passing_marks: item.passing_marks
    });
    setEditId(item.id);
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this subject configuration?")) return;
    try {
      await api.delete(`/admin-portal/exam-workflow/subjects/?id=${id}`);
      onError("Deleted.");
      loadAll();
    } catch {
      onError("Could not delete.");
    }
  }

  if (loading) return <Loader rows={4} />;

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-1 h-fit">
        <SectionTitle icon={Plus}>{editId ? "Edit Subject Config" : "Add Subject Config"}</SectionTitle>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">Exam Schedule (*)</label>
            <select required value={form.exam_schedule_id} onChange={e => setForm({ ...form, exam_schedule_id: e.target.value })}
              className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:border-academic-blue">
              <option value="">Select Exam</option>
              {exams.map(e => <option key={e.id} value={e.id}>{e.exam_name?.replace(/_/g, " ")} ({e.class_name})</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">Subject (*)</label>
            <select required value={form.subject_id} onChange={e => setForm({ ...form, subject_id: e.target.value })}
              className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:border-academic-blue">
              <option value="">Select Subject</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">Date</label>
              <input type="date" value={form.exam_date} onChange={e => setForm({ ...form, exam_date: e.target.value })}
                className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-academic-blue" />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">Start Time</label>
              <input type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })}
                className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-academic-blue" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">Duration</label>
              <input type="number" value={form.duration} onChange={e => setForm({ ...form, duration: parseInt(e.target.value) || 0 })}
                className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-academic-blue" />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">Max Marks</label>
              <input type="number" value={form.max_marks} onChange={e => setForm({ ...form, max_marks: parseInt(e.target.value) || 0 })}
                className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-academic-blue" />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">Pass Marks</label>
              <input type="number" value={form.passing_marks} onChange={e => setForm({ ...form, passing_marks: parseInt(e.target.value) || 0 })}
                className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-academic-blue" />
            </div>
          </div>
          <button className="w-full bg-academic-blue hover:bg-academic-blue/90 text-white rounded-xl py-2.5 font-bold transition-colors">
            {editId ? "Update" : "Add Subject"}
          </button>
          {editId && (
            <button type="button" onClick={() => { setEditId(null); setForm({ exam_schedule_id: "", subject_id: "", exam_date: new Date().toISOString().split("T")[0], start_time: "09:00", duration: 60, max_marks: 100, passing_marks: 40 }); }}
              className="w-full border rounded-xl py-2 font-medium text-ink-secondary hover:bg-slate-50">Cancel Edit</button>
          )}
        </form>
      </Card>

      <Card className="lg:col-span-2">
        <SectionTitle icon={BookOpen}>Subject Configurations ({items.length})</SectionTitle>
        {items.length === 0 ? (
          <EmptyState label="No subject configurations found." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-secondary text-xs uppercase tracking-wide border-b">
                  <th className="py-3">Exam Schedule</th>
                  <th className="py-3">Subject</th>
                  <th className="py-3">Date / Time</th>
                  <th className="py-3">Marks</th>
                  <th className="py-3">Duration</th>
                  <th className="py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map(item => (
                  <tr key={item.id}>
                    <td className="py-3 font-semibold text-ink-primary">{item.exam_schedule_name || `Schedule #${item.exam_schedule_id}`}</td>
                    <td className="py-3 font-semibold text-ink-primary">{item.subject_name || `Subject #${item.subject_id}`}</td>
                    <td className="py-3 text-xs text-ink-secondary">{item.exam_date} at {item.start_time}</td>
                    <td className="py-3 text-xs text-ink-secondary">{item.max_marks} / Pass: {item.passing_marks}</td>
                    <td className="py-3 text-xs text-ink-secondary">{item.duration}m</td>
                    <td className="py-3 text-right space-x-2">
                      <button onClick={() => handleEdit(item)} className="text-xs text-academic-blue hover:underline font-semibold">Edit</button>
                      <button onClick={() => handleDelete(item.id)} className="text-xs text-danger hover:underline font-semibold">Delete</button>
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

function SeatingArrangement({ onError }) {
  const [seats, setSeats] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedExam, setSelectedExam] = useState("");
  const [generating, setGenerating] = useState(false);

  async function loadAll() {
    setLoading(true);
    try {
      const [seatRes, examRes] = await Promise.all([
        api.get("/admin-portal/exam-workflow/seating/"),
        api.get("/admin-portal/exams/")
      ]);
      setSeats(seatRes.data);
      setExams(examRes.data);
    } catch {
      onError("Failed to load seating data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  async function handleAutoGenerate() {
    if (!selectedExam) {
      onError("Please select an exam schedule first.");
      return;
    }
    setGenerating(true);
    try {
      const { data } = await api.post("/admin-portal/exam-workflow/seating/", { exam_schedule_id: selectedExam });
      onError(data.detail || "Seating arrangement generated successfully.");
      loadAll();
    } catch (err) {
      onError(err.response?.data?.detail || "Failed to generate seating.");
    } finally {
      setGenerating(false);
    }
  }

  if (loading) return <Loader rows={4} />;

  return (
    <div className="space-y-6">
      <Card>
        <SectionTitle icon={MapPin}>Seating Arrangement</SectionTitle>
        <div className="flex flex-wrap gap-3 mb-4">
          <select
            value={selectedExam}
            onChange={e => setSelectedExam(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:border-academic-blue"
          >
            <option value="">Select Exam Schedule</option>
            {exams.map(e => (
              <option key={e.id} value={e.id}>{e.exam_name?.replace(/_/g, " ")} ({e.class_name})</option>
            ))}
          </select>
          <button
            onClick={handleAutoGenerate}
            disabled={generating || !selectedExam}
            className="bg-academic-blue hover:bg-academic-blue/90 disabled:opacity-50 text-white rounded-xl px-4 py-2 text-sm font-bold transition-all"
          >
            {generating ? "Generating..." : "Auto-Generate Seats"}
          </button>
        </div>

        {seats.length === 0 ? (
          <EmptyState label="No seating arrangements found." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-secondary text-xs uppercase tracking-wide border-b">
                  <th className="py-3">Student Name</th>
                  <th className="py-3">Exam</th>
                  <th className="py-3">Room</th>
                  <th className="py-3">Seat Number</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {seats.map(s => (
                  <tr key={s.id}>
                    <td className="py-3 font-semibold text-ink-primary">{s.student_name || `Student #${s.student_id}`}</td>
                    <td className="py-3 text-xs text-ink-secondary">{s.exam_name || `Schedule #${s.exam_schedule_id}`}</td>
                    <td className="py-3 font-medium text-ink-primary">
                      <span className="flex items-center gap-1"><MapPin size={12} className="text-academic-blue" /> {s.room_name}</span>
                    </td>
                    <td className="py-3 font-bold font-mono text-ink-primary">{s.seat_number}</td>
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

function InvigilatorAllocation({ onError }) {
  const [items, setItems] = useState([]);
  const [exams, setExams] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ exam_schedule_id: "", teacher_id: "", room_name: "", exam_date: new Date().toISOString().split("T")[0], start_time: "09:00", end_time: "12:00" });
  const [editId, setEditId] = useState(null);

  async function loadAll() {
    setLoading(true);
    try {
      const [itemRes, examRes, userRes] = await Promise.all([
        api.get("/admin-portal/exam-workflow/invigilators/"),
        api.get("/admin-portal/exams/"),
        api.get("/admin-portal/users/")
      ]);
      setItems(itemRes.data);
      setExams(examRes.data);
      setTeachers(userRes.data.filter(u => u.role === "Teacher" || u.user_type === "Teacher"));
    } catch {
      onError("Failed to load invigilator data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  async function handleSave(e) {
    e.preventDefault();
    if (!form.exam_schedule_id || !form.teacher_id) {
      onError("Please select exam and teacher.");
      return;
    }
    try {
      if (editId) {
        await api.patch(`/admin-portal/exam-workflow/invigilators/?id=${editId}`, form);
        onError("Invigilator allocation updated.");
      } else {
        await api.post("/admin-portal/exam-workflow/invigilators/", form);
        onError("Invigilator allocated.");
      }
      setForm({ exam_schedule_id: "", teacher_id: "", room_name: "", exam_date: new Date().toISOString().split("T")[0], start_time: "09:00", end_time: "12:00" });
      setEditId(null);
      loadAll();
    } catch (err) {
      onError(err.response?.data?.detail || "Could not save allocation.");
    }
  }

  function handleEdit(item) {
    setForm({
      exam_schedule_id: item.exam_schedule_id, teacher_id: item.teacher_id,
      room_name: item.room_name, exam_date: item.exam_date,
      start_time: item.start_time, end_time: item.end_time
    });
    setEditId(item.id);
  }

  async function handleDelete(id) {
    if (!window.confirm("Remove this invigilator allocation?")) return;
    try {
      await api.delete(`/admin-portal/exam-workflow/invigilators/?id=${id}`);
      onError("Allocation removed.");
      loadAll();
    } catch {
      onError("Could not remove allocation.");
    }
  }

  if (loading) return <Loader rows={4} />;

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-1 h-fit">
        <SectionTitle icon={UserCheck}>{editId ? "Edit Allocation" : "Allocate Invigilator"}</SectionTitle>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">Exam Schedule (*)</label>
            <select required value={form.exam_schedule_id} onChange={e => setForm({ ...form, exam_schedule_id: e.target.value })}
              className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:border-academic-blue">
              <option value="">Select Exam</option>
              {exams.map(e => <option key={e.id} value={e.id}>{e.exam_name?.replace(/_/g, " ")} ({e.class_name})</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">Teacher (*)</label>
            <select required value={form.teacher_id} onChange={e => setForm({ ...form, teacher_id: e.target.value })}
              className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:border-academic-blue">
              <option value="">Select Teacher</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">Room Name</label>
            <input type="text" placeholder="e.g. Block-A Hall 1" value={form.room_name} onChange={e => setForm({ ...form, room_name: e.target.value })}
              className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-academic-blue" />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">Exam Date</label>
            <input type="date" value={form.exam_date} onChange={e => setForm({ ...form, exam_date: e.target.value })}
              className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-academic-blue" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">Start Time</label>
              <input type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })}
                className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-academic-blue" />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">End Time</label>
              <input type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })}
                className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-academic-blue" />
            </div>
          </div>
          <button className="w-full bg-academic-blue hover:bg-academic-blue/90 text-white rounded-xl py-2.5 font-bold transition-colors">
            {editId ? "Update" : "Allocate"}
          </button>
          {editId && (
            <button type="button" onClick={() => { setEditId(null); setForm({ exam_schedule_id: "", teacher_id: "", room_name: "", exam_date: new Date().toISOString().split("T")[0], start_time: "09:00", end_time: "12:00" }); }}
              className="w-full border rounded-xl py-2 font-medium text-ink-secondary hover:bg-slate-50">Cancel Edit</button>
          )}
        </form>
      </Card>

      <Card className="lg:col-span-2">
        <SectionTitle icon={UserCheck}>Invigilator Allocations ({items.length})</SectionTitle>
        {items.length === 0 ? (
          <EmptyState label="No invigilator allocations found." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-secondary text-xs uppercase tracking-wide border-b">
                  <th className="py-3">Teacher</th>
                  <th className="py-3">Exam</th>
                  <th className="py-3">Room</th>
                  <th className="py-3">Date / Time</th>
                  <th className="py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map(item => (
                  <tr key={item.id}>
                    <td className="py-3 font-semibold text-ink-primary">{item.teacher_name || `Teacher #${item.teacher_id}`}</td>
                    <td className="py-3 text-xs text-ink-secondary">{item.exam_name || `Schedule #${item.exam_schedule_id}`}</td>
                    <td className="py-3 font-medium text-ink-primary"><MapPin size={12} className="text-academic-blue inline mr-1" />{item.room_name || "—"}</td>
                    <td className="py-3 text-xs text-ink-secondary">{item.exam_date} {item.start_time}-{item.end_time}</td>
                    <td className="py-3 text-right space-x-2">
                      <button onClick={() => handleEdit(item)} className="text-xs text-academic-blue hover:underline font-semibold">Edit</button>
                      <button onClick={() => handleDelete(item.id)} className="text-xs text-danger hover:underline font-semibold">Remove</button>
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

function HallTickets({ onError }) {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedExam, setSelectedExam] = useState("");
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState(null);

  async function loadAll() {
    setLoading(true);
    try {
      const { data } = await api.get("/admin-portal/exams/");
      setExams(data);
    } catch {
      onError("Failed to load exams.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  async function handleGenerate() {
    if (!selectedExam) {
      onError("Please select an exam schedule.");
      return;
    }
    setGenerating(true);
    setStatus(null);
    try {
      const { data } = await api.post("/admin-portal/exam-workflow/hall-tickets/generate/", { exam_schedule_id: selectedExam });
      setStatus(data);
      onError(data.detail || "Hall tickets generated successfully.");
    } catch (err) {
      onError(err.response?.data?.detail || "Failed to generate hall tickets.");
    } finally {
      setGenerating(false);
    }
  }

  if (loading) return <Loader rows={3} />;

  return (
    <div className="space-y-6">
      <Card>
        <SectionTitle icon={Printer}>Hall Ticket Generation</SectionTitle>
        <div className="flex flex-wrap gap-3 mb-4">
          <select
            value={selectedExam}
            onChange={e => setSelectedExam(e.target.value)}
            className="flex-1 min-w-[200px] border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:border-academic-blue"
          >
            <option value="">Select Exam Schedule</option>
            {exams.map(e => (
              <option key={e.id} value={e.id}>{e.exam_name?.replace(/_/g, " ")} ({e.class_name} - {e.subject_name})</option>
            ))}
          </select>
          <button
            onClick={handleGenerate}
            disabled={generating || !selectedExam}
            className="bg-academic-blue hover:bg-academic-blue/90 disabled:opacity-50 text-white rounded-xl px-5 py-2 text-sm font-bold transition-all"
          >
            {generating ? "Generating..." : "Generate Hall Tickets"}
          </button>
        </div>

        {status && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800 space-y-1">
            {status.detail && <p className="font-semibold">{status.detail}</p>}
            {status.total_generated !== undefined && <p>Total Generated: <strong>{status.total_generated}</strong></p>}
            {status.total_students !== undefined && <p>Total Students: <strong>{status.total_students}</strong></p>}
            {status.message && <p>{status.message}</p>}
          </div>
        )}

        {!status && !generating && (
          <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-xs text-academic-blue">
            Select an exam schedule and click "Generate Hall Tickets" to create hall tickets for all enrolled students.
          </div>
        )}
      </Card>
    </div>
  );
}

function MarksEntryVerification({ onError }) {
  const [exams, setExams] = useState([]);
  const [verifyItems, setVerifyItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedExam, setSelectedExam] = useState("");
  const [marksData, setMarksData] = useState(null);
  const [marksEntries, setMarksEntries] = useState([]);

  async function loadAll() {
    setLoading(true);
    try {
      const [examRes, verifyRes] = await Promise.all([
        api.get("/admin-portal/exams/"),
        api.get("/admin-portal/exam-workflow/verify-marks/")
      ]);
      setExams(examRes.data);
      setVerifyItems(verifyRes.data);
    } catch {
      onError("Failed to load marks data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  async function loadMarksList() {
    if (!selectedExam) return;
    try {
      const { data } = await api.get(`/admin-portal/exam-workflow/verify-marks/?exam_schedule_id=${selectedExam}`);
      setMarksData(data.exam || data);
      setMarksEntries(data.rows || data.results || []);
    } catch {
      onError("Could not load marks for this exam.");
    }
  }

  async function handleVerify(item) {
    try {
      await api.post("/admin-portal/exam-workflow/verify-marks/", { id: item.id, action: "verify" });
      onError("Marks verified successfully.");
      loadAll();
    } catch (err) {
      onError(err.response?.data?.detail || "Could not verify marks.");
    }
  }

  if (loading) return <Loader rows={4} />;

  return (
    <div className="space-y-6">
      <Card>
        <SectionTitle icon={ClipboardCheck}>Marks Entry & Verification</SectionTitle>
        <div className="flex flex-wrap gap-3 mb-4">
          <select
            value={selectedExam}
            onChange={e => setSelectedExam(e.target.value)}
            className="flex-1 min-w-[200px] border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:border-academic-blue"
          >
            <option value="">Select Exam Schedule to View Marks</option>
            {exams.map(e => (
              <option key={e.id} value={e.id}>{e.exam_name?.replace(/_/g, " ")} ({e.class_name} - {e.subject_name})</option>
            ))}
          </select>
          <button onClick={loadMarksList} className="bg-academic-blue hover:bg-academic-blue/90 text-white rounded-xl px-5 py-2 text-sm font-bold transition-all">Load Marks</button>
        </div>

        {marksEntries.length > 0 && (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-secondary text-xs uppercase tracking-wide border-b">
                  <th className="py-2.5">Student</th>
                  <th className="py-2.5">Marks Obtained</th>
                  <th className="py-2.5">Max Marks</th>
                  <th className="py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {marksEntries.map((entry, idx) => (
                  <tr key={entry.id || idx}>
                    <td className="py-2.5 font-semibold text-ink-primary">{entry.student_name || `Student #${entry.student_id}`}</td>
                    <td className="py-2.5 font-bold text-ink-primary">{entry.marks_obtained ?? "—"}</td>
                    <td className="py-2.5 text-xs text-ink-secondary">{entry.max_marks || marksData?.max_marks || "—"}</td>
                    <td className="py-2.5">
                      <Badge tone={entry.status === "Published" ? "green" : entry.status === "Submitted" ? "blue" : "gold"}>
                        {entry.status || "Draft"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <SectionTitle icon={CheckCircle}>Pending Verification ({verifyItems.length})</SectionTitle>
        {verifyItems.length === 0 ? (
          <EmptyState label="No pending marks to verify." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-secondary text-xs uppercase tracking-wide border-b">
                  <th className="py-3">Exam</th>
                  <th className="py-3">Student</th>
                  <th className="py-3">Subject</th>
                  <th className="py-3">Marks</th>
                  <th className="py-3">Submitted By</th>
                  <th className="py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {verifyItems.map(item => (
                  <tr key={item.id}>
                    <td className="py-3 font-semibold text-ink-primary">{item.exam_name?.replace(/_/g, " ") || "—"}</td>
                    <td className="py-3 font-semibold text-ink-primary">{item.student_name || `Student #${item.student_id}`}</td>
                    <td className="py-3 text-xs text-ink-secondary">{item.subject_name || "—"}</td>
                    <td className="py-3 font-bold text-ink-primary">{item.marks_obtained}/{item.max_marks}</td>
                    <td className="py-3 text-xs text-ink-secondary">{item.submitted_by_name || "—"}</td>
                    <td className="py-3 text-right">
                      {item.status !== "Verified" ? (
                        <button onClick={() => handleVerify(item)} className="bg-academic-green hover:bg-academic-green/90 text-white text-xs px-2.5 py-1.5 rounded-lg font-bold transition-all">
                          Verify
                        </button>
                      ) : (
                        <Badge tone="green">Verified</Badge>
                      )}
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

function GradeConfig({ onError }) {
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ grade_letter: "", min_percentage: 0, max_percentage: 100, grade_points: "", description: "" });
  const [editId, setEditId] = useState(null);

  async function loadAll() {
    setLoading(true);
    try {
      const { data } = await api.get("/admin-portal/exam-workflow/grade-config/");
      setGrades(data);
    } catch {
      onError("Failed to load grade configuration.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  async function handleSave(e) {
    e.preventDefault();
    if (!form.grade_letter.trim()) {
      onError("Grade letter is required.");
      return;
    }
    try {
      if (editId) {
        await api.patch(`/admin-portal/exam-workflow/grade-config/?id=${editId}`, form);
        onError("Grade updated.");
      } else {
        await api.post("/admin-portal/exam-workflow/grade-config/", form);
        onError("Grade created.");
      }
      setForm({ grade_letter: "", min_percentage: 0, max_percentage: 100, grade_points: "", description: "" });
      setEditId(null);
      loadAll();
    } catch (err) {
      onError(err.response?.data?.detail || "Could not save grade.");
    }
  }

  function handleEdit(g) {
    setForm({ grade_letter: g.grade_letter, min_percentage: g.min_percentage, max_percentage: g.max_percentage, grade_points: g.grade_points || "", description: g.description || "" });
    setEditId(g.id);
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this grade configuration?")) return;
    try {
      await api.delete(`/admin-portal/exam-workflow/grade-config/?id=${id}`);
      onError("Grade deleted.");
      loadAll();
    } catch {
      onError("Could not delete grade.");
    }
  }

  if (loading) return <Loader rows={4} />;

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-1 h-fit">
        <SectionTitle icon={Award}>{editId ? "Edit Grade" : "Add Grade"}</SectionTitle>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">Grade Letter (*)</label>
            <input type="text" required placeholder="e.g. A+, A, B+, B..." value={form.grade_letter}
              onChange={e => setForm({ ...form, grade_letter: e.target.value })}
              className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:border-academic-blue" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">Min %</label>
              <input type="number" step="0.01" value={form.min_percentage}
                onChange={e => setForm({ ...form, min_percentage: parseFloat(e.target.value) || 0 })}
                className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-academic-blue" />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">Max %</label>
              <input type="number" step="0.01" value={form.max_percentage}
                onChange={e => setForm({ ...form, max_percentage: parseFloat(e.target.value) || 100 })}
                className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-academic-blue" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">Grade Points</label>
            <input type="text" placeholder="e.g. 10, 9, 8..." value={form.grade_points}
              onChange={e => setForm({ ...form, grade_points: e.target.value })}
              className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:border-academic-blue" />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">Description</label>
            <input type="text" placeholder="e.g. Outstanding" value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:border-academic-blue" />
          </div>
          <button className="w-full bg-academic-blue hover:bg-academic-blue/90 text-white rounded-xl py-2.5 font-bold transition-colors">
            {editId ? "Update Grade" : "Create Grade"}
          </button>
          {editId && (
            <button type="button" onClick={() => { setEditId(null); setForm({ grade_letter: "", min_percentage: 0, max_percentage: 100, grade_points: "", description: "" }); }}
              className="w-full border rounded-xl py-2 font-medium text-ink-secondary hover:bg-slate-50">Cancel Edit</button>
          )}
        </form>
      </Card>

      <Card className="lg:col-span-2">
        <SectionTitle icon={Award}>Grade Configuration ({grades.length})</SectionTitle>
        {grades.length === 0 ? (
          <EmptyState label="No grade configurations found." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-secondary text-xs uppercase tracking-wide border-b">
                  <th className="py-3">Letter</th>
                  <th className="py-3">Min %</th>
                  <th className="py-3">Max %</th>
                  <th className="py-3">Points</th>
                  <th className="py-3">Description</th>
                  <th className="py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {grades.map(g => (
                  <tr key={g.id}>
                    <td className="py-3 font-bold text-ink-primary text-lg">{g.grade_letter}</td>
                    <td className="py-3 text-xs text-ink-secondary">{g.min_percentage}%</td>
                    <td className="py-3 text-xs text-ink-secondary">{g.max_percentage}%</td>
                    <td className="py-3 font-semibold text-ink-primary">{g.grade_points || "—"}</td>
                    <td className="py-3 text-xs text-ink-secondary">{g.description || "—"}</td>
                    <td className="py-3 text-right space-x-2">
                      <button onClick={() => handleEdit(g)} className="text-xs text-academic-blue hover:underline font-semibold">Edit</button>
                      <button onClick={() => handleDelete(g.id)} className="text-xs text-danger hover:underline font-semibold">Delete</button>
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

function ResultProcessing({ onError }) {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedExam, setSelectedExam] = useState("");
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);

  async function loadAll() {
    setLoading(true);
    try {
      const { data } = await api.get("/admin-portal/exams/");
      setExams(data);
    } catch {
      onError("Failed to load exams.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  async function handleProcess() {
    if (!selectedExam) {
      onError("Please select an exam schedule.");
      return;
    }
    setProcessing(true);
    setResult(null);
    try {
      const { data } = await api.post("/admin-portal/exam-workflow/process-results/", { exam_schedule_id: selectedExam });
      setResult(data);
      onError(data.detail || "Results processed successfully.");
    } catch (err) {
      onError(err.response?.data?.detail || "Failed to process results.");
    } finally {
      setProcessing(false);
    }
  }

  if (loading) return <Loader rows={3} />;

  return (
    <div className="space-y-6">
      <Card>
        <SectionTitle icon={Layers}>Result Processing</SectionTitle>
        <div className="flex flex-wrap gap-3 mb-4">
          <select
            value={selectedExam}
            onChange={e => setSelectedExam(e.target.value)}
            className="flex-1 min-w-[200px] border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:border-academic-blue"
          >
            <option value="">Select Exam Schedule</option>
            {exams.map(e => (
              <option key={e.id} value={e.id}>{e.exam_name?.replace(/_/g, " ")} ({e.class_name} - {e.subject_name})</option>
            ))}
          </select>
          <button
            onClick={handleProcess}
            disabled={processing || !selectedExam}
            className="bg-academic-blue hover:bg-academic-blue/90 disabled:opacity-50 text-white rounded-xl px-5 py-2 text-sm font-bold transition-all"
          >
            {processing ? "Processing..." : "Process Results"}
          </button>
        </div>

        {result && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800 space-y-1">
            {result.detail && <p className="font-semibold">{result.detail}</p>}
            {result.total_students !== undefined && <p>Total Students: <strong>{result.total_students}</strong></p>}
            {result.passed !== undefined && <p>Passed: <strong>{result.passed}</strong></p>}
            {result.failed !== undefined && <p>Failed: <strong>{result.failed}</strong></p>}
            {result.average_marks !== undefined && <p>Average Marks: <strong>{result.average_marks}</strong></p>}
            {result.message && <p>{result.message}</p>}
          </div>
        )}

        {!result && !processing && (
          <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-xs text-academic-blue">
            Select an exam schedule and click "Process Results" to calculate grades, ranks, and pass/fail status for all students.
          </div>
        )}
      </Card>
    </div>
  );
}

function RankLists({ onError }) {
  const [ranks, setRanks] = useState([]);
  const [overall, setOverall] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("per-exam");

  async function loadAll() {
    setLoading(true);
    try {
      const [rankRes, overallRes] = await Promise.all([
        api.get("/admin-portal/rank-list/").catch(() => ({ data: [] })),
        api.get("/admin-portal/rank-list/overall/").catch(() => ({ data: [] }))
      ]);
      setRanks(rankRes.data);
      setOverall(overallRes.data);
    } catch {
      onError("Failed to load rank lists.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  if (loading) return <Loader rows={4} />;

  const displayData = view === "overall" ? overall : ranks;

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center justify-between mb-3">
          <SectionTitle icon={ListOrdered}>Rank Lists</SectionTitle>
          <div className="flex gap-2">
            <button onClick={() => setView("per-exam")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${view === "per-exam" ? "bg-academic-blue text-white" : "bg-slate-100 text-ink-secondary hover:bg-slate-200"}`}>
              Per Exam
            </button>
            <button onClick={() => setView("overall")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${view === "overall" ? "bg-academic-blue text-white" : "bg-slate-100 text-ink-secondary hover:bg-slate-200"}`}>
              Overall
            </button>
          </div>
        </div>

        {displayData.length === 0 ? (
          <EmptyState label="No rank data available." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-secondary text-xs uppercase tracking-wide border-b">
                  <th className="py-3">Rank</th>
                  <th className="py-3">Student</th>
                  <th className="py-3">Class</th>
                  <th className="py-3">Total Marks</th>
                  <th className="py-3">Percentage</th>
                  <th className="py-3">Grade</th>
                  {view === "per-exam" && <th className="py-3">Exam</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayData.map((r, idx) => (
                  <tr key={r.id || idx}>
                    <td className="py-3 font-bold text-ink-primary">
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${idx < 3 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                        {r.rank || idx + 1}
                      </span>
                    </td>
                    <td className="py-3 font-semibold text-ink-primary">{r.student_name}</td>
                    <td className="py-3 text-xs text-ink-secondary">{r.class_name || "—"}</td>
                    <td className="py-3 font-bold text-ink-primary">{r.total_marks ?? r.total ?? "—"}</td>
                    <td className="py-3 text-xs text-ink-secondary">{r.percentage != null ? `${r.percentage}%` : "—"}</td>
                    <td className="py-3"><Badge tone="blue">{r.grade_letter || r.grade || "—"}</Badge></td>
                    {view === "per-exam" && <td className="py-3 text-xs text-ink-secondary">{r.exam_name?.replace(/_/g, " ") || "—"}</td>}
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

function ReportCards({ onError }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [studentId, setStudentId] = useState("");
  const [examCycle, setExamCycle] = useState("");
  const [report, setReport] = useState(null);
  const [fetching, setFetching] = useState(false);

  async function loadStudents() {
    setLoading(true);
    try {
      const { data } = await api.get("/admin-portal/users/?role=Student");
      setStudents(data);
    } catch {
      onError("Failed to load students.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadStudents(); }, []);

  async function handleFetch() {
    if (!studentId) {
      onError("Please select a student.");
      return;
    }
    setFetching(true);
    setReport(null);
    try {
      const params = new URLSearchParams({ student_id: studentId });
      if (examCycle) params.append("exam_name", examCycle);
      const { data } = await api.get(`/admin-portal/report-card/?${params.toString()}`);
      setReport(data);
    } catch (err) {
      onError(err.response?.data?.detail || "Could not fetch report card.");
    } finally {
      setFetching(false);
    }
  }

  if (loading) return <Loader rows={3} />;

  return (
    <div className="space-y-6">
      <Card>
        <SectionTitle icon={FileText}>Report Cards</SectionTitle>
        <div className="flex flex-wrap gap-3 mb-4">
          <select value={studentId} onChange={e => setStudentId(e.target.value)}
            className="flex-1 min-w-[200px] border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:border-academic-blue">
            <option value="">Select Student</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.admission_number || s.id})</option>)}
          </select>
          <select value={examCycle} onChange={e => setExamCycle(e.target.value)}
            className="min-w-[150px] border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:border-academic-blue">
            <option value="">All Exam Cycles</option>
            {EXAM_NAME_CHOICES.map(n => <option key={n} value={n}>{n.replace(/_/g, " ")}</option>)}
          </select>
          <button onClick={handleFetch} disabled={fetching || !studentId}
            className="bg-academic-blue hover:bg-academic-blue/90 disabled:opacity-50 text-white rounded-xl px-5 py-2 text-sm font-bold transition-all">
            {fetching ? "Loading..." : "View Report Card"}
          </button>
        </div>

        {report && (
          <div className="space-y-4">
            {report.student_name && (
              <div className="p-4 bg-slate-50 border rounded-xl">
                <p className="font-heading font-bold text-ink-primary text-lg">{report.student_name}</p>
                <p className="text-xs text-ink-secondary">Class: {report.class_name || "—"} | Admission: {report.admission_number || "—"}</p>
              </div>
            )}

            {report.results && report.results.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-ink-secondary text-xs uppercase tracking-wide border-b">
                      <th className="py-2.5">Subject</th>
                      <th className="py-2.5">Marks Obtained</th>
                      <th className="py-2.5">Max Marks</th>
                      <th className="py-2.5">Percentage</th>
                      <th className="py-2.5">Grade</th>
                      <th className="py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.results.map((r, idx) => (
                      <tr key={idx}>
                        <td className="py-2.5 font-semibold text-ink-primary">{r.subject_name || "—"}</td>
                        <td className="py-2.5 font-bold text-ink-primary">{r.marks_obtained ?? "—"}</td>
                        <td className="py-2.5 text-xs text-ink-secondary">{r.max_marks ?? "—"}</td>
                        <td className="py-2.5 text-xs text-ink-secondary">{r.percentage != null ? `${r.percentage}%` : "—"}</td>
                        <td className="py-2.5"><Badge tone="blue">{r.grade_letter || r.grade || "—"}</Badge></td>
                        <td className="py-2.5">
                          <Badge tone={r.status === "Pass" || r.is_passed ? "green" : "red"}>
                            {r.status || (r.is_passed ? "Pass" : "Fail")}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {report.summary && (
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-academic-blue space-y-1">
                {report.summary.total_marks !== undefined && <p>Total Marks: <strong>{report.summary.total_marks}</strong></p>}
                {report.summary.percentage !== undefined && <p>Overall Percentage: <strong>{report.summary.percentage}%</strong></p>}
                {report.summary.overall_grade && <p>Overall Grade: <strong>{report.summary.overall_grade}</strong></p>}
                {report.summary.rank && <p>Rank: <strong>{report.summary.rank}</strong></p>}
              </div>
            )}
          </div>
        )}

        {!report && !fetching && (
          <EmptyState label="Select a student and click 'View Report Card' to display results." />
        )}
      </Card>
    </div>
  );
}

function RevaluationSupplementary({ onError }) {
  const [tab, setTab] = useState("revaluation");
  const [revaluations, setRevaluations] = useState([]);
  const [supps, setSupps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revalModal, setRevalModal] = useState(null);
  const [revalForm, setRevalForm] = useState({ status: "Approved", teacher_remarks: "", updated_marks: "" });
  const [suppModal, setSuppModal] = useState(null);
  const [suppForm, setSuppForm] = useState({ status: "Completed", marks_obtained: "" });
  const [certForm, setCertForm] = useState({ student_id: "", certificate_type: "Marks Memo", file_url: "" });

  async function loadAll() {
    setLoading(true);
    try {
      const [revalRes, suppRes] = await Promise.all([
        api.get("/admin-portal/exams/revaluation/").catch(() => ({ data: [] })),
        api.get("/admin-portal/exams/supplementary/").catch(() => ({ data: [] }))
      ]);
      setRevaluations(revalRes.data);
      setSupps(suppRes.data);
    } catch {
      onError("Failed to load revaluation/supplementary data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  async function handleRevalSubmit(e) {
    e.preventDefault();
    try {
      await api.patch("/admin-portal/exams/revaluation/", {
        id: revalModal.id, status: revalForm.status,
        teacher_remarks: revalForm.teacher_remarks,
        updated_marks: revalForm.updated_marks || null
      });
      onError("Revaluation status updated.");
      setRevalModal(null);
      loadAll();
    } catch {
      onError("Could not process revaluation.");
    }
  }

  async function handleSuppSubmit(e) {
    e.preventDefault();
    try {
      await api.patch("/admin-portal/exams/supplementary/", {
        id: suppModal.id, status: suppForm.status,
        marks_obtained: suppForm.marks_obtained || null
      });
      onError("Supplementary record updated.");
      setSuppModal(null);
      loadAll();
    } catch {
      onError("Could not save supplementary results.");
    }
  }

  async function handleIssueCertificate(e) {
    e.preventDefault();
    if (!certForm.student_id) {
      onError("Student ID is required.");
      return;
    }
    try {
      const { data } = await api.post("/admin-portal/exams/certificates/", certForm);
      onError(`Certificate issued! Code: ${data.verification_code}`);
      setCertForm({ student_id: "", certificate_type: "Marks Memo", file_url: "" });
    } catch {
      onError("Could not issue certificate.");
    }
  }

  if (loading) return <Loader rows={4} />;

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {[["revaluation", "Revaluations", RefreshCw], ["supplementary", "Supplementary", ShieldAlert], ["certificates", "Certificates", Award]].map(([key, label, Icon]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm ${tab === key ? "bg-academic-blue text-white shadow-md" : "bg-white text-ink-secondary hover:text-ink-primary hover:bg-slate-50"}`}>
            <Icon size={15} />{label}
          </button>
        ))}
      </div>

      {tab === "revaluation" && (
        <Card>
          <SectionTitle icon={RefreshCw}>Revaluation Applications ({revaluations.length})</SectionTitle>
          {revaluations.length === 0 ? (
            <EmptyState label="No revaluation requests submitted." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-ink-secondary text-xs uppercase tracking-wide border-b">
                    <th className="py-3">Student</th>
                    <th className="py-3">Exam / Subject</th>
                    <th className="py-3">Original Score</th>
                    <th className="py-3">Reason</th>
                    <th className="py-3">Status</th>
                    <th className="py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {revaluations.map(r => (
                    <tr key={r.id}>
                      <td className="py-3 font-semibold text-ink-primary">{r.student_name}</td>
                      <td className="py-3">
                        <p className="font-semibold text-ink-primary">{r.exam_name?.replace(/_/g, " ")}</p>
                        <span className="text-xs text-slate-500">{r.subject_name}</span>
                      </td>
                      <td className="py-3 font-bold text-ink-primary">{r.original_marks}</td>
                      <td className="py-3 text-xs text-ink-secondary truncate max-w-xs">{r.reason}</td>
                      <td className="py-3">
                        <Badge tone={r.status === "Completed" ? "green" : r.status === "Approved" ? "blue" : r.status === "Rejected" ? "red" : "orange"}>
                          {r.status}
                        </Badge>
                      </td>
                      <td className="py-3 text-right">
                        {r.status !== "Completed" && r.status !== "Rejected" ? (
                          <button onClick={() => { setRevalForm({ status: "Approved", teacher_remarks: r.teacher_remarks || "", updated_marks: r.original_marks }); setRevalModal(r); }}
                            className="bg-academic-blue text-white text-xs px-2.5 py-1.5 rounded-lg font-bold shadow-sm">Review</button>
                        ) : <span className="text-xs text-slate-400">Done</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === "supplementary" && (
        <Card>
          <SectionTitle icon={ShieldAlert}>Supplementary Examinations ({supps.length})</SectionTitle>
          {supps.length === 0 ? (
            <EmptyState label="No supplementary registrations." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-ink-secondary text-xs uppercase tracking-wide border-b">
                    <th className="py-3">Student</th>
                    <th className="py-3">Subject</th>
                    <th className="py-3">Original Exam</th>
                    <th className="py-3">Status</th>
                    <th className="py-3">Grade</th>
                    <th className="py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {supps.map(s => (
                    <tr key={s.id}>
                      <td className="py-3 font-semibold text-ink-primary">{s.student_name}</td>
                      <td className="py-3 font-medium text-ink-primary">{s.subject_name}</td>
                      <td className="py-3 text-ink-secondary">{s.original_exam_name?.replace(/_/g, " ")}</td>
                      <td className="py-3">
                        <Badge tone={s.status === "Completed" ? "green" : s.status === "Hall Ticket Issued" ? "blue" : "orange"}>{s.status}</Badge>
                      </td>
                      <td className="py-3 font-bold font-mono text-ink-primary">{s.grade_letter || "—"}</td>
                      <td className="py-3 text-right">
                        {s.status !== "Completed" ? (
                          <button onClick={() => { setSuppForm({ status: "Completed", marks_obtained: "" }); setSuppModal(s); }}
                            className="bg-academic-blue text-white text-xs px-2.5 py-1.5 rounded-lg font-bold shadow-sm">Record Marks</button>
                        ) : <span className="text-xs text-slate-400">Recorded</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === "certificates" && (
        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1 h-fit">
            <SectionTitle icon={Award}>Issue Certificate</SectionTitle>
            <form onSubmit={handleIssueCertificate} className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">Student User ID (*)</label>
                <input type="number" required placeholder="e.g. 5" value={certForm.student_id}
                  onChange={e => setCertForm({ ...certForm, student_id: e.target.value })}
                  className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-academic-blue" />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">Certificate Type</label>
                <select value={certForm.certificate_type} onChange={e => setCertForm({ ...certForm, certificate_type: e.target.value })}
                  className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:border-academic-blue">
                  <option value="Marks Memo">Marks Memo / Report Card</option>
                  <option value="Pass Certificate">Pass Certificate</option>
                  <option value="Rank Certificate">Rank Certificate</option>
                  <option value="Provisional Certificate">Provisional Certificate</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">PDF URL (Optional)</label>
                <input type="text" placeholder="https://..." value={certForm.file_url}
                  onChange={e => setCertForm({ ...certForm, file_url: e.target.value })}
                  className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-academic-blue" />
              </div>
              <button className="w-full bg-academic-blue hover:bg-academic-blue/90 text-white rounded-xl py-2.5 font-bold transition-colors">
                Issue Certificate
              </button>
            </form>
          </Card>
          <Card className="lg:col-span-2">
            <SectionTitle icon={Award}>Issued Certificates</SectionTitle>
            <CertificateList onError={onError} />
          </Card>
        </div>
      )}

      {revalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="font-heading font-bold text-ink-primary">Revaluation: {revalModal.student_name}</h3>
              <button onClick={() => setRevalModal(null)} className="text-slate-400 hover:text-ink-primary font-bold">✕</button>
            </div>
            <form onSubmit={handleRevalSubmit} className="p-6 space-y-4">
              <div className="p-3 bg-slate-50 border rounded-xl text-xs space-y-1.5 text-ink-secondary">
                <p><strong>Subject:</strong> {revalModal.subject_name}</p>
                <p><strong>Original Marks:</strong> {revalModal.original_marks}</p>
                <p><strong>Reason:</strong> "{revalModal.reason}"</p>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-ink-secondary">Action</label>
                <select value={revalForm.status} onChange={e => setRevalForm({ ...revalForm, status: e.target.value })}
                  className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white outline-none">
                  <option value="Approved">Approve</option>
                  <option value="Rejected">Reject</option>
                  <option value="Completed">Resolve &amp; Save Updated Marks</option>
                </select>
              </div>
              {revalForm.status === "Completed" && (
                <div>
                  <label className="text-xs font-semibold uppercase text-ink-secondary">Updated Marks (*)</label>
                  <input type="number" step="0.01" required value={revalForm.updated_marks}
                    onChange={e => setRevalForm({ ...revalForm, updated_marks: e.target.value })}
                    className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-academic-blue" />
                </div>
              )}
              <div>
                <label className="text-xs font-semibold uppercase text-ink-secondary">Remarks (*)</label>
                <textarea rows={3} required placeholder="Review comments..." value={revalForm.teacher_remarks}
                  onChange={e => setRevalForm({ ...revalForm, teacher_remarks: e.target.value })}
                  className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none resize-none focus:border-academic-blue" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setRevalModal(null)} className="flex-1 border rounded-xl py-2 font-medium">Cancel</button>
                <button type="submit" className="flex-1 bg-academic-blue text-white rounded-xl py-2 font-bold hover:bg-academic-blue/90">Submit</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {suppModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="font-heading font-bold text-ink-primary">Supplementary Record</h3>
              <button onClick={() => setSuppModal(null)} className="text-slate-400 hover:text-ink-primary font-bold">✕</button>
            </div>
            <form onSubmit={handleSuppSubmit} className="p-6 space-y-4">
              <div className="p-3 bg-slate-50 border rounded-xl text-xs space-y-1 text-ink-secondary">
                <p><strong>Student:</strong> {suppModal.student_name}</p>
                <p><strong>Subject:</strong> {suppModal.subject_name}</p>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-ink-secondary">Status</label>
                <select value={suppForm.status} onChange={e => setSuppForm({ ...suppForm, status: e.target.value })}
                  className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white outline-none">
                  <option value="Completed">Completed</option>
                  <option value="Absent">Absent</option>
                  <option value="Hall Ticket Issued">Hall Ticket Issued</option>
                </select>
              </div>
              {suppForm.status === "Completed" && (
                <div>
                  <label className="text-xs font-semibold uppercase text-ink-secondary">Marks Obtained (*)</label>
                  <input type="number" step="0.01" required value={suppForm.marks_obtained}
                    onChange={e => setSuppForm({ ...suppForm, marks_obtained: e.target.value })}
                    className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-academic-blue" />
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setSuppModal(null)} className="flex-1 border rounded-xl py-2 font-medium">Cancel</button>
                <button type="submit" className="flex-1 bg-academic-blue text-white rounded-xl py-2 font-bold hover:bg-academic-blue/90">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationsTab({ onError }) {
  const [items, setItems] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    exam_schedule_id: "", notification_type: "Exam_Schedule",
    title: "", message: "", target_audience: "Students"
  });

  async function loadAll() {
    setLoading(true);
    try {
      const [notifRes, examRes] = await Promise.all([
        api.get("/admin-portal/exam-workflow/notifications/"),
        api.get("/admin-portal/exams/")
      ]);
      setItems(notifRes.data);
      setExams(examRes.data);
    } catch {
      onError("Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim()) {
      onError("Title and message are required.");
      return;
    }
    try {
      await api.post("/admin-portal/exam-workflow/notifications/", form);
      onError("Notification created.");
      setForm({ exam_schedule_id: "", notification_type: "Exam_Schedule", title: "", message: "", target_audience: "Students" });
      loadAll();
    } catch (err) {
      onError(err.response?.data?.detail || "Could not create notification.");
    }
  }

  async function handleSend(id) {
    try {
      await api.post("/admin-portal/exam-workflow/notifications/send/", { id });
      onError("Notification sent.");
      loadAll();
    } catch (err) {
      onError(err.response?.data?.detail || "Could not send notification.");
    }
  }

  if (loading) return <Loader rows={4} />;

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-1 h-fit">
        <SectionTitle icon={Bell}>Create Notification</SectionTitle>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">Exam Schedule</label>
            <select value={form.exam_schedule_id} onChange={e => setForm({ ...form, exam_schedule_id: e.target.value })}
              className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:border-academic-blue">
              <option value="">General (No specific exam)</option>
              {exams.map(e => <option key={e.id} value={e.id}>{e.exam_name?.replace(/_/g, " ")} ({e.class_name})</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">Type</label>
            <select value={form.notification_type} onChange={e => setForm({ ...form, notification_type: e.target.value })}
              className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:border-academic-blue">
              {NOTIFICATION_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">Target Audience</label>
            <select value={form.target_audience} onChange={e => setForm({ ...form, target_audience: e.target.value })}
              className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:border-academic-blue">
              <option>Students</option>
              <option>Teachers</option>
              <option>Parents</option>
              <option>All</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">Title (*)</label>
            <input type="text" required placeholder="Notification title" value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-academic-blue" />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">Message (*)</label>
            <textarea rows={3} required placeholder="Notification message..." value={form.message}
              onChange={e => setForm({ ...form, message: e.target.value })}
              className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none resize-none focus:border-academic-blue" />
          </div>
          <button className="w-full bg-academic-blue hover:bg-academic-blue/90 text-white rounded-xl py-2.5 font-bold transition-colors">
            Create Notification
          </button>
        </form>
      </Card>

      <Card className="lg:col-span-2">
        <SectionTitle icon={Bell}>Notifications ({items.length})</SectionTitle>
        {items.length === 0 ? (
          <EmptyState label="No notifications created." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-secondary text-xs uppercase tracking-wide border-b">
                  <th className="py-3">Title</th>
                  <th className="py-3">Type</th>
                  <th className="py-3">Audience</th>
                  <th className="py-3">Status</th>
                  <th className="py-3">Date</th>
                  <th className="py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map(item => (
                  <tr key={item.id}>
                    <td className="py-3 font-semibold text-ink-primary">{item.title}</td>
                    <td className="py-3"><Badge tone="blue">{item.notification_type?.replace(/_/g, " ")}</Badge></td>
                    <td className="py-3 text-xs text-ink-secondary">{item.target_audience || "All"}</td>
                    <td className="py-3">
                      <Badge tone={item.is_sent ? "green" : "gold"}>{item.is_sent ? "Sent" : "Draft"}</Badge>
                    </td>
                    <td className="py-3 text-xs text-ink-secondary">{item.created_at ? new Date(item.created_at).toLocaleDateString() : "—"}</td>
                    <td className="py-3 text-right">
                      {!item.is_sent && (
                        <button onClick={() => handleSend(item.id)} className="bg-academic-green hover:bg-academic-green/90 text-white text-xs px-2.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1">
                          <Send size={12} /> Send
                        </button>
                      )}
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

function ReportsTab({ onError }) {
  const [reportType, setReportType] = useState("");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  async function handleFetch() {
    if (!reportType) {
      onError("Please select a report type.");
      return;
    }
    setLoading(true);
    setData([]);
    try {
      const { data: result } = await api.get(`/admin-portal/exam-workflow/reports/?type=${reportType}`);
      setData(result.results || result.data || result || []);
    } catch (err) {
      onError(err.response?.data?.detail || "Failed to fetch report.");
    } finally {
      setLoading(false);
    }
  }

  const columns = data.length > 0 ? Object.keys(data[0]).filter(k => k !== "id") : [];

  return (
    <div className="space-y-6">
      <Card>
        <SectionTitle icon={FileBarChart}>Exam Reports</SectionTitle>
        <div className="flex flex-wrap gap-3 mb-4">
          <select value={reportType} onChange={e => setReportType(e.target.value)}
            className="flex-1 min-w-[200px] border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:border-academic-blue">
            <option value="">Select Report Type</option>
            {REPORT_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</option>)}
          </select>
          <button onClick={handleFetch} disabled={loading || !reportType}
            className="bg-academic-blue hover:bg-academic-blue/90 disabled:opacity-50 text-white rounded-xl px-5 py-2 text-sm font-bold transition-all">
            {loading ? "Loading..." : "Generate Report"}
          </button>
        </div>

        {loading && <Loader rows={3} />}

        {!loading && data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-secondary text-xs uppercase tracking-wide border-b">
                  {columns.map(col => (
                    <th key={col} className="py-3">{col.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((row, idx) => (
                  <tr key={row.id || idx}>
                    {columns.map(col => (
                      <td key={col} className="py-3 text-sm text-ink-primary">
                        {typeof row[col] === "boolean" ? (row[col] ? "Yes" : "No") : (row[col] ?? "—")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && data.length === 0 && reportType && (
          <EmptyState label="No data available for this report type." />
        )}

        {!reportType && !loading && (
          <EmptyState label="Select a report type and click 'Generate Report' to view data." />
        )}
      </Card>
    </div>
  );
}

function CertificateList({ onError }) {
  const [certs, setCerts] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadCerts() {
    try {
      const { data } = await api.get("/admin-portal/exams/certificates/");
      setCerts(data);
    } catch {
      if (onError) onError("Could not load certificates.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadCerts(); }, []);

  if (loading) return <Loader rows={3} />;
  if (certs.length === 0) return <EmptyState label="No certificates issued yet." />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-ink-secondary text-xs uppercase tracking-wide border-b">
            <th className="py-2.5">Student</th>
            <th className="py-2.5">Type</th>
            <th className="py-2.5">Issued Date</th>
            <th className="py-2.5">Verification Code</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {certs.map(c => (
            <tr key={c.id}>
              <td className="py-2.5 font-semibold text-ink-primary">{c.student_name}</td>
              <td className="py-2.5 font-medium text-ink-primary">{c.certificate_type}</td>
              <td className="py-2.5 text-xs text-ink-secondary">{c.issued_date}</td>
              <td className="py-2.5 font-mono text-xs text-academic-blue font-semibold">{c.verification_code}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
