import { Plus, Trash2, Edit2, X, PlusCircle, CheckCircle2, Sparkles, FileUp, BarChart3, Send, BookOpen } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { Badge, Card, EmptyState, Loader, SectionTitle, Toast } from "../components/Common";
import api from "../lib/api";

const ASSIGNMENT_TYPES = ["Homework", "Worksheet", "Project", "Research", "Practical_Record", "Lab_Report", "Presentation", "Essay", "Coding", "Case_Study", "Group", "Quiz"];

export default function Assignments() {
  const [tab, setTab] = useState("list");
  const [items, setItems] = useState(null);
  const [classes, setClasses] = useState([]);
  const [editItem, setEditItem] = useState(null);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [toast, setToast] = useState("");

  function load() {
    api.get("/teacher/assignments/").then(({ data }) => setItems(data)).catch(() => setItems([]));
  }

  useEffect(() => {
    load();
    api.get("/teacher/classes/").then(({ data }) => {
      setClasses(data.filter(c => c.subject_id !== 0 && c.subject_id !== "0"));
    }).catch(() => {});
  }, []);

  const totalAssignments = items ? items.length : 0;
  const pendingGrading = items ? items.reduce((sum, a) => sum + ((a.submission_count || 0) - (a.graded_count || 0)), 0) : 0;
  const totalSubmitted = items ? items.reduce((sum, a) => sum + (a.submission_count || 0), 0) : 0;

  async function handleDelete(id) {
    if (!window.confirm("Delete this assignment?")) return;
    try {
      await api.delete(`/teacher/assignments/${id}/`);
      setToast("Assignment deleted.");
      load();
    } catch {
      setToast("Could not delete assignment.");
    }
  }

  if (!items) return <Loader rows={4} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-xl">
            <BookOpen size={14} className="text-academic-blue" />
            <span className="text-xs font-semibold text-academic-blue">{totalAssignments} Assignments</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 rounded-xl">
            <FileUp size={14} className="text-amber-600" />
            <span className="text-xs font-semibold text-amber-600">{pendingGrading} Pending Grading</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-xl">
            <CheckCircle2 size={14} className="text-academic-green" />
            <span className="text-xs font-semibold text-academic-green">{totalSubmitted} Submitted</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          ["list", "My Assignments", BookOpen],
          ["create", "Create Assignment", PlusCircle],
          ["submissions", "Submissions", Send],
          ["rubrics", "Rubrics", BarChart3],
          ["reports", "Reports", BarChart3],
        ].map(([key, label, Icon]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm ${
              tab === key ? "bg-academic-blue text-white shadow-md" : "bg-white text-ink-secondary hover:text-ink-primary hover:bg-slate-50"
            }`}>
            <Icon size={15} />{label}
          </button>
        ))}
      </div>

      {tab === "list" && (
        <AssignmentsListTab
          items={items}
          onEdit={a => { setEditItem(a); setTab("create"); }}
          onDelete={handleDelete}
          onViewSubs={a => { setSelectedAssignment(a); setTab("submissions"); }}
          onCreateNew={() => { setEditItem(null); setTab("create"); }}
        />
      )}

      {tab === "create" && (
        <CreateAssignmentTab
          classes={classes}
          assignment={editItem}
          onSaved={() => { setEditItem(null); setTab("list"); setToast(editItem ? "Assignment updated." : "Assignment created."); load(); }}
          onCancel={() => { setEditItem(null); setTab("list"); }}
        />
      )}

      {tab === "submissions" && (
        <SubmissionsTab
          assignments={items}
          selectedAssignment={selectedAssignment}
          onSelect={setSelectedAssignment}
        />
      )}

      {tab === "rubrics" && <RubricsTab />}
      {tab === "reports" && <ReportsTab />}

      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}

function AssignmentsListTab({ items, onEdit, onDelete, onViewSubs, onCreateNew }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={onCreateNew}
          className="flex items-center gap-2 bg-academic-blue text-white rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-academic-blue/90">
          <Plus size={16} /> New Assignment
        </button>
      </div>

      {items.length === 0 ? (
        <EmptyState label="No assignments created yet." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-secondary text-xs uppercase tracking-wide border-b">
                <th className="py-3">Title</th>
                <th className="py-3">Class</th>
                <th className="py-3">Subject</th>
                <th className="py-3">Due Date</th>
                <th className="py-3">Type</th>
                <th className="py-3">Submissions</th>
                <th className="py-3">Status</th>
                <th className="py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map(a => (
                <tr key={a.id}>
                  <td className="py-3 font-semibold text-ink-primary">{a.title}</td>
                  <td className="py-3 text-ink-primary">{a.class_name || "—"}</td>
                  <td className="py-3 text-ink-primary">{a.subject_name || "—"}</td>
                  <td className="py-3 text-xs text-ink-secondary">
                    {a.due_date ? new Date(a.due_date).toLocaleDateString() : "—"}
                  </td>
                  <td className="py-3">
                    <Badge tone={a.assignment_type === "Quiz" ? "purple" : "blue"}>
                      {a.assignment_type?.replace(/_/g, " ") || "—"}
                    </Badge>
                  </td>
                  <td className="py-3 text-xs text-ink-secondary">
                    {a.submission_count || 0} / {a.graded_count || 0} graded
                  </td>
                  <td className="py-3">
                    <Badge tone={a.status === "Published" ? "green" : a.status === "Closed" ? "red" : "gold"}>
                      {a.status || "Draft"}
                    </Badge>
                  </td>
                  <td className="py-3 text-right space-x-2">
                    <button onClick={() => onViewSubs(a)} className="text-xs text-academic-blue hover:underline font-semibold">Submissions</button>
                    <button onClick={() => onEdit(a)} className="text-xs text-academic-blue hover:underline font-semibold">Edit</button>
                    <button onClick={() => onDelete(a.id)} className="text-xs text-danger hover:underline font-semibold">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CreateAssignmentTab({ classes, assignment, onSaved, onCancel }) {
  const isEdit = !!assignment;
  const [form, setForm] = useState({
    class_id: assignment?.class_id || classes[0]?.class_id || "",
    subject_id: assignment?.subject_id || classes[0]?.subject_id || "",
    title: assignment?.title || "",
    description: assignment?.description || "",
    file_url: assignment?.file_url || "",
    max_marks: assignment?.max_marks || 100,
    due_date: assignment?.due_date ? new Date(assignment.due_date).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
    assignment_type: assignment?.assignment_type || "Homework",
    quiz_questions: assignment?.quiz_questions
      ? (typeof assignment.quiz_questions === "string" ? JSON.parse(assignment.quiz_questions) : assignment.quiz_questions)
      : [],
  });
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    if (classes.length && !form.class_id) {
      setForm(f => ({ ...f, class_id: classes[0].class_id, subject_id: classes[0].subject_id }));
    }
  }, [classes]);

  function pickClassSubject(val) {
    const [classId, subjectId] = val.split("-");
    setForm(f => ({ ...f, class_id: classId ? Number(classId) : "", subject_id: subjectId ? Number(subjectId) : "" }));
  }

  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setError("");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("bucket", "lms-resources");
    try {
      const { data } = await api.post("/upload/", formData, { headers: { "Content-Type": "multipart/form-data" } });
      setForm(f => ({ ...f, file_url: data.url }));
    } catch {
      setError("Failed to upload file.");
    } finally {
      setUploading(false);
    }
  }

  async function handleScanPdf(e) {
    const file = e.target.files[0];
    if (!file) return;
    setScanning(true);
    setError("");
    const formData = new FormData();
    formData.append("file", file);
    try {
      const { data } = await api.post("/teacher/assignments/scan-pdf/", formData, { headers: { "Content-Type": "multipart/form-data" } });
      if (data.questions && data.questions.length > 0) {
        setForm(f => ({ ...f, quiz_questions: [...f.quiz_questions, ...data.questions] }));
      } else {
        setError("No questions extracted from the PDF.");
      }
    } catch {
      setError("Failed to scan PDF.");
    } finally {
      setScanning(false);
    }
  }

  function addQuestion() {
    setForm(f => ({
      ...f, quiz_questions: [...f.quiz_questions, { question_text: "", options: ["", "", "", ""], correct_answer: "" }]
    }));
  }

  function removeQuestion(index) {
    setForm(f => ({ ...f, quiz_questions: f.quiz_questions.filter((_, i) => i !== index) }));
  }

  function updateQuestion(index, key, val) {
    setForm(f => {
      const copy = [...f.quiz_questions];
      copy[index] = { ...copy[index], [key]: val };
      return { ...f, quiz_questions: copy };
    });
  }

  function updateOption(qIndex, oIndex, val) {
    setForm(f => {
      const copy = [...f.quiz_questions];
      const opts = [...copy[qIndex].options];
      opts[oIndex] = val;
      copy[qIndex] = { ...copy[qIndex], options: opts };
      return { ...f, quiz_questions: copy };
    });
  }

  async function submit(e) {
    e.preventDefault();
    const errs = {};
    if (!form.class_id || !form.subject_id) errs.class_subject = "Select a class & subject.";
    if (!form.title.trim()) errs.title = "Title is required.";
    if (!form.description.trim()) errs.description = "Description is required.";
    if (!form.max_marks || form.max_marks <= 0) errs.max_marks = "Max marks must be positive.";
    if (!form.due_date) errs.due_date = "Due date is required.";
    if (form.assignment_type === "Quiz") {
      if (form.quiz_questions.length === 0) errs.quiz = "Add at least one question.";
      else if (form.quiz_questions.some(q => !q.question_text || !q.correct_answer || q.options.some(o => !o)))
        errs.quiz = "All question fields must be filled.";
    }
    if (Object.keys(errs).length > 0) { setValidationErrors(errs); return; }
    setValidationErrors({});
    setBusy(true);
    setError("");
    try {
      const payload = { ...form, due_date: new Date(form.due_date).toISOString() };
      if (isEdit) {
        await api.patch(`/teacher/assignments/${assignment.id}/`, payload);
      } else {
        await api.post("/teacher/assignments/", payload);
      }
      onSaved();
    } catch (err) {
      setError(err?.response?.data?.detail || "Couldn't save assignment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
        <SectionTitle icon={isEdit ? Edit2 : PlusCircle}>{isEdit ? "Edit Assignment" : "Create Assignment"}</SectionTitle>
        <button onClick={onCancel} className="text-ink-secondary hover:text-ink-primary"><X size={18} /></button>
      </div>

      {error && <div className="mb-3 text-sm text-danger bg-red-50 rounded-xl px-3 py-2">{error}</div>}

      <form onSubmit={submit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-ink-secondary uppercase">Class & Subject (*)</label>
            <select
              value={form.class_id && form.subject_id ? `${form.class_id}-${form.subject_id}` : ""}
              onChange={e => pickClassSubject(e.target.value)}
              className={`w-full mt-1 rounded-xl border px-3 py-2.5 text-sm outline-none ${validationErrors.class_subject ? "border-danger" : "border-slate-200"}`}>
              <option value="">Select Class & Subject</option>
              {classes.map(c => (
                <option key={c.id} value={`${c.class_id}-${c.subject_id}`}>{c.class_name} — {c.subject_name}</option>
              ))}
            </select>
            {validationErrors.class_subject && <p className="text-xs text-danger mt-1">{validationErrors.class_subject}</p>}
          </div>
          <div>
            <label className="text-xs font-semibold text-ink-secondary uppercase">Assignment Type</label>
            <select value={form.assignment_type} onChange={e => setForm(f => ({ ...f, assignment_type: e.target.value }))}
              className="w-full mt-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none bg-white">
              {ASSIGNMENT_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-ink-secondary uppercase">Title (*)</label>
          <input required placeholder="e.g. Chapter 3 Integration Test" value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            className={`w-full mt-1 rounded-xl border px-3 py-2.5 text-sm outline-none ${validationErrors.title ? "border-danger" : "border-slate-200"}`} />
          {validationErrors.title && <p className="text-xs text-danger mt-1">{validationErrors.title}</p>}
        </div>

        <div>
          <label className="text-xs font-semibold text-ink-secondary uppercase">Description (*)</label>
          <textarea required rows={2} placeholder="Instructions or guidelines..." value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            className={`w-full mt-1 rounded-xl border px-3 py-2.5 text-sm outline-none resize-none ${validationErrors.description ? "border-danger" : "border-slate-200"}`} />
          {validationErrors.description && <p className="text-xs text-danger mt-1">{validationErrors.description}</p>}
        </div>

        <div>
          <label className="text-xs font-semibold text-ink-secondary uppercase">Attachment (PDF, DOCX, TXT)</label>
          <div className="flex gap-2 items-center mt-1">
            <input type="file" accept=".pdf,.txt,.docx" onChange={handleFileUpload} className="hidden" id="assignment-file" />
            <label htmlFor="assignment-file"
              className="bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold cursor-pointer select-none transition-colors">
              {uploading ? "Uploading..." : "Choose File"}
            </label>
            {form.file_url ? (
              <span className="text-xs text-academic-green font-semibold truncate max-w-[200px]" title={form.file_url}>✓ {form.file_url.split("/").pop()}</span>
            ) : (
              <span className="text-xs text-slate-400">No file uploaded</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-ink-secondary uppercase">Max Marks</label>
            <input type="number" value={form.max_marks} onChange={e => setForm(f => ({ ...f, max_marks: Number(e.target.value) }))}
              className={`w-full mt-1 rounded-xl border px-3 py-2 text-sm outline-none ${validationErrors.max_marks ? "border-danger" : "border-slate-200"}`} />
            {validationErrors.max_marks && <p className="text-xs text-danger mt-1">{validationErrors.max_marks}</p>}
          </div>
          <div>
            <label className="text-xs font-semibold text-ink-secondary uppercase">Due Date & Time</label>
            <input type="datetime-local" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
              className={`w-full mt-1 rounded-xl border px-3 py-2 text-sm outline-none ${validationErrors.due_date ? "border-danger" : "border-slate-200"}`} />
            {validationErrors.due_date && <p className="text-xs text-danger mt-1">{validationErrors.due_date}</p>}
          </div>
        </div>

        {validationErrors.quiz && (
          <div className="text-sm text-danger bg-red-50 rounded-xl px-3 py-2 border border-danger/35">{validationErrors.quiz}</div>
        )}

        {form.assignment_type === "Quiz" && (
          <div className="space-y-4 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <p className="font-heading font-semibold text-slate-700">Quiz Questions Builder</p>
              <div className="flex items-center gap-3">
                <input type="file" accept=".pdf" onChange={handleScanPdf} className="hidden" id="quiz-scan-pdf" disabled={scanning} />
                <label htmlFor="quiz-scan-pdf"
                  className="flex items-center gap-1.5 bg-purple-50 border border-purple-200 text-purple-700 hover:bg-purple-100 rounded-xl px-3 py-1.5 text-xs font-semibold cursor-pointer select-none transition-all disabled:opacity-50">
                  <Sparkles size={13} className={scanning ? "animate-pulse" : ""} />
                  {scanning ? "Scanning..." : "Scan PDF"}
                </label>
                <button type="button" onClick={addQuestion} className="flex items-center gap-1 text-xs font-semibold text-academic-blue hover:text-academic-blue/80">
                  <PlusCircle size={14} /> Add Question
                </button>
              </div>
            </div>

            {form.quiz_questions.length === 0 ? (
              <p className="text-xs text-center py-4 bg-slate-50 text-slate-400 rounded-xl">No questions added yet.</p>
            ) : (
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                {form.quiz_questions.map((q, qIdx) => (
                  <div key={qIdx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500 uppercase">Question #{qIdx + 1}</span>
                      <button type="button" onClick={() => removeQuestion(qIdx)} className="text-danger hover:text-red-700"><Trash2 size={14} /></button>
                    </div>
                    <input required placeholder="Question Text" value={q.question_text}
                      onChange={e => updateQuestion(qIdx, "question_text", e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs outline-none" />
                    <div className="grid grid-cols-2 gap-2">
                      {q.options.map((opt, oIdx) => (
                        <div key={oIdx} className="flex items-center gap-1">
                          <span className="text-xs font-semibold text-slate-400 uppercase">{String.fromCharCode(65 + oIdx)}</span>
                          <input required placeholder={`Option ${oIdx + 1}`} value={opt}
                            onChange={e => updateOption(qIdx, oIdx, e.target.value)}
                            className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs outline-none" />
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <label className="text-xs font-semibold text-slate-500 shrink-0">Correct Answer:</label>
                      <select value={q.correct_answer} onChange={e => updateQuestion(qIdx, "correct_answer", e.target.value)}
                        className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs outline-none flex-1" required>
                        <option value="">-- Choose --</option>
                        {q.options.map((opt, oIdx) => opt ? <option key={oIdx} value={opt}>{String.fromCharCode(65 + oIdx)}: {opt}</option> : null)}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onCancel} className="flex-1 border rounded-xl py-2.5 font-medium">Cancel</button>
          <button disabled={busy}
            className="flex-1 bg-academic-blue text-white rounded-xl py-2.5 font-medium hover:bg-academic-blue/90 disabled:opacity-60 transition-colors">
            {busy ? "Saving..." : isEdit ? "Update Assignment" : "Create Assignment"}
          </button>
        </div>
      </form>
    </Card>
  );
}

function SubmissionsTab({ assignments, selectedAssignment, onSelect }) {
  const [subs, setSubs] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedSub, setExpandedSub] = useState(null);

  const loadSubs = useCallback(async () => {
    if (!selectedAssignment) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/teacher/assignments/${selectedAssignment.id}/submissions/`);
      setSubs(data);
    } catch {
      setSubs([]);
    } finally {
      setLoading(false);
    }
  }, [selectedAssignment]);

  useEffect(() => { loadSubs(); }, [loadSubs]);

  async function handleGrade(subId, marks, feedback) {
    try {
      await api.patch(`/teacher/assignments/${selectedAssignment.id}/submissions/${subId}/`, {
        marks_obtained: marks, teacher_feedback: feedback,
      });
      loadSubs();
    } catch {
      // silent
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-sm font-semibold text-ink-secondary">Select Assignment:</label>
        <select value={selectedAssignment?.id || ""} onChange={e => {
          const found = assignments.find(a => a.id === parseInt(e.target.value));
          onSelect(found || null);
          setSubs(null);
        }}
          className="flex-1 border rounded-xl px-3 py-2 text-sm bg-white outline-none">
          <option value="">Select Assignment</option>
          {assignments.map(a => (
            <option key={a.id} value={a.id}>{a.title} ({a.submission_count || 0} submissions)</option>
          ))}
        </select>
      </div>

      {selectedAssignment && (
        <Card>
          <SectionTitle icon={Send}>Submissions for "{selectedAssignment.title}"</SectionTitle>
          {loading ? (
            <Loader rows={3} />
          ) : !subs || subs.length === 0 ? (
            <EmptyState label="No submissions yet." />
          ) : (
            <div className="space-y-3">
              {subs.map(s => (
                <SubmissionRow
                  key={s.id}
                  sub={s}
                  maxMarks={selectedAssignment.max_marks}
                  assignmentType={selectedAssignment.assignment_type}
                  expanded={expandedSub === s.id}
                  onToggle={() => setExpandedSub(expandedSub === s.id ? null : s.id)}
                  onGrade={handleGrade}
                />
              ))}
            </div>
          )}
        </Card>
      )}

      {!selectedAssignment && (
        <EmptyState label="Select an assignment above to view its submissions." />
      )}
    </div>
  );
}

