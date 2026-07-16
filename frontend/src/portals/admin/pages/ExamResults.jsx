import { useState, useEffect } from "react";
import api from "../lib/api";
import { Card, EmptyState, Loader, SectionTitle, Toast, Badge } from "../components/Common";
import {
  Calendar, Users, MapPin, CheckCircle, FileText, BarChart2,
  Plus, Trash2, Award, Clock, ShieldAlert, BookOpen, UserCheck, RefreshCw
} from "lucide-react";

const EXAM_NAME_CHOICES = [
  "Unit_Test_1", "Unit_Test_2", "Unit_Test_3", "Unit_Test_4",
  "Mid_Term", "Final_Term", "Pre_Board", "Board_Exam"
];

const EXAM_TYPE_CHOICES = ["Unit Test", "Mid-Term", "Final", "Practical", "Online Assessment"];

export default function ExamResults() {
  const [tab, setTab] = useState("planning");
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(false);

  // Lists loaded from backend
  const [exams, setExams] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [revaluations, setRevaluations] = useState([]);
  const [supps, setSupps] = useState([]);

  // Form states
  const [planningForm, setPlanningForm] = useState({
    exam_name: "Unit_Test_1",
    exam_type: "Unit Test",
    exam_date: new Date().toISOString().split("T")[0],
    start_time: "09:00",
    duration_minutes: 60,
    max_marks: 100,
    passing_marks: 40,
    internal_weightage: 20,
    practical_weightage: 0,
    class_id: "",
    subject_id: "",
    teacher_id: ""
  });

  const [seatingForm, setSeatingForm] = useState({
    exam_schedule_id: "",
    room_name: "",
    invigilator_id: "",
    passing_marks: 40,
    internal_weightage: 20,
    practical_weightage: 0
  });

  const [revalModal, setRevalModal] = useState(null);
  const [revalForm, setRevalForm] = useState({ status: "Approved", teacher_remarks: "", updated_marks: "" });

  const [suppModal, setSuppModal] = useState(null);
  const [suppForm, setSuppForm] = useState({ status: "Completed", marks_obtained: "" });

  const [certForm, setCertForm] = useState({ student_id: "", certificate_type: "Marks Memo", file_url: "" });

  // Load all foundational data
  async function loadData() {
    setLoading(true);
    try {
      const { data: examData } = await api.get("/admin-portal/exams/");
      setExams(examData);

      const { data: classData } = await api.get("/admin-portal/classes/");
      setClasses(classData);

      const { data: subjectData } = await api.get("/admin-portal/subjects/");
      setSubjects(subjectData);

      const { data: userData } = await api.get("/admin-portal/users/");
      setTeachers(userData.filter(u => u.role === "Teacher" || u.user_type === "Teacher"));

      if (tab === "revaluation") {
        const { data: revalData } = await api.get("/admin-portal/exams/revaluation/");
        setRevaluations(revalData);
      } else if (tab === "supplementary") {
        const { data: suppData } = await api.get("/admin-portal/exams/supplementary/");
        setSupps(suppData);
      }
    } catch (err) {
      setToast("Error loading exam configuration details.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [tab]);

  // Create exam cycle
  async function handleCreateExam(e) {
    e.preventDefault();
    if (!planningForm.class_id || !planningForm.subject_id) {
      setToast("Please select a valid class and subject.");
      return;
    }
    try {
      await api.post("/teacher/exams/", planningForm);
      setToast("Examination scheduled successfully.");
      loadData();
    } catch (err) {
      setToast(err.response?.data?.detail || "Could not schedule exam.");
    }
  }

  // Update Seating & Seating/Invigilator conflict checks
  async function handleAssignSeating(e) {
    e.preventDefault();
    if (!seatingForm.exam_schedule_id) {
      setToast("Please select an exam schedule.");
      return;
    }
    try {
      const { data } = await api.post("/admin-portal/exams/seating/", seatingForm);
      setToast(data.detail);
      loadData();
    } catch (err) {
      setToast(err.response?.data?.detail || "Seating conflict validation failed.");
    }
  }

  // Publish / Return result action
  async function handleExamAction(examId, action) {
    try {
      await api.post(`/admin-portal/exams/${examId}/action/`, { action });
      setToast(`Exam results successfully ${action === "Publish" ? "published" : "returned"}.`);
      loadData();
    } catch {
      setToast("Could not update result status.");
    }
  }

  // Revaluation request approval
  async function handleRevalSubmit(e) {
    e.preventDefault();
    try {
      await api.patch("/admin-portal/exams/revaluation/", {
        id: revalModal.id,
        status: revalForm.status,
        teacher_remarks: revalForm.teacher_remarks,
        updated_marks: revalForm.updated_marks || null
      });
      setToast("Revaluation request status updated.");
      setRevalModal(null);
      loadData();
    } catch {
      setToast("Could not process revaluation.");
    }
  }

  // Supplementary update
  async function handleSuppSubmit(e) {
    e.preventDefault();
    try {
      await api.patch("/admin-portal/exams/supplementary/", {
        id: suppModal.id,
        status: suppForm.status,
        marks_obtained: suppForm.marks_obtained || null
      });
      setToast("Supplementary exam results recorded.");
      setSuppModal(null);
      loadData();
    } catch {
      setToast("Could not save supplementary results.");
    }
  }

  // Generate Digital Certificate
  async function handleIssueCertificate(e) {
    e.preventDefault();
    if (!certForm.student_id) {
      setToast("Student user ID is required.");
      return;
    }
    try {
      const { data } = await api.post("/admin-portal/exams/certificates/", certForm);
      setToast(`Certificate issued! Verification code: ${data.verification_code}`);
      setCertForm({ student_id: "", certificate_type: "Marks Memo", file_url: "" });
    } catch {
      setToast("Could not issue digital certificate.");
    }
  }

  // Calculate high level metrics
  const stats = {
    total: exams.length,
    published: exams.filter(e => e.status === "Published").length,
    submitted: exams.filter(e => e.status === "Submitted").length,
    conflictFree: exams.filter(e => e.room_name && e.invigilator_id).length
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Action Tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          ["planning", "Exam Planning", Calendar],
          ["seating", "Seating & Invigilators", MapPin],
          ["publish", "Oversee & Publish", CheckCircle],
          ["revaluation", "Revaluations", RefreshCw],
          ["supplementary", "Supplementary Cycle", ShieldAlert],
          ["certificates", "Certificates Memo", Award]
        ].map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm ${
              tab === key
                ? "bg-academic-blue text-white shadow-md scale-102"
                : "bg-white text-ink-secondary hover:text-ink-primary hover:bg-slate-50"
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <Loader rows={5} />
      ) : (
        <>
          {/* TAB 1: Exam Planning */}
          {tab === "planning" && (
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Scheduling Panel */}
              <Card className="lg:col-span-1 h-fit">
                <SectionTitle icon={Plus}>Schedule Exam Session</SectionTitle>
                <form onSubmit={handleCreateExam} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">Exam Cycle</label>
                    <select
                      value={planningForm.exam_name}
                      onChange={e => setPlanningForm({ ...planningForm, exam_name: e.target.value })}
                      className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:border-academic-blue"
                    >
                      {EXAM_NAME_CHOICES.map(name => (
                        <option key={name} value={name}>{name.replace(/_/g, " ")}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">Exam Type</label>
                    <select
                      value={planningForm.exam_type}
                      onChange={e => setPlanningForm({ ...planningForm, exam_type: e.target.value })}
                      className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:border-academic-blue"
                    >
                      {EXAM_TYPE_CHOICES.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">Class Target (*)</label>
                      <select
                        required
                        value={planningForm.class_id}
                        onChange={e => setPlanningForm({ ...planningForm, class_id: e.target.value })}
                        className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:border-academic-blue"
                      >
                        <option value="">Select Class</option>
                        {classes.map(c => (
                          <option key={c.id} value={c.id}>{c.name}-{c.section}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">Subject Target (*)</label>
                      <select
                        required
                        value={planningForm.subject_id}
                        onChange={e => setPlanningForm({ ...planningForm, subject_id: e.target.value })}
                        className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:border-academic-blue"
                      >
                        <option value="">Select Subject</option>
                        {subjects.map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.subject_code})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">Date (*)</label>
                      <input
                        type="date"
                        required
                        value={planningForm.exam_date}
                        onChange={e => setPlanningForm({ ...planningForm, exam_date: e.target.value })}
                        className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-academic-blue"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">Start Time (*)</label>
                      <input
                        type="time"
                        required
                        value={planningForm.start_time}
                        onChange={e => setPlanningForm({ ...planningForm, start_time: e.target.value })}
                        className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-academic-blue"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">Duration</label>
                      <input
                        type="number"
                        placeholder="Mins"
                        value={planningForm.duration_minutes}
                        onChange={e => setPlanningForm({ ...planningForm, duration_minutes: parseInt(e.target.value) })}
                        className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-academic-blue"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">Max Marks</label>
                      <input
                        type="number"
                        value={planningForm.max_marks}
                        onChange={e => setPlanningForm({ ...planningForm, max_marks: parseInt(e.target.value) })}
                        className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-academic-blue"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">Passing</label>
                      <input
                        type="number"
                        value={planningForm.passing_marks}
                        onChange={e => setPlanningForm({ ...planningForm, passing_marks: parseInt(e.target.value) })}
                        className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-academic-blue"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">Internal Weight %</label>
                      <input
                        type="number"
                        value={planningForm.internal_weightage}
                        onChange={e => setPlanningForm({ ...planningForm, internal_weightage: parseInt(e.target.value) })}
                        className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-academic-blue"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">Practical Weight %</label>
                      <input
                        type="number"
                        value={planningForm.practical_weightage}
                        onChange={e => setPlanningForm({ ...planningForm, practical_weightage: parseInt(e.target.value) })}
                        className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-academic-blue"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">Mapped Teacher</label>
                    <select
                      value={planningForm.teacher_id}
                      onChange={e => setPlanningForm({ ...planningForm, teacher_id: e.target.value })}
                      className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:border-academic-blue"
                    >
                      <option value="">Select Subject Teacher</option>
                      {teachers.map(t => (
                        <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
                      ))}
                    </select>
                  </div>
                  <button className="w-full bg-academic-blue hover:bg-academic-blue/90 text-white rounded-xl py-2.5 font-bold transition-colors">
                    Publish Exam to Calendar
                  </button>
                </form>
              </Card>

              {/* Scheduled Exams Registry */}
              <Card className="lg:col-span-2">
                <SectionTitle icon={BookOpen}>Active Academic Calendar ({exams.length})</SectionTitle>
                {exams.length === 0 ? (
                  <EmptyState label="No scheduled examinations found." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-ink-secondary text-xs uppercase tracking-wide border-b">
                          <th className="py-3">Exam Cycle</th>
                          <th className="py-3">Target Class</th>
                          <th className="py-3">Details</th>
                          <th className="py-3">Passing Criteria</th>
                          <th className="py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {exams.map(e => (
                          <tr key={e.id}>
                            <td className="py-3 font-semibold text-ink-primary">
                              {e.exam_name.replace(/_/g, " ")}
                              <span className="block text-xs font-normal text-slate-500">{e.exam_type}</span>
                            </td>
                            <td className="py-3 font-semibold text-ink-primary">
                              {e.class_name}
                              <span className="block text-xs font-normal text-slate-500">{e.subject_name}</span>
                            </td>
                            <td className="py-3">
                              <span className="block text-xs text-ink-primary font-semibold">{e.exam_date}</span>
                              <span className="block text-xs text-ink-secondary">{e.start_time} ({e.duration_minutes}m)</span>
                            </td>
                            <td className="py-3 text-xs text-ink-secondary space-y-0.5">
                              <p>Passing: <strong>{e.passing_marks}/{e.max_marks}</strong></p>
                              <p>Weights: Int {e.internal_weightage}% | Prac {e.practical_weightage}%</p>
                            </td>
                            <td className="py-3">
                              <Badge tone={e.status === "Published" ? "green" : e.status === "Submitted" ? "blue" : "gold"}>
                                {e.status}
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
          )}

          {/* TAB 2: Seating & Invigilation */}
          {tab === "seating" && (
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Seating Form */}
              <Card className="lg:col-span-1 h-fit">
                <SectionTitle icon={MapPin}>Assign Room &amp; Invigilator</SectionTitle>
                <form onSubmit={handleAssignSeating} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">Select Examination (*)</label>
                    <select
                      required
                      value={seatingForm.exam_schedule_id}
                      onChange={e => {
                        const schedId = e.target.value;
                        const match = exams.find(x => x.id === parseInt(schedId));
                        setSeatingForm({
                          exam_schedule_id: schedId,
                          room_name: match?.room_name || "",
                          invigilator_id: match?.invigilator_id || "",
                          passing_marks: match?.passing_marks || 40,
                          internal_weightage: match?.internal_weightage || 20,
                          practical_weightage: match?.practical_weightage || 0
                        });
                      }}
                      className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:border-academic-blue"
                    >
                      <option value="">Select Exam Slot</option>
                      {exams.map(e => (
                        <option key={e.id} value={e.id}>
                          {e.exam_name.replace(/_/g, " ")} ({e.class_name} | {e.subject_name})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">Room/Hall Location (*)</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Block-A Hall 1 (*)"
                      value={seatingForm.room_name}
                      onChange={e => setSeatingForm({ ...seatingForm, room_name: e.target.value })}
                      className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-academic-blue"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">Assign Invigilator (*)</label>
                    <select
                      required
                      value={seatingForm.invigilator_id}
                      onChange={e => setSeatingForm({ ...seatingForm, invigilator_id: e.target.value })}
                      className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:border-academic-blue"
                    >
                      <option value="">Select Invigilator</option>
                      {teachers.map(t => (
                        <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">Passing</label>
                      <input
                        type="number"
                        value={seatingForm.passing_marks}
                        onChange={e => setSeatingForm({ ...seatingForm, passing_marks: parseInt(e.target.value) })}
                        className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">Internal %</label>
                      <input
                        type="number"
                        value={seatingForm.internal_weightage}
                        onChange={e => setSeatingForm({ ...seatingForm, internal_weightage: parseInt(e.target.value) })}
                        className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">Practical %</label>
                      <input
                        type="number"
                        value={seatingForm.practical_weightage}
                        onChange={e => setSeatingForm({ ...seatingForm, practical_weightage: parseInt(e.target.value) })}
                        className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none"
                      />
                    </div>
                  </div>
                  <button className="w-full bg-academic-blue hover:bg-academic-blue/90 text-white rounded-xl py-2.5 font-bold transition-colors">
                    Check Conflict &amp; Save
                  </button>
                </form>
              </Card>

              {/* Seating Registry */}
              <Card className="lg:col-span-2">
                <SectionTitle icon={UserCheck}>Duty Roster &amp; Room Allocations</SectionTitle>
                {exams.length === 0 ? (
                  <EmptyState label="No scheduled exams available." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-ink-secondary text-xs uppercase tracking-wide border-b">
                          <th className="py-3">Exam Details</th>
                          <th className="py-3">Halls &amp; Rooms</th>
                          <th className="py-3">Invigilator</th>
                          <th className="py-3">Overlapping Safeguard</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {exams.map(e => {
                          const hasDuty = e.room_name && e.invigilator_id;
                          const invMatch = teachers.find(t => t.id === e.invigilator_id);
                          const invName = invMatch ? `${invMatch.first_name} ${invMatch.last_name}` : "—";
                          return (
                            <tr key={e.id}>
                              <td className="py-3 font-semibold text-ink-primary">
                                {e.exam_name.replace(/_/g, " ")}
                                <span className="block text-xs font-normal text-slate-500">{e.class_name} | {e.subject_name}</span>
                              </td>
                              <td className="py-3">
                                {e.room_name ? (
                                  <span className="flex items-center gap-1 text-sm font-semibold text-ink-primary">
                                    <MapPin size={12} className="text-academic-blue" /> {e.room_name}
                                  </span>
                                ) : (
                                  <span className="text-xs text-amber-600 bg-amber-50 rounded px-1.5 py-0.5 font-medium">Unallocated Room</span>
                                )}
                              </td>
                              <td className="py-3 font-medium text-ink-primary">
                                {invName}
                              </td>
                              <td className="py-3">
                                {hasDuty ? (
                                  <Badge tone="green">Conflict Checked</Badge>
                                ) : (
                                  <Badge tone="gold">Pending Assignment</Badge>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* TAB 3: Oversee & Publish */}
          {tab === "publish" && (
            <Card>
              <SectionTitle icon={CheckCircle}>Approve &amp; Publish Exam Results</SectionTitle>
              {exams.length === 0 ? (
                <EmptyState label="No examinations logged." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-ink-secondary text-xs uppercase tracking-wide border-b">
                        <th className="py-3">Examination Cycle</th>
                        <th className="py-3">Class &amp; Subject</th>
                        <th className="py-3">Assigned Teacher</th>
                        <th className="py-3">Date / Time</th>
                        <th className="py-3">Status</th>
                        <th className="py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {exams.map(e => (
                        <tr key={e.id}>
                          <td className="py-3 font-semibold text-ink-primary">
                            {e.exam_name.replace(/_/g, " ")}
                            <span className="block text-xs font-normal text-slate-500">Max Marks: {e.max_marks}</span>
                          </td>
                          <td className="py-3 font-semibold text-ink-primary">
                            {e.class_name}
                            <span className="block text-xs font-normal text-slate-500">{e.subject_name}</span>
                          </td>
                          <td className="py-3 text-ink-secondary">
                            {teachers.find(t => t.id === e.teacher_id)?.first_name || "—"} {teachers.find(t => t.id === e.teacher_id)?.last_name || ""}
                          </td>
                          <td className="py-3 font-numeric text-xs text-ink-secondary">
                            {e.exam_date} at {e.start_time}
                          </td>
                          <td className="py-3">
                            <Badge tone={e.status === "Published" ? "green" : e.status === "Submitted" ? "blue" : e.status === "Returned" ? "red" : "gold"}>
                              {e.status}
                            </Badge>
                          </td>
                          <td className="py-3 text-right">
                            {e.status === "Submitted" ? (
                              <div className="flex justify-end gap-1.5">
                                <button
                                  onClick={() => handleExamAction(e.id, "Publish")}
                                  className="bg-academic-green hover:bg-academic-green/90 text-white text-xs px-2.5 py-1.5 rounded-lg font-bold transition-all shadow-sm"
                                >
                                  Publish Results
                                </button>
                                <button
                                  onClick={() => handleExamAction(e.id, "Return")}
                                  className="bg-danger hover:bg-danger/90 text-white text-xs px-2.5 py-1.5 rounded-lg font-bold transition-all shadow-sm"
                                >
                                  Return to Teacher
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 font-medium">No actions pending</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}

          {/* TAB 4: Revaluation Requests */}
          {tab === "revaluation" && (
            <Card>
              <SectionTitle icon={RefreshCw}>Revaluation Applications Registry</SectionTitle>
              {revaluations.length === 0 ? (
                <EmptyState label="No revaluation requests submitted." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-ink-secondary text-xs uppercase tracking-wide border-b">
                        <th className="py-3">Student</th>
                        <th className="py-3">Exam &amp; Subject</th>
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
                          <td className="py-3 font-semibold text-ink-primary">
                            {r.exam_name.replace(/_/g, " ")}
                            <span className="block text-xs font-normal text-slate-500">{r.subject_name}</span>
                          </td>
                          <td className="py-3 font-semibold text-ink-primary font-numeric">{r.original_marks}</td>
                          <td className="py-3 text-xs text-ink-secondary truncate max-w-xs">{r.reason}</td>
                          <td className="py-3">
                            <Badge tone={r.status === "Completed" ? "green" : r.status === "Approved" ? "blue" : r.status === "Rejected" ? "red" : "orange"}>
                              {r.status}
                            </Badge>
                          </td>
                          <td className="py-3 text-right">
                            {r.status !== "Completed" && r.status !== "Rejected" ? (
                              <button
                                onClick={() => {
                                  setRevalForm({ status: "Approved", teacher_remarks: r.teacher_remarks || "", updated_marks: r.original_marks });
                                  setRevalModal(r);
                                }}
                                className="bg-academic-blue text-white text-xs px-2.5 py-1.5 rounded-lg font-bold shadow-sm"
                              >
                                Review Request
                              </button>
                            ) : (
                              <span className="text-xs text-slate-400 font-medium">Completed</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}

          {/* TAB 5: Supplementary Cycles */}
          {tab === "supplementary" && (
            <Card>
              <SectionTitle icon={ShieldAlert}>Supplementary Examinations Cycle</SectionTitle>
              {supps.length === 0 ? (
                <EmptyState label="No students registered for supplementary exams." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-ink-secondary text-xs uppercase tracking-wide border-b">
                        <th className="py-3">Student Name</th>
                        <th className="py-3">Failed Subject</th>
                        <th className="py-3">Original Cycle</th>
                        <th className="py-3">Registration Status</th>
                        <th className="py-3">Cleared Grade</th>
                        <th className="py-3 text-right">Record Supplementary</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {supps.map(s => (
                        <tr key={s.id}>
                          <td className="py-3 font-semibold text-ink-primary">{s.student_name}</td>
                          <td className="py-3 font-medium text-ink-primary">{s.subject_name}</td>
                          <td className="py-3 text-ink-secondary">{s.original_exam_name.replace(/_/g, " ")}</td>
                          <td className="py-3">
                            <Badge tone={s.status === "Completed" ? "green" : s.status === "Hall Ticket Issued" ? "blue" : "orange"}>
                              {s.status}
                            </Badge>
                          </td>
                          <td className="py-3 font-bold text-ink-primary font-mono">{s.grade_letter || "—"}</td>
                          <td className="py-3 text-right">
                            {s.status !== "Completed" ? (
                              <button
                                onClick={() => {
                                  setSuppForm({ status: "Completed", marks_obtained: "" });
                                  setSuppModal(s);
                                }}
                                className="bg-academic-blue text-white text-xs px-2.5 py-1.5 rounded-lg font-bold shadow-sm"
                              >
                                Record Marks
                              </button>
                            ) : (
                              <span className="text-xs text-slate-400 font-medium">Recorded</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}

          {/* TAB 6: Certificates Issue */}
          {tab === "certificates" && (
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Issuance Panel */}
              <Card className="lg:col-span-1 h-fit">
                <SectionTitle icon={Award}>Generate Academic Documents</SectionTitle>
                <form onSubmit={handleIssueCertificate} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">Student User ID (*)</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 5 (*)"
                      value={certForm.student_id}
                      onChange={e => setCertForm({ ...certForm, student_id: e.target.value })}
                      className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-academic-blue"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">Certificate Type</label>
                    <select
                      value={certForm.certificate_type}
                      onChange={e => setCertForm({ ...certForm, certificate_type: e.target.value })}
                      className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:border-academic-blue"
                    >
                      <option value="Marks Memo">Marks Memo / Report Card</option>
                      <option value="Pass Certificate">Pass Certificate</option>
                      <option value="Rank Certificate">Rank Certificate</option>
                      <option value="Provisional Certificate">Provisional Certificate</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">Document PDF URL (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. https://files.edunova.edu/memo-5.pdf"
                      value={certForm.file_url}
                      onChange={e => setCertForm({ ...certForm, file_url: e.target.value })}
                      className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-academic-blue"
                    />
                  </div>
                  <button className="w-full bg-academic-blue hover:bg-academic-blue/90 text-white rounded-xl py-2.5 font-bold transition-colors">
                    Issue Certificate Memo
                  </button>
                </form>
              </Card>

              {/* Certificate Registry */}
              <Card className="lg:col-span-2">
                <SectionTitle icon={Award}>Issued Documents Registry</SectionTitle>
                <div className="p-3.5 bg-blue-50/50 border border-blue-100 rounded-xl text-xs text-academic-blue mb-4">
                  Verification codes are automatically hashed using cryptographically secure strings for external memo verification.
                </div>
                <CertificateList />
              </Card>
            </div>
          )}
        </>
      )}

      {/* REVALUATION ACTION MODAL */}
      {revalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="font-heading font-bold text-ink-primary">Revaluation Review: {revalModal.student_name}</h3>
              <button onClick={() => setRevalModal(null)} className="text-slate-400 hover:text-ink-primary font-bold">✕</button>
            </div>
            <form onSubmit={handleRevalSubmit} className="p-6 space-y-4">
              <div className="p-3 bg-slate-50 border rounded-xl text-xs space-y-1.5 text-ink-secondary">
                <p><strong>Failed/Target Subject:</strong> {revalModal.subject_name}</p>
                <p><strong>Original Marks:</strong> {revalModal.original_marks}</p>
                <p><strong>Student Request Reason:</strong> "{revalModal.reason}"</p>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-ink-secondary">Action Decision</label>
                <select
                  value={revalForm.status}
                  onChange={e => setRevalForm({ ...revalForm, status: e.target.value })}
                  className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white outline-none"
                >
                  <option value="Approved">Approve Application (Keep Pending Marks Update)</option>
                  <option value="Rejected">Reject Application</option>
                  <option value="Completed">Resolve &amp; Save Updated Grade Marks</option>
                </select>
              </div>
              {revalForm.status === "Completed" && (
                <div>
                  <label className="text-xs font-semibold uppercase text-ink-secondary">Updated Marks Obtained (*)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={revalForm.updated_marks}
                    onChange={e => setRevalForm({ ...revalForm, updated_marks: e.target.value })}
                    className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-academic-blue"
                  />
                </div>
              )}
              <div>
                <label className="text-xs font-semibold uppercase text-ink-secondary">Teacher / Admin Comments (*)</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Review results notes... (*)"
                  value={revalForm.teacher_remarks}
                  onChange={e => setRevalForm({ ...revalForm, teacher_remarks: e.target.value })}
                  className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none resize-none focus:border-academic-blue"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setRevalModal(null)} className="flex-1 border rounded-xl py-2 font-medium">Cancel</button>
                <button type="submit" className="flex-1 bg-academic-blue text-white rounded-xl py-2 font-bold hover:bg-academic-blue/90">Submit Resolution</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUPPLEMENTARY RECORD MODAL */}
      {suppModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="font-heading font-bold text-ink-primary">Record Supplementary Performance</h3>
              <button onClick={() => setSuppModal(null)} className="text-slate-400 hover:text-ink-primary font-bold">✕</button>
            </div>
            <form onSubmit={handleSuppSubmit} className="p-6 space-y-4">
              <div className="p-3 bg-slate-50 border rounded-xl text-xs space-y-1 text-ink-secondary">
                <p><strong>Student:</strong> {suppModal.student_name}</p>
                <p><strong>Subject:</strong> {suppModal.subject_name}</p>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-ink-secondary">Performance Status</label>
                <select
                  value={suppForm.status}
                  onChange={e => setSuppForm({ ...suppForm, status: e.target.value })}
                  className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white outline-none"
                >
                  <option value="Completed">Completed (Marks Obtained)</option>
                  <option value="Absent">Absent</option>
                  <option value="Hall Ticket Issued">Hall Ticket Issued</option>
                </select>
              </div>
              {suppForm.status === "Completed" && (
                <div>
                  <label className="text-xs font-semibold uppercase text-ink-secondary">Supplementary Marks Obtained (*)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={suppForm.marks_obtained}
                    onChange={e => setSuppForm({ ...suppForm, marks_obtained: e.target.value })}
                    className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-academic-blue"
                  />
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setSuppModal(null)} className="flex-1 border rounded-xl py-2 font-medium">Cancel</button>
                <button type="submit" className="flex-1 bg-academic-blue text-white rounded-xl py-2 font-bold hover:bg-academic-blue/90">Save Supplementary Marks</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}

function CertificateList() {
  const [certs, setCerts] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadCerts() {
    try {
      const { data } = await api.get("/admin-portal/exams/certificates/");
      setCerts(data);
    } catch {
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCerts();
  }, []);

  if (loading) return <Loader rows={3} />;
  if (certs.length === 0) return <EmptyState label="No certificates issued yet." />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-ink-secondary text-xs uppercase tracking-wide border-b">
            <th className="py-2.5">Student</th>
            <th className="py-2.5">Certificate Type</th>
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
