import { Plus, Trash2, Video, Clock, Users, ExternalLink, Edit2, Calendar, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Card, EmptyState, Loader, SectionTitle, StatCard, Badge, Toast } from "../components/Common";
import api from "../lib/api";

const STATUS_TONE = {
  Scheduled: "blue",
  Live: "green",
  Completed: "slate",
  Cancelled: "red",
};

export default function LiveClasses() {
  const [classes, setClasses] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [form, setForm] = useState({
    course_id: "",
    title: "",
    description: "",
    scheduled_date: new Date().toISOString().slice(0, 10),
    start_time: "09:00",
    end_time: "10:00",
    meeting_platform: "Zoom",
    meeting_link: "",
    meeting_password: "",
    status: "Scheduled",
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  function loadData() {
    setLoading(true);
    Promise.all([
      api.get("/teacher/lms/live-classes/"),
      api.get("/teacher/lms/courses/"),
    ])
      .then(([classesRes, coursesRes]) => {
        setClasses(classesRes.data || []);
        setCourses(coursesRes.data || []);
      })
      .catch(() => {
        setClasses([]);
        setCourses([]);
      })
      .finally(() => setLoading(false));
  }

  function resetForm() {
    setForm({
      course_id: courses[0]?.id || "",
      title: "",
      description: "",
      scheduled_date: new Date().toISOString().slice(0, 10),
      start_time: "09:00",
      end_time: "10:00",
      meeting_platform: "Zoom",
      meeting_link: "",
      meeting_password: "",
      status: "Scheduled",
    });
    setErrors({});
    setEditingClass(null);
  }

  function openCreate() {
    resetForm();
    setShowForm(true);
  }

  function openEdit(cls) {
    setForm({
      course_id: cls.course_id || "",
      title: cls.title || "",
      description: cls.description || "",
      scheduled_date: cls.scheduled_date || "",
      start_time: cls.start_time?.slice(0, 5) || "09:00",
      end_time: cls.end_time?.slice(0, 5) || "10:00",
      meeting_platform: cls.meeting_platform || "Zoom",
      meeting_link: cls.meeting_link || "",
      meeting_password: cls.meeting_password || "",
      status: cls.status || "Scheduled",
    });
    setEditingClass(cls);
    setShowForm(true);
  }

  function validate() {
    const errs = {};
    if (!form.course_id) errs.course_id = "Select a course.";
    if (!form.title.trim()) errs.title = "Title is required.";
    if (!form.scheduled_date) errs.scheduled_date = "Date is required.";
    if (!form.start_time) errs.start_time = "Start time is required.";
    if (!form.end_time) errs.end_time = "End time is required.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      ...form,
      start_time: form.start_time.length === 5 ? form.start_time + ":00" : form.start_time,
      end_time: form.end_time.length === 5 ? form.end_time + ":00" : form.end_time,
    };

    try {
      if (editingClass) {
        await api.put("/teacher/lms/live-classes/", { id: editingClass.id, ...payload });
        setToast("Live class updated.");
      } else {
        await api.post("/teacher/lms/live-classes/", payload);
        setToast("Live class scheduled.");
      }
      setShowForm(false);
      resetForm();
      loadData();
    } catch (err) {
      setToast(err.response?.data?.detail || "Failed to save live class.");
    }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this live class?")) return;
    try {
      await api.delete(`/teacher/lms/live-classes/?id=${id}`);
      setToast("Live class deleted.");
      loadData();
    } catch {
      setToast("Failed to delete.");
    }
  }

  function updateStatus(id, status) {
    api.put("/teacher/lms/live-classes/", { id, status })
      .then(() => { setToast("Status updated."); loadData(); })
      .catch(() => setToast("Failed to update status."));
  }

  if (loading) return <Loader rows={4} />;

  const filtered = filterStatus === "all"
    ? classes
    : classes.filter(c => c.status?.toLowerCase() === filterStatus);

  const scheduledCount = classes.filter(c => c.status === "Scheduled").length;
  const liveCount = classes.filter(c => c.status === "Live").length;
  const completedCount = classes.filter(c => c.status === "Completed").length;

  return (
    <div className="space-y-6 animate-[fadeIn_.2s_ease]">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold text-ink-primary">Live Classes</h2>
          <p className="text-sm text-ink-secondary">Schedule and manage live virtual classroom sessions for your courses.</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-academic-blue text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-academic-blue/90 shadow-raised transition-all"
        >
          <Plus size={16} /> Schedule Class
        </button>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard icon={Clock} label="Scheduled" value={scheduledCount} accent="blue" />
        <StatCard icon={Video} label="Live Now" value={liveCount} accent="green" />
        <StatCard icon={Calendar} label="Completed" value={completedCount} accent="slate" />
      </div>

      <div className="flex gap-2">
        {["all", "scheduled", "live", "completed", "cancelled"].map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl capitalize transition-all ${
              filterStatus === s ? "bg-academic-blue text-white shadow-md" : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            {s === "all" ? "All Classes" : s}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState label="No live classes found. Click 'Schedule Class' to create one." />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map(cls => (
            <Card key={cls.id} className="border border-slate-100 hover:border-slate-200 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-academic-blue/10 text-academic-blue flex items-center justify-center">
                    <Video size={16} />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-sm text-ink-primary">{cls.title}</h3>
                    <p className="text-[11px] text-ink-secondary">{cls.course_title || cls.subject_name}</p>
                  </div>
                </div>
                <Badge tone={STATUS_TONE[cls.status] || "slate"}>{cls.status}</Badge>
              </div>

              <div className="space-y-1.5 text-xs text-ink-secondary mb-4">
                <div className="flex items-center gap-2">
                  <Calendar size={12} className="text-slate-400" />
                  <span>{cls.scheduled_date}</span>
                  <span className="mx-1">·</span>
                  <Clock size={12} className="text-slate-400" />
                  <span>{cls.start_time?.slice(0, 5)} — {cls.end_time?.slice(0, 5)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Video size={12} className="text-slate-400" />
                  <span>{cls.meeting_platform}</span>
                  {cls.meeting_link && (
                    <a href={cls.meeting_link} target="_blank" rel="noreferrer" className="text-academic-blue hover:underline flex items-center gap-1">
                      Join Link <ExternalLink size={10} />
                    </a>
                  )}
                </div>
                {cls.attended_count !== undefined && (
                  <div className="flex items-center gap-2">
                    <Users size={12} className="text-slate-400" />
                    <span>{cls.attended_count} / {cls.total_students} students attended</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                <div className="flex gap-1.5">
                  {cls.status === "Scheduled" && (
                    <button onClick={() => updateStatus(cls.id, "Live")} className="text-[11px] font-bold text-academic-green bg-academic-green/10 hover:bg-academic-green/20 px-2.5 py-1 rounded-lg transition-colors">
                      Start Now
                    </button>
                  )}
                  {cls.status === "Live" && (
                    <button onClick={() => updateStatus(cls.id, "Completed")} className="text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition-colors">
                      End Class
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => openEdit(cls)} className="p-1.5 rounded-lg text-slate-400 hover:text-academic-blue hover:bg-slate-50 transition-colors" title="Edit">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => handleDelete(cls.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-danger hover:bg-red-50 transition-colors" title="Delete">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-[fadeIn_.2s_ease]">
          <div className="bg-white rounded-card w-full max-w-lg p-6 shadow-raised max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-heading text-lg font-bold text-ink-primary">
                {editingClass ? "Edit Live Class" : "Schedule Live Class"}
              </h3>
              <button onClick={() => { setShowForm(false); resetForm(); }} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-ink-secondary block mb-1">Course *</label>
                <select
                  value={form.course_id}
                  onChange={e => setForm(f => ({ ...f, course_id: e.target.value }))}
                  className={`w-full rounded-xl border px-3 py-2.5 text-sm focus-ring outline-none ${errors.course_id ? "border-danger" : "border-slate-200"}`}
                >
                  <option value="">-- Select Course --</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.title || c.subject_name} — {c.class_name}</option>
                  ))}
                </select>
                {errors.course_id && <p className="text-xs text-danger mt-1">{errors.course_id}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-ink-secondary block mb-1">Class Title *</label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Chapter 5: Thermodynamics Live Session"
                  className={`w-full rounded-xl border px-3 py-2.5 text-sm focus-ring outline-none ${errors.title ? "border-danger" : "border-slate-200"}`}
                />
                {errors.title && <p className="text-xs text-danger mt-1">{errors.title}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-ink-secondary block mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Brief description of the session..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus-ring outline-none h-16"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-ink-secondary block mb-1">Date *</label>
                  <input
                    type="date"
                    value={form.scheduled_date}
                    onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))}
                    className={`w-full rounded-xl border px-3 py-2.5 text-sm focus-ring outline-none ${errors.scheduled_date ? "border-danger" : "border-slate-200"}`}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-ink-secondary block mb-1">Start *</label>
                  <input
                    type="time"
                    value={form.start_time}
                    onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                    className={`w-full rounded-xl border px-3 py-2.5 text-sm focus-ring outline-none ${errors.start_time ? "border-danger" : "border-slate-200"}`}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-ink-secondary block mb-1">End *</label>
                  <input
                    type="time"
                    value={form.end_time}
                    onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
                    className={`w-full rounded-xl border px-3 py-2.5 text-sm focus-ring outline-none ${errors.end_time ? "border-danger" : "border-slate-200"}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-ink-secondary block mb-1">Platform</label>
                  <select
                    value={form.meeting_platform}
                    onChange={e => setForm(f => ({ ...f, meeting_platform: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus-ring outline-none"
                  >
                    {["Zoom", "Google Meet", "Microsoft Teams", "Jitsi"].map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-ink-secondary block mb-1">Meeting Password</label>
                  <input
                    value={form.meeting_password}
                    onChange={e => setForm(f => ({ ...f, meeting_password: e.target.value }))}
                    placeholder="Optional"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus-ring outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-ink-secondary block mb-1">Meeting Link *</label>
                <input
                  value={form.meeting_link}
                  onChange={e => setForm(f => ({ ...f, meeting_link: e.target.value }))}
                  placeholder="https://zoom.us/j/... or Google Meet link"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus-ring outline-none"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
                <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-academic-blue text-white rounded-xl text-sm font-semibold hover:bg-academic-blue/90 shadow-raised">
                  {editingClass ? "Update Class" : "Schedule Class"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}