function SubmissionRow({ sub, maxMarks, assignmentType, expanded, onToggle, onGrade }) {
  const [marks, setMarks] = useState(sub.marks_obtained ?? "");
  const [feedback, setFeedback] = useState(sub.teacher_feedback ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await onGrade(sub.id, assignmentType === "Quiz" ? sub.marks_obtained : marks, feedback);
    setSaving(false);
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors">
      <div className="flex items-center justify-between p-4 cursor-pointer" onClick={onToggle}>
        <div className="flex items-center gap-3">
          <div>
            <p className="text-sm font-medium text-ink-primary">{sub.student_name}</p>
            <p className="text-xs text-ink-secondary font-numeric">{sub.admission_number}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {assignmentType === "Quiz" && <Badge tone="purple">Auto-Graded</Badge>}
          {sub.marks_obtained != null && <Badge tone="green">{sub.marks_obtained}/{maxMarks}</Badge>}
          <span className="text-xs text-ink-secondary">{expanded ? <CheckCircle2 size={14} /> : "Expand"}</span>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-3">
          {sub.submission_url && (
            <div className="text-xs bg-white p-3 rounded-lg border border-slate-100 max-h-[120px] overflow-y-auto whitespace-pre-wrap">
              <strong className="text-academic-blue text-[10px] uppercase block mb-1">Submission:</strong>
              {sub.submission_url.startsWith("http") ? (
                <a href={sub.submission_url} target="_blank" rel="noreferrer" className="text-academic-blue hover:underline">{sub.submission_url}</a>
              ) : sub.submission_url}
            </div>
          )}

          <div className="flex gap-2 items-end">
            <div className="w-28">
              <label className="text-xs font-semibold text-ink-secondary">Marks</label>
              <input type="number" max={maxMarks} placeholder={`/ ${maxMarks}`} value={marks}
                onChange={e => setMarks(e.target.value)}
                disabled={assignmentType === "Quiz"}
                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none mt-1" />
            </div>
            <div className="flex-1">
              <label className="text-xs font-semibold text-ink-secondary">Feedback</label>
              <input placeholder="Feedback (optional)" value={feedback}
                onChange={e => setFeedback(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none mt-1" />
            </div>
            <button disabled={saving || (assignmentType !== "Quiz" && marks === "")}
              onClick={handleSave}
              className="text-xs font-medium bg-academic-blue text-white rounded-lg px-3 py-2 hover:bg-academic-blue/90 disabled:opacity-60 transition-colors">
              {saving ? "Saving..." : "Save"}
            </button>
          </div>

          {sub.submitted_at && (
            <p className="text-[10px] text-slate-400">Submitted: {new Date(sub.submitted_at).toLocaleString()}</p>
          )}
        </div>
      )}
    </div>
  );
}

