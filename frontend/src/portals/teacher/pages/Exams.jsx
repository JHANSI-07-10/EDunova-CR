import { useEffect, useState } from "react";
import api from "../lib/api";
import { Badge, Card, EmptyState, Loader, Toast } from "../components/Common";
import {
  Plus, X, Calendar, BookOpen, FileText, Clipboard, RefreshCw, MapPin, Check, Edit2, Trash2
} from "lucide-react";
import { isPositiveNumber } from "../../../utils/validation";

const EXAM_NAME_CHOICES = ["Unit_Test_1", "Unit_Test_2", "Unit_Test_3", "Unit_Test_4", "Mid_Term", "Final_Term", "Pre_Board", "Board_Exam"];
const DIFFICULTY_LEVELS = ["Easy", "Medium", "Hard"];
const QUESTION_TYPES = ["MCQ", "Descriptive", "Short", "Practical"];

export default function Exams() {
  const [tab, setTab] = useState("schedules");
  const [toast, setToast] = useState("");

  // Common teacher data
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);

  // Schedules & Invigilations state
  const [exams, setExams] = useState([]);
  const [duties, setDuties] = useState([]);
  const [showScheduleForm, setShowScheduleForm] = useState(false);

  // Question Bank state
  const [questions, setQuestions] = useState([]);
  const [selectedSubForBank, setSelectedSubForBank] = useState("");
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [questionEditItem, setQuestionEditItem] = useState(null);
  const [questionForm, setQuestionForm] = useState({
    subject_id: "",
    question_text: "",
    type: "MCQ",
    options: ["", "", "", ""],
    correct_answer: "",
    difficulty: "Medium",
    chapter: ""
  });

  // Question Papers state
  const [papers, setPapers] = useState([]);
  const [selectedExamForPaper, setSelectedExamForPaper] = useState("");
  const [paperTitle, setPaperTitle] = useState("");
  const [paperType, setPaperType] = useState("Auto"); // Auto | Manual

  // Marks Entry state
  const [selectedExamForMarks, setSelectedExamForMarks] = useState("");
  const [marksData, setMarksData] = useState(null);
  const [marksEntries, setMarksEntries] = useState([]);

  // Revaluation state
  const [revals, setRevals] = useState([]);
  const [activeRevalModal, setActiveRevalModal] = useState(null);
  const [revalForm, setRevalForm] = useState({ status: "Completed", updated_marks: "", teacher_remarks: "" });

  // Load classes & subjects
  async function loadMeta() {
    try {
      const { data: clsData } = await api.get("/teacher/classes/");
      setClasses(clsData);
      // Unique list of subjects
      const subMap = {};
      clsData.forEach(c => {
        if (c.subject_id) subMap[c.subject_id] = c.subject_name;
      });
      setSubjects(Object.entries(subMap).map(([id, name]) => ({ id: parseInt(id), name })));
      if (Object.keys(subMap).length > 0) {
        setSelectedSubForBank(Object.keys(subMap)[0]);
      }
    } catch {}
  }

  // Load data based on tab
  async function loadTabData() {
    if (tab === "schedules") {
      api.get("/teacher/exams/").then(({ data }) => setExams(data)).catch(() => setExams([]));
      api.get("/teacher/invigilation-duty/").then(({ data }) => setDuties(data)).catch(() => setDuties([]));
    } else if (tab === "qbank") {
      if (selectedSubForBank) {
        api.get(`/teacher/question-bank/?subject_id=${selectedSubForBank}`)
          .then(({ data }) => setQuestions(data)).catch(() => setQuestions([]));
      }
    } else if (tab === "papers") {
      api.get("/teacher/question-papers/").then(({ data }) => setPapers(data)).catch(() => setPapers([]));
      api.get("/teacher/exams/").then(({ data }) => setExams(data)).catch(() => setExams([]));
    } else if (tab === "revaluation") {
      api.get("/teacher/revaluation/").then(({ data }) => setRevals(data)).catch(() => setRevals([]));
    }
  }

  useEffect(() => {
    loadMeta();
  }, []);

  useEffect(() => {
    loadTabData();
  }, [tab, selectedSubForBank]);

  // Handle Exam Schedule submission
  async function handleScheduleSaved() {
    setShowScheduleForm(false);
    setToast("Exam scheduled successfully.");
    loadTabData();
  }

  // Save/Update Question in bank
  async function handleSaveQuestion(e) {
    e.preventDefault();
    if (!questionForm.subject_id || !questionForm.question_text || !questionForm.correct_answer || !questionForm.chapter) {
      setToast("Please fill all required question details.");
      return;
    }
    try {
      if (questionEditItem) {
        await api.patch("/teacher/question-bank/", { ...questionForm, id: questionEditItem.id });
        setToast("Question updated.");
      } else {
        await api.post("/teacher/question-bank/", questionForm);
        setToast("Question added to bank.");
      }
      setShowQuestionForm(false);
      setQuestionEditItem(null);
      loadTabData();
    } catch {
      setToast("Could not save question.");
    }
  }

  // Delete Question
  async function handleDeleteQuestion(q) {
    if (!window.confirm("Delete this question from bank?")) return;
    try {
      await api.delete(`/teacher/question-bank/?id=${q.id}`);
      setToast("Question deleted.");
      loadTabData();
    } catch {
      setToast("Could not delete question.");
    }
  }

  // Generate / Save Question Paper
  async function handleCreatePaper(e) {
    e.preventDefault();
    if (!selectedExamForPaper || !paperTitle) {
      setToast("Exam cycle and paper title are required.");
      return;
    }
    try {
      await api.post("/teacher/question-papers/", {
        exam_schedule_id: selectedExamForPaper,
        title: paperTitle,
        paper_type: paperType,
        questions: []
      });
      setToast("Question paper generated successfully.");
      setPaperTitle("");
      loadTabData();
    } catch (err) {
      setToast(err.response?.data?.detail || "Could not generate paper.");
    }
  }

  // Load Roll list for marks entry
  async function loadMarksList() {
    if (!selectedExamForMarks) return;
    try {
      const { data } = await api.get(`/teacher/marks-entry/?exam_schedule_id=${selectedExamForMarks}`);
      setMarksData(data.exam);
      setMarksEntries(data.rows);
    } catch {
      setToast("Could not load marks entry sheet.");
    }
  }

  // Save/Submit marks
  async function handleSaveMarks(submit) {
    try {
      await api.post("/teacher/marks-entry/", {
        exam_schedule_id: selectedExamForMarks,
        entries: marksEntries,
        submit
      });
      setToast(submit ? "Marks submitted for admin approval." : "Marks saved as draft.");
      loadMarksList();
    } catch (err) {
      setToast(err.response?.data?.detail || "Could not save marks.");
    }
  }

  // Save revaluation decision
  async function handleRevalSubmit(e) {
    e.preventDefault();
    try {
      await api.patch("/teacher/revaluation/", {
        id: activeRevalModal.id,
        status: revalForm.status,
        updated_marks: revalForm.updated_marks,
        teacher_remarks: revalForm.teacher_remarks
      });
      setToast("Revaluation grade updated.");
      setActiveRevalModal(null);
      loadTabData();
    } catch {
      setToast("Could not submit revaluation comments.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          ["schedules", "Schedules & Invigilations", Calendar],
          ["qbank", "Question Bank", BookOpen],
          ["papers", "Question Papers", FileText],
          ["marks", "Marks Entry", Clipboard],
          ["revaluation", "Revaluations", RefreshCw]
        ].map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm ${
              tab === key
                ? "bg-academic-blue text-white shadow-md"
                : "bg-white text-ink-secondary hover:text-ink-primary"
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* TAB 1: Schedules & Invigilations */}
      {tab === "schedules" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="font-heading font-semibold text-ink-primary">My Scheduled Exams ({exams.length})</h2>
            <button
              onClick={() => setShowScheduleForm(true)}
              className="flex items-center gap-2 bg-academic-blue text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-academic-blue/90"
            >
              <Plus size={15} /> Schedule Exam
            </button>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <SectionTitle icon={Calendar}>Exam Schedule Timeline</SectionTitle>
              {exams.length === 0 ? <EmptyState label="No exams scheduled." /> : (
                <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto pr-2">
                  {exams.map(e => (
                    <div key={e.id} className="py-3 flex justify-between items-start text-sm">
                      <div>
                        <p className="font-semibold text-ink-primary">{e.exam_name.replace(/_/g, " ")}</p>
                        <p className="text-xs text-ink-secondary">{e.class_name} | {e.subject_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-ink-primary">{e.exam_date}</p>
                        <p className="text-xs text-ink-secondary">{e.start_time} ({e.duration_minutes}m)</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <SectionTitle icon={MapPin}>Invigilation Duty List</SectionTitle>
              {duties.length === 0 ? <EmptyState label="No invigilation duties assigned." /> : (
                <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto pr-2">
                  {duties.map(d => (
                    <div key={d.id} className="py-3 flex justify-between items-start text-sm">
                      <div>
                        <p className="font-semibold text-ink-primary">{d.exam_name.replace(/_/g, " ")}</p>
                        <p className="text-xs text-ink-secondary">Target Class Size: {d.student_count} Students</p>
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-academic-blue bg-blue-50 px-1.5 py-0.5 rounded mt-1">
                          <MapPin size={10} /> {d.room_name || "Unassigned Hall"}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-ink-primary">{d.exam_date}</p>
                        <p className="text-xs text-ink-secondary">{d.start_time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: Question Bank */}
      {tab === "qbank" && (
        <div className="space-y-4">
          <div className="flex flex-wrap justify-between items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold text-ink-secondary">Select Subject:</label>
              <select
                value={selectedSubForBank}
                onChange={e => setSelectedSubForBank(e.target.value)}
                className="border rounded-xl px-3 py-1.5 text-sm bg-white outline-none"
              >
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <button
              onClick={() => {
                setQuestionForm({
                  subject_id: selectedSubForBank,
                  question_text: "",
                  type: "MCQ",
                  options: ["", "", "", ""],
                  correct_answer: "",
                  difficulty: "Medium",
                  chapter: ""
                });
                setQuestionEditItem(null);
                setShowQuestionForm(true);
              }}
              className="flex items-center gap-2 bg-academic-blue text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-academic-blue/90"
            >
              <Plus size={15} /> Add Question
            </button>
          </div>

          <Card>
            <SectionTitle icon={BookOpen}>Subject Question Bank ({questions.length})</SectionTitle>
            {questions.length === 0 ? <EmptyState label="No questions created for this subject." /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-ink-secondary border-b">
                      <th className="py-2.5">Chapter</th>
                      <th className="py-2.5">Type</th>
                      <th className="py-2.5">Question Description</th>
                      <th className="py-2.5">Difficulty</th>
                      <th className="py-2.5">Correct Answer</th>
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
                          <button
                            onClick={() => {
                              setQuestionForm({
                                subject_id: q.subject_id,
                                question_text: q.question_text,
                                type: q.type,
                                options: Array.isArray(q.options) ? q.options : ["", "", "", ""],
                                correct_answer: q.correct_answer,
                                difficulty: q.difficulty,
                                chapter: q.chapter
                              });
                              setQuestionEditItem(q);
                              setShowQuestionForm(true);
                            }}
                            className="text-slate-400 hover:text-academic-blue"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => handleDeleteQuestion(q)} className="text-slate-400 hover:text-danger">
                            <Trash2 size={14} />
                          </button>
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

      {/* TAB 3: Question Papers */}
      {tab === "papers" && (
        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1 h-fit">
            <SectionTitle icon={Plus}>Generate Question Paper</SectionTitle>
            <form onSubmit={handleCreatePaper} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-ink-secondary uppercase tracking-wider">Select Scheduled Exam (*)</label>
                <select
                  required
                  value={selectedExamForPaper}
                  onChange={e => setSelectedExamForPaper(e.target.value)}
                  className="w-full mt-1 border rounded-xl px-3 py-2 text-sm bg-white outline-none"
                >
                  <option value="">Select Exam Slot</option>
                  {exams.map(e => (
                    <option key={e.id} value={e.id}>{e.exam_name.replace(/_/g, " ")} ({e.class_name})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-ink-secondary uppercase tracking-wider">Question Paper Title (*)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Midterm Physics Paper A (*)"
                  value={paperTitle}
                  onChange={e => setPaperTitle(e.target.value)}
                  className="w-full mt-1 border rounded-xl px-3 py-2 text-sm outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-ink-secondary uppercase tracking-wider">Paper Generation Mode</label>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                    <input type="radio" name="paperType" checked={paperType === "Auto"} onChange={() => setPaperType("Auto")} /> Auto-generate from Bank
                  </label>
                  <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                    <input type="radio" name="paperType" checked={paperType === "Manual"} onChange={() => setPaperType("Manual")} /> Manual Selection
                  </label>
                </div>
              </div>
              <button className="w-full bg-academic-blue hover:bg-academic-blue/90 text-white rounded-xl py-2.5 font-bold transition-all shadow-sm">
                Generate Question Paper
              </button>
            </form>
          </Card>

          <Card className="lg:col-span-2">
            <SectionTitle icon={FileText}>Question Papers Registry</SectionTitle>
            {papers.length === 0 ? <EmptyState label="No question papers generated yet." /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-ink-secondary border-b">
                      <th className="py-2.5">Exam Cycle</th>
                      <th className="py-2.5">Subject</th>
                      <th className="py-2.5">Title</th>
                      <th className="py-2.5">Generation Type</th>
                      <th className="py-2.5">Questions Count</th>
                      <th className="py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {papers.map(p => (
                      <tr key={p.id}>
                        <td className="py-3 font-semibold text-ink-primary">{p.exam_name.replace(/_/g, " ")}</td>
                        <td className="py-3 font-medium text-ink-primary">{p.subject_name}</td>
                        <td className="py-3 text-ink-primary">{p.title}</td>
                        <td className="py-3"><Badge tone="blue">{p.paper_type}</Badge></td>
                        <td className="py-3 font-bold font-numeric">{(p.questions || []).length} MCQ</td>
                        <td className="py-3"><Badge tone={p.status === "Published" ? "green" : "gold"}>{p.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 4: Marks Entry */}
      {tab === "marks" && (
        <Card>
          <SectionTitle icon={Clipboard}>Marks Sheet Center</SectionTitle>
          <div className="flex gap-3 mb-4">
            <select
              value={selectedExamForMarks}
              onChange={e => setSelectedExamForMarks(e.target.value)}
              className="flex-1 border rounded-xl px-3 py-2 text-sm bg-white outline-none"
            >
              <option value="">Select Scheduled Exam</option>
              {exams.map(e => (
                <option key={e.id} value={e.id}>{e.exam_name.replace(/_/g, " ")} ({e.class_name} | {e.subject_name})</option>
              ))}
            </select>
            <button onClick={loadMarksList} className="bg-academic-blue text-white rounded-xl px-5 font-bold">Load Sheet</button>
          </div>

          {marksData && (
            <div className="space-y-4 pt-3 border-t">
              <div className="flex justify-between items-center text-sm p-3.5 bg-slate-50 border rounded-2xl">
                <div>
                  <p className="font-semibold text-ink-primary">{marksData.exam_name.replace(/_/g, " ")}</p>
                  <p className="text-xs text-ink-secondary">{marksData.class_name} | {marksData.subject_name}</p>
                </div>
                <div className="text-right">
                  <p>Max Marks: <strong>{marksData.max_marks}</strong></p>
                  <p className="text-xs text-ink-secondary">Status: <strong>{marksData.status}</strong></p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-ink-secondary border-b">
                      <th className="py-2.5">Roll No.</th>
                      <th className="py-2.5">Student</th>
                      <th className="py-2.5">Marks Obtained</th>
                      <th className="py-2.5">Remarks Comments</th>
                    </tr>
                  </thead>
                  <tbody>
                    {marksEntries.map((entry, idx) => (
                      <tr key={entry.student} className="border-b border-slate-50">
                        <td className="py-2.5 text-xs text-slate-400 font-semibold">{entry.admission_number || idx+1}</td>
                        <td className="py-2.5 font-semibold text-ink-primary">{entry.student_name}</td>
                        <td className="py-2.5">
                          <input
                            type="number"
                            step="0.01"
                            disabled={entry.published}
                            value={entry.marks_obtained || ""}
                            onChange={e => {
                              const updated = [...marksEntries];
                              updated[idx].marks_obtained = e.target.value;
                              setMarksEntries(updated);
                            }}
                            className="w-24 border rounded-xl px-2 py-1 text-center font-bold text-ink-primary"
                          />
                        </td>
                        <td className="py-2.5">
                          <input
                            type="text"
                            disabled={entry.published}
                            placeholder="Add remarks..."
                            value={entry.remarks || ""}
                            onChange={e => {
                              const updated = [...marksEntries];
                              updated[idx].remarks = e.target.value;
                              setMarksEntries(updated);
                            }}
                            className="w-full max-w-xs border rounded-xl px-3 py-1 text-xs text-ink-secondary"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {marksData.status !== "Published" && marksData.status !== "Submitted" && (
                <div className="flex gap-3 pt-4">
                  <button onClick={() => handleSaveMarks(false)} className="flex-1 border hover:bg-slate-50 py-2.5 rounded-xl font-bold">
                    Save Draft
                  </button>
                  <button onClick={() => handleSaveMarks(true)} className="flex-1 bg-academic-blue hover:bg-academic-blue/90 text-white py-2.5 rounded-xl font-bold transition-all shadow-sm">
                    Submit for Approval
                  </button>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* TAB 5: Revaluation Reviews */}
      {tab === "revaluation" && (
        <Card>
          <SectionTitle icon={RefreshCw}>Revaluation Scripts Review</SectionTitle>
          {revals.length === 0 ? <EmptyState label="No revaluation applications pending." /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-ink-secondary border-b">
                    <th className="py-2.5">Student</th>
                    <th className="py-2.5">Exam Cycle</th>
                    <th className="py-2.5">Subject</th>
                    <th className="py-2.5">Original Score</th>
                    <th className="py-2.5">Student Reason</th>
                    <th className="py-2.5">Status</th>
                    <th className="py-2.5 text-right">Review Script</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {revals.map(r => (
                    <tr key={r.id}>
                      <td className="py-3 font-semibold text-ink-primary">{r.student_name}</td>
                      <td className="py-3 text-ink-primary">{r.exam_name.replace(/_/g, " ")}</td>
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
                          <button
                            onClick={() => {
                              setRevalForm({ status: "Completed", updated_marks: r.original_marks, teacher_remarks: "" });
                              setActiveRevalModal(r);
                            }}
                            className="bg-academic-blue hover:bg-academic-blue/90 text-white text-xs px-2.5 py-1.5 rounded-lg font-bold shadow-sm"
                          >
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
      )}

      {/* QUESTION BUILDER MODAL */}
      {showQuestionForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="font-heading font-bold text-ink-primary">
                {questionEditItem ? "Edit Question Details" : "Create New Question"}
              </h3>
              <button onClick={() => setShowQuestionForm(false)} className="text-slate-400 hover:text-ink-primary font-bold">✕</button>
            </div>
            <form onSubmit={handleSaveQuestion} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase text-ink-secondary">Chapter / Section (*)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chapter-1 Kinematics (*)"
                  value={questionForm.chapter}
                  onChange={e => setQuestionForm({ ...questionForm, chapter: e.target.value })}
                  className="w-full mt-1 border rounded-xl px-3 py-2 text-sm outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold uppercase text-ink-secondary">Question Type</label>
                  <select
                    value={questionForm.type}
                    onChange={e => setQuestionForm({ ...questionForm, type: e.target.value })}
                    className="w-full mt-1 border rounded-xl px-3 py-2 text-sm bg-white outline-none"
                  >
                    {QUESTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-ink-secondary">Difficulty Level</label>
                  <select
                    value={questionForm.difficulty}
                    onChange={e => setQuestionForm({ ...questionForm, difficulty: e.target.value })}
                    className="w-full mt-1 border rounded-xl px-3 py-2 text-sm bg-white outline-none"
                  >
                    {DIFFICULTY_LEVELS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-ink-secondary">Question Text (*)</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Type question content here... (*)"
                  value={questionForm.question_text}
                  onChange={e => setQuestionForm({ ...questionForm, question_text: e.target.value })}
                  className="w-full mt-1 border rounded-xl px-3 py-2 text-sm outline-none resize-none"
                />
              </div>
              {questionForm.type === "MCQ" && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-ink-secondary block">MCQ Options</label>
                  <div className="grid grid-cols-2 gap-2">
                    {questionForm.options.map((opt, idx) => (
                      <input
                        key={idx}
                        type="text"
                        required
                        placeholder={`Option ${idx + 1}`}
                        value={opt}
                        onChange={e => {
                          const updated = [...questionForm.options];
                          updated[idx] = e.target.value;
                          setQuestionForm({ ...questionForm, options: updated });
                        }}
                        className="border rounded-xl px-3 py-1.5 text-xs outline-none"
                      />
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label className="text-xs font-semibold uppercase text-ink-secondary">Correct Answer / Correct Option (*)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Option 1 or Option content (*)"
                  value={questionForm.correct_answer}
                  onChange={e => setQuestionForm({ ...questionForm, correct_answer: e.target.value })}
                  className="w-full mt-1 border rounded-xl px-3 py-2 text-sm outline-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowQuestionForm(false)} className="flex-1 border rounded-xl py-2 font-medium">Cancel</button>
                <button type="submit" className="flex-1 bg-academic-blue text-white rounded-xl py-2 font-bold">Save Question</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REVALUATION GRADE MODAL */}
      {activeRevalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between pb-3 border-b mb-4">
              <h3 className="font-heading font-bold text-ink-primary">Re-evaluate Exam Script</h3>
              <button onClick={() => setActiveRevalModal(null)} className="text-slate-400 font-bold">✕</button>
            </div>
            <form onSubmit={handleRevalSubmit} className="space-y-4">
              <div className="p-3 bg-slate-50 border rounded-xl text-xs space-y-1.5 text-ink-secondary">
                <p><strong>Student Name:</strong> {activeRevalModal.student_name}</p>
                <p><strong>Subject:</strong> {activeRevalModal.subject_name}</p>
                <p><strong>Original Marks:</strong> {activeRevalModal.original_marks}</p>
                <p><strong>Remarks:</strong> "{activeRevalModal.reason}"</p>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-ink-secondary">Grading Action Status</label>
                <select
                  value={revalForm.status}
                  onChange={e => setRevalForm({ ...revalForm, status: e.target.value })}
                  className="w-full mt-1 border rounded-xl px-3 py-2 text-sm bg-white outline-none"
                >
                  <option value="Completed">Mark Revaluation Completed</option>
                  <option value="Rejected">Reject Request</option>
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
                    className="w-full mt-1 border rounded-xl px-3 py-2 text-sm outline-none"
                  />
                </div>
              )}
              <div>
                <label className="text-xs font-semibold uppercase text-ink-secondary">Review Marks Details / Comments (*)</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Explain resolution comments... (*)"
                  value={revalForm.teacher_remarks}
                  onChange={e => setRevalForm({ ...revalForm, teacher_remarks: e.target.value })}
                  className="w-full mt-1 border rounded-xl px-3 py-2 text-sm outline-none resize-none"
                />
              </div>
              <button className="w-full bg-academic-blue text-white rounded-xl py-2.5 font-bold hover:bg-academic-blue/90 transition-colors">
                Submit Graded Script
              </button>
            </form>
          </div>
        </div>
      )}

      {/* EXAM SCHEDULE DIALOG */}
      {showScheduleForm && (
        <ExamForm
          classes={classes}
          onClose={() => setShowScheduleForm(false)}
          onSaved={handleScheduleSaved}
        />
      )}

      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}

function ExamForm({ classes, onClose, onSaved }) {
  const [form, setForm] = useState({
    class_id: classes[0]?.class_id || "",
    subject_id: classes[0]?.subject_id || "",
    exam_name: EXAM_NAME_CHOICES[0],
    exam_type: "Offline",
    exam_date: new Date().toISOString().slice(0, 10),
    start_time: "09:00",
    duration_minutes: 60,
    max_marks: 100,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    if (classes.length && !form.class_id) {
      setForm((f) => ({
        ...f,
        class_id: classes[0].class_id,
        subject_id: classes[0].subject_id,
      }));
    }
  }, [classes]);

  function pickClassSubject(val) {
    const [classId, subjectId] = val.split("-");
    setForm((f) => ({ ...f, class_id: classId ? Number(classId) : "", subject_id: subjectId ? Number(subjectId) : "" }));
  }

  async function submit(e) {
    e.preventDefault();
    const errs = {};
    if (!form.class_id || !form.subject_id) {
      errs.class_subject = "Please select a target class & subject.";
    }
    if (!isPositiveNumber(form.duration_minutes)) {
      errs.duration_minutes = "Duration must be a positive number.";
    }
    if (!isPositiveNumber(form.max_marks)) {
      errs.max_marks = "Max marks must be a positive number.";
    }
    if (!form.exam_date) {
      errs.exam_date = "Exam date is required.";
    }

    if (Object.keys(errs).length > 0) {
      setValidationErrors(errs);
      return;
    }
    setValidationErrors({});
    setBusy(true);
    setError("");
    try {
      await api.post("/teacher/exams/", form);
      onSaved();
    } catch (err) {
      setError(err?.response?.data?.detail || "Couldn't schedule exam.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-card w-full max-w-md p-6 shadow-raised max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <p className="font-heading font-semibold">Schedule exam</p>
          <button onClick={onClose} className="text-ink-secondary">✕</button>
        </div>
        {error && <div className="mb-3 text-sm text-danger bg-red-50 rounded-xl px-3 py-2">{error}</div>}
        <form onSubmit={submit} className="space-y-3">
          <div>
            <select
              value={form.class_id && form.subject_id ? `${form.class_id}-${form.subject_id}` : ""}
              onChange={(e) => pickClassSubject(e.target.value)}
              className={`w-full rounded-xl border px-3 py-2.5 text-sm focus-ring outline-none bg-white ${
                validationErrors.class_subject ? "border-danger" : "border-slate-200"
              }`}
            >
              <option value="">Select Class & Subject</option>
              {classes.map((c) => (
                <option key={c.id} value={`${c.class_id}-${c.subject_id}`}>{c.class_name} — {c.subject_name}</option>
              ))}
            </select>
            {validationErrors.class_subject && (
              <p className="text-xs text-danger mt-1">{validationErrors.class_subject}</p>
            )}
          </div>

          <select
            required
            value={form.exam_name}
            onChange={(e) => setForm((f) => ({ ...f, exam_name: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus-ring outline-none bg-white"
          >
            {EXAM_NAME_CHOICES.map((name) => (
              <option key={name} value={name}>{name.replace(/_/g, " ")}</option>
            ))}
          </select>
          <select
            value={form.exam_type}
            onChange={(e) => setForm((f) => ({ ...f, exam_type: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus-ring outline-none bg-white"
          >
            <option>Offline</option>
            <option>Online</option>
            <option>OMR</option>
          </select>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <input type="date" value={form.exam_date} onChange={(e) => setForm((f) => ({ ...f, exam_date: e.target.value }))}
                className={`w-full rounded-xl border px-3 py-2 text-sm focus-ring outline-none ${
                  validationErrors.exam_date ? "border-danger" : "border-slate-200"
                }`} />
              {validationErrors.exam_date && (
                <p className="text-xs text-danger mt-1">{validationErrors.exam_date}</p>
              )}
            </div>
            <input type="time" value={form.start_time} onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus-ring outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-ink-secondary">Duration (min)</label>
              <input type="number" value={form.duration_minutes} onChange={(e) => setForm((f) => ({ ...f, duration_minutes: Number(e.target.value) }))}
                className={`w-full rounded-xl border px-3 py-2 text-sm focus-ring outline-none ${
                  validationErrors.duration_minutes ? "border-danger" : "border-slate-200"
                }`} />
              {validationErrors.duration_minutes && (
                <p className="text-xs text-danger mt-1">{validationErrors.duration_minutes}</p>
              )}
            </div>
            <div>
              <label className="text-xs text-ink-secondary">Max marks</label>
              <input type="number" value={form.max_marks} onChange={(e) => setForm((f) => ({ ...f, max_marks: Number(e.target.value) }))}
                className={`w-full rounded-xl border px-3 py-2 text-sm focus-ring outline-none ${
                  validationErrors.max_marks ? "border-danger" : "border-slate-200"
                }`} />
              {validationErrors.max_marks && (
                <p className="text-xs text-danger mt-1">{validationErrors.max_marks}</p>
              )}
            </div>
          </div>
          <button
            disabled={busy}
            className="w-full bg-academic-blue text-white rounded-xl py-2.5 font-medium hover:bg-academic-blue/90 disabled:opacity-60"
          >
            {busy ? "Saving…" : "Schedule exam"}
          </button>
        </form>
      </div>
    </div>
  );
}
