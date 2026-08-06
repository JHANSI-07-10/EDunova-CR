import { useEffect, useState, useCallback } from "react";
import api from "../lib/api";
import { Card, EmptyState, Loader, SectionTitle, Toast, Badge } from "../components/Common";
import {
  Plus, X, Calendar, BookOpen, FileText, Clipboard, RefreshCw, MapPin,
  Check, Edit2, Trash2, Clock, UserCheck, BarChart3
} from "lucide-react";

const EXAM_NAME_CHOICES = ["Unit_Test_1", "Unit_Test_2", "Unit_Test_3", "Unit_Test_4", "Mid_Term", "Final_Term", "Pre_Board", "Board_Exam"];
const DIFFICULTY_LEVELS = ["Easy", "Medium", "Hard"];
const QUESTION_TYPES = ["MCQ", "Descriptive", "Short", "Practical"];

export default function Exams() {
  const [tab, setTab] = useState("schedules");
  const [toast, setToast] = useState("");
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [exams, setExams] = useState([]);

  async function loadMeta() {
    try {
      const { data: clsData } = await api.get("/teacher/classes/");
      setClasses(clsData);
      const subMap = {};
      clsData.forEach(c => {
        if (c.subject_id) subMap[c.subject_id] = c.subject_name;
      });
      setSubjects(Object.entries(subMap).map(([id, name]) => ({ id: parseInt(id), name })));
    } catch {}
  }

  async function loadExams() {
    try {
      const { data } = await api.get("/teacher/exams/");
      setExams(data);
    } catch {
      setExams([]);
    }
  }

  useEffect(() => {
    loadMeta();
    loadExams();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {[
          ["schedules", "My Exam Schedules", Calendar],
          ["qbank", "Question Bank", BookOpen],
          ["papers", "Question Papers", FileText],
          ["marks", "Marks Entry", Clipboard],
          ["invigilation", "Invigilation Duty", UserCheck],
          ["revaluation", "Revaluation Requests", RefreshCw],
        ].map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm ${
              tab === key
                ? "bg-academic-blue text-white shadow-md"
                : "bg-white text-ink-secondary hover:text-ink-primary hover:bg-slate-50"
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {tab === "schedules" && <SchedulesTab exams={exams} classes={classes} subjects={subjects} onRefresh={loadExams} onError={setToast} />}
      {tab === "qbank" && <QuestionBankTab subjects={subjects} onError={setToast} />}
      {tab === "papers" && <QuestionPapersTab exams={exams} onError={setToast} />}
      {tab === "marks" && <MarksEntryTab exams={exams} onError={setToast} />}
      {tab === "invigilation" && <InvigilationTab onError={setToast} />}
      {tab === "revaluation" && <RevaluationTab onError={setToast} />}

      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}

function SchedulesTab({ exams, classes, subjects, onRefresh, onError }) {
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);

  async function handleDelete(id) {
    if (!window.confirm("Delete this exam schedule?")) return;
    try {
      await api.delete(`/teacher/exams/?id=${id}`);
      onError("Exam deleted.");
      onRefresh();
    } catch {
      onError("Could not delete exam.");
    }
  }

  function handleEdit(item) {
    setEditItem(item);
    setShowForm(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="font-heading font-semibold text-ink-primary">My Exam Schedules ({exams.length})</h2>
        <button onClick={() => { setEditItem(null); setShowForm(true); }}
          className="flex items-center gap-2 bg-academic-blue text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-academic-blue/90">
          <Plus size={15} /> Schedule Exam
        </button>
      </div>

      <Card>
        <SectionTitle icon={Calendar}>Exam Schedule Timeline</SectionTitle>
        {exams.length === 0 ? (
          <EmptyState label="No exams scheduled yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-secondary text-xs uppercase tracking-wide border-b">
                  <th className="py-3">Exam Name</th>
                  <th className="py-3">Class</th>
                  <th className="py-3">Subject</th>
                  <th className="py-3">Date & Time</th>
                  <th className="py-3">Duration</th>
                  <th className="py-3">Max Marks</th>
                  <th className="py-3">Status</th>
                  <th className="py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {exams.map(e => (
                  <tr key={e.id}>
                    <td className="py-3 font-semibold text-ink-primary">{e.exam_name?.replace(/_/g, " ")}</td>
                    <td className="py-3 text-ink-primary">{e.class_name}</td>
                    <td className="py-3 text-ink-primary">{e.subject_name}</td>
                    <td className="py-3">
                      <p className="font-semibold text-ink-primary text-xs">{e.exam_date}</p>
                      <p className="text-xs text-ink-secondary">{e.start_time}</p>
                    </td>
                    <td className="py-3 text-xs text-ink-secondary">{e.duration_minutes}m</td>
                    <td className="py-3 font-bold text-ink-primary">{e.max_marks}</td>
                    <td className="py-3">
                      <Badge tone={e.status === "Published" ? "green" : e.status === "Submitted" ? "blue" : "gold"}>
                        {e.status}
                      </Badge>
                    </td>
                    <td className="py-3 text-right space-x-2">
                      <button onClick={() => handleEdit(e)} className="text-xs text-academic-blue hover:underline font-semibold">Edit</button>
                      <button onClick={() => handleDelete(e.id)} className="text-xs text-danger hover:underline font-semibold">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {showForm && (
        <ExamForm
          classes={classes}
          subjects={subjects}
          exam={editItem}
          onClose={() => { setShowForm(false); setEditItem(null); }}
          onSaved={() => { setShowForm(false); setEditItem(null); onError(editItem ? "Exam updated." : "Exam scheduled."); onRefresh(); }}
        />
      )}
    </div>
  );
}

function ExamForm({ classes, subjects, exam, onClose, onSaved }) {
  const isEdit = !!exam;
  const [form, setForm] = useState({
    class_id: exam?.class_id || classes[0]?.class_id || "",
    subject_id: exam?.subject_id || classes[0]?.subject_id || "",
    exam_name: exam?.exam_name || EXAM_NAME_CHOICES[0],
    exam_type: exam?.exam_type || "Offline",
    exam_date: exam?.exam_date || new Date().toISOString().slice(0, 10),
    start_time: exam?.start_time || "09:00",
    duration_minutes: exam?.duration_minutes || 60,
    max_marks: exam?.max_marks || 100,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function pickClassSubject(val) {
    const [classId, subjectId] = val.split("-");
    setForm(f => ({ ...f, class_id: classId ? Number(classId) : "", subject_id: subjectId ? Number(subjectId) : "" }));
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.class_id || !form.subject_id) {
      setError("Please select a valid class & subject.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (isEdit) {
        await api.patch(`/teacher/exams/?id=${exam.id}`, form);
      } else {
        await api.post("/teacher/exams/", form);
      }
      onSaved();
    } catch (err) {
      setError(err?.response?.data?.detail || "Could not save exam.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-card w-full max-w-md p-6 shadow-raised max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <p className="font-heading font-semibold">{isEdit ? "Edit Exam" : "Schedule Exam"}</p>
          <button onClick={onClose} className="text-ink-secondary"><X size={18} /></button>
        </div>
        {error && <div className="mb-3 text-sm text-danger bg-red-50 rounded-xl px-3 py-2">{error}</div>}
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-xs font-semibold uppercase text-ink-secondary">Class & Subject (*)</label>
            <select
              value={form.class_id && form.subject_id ? `${form.class_id}-${form.subject_id}` : ""}
              onChange={e => pickClassSubject(e.target.value)}
              className="w-full mt-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-academic-blue"
            >
              <option value="">Select Class & Subject</option>
              {classes.map(c => (
                <option key={c.id} value={`${c.class_id}-${c.subject_id}`}>{c.class_name} — {c.subject_name}</option>
              ))}
            </select>
          </div>
          <select value={form.exam_name} onChange={e => setForm(f => ({ ...f, exam_name: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-academic-blue bg-white">
            {EXAM_NAME_CHOICES.map(n => <option key={n} value={n}>{n.replace(/_/g, " ")}</option>)}
          </select>
          <select value={form.exam_type} onChange={e => setForm(f => ({ ...f, exam_type: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-academic-blue bg-white">
            <option>Offline</option>
            <option>Online</option>
            <option>OMR</option>
          </select>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-ink-secondary">Date (*)</label>
              <input type="date" required value={form.exam_date} onChange={e => setForm(f => ({ ...f, exam_date: e.target.value }))}
                className="w-full mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-academic-blue" />
            </div>
            <div>
              <label className="text-xs text-ink-secondary">Start Time</label>
              <input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                className="w-full mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-academic-blue" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-ink-secondary">Duration (min)</label>
              <input type="number" value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: Number(e.target.value) }))}
                className="w-full mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-academic-blue" />
            </div>
            <div>
              <label className="text-xs text-ink-secondary">Max Marks</label>
              <input type="number" value={form.max_marks} onChange={e => setForm(f => ({ ...f, max_marks: Number(e.target.value) }))}
                className="w-full mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-academic-blue" />
            </div>
          </div>
          <button disabled={busy}
            className="w-full bg-academic-blue text-white rounded-xl py-2.5 font-medium hover:bg-academic-blue/90 disabled:opacity-60">
            {busy ? "Saving..." : isEdit ? "Update Exam" : "Schedule Exam"}
          </button>
        </form>
      </div>
    </div>
  );
}

function QuestionBankTab({ subjects, onError }) {
  const [questions, setQuestions] = useState([]);
  const [selectedSub, setSelectedSub] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({
    subject_id: "", question_text: "", type: "MCQ",
    options: ["", "", "", ""], correct_answer: "",
    difficulty: "Medium", chapter: ""
  });

  useEffect(() => {
    if (subjects.length > 0 && !selectedSub) {
      setSelectedSub(subjects[0].id);
    }
  }, [subjects]);

  const loadQuestions = useCallback(async () => {
    if (!selectedSub) return;
    try {
      const { data } = await api.get(`/teacher/question-bank/?subject_id=${selectedSub}`);
      setQuestions(data);
    } catch {
      setQuestions([]);
    }
  }, [selectedSub]);

  useEffect(() => { loadQuestions(); }, [loadQuestions]);

  async function handleSave(e) {
    e.preventDefault();
    if (!form.subject_id || !form.question_text || !form.correct_answer || !form.chapter) {
      onError("Please fill all required fields.");
      return;
    }
    try {
      if (editItem) {
        await api.patch("/teacher/question-bank/", { ...form, id: editItem.id });
        onError("Question updated.");
      } else {
        await api.post("/teacher/question-bank/", form);
        onError("Question added to bank.");
      }
      setShowForm(false);
      setEditItem(null);
      loadQuestions();
    } catch {
      onError("Could not save question.");
    }
  }

  async function handleDelete(q) {
    if (!window.confirm("Delete this question?")) return;
    try {
      await api.delete(`/teacher/question-bank/?id=${q.id}`);
      onError("Question deleted.");
      loadQuestions();
    } catch {
      onError("Could not delete question.");
    }
  }

  function openNew() {
    setForm({ subject_id: selectedSub, question_text: "", type: "MCQ", options: ["", "", "", ""], correct_answer: "", difficulty: "Medium", chapter: "" });
    setEditItem(null);
    setShowForm(true);
  }

  function openEdit(q) {
    setForm({
      subject_id: q.subject_id, question_text: q.question_text, type: q.type,
      options: Array.isArray(q.options) ? q.options : ["", "", "", ""],
      correct_answer: q.correct_answer, difficulty: q.difficulty, chapter: q.chapter
    });
    setEditItem(q);
    setShowForm(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-ink-secondary">Subject:</label>
          <select value={selectedSub} onChange={e => setSelectedSub(e.target.value)}
            className="border rounded-xl px-3 py-1.5 text-sm bg-white outline-none">
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 bg-academic-blue text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-academic-blue/90">
          <Plus size={15} /> Add Question
        </button>
      </div>

      <Card>
        <SectionTitle icon={BookOpen}>Question Bank ({questions.length})</SectionTitle>
        {questions.length === 0 ? (
          <EmptyState label="No questions created for this subject." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-secondary border-b text-xs uppercase tracking-wide">
                  <th className="py-2.5">Chapter</th>
                  <th className="py-2.5">Type</th>
                  <th className="py-2.5">Question</th>
                  <th className="py-2.5">Difficulty</th>
                  <th className="py-2.5">Answer</th>
                  <th className="py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {questions.map(q => (
                  <tr key={q.id}>
                    <td className="py-3 font-semibold text-ink-primary">{q.chapter}</td>
                    <td className="py-3"><Badge tone="blue">{q.type}</Badge></td>
                    <td className="py-3 text-ink-primary max-w-sm truncate" title={q.question_text}>{q.question_text}</td>
                    <td className="py-3">
                      <Badge tone={q.difficulty === "Easy" ? "green" : q.difficulty === "Hard" ? "red" : "gold"}>
                        {q.difficulty}
                      </Badge>
                    </td>
                    <td className="py-3 font-medium text-ink-secondary">{q.correct_answer}</td>
                    <td className="py-3 text-right space-x-1.5">
                      <button onClick={() => openEdit(q)} className="text-slate-400 hover:text-academic-blue"><Edit2 size={14} /></button>
                      <button onClick={() => handleDelete(q)} className="text-slate-400 hover:text-danger"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="font-heading font-bold text-ink-primary">{editItem ? "Edit Question" : "New Question"}</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-ink-primary font-bold">✕</button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase text-ink-secondary">Chapter / Section (*)</label>
                <input type="text" required placeholder="e.g. Chapter-1 Kinematics" value={form.chapter}
                  onChange={e => setForm({ ...form, chapter: e.target.value })}
                  className="w-full mt-1 border rounded-xl px-3 py-2 text-sm outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold uppercase text-ink-secondary">Question Type</label>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                    className="w-full mt-1 border rounded-xl px-3 py-2 text-sm bg-white outline-none">
                    {QUESTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-ink-secondary">Difficulty</label>
                  <select value={form.difficulty} onChange={e => setForm({ ...form, difficulty: e.target.value })}
                    className="w-full mt-1 border rounded-xl px-3 py-2 text-sm bg-white outline-none">
                    {DIFFICULTY_LEVELS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-ink-secondary">Question Text (*)</label>
                <textarea rows={3} required placeholder="Type question here..." value={form.question_text}
                  onChange={e => setForm({ ...form, question_text: e.target.value })}
                  className="w-full mt-1 border rounded-xl px-3 py-2 text-sm outline-none resize-none" />
              </div>
              {form.type === "MCQ" && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-ink-secondary block">MCQ Options</label>
                  <div className="grid grid-cols-2 gap-2">
                    {form.options.map((opt, idx) => (
                      <input key={idx} type="text" required placeholder={`Option ${idx + 1}`} value={opt}
                        onChange={e => { const updated = [...form.options]; updated[idx] = e.target.value; setForm({ ...form, options: updated }); }}
                        className="border rounded-xl px-3 py-1.5 text-xs outline-none" />
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label className="text-xs font-semibold uppercase text-ink-secondary">Correct Answer (*)</label>
                <input type="text" required placeholder="e.g. Option 1 or answer text" value={form.correct_answer}
                  onChange={e => setForm({ ...form, correct_answer: e.target.value })}
                  className="w-full mt-1 border rounded-xl px-3 py-2 text-sm outline-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 border rounded-xl py-2 font-medium">Cancel</button>
                <button type="submit" className="flex-1 bg-academic-blue text-white rounded-xl py-2 font-bold hover:bg-academic-blue/90">Save Question</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function QuestionPapersTab({ exams, onError }) {
  const [papers, setPapers] = useState([]);
  const [selectedExam, setSelectedExam] = useState("");
  const [paperTitle, setPaperTitle] = useState("");
  const [paperType, setPaperType] = useState("Auto");
  const [loading, setLoading] = useState(true);

  const loadPapers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/teacher/question-papers/");
      setPapers(data);
    } catch {
      setPapers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPapers(); }, [loadPapers]);

  async function handleCreate(e) {
    e.preventDefault();
    if (!selectedExam || !paperTitle) {
      onError("Exam schedule and paper title are required.");
      return;
    }
    try {
      await api.post("/teacher/question-papers/", {
        exam_schedule_id: selectedExam, title: paperTitle,
        paper_type: paperType, questions: []
      });
      onError("Question paper generated.");
      setPaperTitle("");
      loadPapers();
    } catch (err) {
      onError(err.response?.data?.detail || "Could not generate paper.");
    }
  }

  async function handlePublish(paperId) {
    try {
      await api.patch(`/teacher/question-papers/?id=${paperId}`, { status: "Published" });
      onError("Paper published.");
      loadPapers();
    } catch {
      onError("Could not publish paper.");
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this question paper?")) return;
    try {
      await api.delete(`/teacher/question-papers/?id=${id}`);
      onError("Paper deleted.");
      loadPapers();
    } catch {
      onError("Could not delete paper.");
    }
  }

  if (loading) return <Loader rows={4} />;

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-1 h-fit">
        <SectionTitle icon={Plus}>Generate Question Paper</SectionTitle>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-ink-secondary uppercase tracking-wider">Exam Schedule (*)</label>
            <select required value={selectedExam} onChange={e => setSelectedExam(e.target.value)}
              className="w-full mt-1 border rounded-xl px-3 py-2 text-sm bg-white outline-none">
              <option value="">Select Exam</option>
              {exams.map(e => (
                <option key={e.id} value={e.id}>{e.exam_name?.replace(/_/g, " ")} ({e.class_name})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-ink-secondary uppercase tracking-wider">Paper Title (*)</label>
            <input type="text" required placeholder="e.g. Midterm Physics Paper A" value={paperTitle}
              onChange={e => setPaperTitle(e.target.value)}
              className="w-full mt-1 border rounded-xl px-3 py-2 text-sm outline-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-ink-secondary uppercase tracking-wider">Generation Mode</label>
            <div className="flex gap-4 mt-2">
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input type="radio" name="paperType" checked={paperType === "Auto"} onChange={() => setPaperType("Auto")} /> Auto-generate
              </label>
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input type="radio" name="paperType" checked={paperType === "Manual"} onChange={() => setPaperType("Manual")} /> Manual
              </label>
            </div>
          </div>
          <button className="w-full bg-academic-blue hover:bg-academic-blue/90 text-white rounded-xl py-2.5 font-bold transition-all shadow-sm">
            Generate Paper
          </button>
        </form>
      </Card>

      <Card className="lg:col-span-2">
        <SectionTitle icon={FileText}>Question Papers ({papers.length})</SectionTitle>
        {papers.length === 0 ? (
          <EmptyState label="No question papers generated yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-secondary border-b text-xs uppercase tracking-wide">
                  <th className="py-2.5">Exam Cycle</th>
                  <th className="py-2.5">Title</th>
                  <th className="py-2.5">Mode</th>
                  <th className="py-2.5">Questions</th>
                  <th className="py-2.5">Status</th>
                  <th className="py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {papers.map(p => (
                  <tr key={p.id}>
                    <td className="py-3 font-semibold text-ink-primary">{p.exam_name?.replace(/_/g, " ") || `Schedule #${p.exam_schedule_id}`}</td>
                    <td className="py-3 text-ink-primary">{p.title}</td>
                    <td className="py-3"><Badge tone="blue">{p.paper_type}</Badge></td>
                    <td className="py-3 font-bold font-numeric">{(p.questions || []).length}</td>
                    <td className="py-3">
                      <Badge tone={p.status === "Published" ? "green" : p.status === "Locked" ? "red" : "gold"}>{p.status}</Badge>
                    </td>
                    <td className="py-3 text-right space-x-2">
                      {p.status !== "Published" && (
                        <button onClick={() => handlePublish(p.id)} className="text-xs text-academic-green hover:underline font-semibold">Publish</button>
                      )}
                      <button onClick={() => handleDelete(p.id)} className="text-xs text-danger hover:underline font-semibold">Delete</button>
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

function MarksEntryTab({ exams, onError }) {
  const [selectedExam, setSelectedExam] = useState("");
  const [marksData, setMarksData] = useState(null);
  const [marksEntries, setMarksEntries] = useState([]);

  async function loadMarksList() {
    if (!selectedExam) return;
    try {
      const { data } = await api.get(`/teacher/marks-entry/?exam_schedule_id=${selectedExam}`);
      setMarksData(data.exam);
      setMarksEntries(data.rows);
    } catch {
      onError("Could not load marks entry sheet.");
    }
  }

  async function handleSaveMarks(submit) {
    try {
      await api.post("/teacher/marks-entry/", {
        exam_schedule_id: selectedExam, entries: marksEntries, submit
      });
      onError(submit ? "Marks submitted for admin approval." : "Marks saved as draft.");
      loadMarksList();
    } catch (err) {
      onError(err.response?.data?.detail || "Could not save marks.");
    }
  }

  return (
    <Card>
      <SectionTitle icon={Clipboard}>Marks Sheet Center</SectionTitle>
      <div className="flex gap-3 mb-4">
        <select value={selectedExam} onChange={e => setSelectedExam(e.target.value)}
          className="flex-1 border rounded-xl px-3 py-2 text-sm bg-white outline-none">
          <option value="">Select Exam Schedule</option>
          {exams.map(e => (
            <option key={e.id} value={e.id}>{e.exam_name?.replace(/_/g, " ")} ({e.class_name} | {e.subject_name})</option>
          ))}
        </select>
        <button onClick={loadMarksList} className="bg-academic-blue text-white rounded-xl px-5 font-bold">Load Sheet</button>
      </div>

      {marksData && (
        <div className="space-y-4 pt-3 border-t">
          <div className="flex justify-between items-center text-sm p-3.5 bg-slate-50 border rounded-2xl">
            <div>
              <p className="font-semibold text-ink-primary">{marksData.exam_name?.replace(/_/g, " ")}</p>
              <p className="text-xs text-ink-secondary">{marksData.class_name} | {marksData.subject_name}</p>
            </div>
            <div className="text-right">
              <p>Max Marks: <strong>{marksData.max_marks}</strong></p>
              <p className="text-xs text-ink-secondary">Status: <Badge tone={marksData.status === "Published" ? "green" : marksData.status === "Submitted" ? "blue" : "gold"}>{marksData.status}</Badge></p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-secondary border-b text-xs uppercase tracking-wide">
                  <th className="py-2.5">Roll No.</th>
                  <th className="py-2.5">Student</th>
                  <th className="py-2.5">Marks Obtained</th>
                  <th className="py-2.5">Percentage</th>
                  <th className="py-2.5">Grade</th>
                  <th className="py-2.5">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {marksEntries.map((entry, idx) => {
                  const pct = marksData.max_marks && entry.marks_obtained
                    ? ((entry.marks_obtained / marksData.max_marks) * 100).toFixed(1) : null;
                  return (
                    <tr key={entry.student} className="border-b border-slate-50">
                      <td className="py-2.5 text-xs text-slate-400 font-semibold">{entry.admission_number || idx + 1}</td>
                      <td className="py-2.5 font-semibold text-ink-primary">{entry.student_name}</td>
                      <td className="py-2.5">
                        <input type="number" step="0.01" disabled={entry.published} value={entry.marks_obtained || ""}
                          onChange={e => { const updated = [...marksEntries]; updated[idx].marks_obtained = e.target.value; setMarksEntries(updated); }}
                          className="w-24 border rounded-xl px-2 py-1 text-center font-bold text-ink-primary" />
                      </td>
                      <td className="py-2.5 text-xs font-semibold text-ink-secondary">{pct != null ? `${pct}%` : "—"}</td>
                      <td className="py-2.5">
                        {pct != null ? (
                          <Badge tone={pct >= 40 ? "green" : "red"}>
                            {pct >= 90 ? "A+" : pct >= 80 ? "A" : pct >= 70 ? "B+" : pct >= 60 ? "B" : pct >= 50 ? "C" : pct >= 40 ? "D" : "F"}
                          </Badge>
                        ) : "—"}
                      </td>
                      <td className="py-2.5">
                        <input type="text" disabled={entry.published} placeholder="Remarks..." value={entry.remarks || ""}
                          onChange={e => { const updated = [...marksEntries]; updated[idx].remarks = e.target.value; setMarksEntries(updated); }}
                          className="w-full max-w-[150px] border rounded-xl px-3 py-1 text-xs text-ink-secondary" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {marksData.status !== "Published" && marksData.status !== "Submitted" && (
            <div className="flex gap-3 pt-4">
              <button onClick={() => handleSaveMarks(false)} className="flex-1 border hover:bg-slate-50 py-2.5 rounded-xl font-bold">Save Draft</button>
              <button onClick={() => handleSaveMarks(true)} className="flex-1 bg-academic-blue hover:bg-academic-blue/90 text-white py-2.5 rounded-xl font-bold transition-all shadow-sm">Submit for Approval</button>
            </div>
          )}
        </div>
      )}

      {!marksData && (
        <EmptyState label="Select an exam schedule and click 'Load Sheet' to enter marks." />
      )}
    </Card>
  );
}

function InvigilationTab({ onError }) {
  const [duties, setDuties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/teacher/invigilation-duty/");
        setDuties(data);
      } catch {
        setDuties([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <Loader rows={3} />;

  return (
    <Card>
      <SectionTitle icon={UserCheck}>Invigilation Duties ({duties.length})</SectionTitle>
      {duties.length === 0 ? (
        <EmptyState label="No invigilation duties assigned." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-secondary text-xs uppercase tracking-wide border-b">
                <th className="py-3">Exam</th>
                <th className="py-3">Room</th>
                <th className="py-3">Date</th>
                <th className="py-3">Time</th>
                <th className="py-3">Student Count</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {duties.map(d => (
                <tr key={d.id}>
                  <td className="py-3 font-semibold text-ink-primary">{d.exam_name?.replace(/_/g, " ")}</td>
                  <td className="py-3">
                    <span className="flex items-center gap-1 text-sm font-semibold text-academic-blue">
                      <MapPin size={12} /> {d.room_name || "Unassigned"}
                    </span>
                  </td>
                  <td className="py-3 text-xs text-ink-secondary">{d.exam_date}</td>
                  <td className="py-3 text-xs text-ink-secondary">{d.start_time}</td>
                  <td className="py-3 font-bold text-ink-primary">{d.student_count || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function RevaluationTab({ onError }) {
  const [revals, setRevals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState(null);
  const [form, setForm] = useState({ status: "Completed", updated_marks: "", teacher_remarks: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/teacher/revaluation/");
      setRevals(data);
    } catch {
      setRevals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleRevalSubmit(e) {
    e.preventDefault();
    try {
      await api.patch("/teacher/revaluation/", {
        id: activeModal.id, status: form.status,
        updated_marks: form.updated_marks, teacher_remarks: form.teacher_remarks
      });
      onError("Revaluation updated.");
      setActiveModal(null);
      load();
    } catch {
      onError("Could not submit revaluation.");
    }
  }

  if (loading) return <Loader rows={4} />;

  return (
    <div className="space-y-6">
      <Card>
        <SectionTitle icon={RefreshCw}>Revaluation Requests ({revals.length})</SectionTitle>
        {revals.length === 0 ? (
          <EmptyState label="No revaluation requests pending." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-secondary border-b text-xs uppercase tracking-wide">
                  <th className="py-2.5">Student</th>
                  <th className="py-2.5">Exam</th>
                  <th className="py-2.5">Subject</th>
                  <th className="py-2.5">Original Score</th>
                  <th className="py-2.5">Reason</th>
                  <th className="py-2.5">Status</th>
                  <th className="py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {revals.map(r => (
                  <tr key={r.id}>
                    <td className="py-3 font-semibold text-ink-primary">{r.student_name}</td>
                    <td className="py-3 text-ink-primary">{r.exam_name?.replace(/_/g, " ")}</td>
                    <td className="py-3 font-medium text-ink-primary">{r.subject_name}</td>
                    <td className="py-3 font-bold font-numeric">{r.original_marks}</td>
                    <td className="py-3 text-xs text-ink-secondary truncate max-w-xs">{r.reason}</td>
                    <td className="py-3">
                      <Badge tone={r.status === "Completed" ? "green" : r.status === "Approved" ? "blue" : "orange"}>
                        {r.status}
                      </Badge>
                    </td>
                    <td className="py-3 text-right">
                      {r.status !== "Completed" ? (
                        <button onClick={() => {
                          setForm({ status: "Completed", updated_marks: r.original_marks, teacher_remarks: "" });
                          setActiveModal(r);
                        }} className="bg-academic-blue hover:bg-academic-blue/90 text-white text-xs px-2.5 py-1.5 rounded-lg font-bold shadow-sm">
                          Grade Script
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">Graded</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between pb-3 border-b mb-4">
              <h3 className="font-heading font-bold text-ink-primary">Re-evaluate Script</h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 font-bold">✕</button>
            </div>
            <form onSubmit={handleRevalSubmit} className="space-y-4">
              <div className="p-3 bg-slate-50 border rounded-xl text-xs space-y-1.5 text-ink-secondary">
                <p><strong>Student:</strong> {activeModal.student_name}</p>
                <p><strong>Subject:</strong> {activeModal.subject_name}</p>
                <p><strong>Original Marks:</strong> {activeModal.original_marks}</p>
                <p><strong>Reason:</strong> "{activeModal.reason}"</p>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-ink-secondary">Status</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                  className="w-full mt-1 border rounded-xl px-3 py-2 text-sm bg-white outline-none">
                  <option value="Completed">Mark Completed</option>
                  <option value="Rejected">Reject Request</option>
                </select>
              </div>
              {form.status === "Completed" && (
                <div>
                  <label className="text-xs font-semibold uppercase text-ink-secondary">Updated Marks (*)</label>
                  <input type="number" step="0.01" required value={form.updated_marks}
                    onChange={e => setForm({ ...form, updated_marks: e.target.value })}
                    className="w-full mt-1 border rounded-xl px-3 py-2 text-sm outline-none" />
                </div>
              )}
              <div>
                <label className="text-xs font-semibold uppercase text-ink-secondary">Comments (*)</label>
                <textarea rows={2} required placeholder="Review comments..." value={form.teacher_remarks}
                  onChange={e => setForm({ ...form, teacher_remarks: e.target.value })}
                  className="w-full mt-1 border rounded-xl px-3 py-2 text-sm outline-none resize-none" />
              </div>
              <button className="w-full bg-academic-blue text-white rounded-xl py-2.5 font-bold hover:bg-academic-blue/90 transition-colors">
                Submit Graded Script
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