function RubricsTab() {
  const [rubrics, setRubrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState("");
  const [form, setForm] = useState({ criterion: "", max_marks: 10, description: "" });
  const [editId, setEditId] = useState(null);

  async function loadRubrics() {
    setLoading(true);
    try {
      const { data } = await api.get("/admin-portal/assignment-workflow/rubrics/");
      setRubrics(data);
    } catch {
      setRubrics([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadAssignments() {
    try {
      const { data } = await api.get("/teacher/assignments/");
      setAssignments(data);
    } catch {
      setAssignments([]);
    }
  }

  useEffect(() => { loadRubrics(); loadAssignments(); }, []);

  async function handleSave(e) {
    e.preventDefault();
    if (!form.criterion.trim()) return;
    try {
      const payload = { ...form, assignment_id: selectedAssignment || undefined };
      if (editId) {
        await api.patch(`/admin-portal/assignment-workflow/rubrics/?id=${editId}`, payload);
      } else {
        await api.post("/admin-portal/assignment-workflow/rubrics/", payload);
      }
      setForm({ criterion: "", max_marks: 10, description: "" });
      setEditId(null);
      loadRubrics();
    } catch {
      // silent
    }
  }

  function handleEdit(r) {
    setForm({ criterion: r.criterion, max_marks: r.max_marks, description: r.description || "" });
    setEditId(r.id);
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this rubric?")) return;
    try {
      await api.delete(`/admin-portal/assignment-workflow/rubrics/?id=${id}`);
      loadRubrics();
    } catch {}
  }

  if (loading) return <Loader rows={4} />;

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-1 h-fit">
        <SectionTitle icon={PlusCircle}>{editId ? "Edit Rubric" : "Add Rubric"}</SectionTitle>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">Assignment</label>
            <select value={selectedAssignment} onChange={e => setSelectedAssignment(e.target.value)}
              className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white outline-none">
              <option value="">General Rubric</option>
              {assignments.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">Criterion (*)</label>
            <input type="text" required placeholder="e.g. Content Accuracy" value={form.criterion}
              onChange={e => setForm({ ...form, criterion: e.target.value })}
              className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-academic-blue" />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">Max Marks</label>
            <input type="number" value={form.max_marks}
              onChange={e => setForm({ ...form, max_marks: parseInt(e.target.value) || 0 })}
              className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-academic-blue" />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">Description</label>
            <textarea rows={2} placeholder="Description of this criterion..." value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none resize-none focus:border-academic-blue" />
          </div>
          <button className="w-full bg-academic-blue hover:bg-academic-blue/90 text-white rounded-xl py-2.5 font-bold transition-colors">
            {editId ? "Update Rubric" : "Add Rubric"}
          </button>
          {editId && (
            <button type="button" onClick={() => { setEditId(null); setForm({ criterion: "", max_marks: 10, description: "" }); }}
              className="w-full border rounded-xl py-2 font-medium text-ink-secondary hover:bg-slate-50">Cancel</button>
          )}
        </form>
      </Card>

      <Card className="lg:col-span-2">
        <SectionTitle icon={BarChart3}>Rubrics ({rubrics.length})</SectionTitle>
        {rubrics.length === 0 ? (
          <EmptyState label="No rubrics defined yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-secondary text-xs uppercase tracking-wide border-b">
                  <th className="py-3">Criterion</th>
                  <th className="py-3">Max Marks</th>
                  <th className="py-3">Description</th>
                  <th className="py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rubrics.map(r => (
                  <tr key={r.id}>
                    <td className="py-3 font-semibold text-ink-primary">{r.criterion}</td>
                    <td className="py-3 font-bold text-ink-primary">{r.max_marks}</td>
                    <td className="py-3 text-xs text-ink-secondary truncate max-w-xs">{r.description || "—"}</td>
                    <td className="py-3 text-right space-x-2">
                      <button onClick={() => handleEdit(r)} className="text-xs text-academic-blue hover:underline font-semibold">Edit</button>
                      <button onClick={() => handleDelete(r.id)} className="text-xs text-danger hover:underline font-semibold">Delete</button>
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

function ReportsTab() {
  const [reportType, setReportType] = useState("");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const REPORT_TYPES = [
    "pending", "submitted", "late", "marks", "class_performance",
    "subject_performance", "teacher_workload", "completion_rate"
  ];

  async function handleFetch() {
    if (!reportType) return;
    setLoading(true);
    setData([]);
    try {
      const { data: result } = await api.get(`/admin-portal/assignment-workflow/reports/?type=${reportType}`);
      setData(result.results || result.data || result || []);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }

  const columns = data.length > 0 ? Object.keys(data[0]).filter(k => k !== "id") : [];

  return (
    <Card>
      <SectionTitle icon={BarChart3}>Assignment Reports</SectionTitle>
      <div className="flex flex-wrap gap-3 mb-4">
        <select value={reportType} onChange={e => setReportType(e.target.value)}
          className="flex-1 min-w-[200px] border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white outline-none">
          <option value="">Select Report Type</option>
          {REPORT_TYPES.map(t => (
            <option key={t} value={t}>{t.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</option>
          ))}
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
  );
}
