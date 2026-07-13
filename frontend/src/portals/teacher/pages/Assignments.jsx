import { Plus, Trash2, Edit2, X, PlusCircle, CheckCircle2, FileUp, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge, Card, EmptyState, Loader, Toast } from "../components/Common";
import api from "../lib/api";
import { isNonEmptyString, isPositiveNumber } from "../../../utils/validation";


export default function Assignments() {
  const [items, setItems] = useState(null);
  const [classes, setClasses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [grading, setGrading] = useState(null);
  const [toast, setToast] = useState("");

  function load() {
    api.get("/teacher/assignments/").then(({ data }) => setItems(data)).catch(() => setItems([]));
  }
  useEffect(() => {
    load();
    api.get("/teacher/classes/").then(({ data }) => {
      setClasses(data.filter((c) => c.subject_id !== 0 && c.subject_id !== "0"));
    });
  }, []);

  async function removeAssignment(id) {
    if (confirm("Are you sure you want to delete this assignment?")) {
      try {
        await api.delete(`/teacher/assignments/${id}/`);
        setToast("Assignment deleted.");
        load();
      } catch (err) {
        setToast("Could not delete assignment.");
      }
    }
  }

  if (!items) return <Loader rows={4} />;

  return (
    <div className="space-y-4">
      <button
        onClick={() => {
          setEditItem(null);
          setShowForm(true);
        }}
        className="flex items-center gap-2 bg-academic-blue text-white rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-academic-blue/90"
      >
        <Plus size={16} /> New assignment
      </button>

      {items.length ? (
        <div className="grid md:grid-cols-2 gap-4">
          {items.map((a) => (
            <Card key={a.id} className="relative">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-heading font-semibold text-lg">{a.title}</p>
                  <Badge tone={a.assignment_type === "Quiz" ? "purple" : "blue"}>
                    {a.assignment_type}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditItem(a);
                      setShowForm(true);
                    }}
                    className="p-1.5 text-ink-secondary hover:text-academic-blue"
                    title="Edit Assignment"
                  >
                    <Edit2 size={15} />
                  </button>
                  <button
                    onClick={() => removeAssignment(a.id)}
                    className="p-1.5 text-ink-secondary hover:text-danger"
                    title="Delete Assignment"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <p className="text-xs text-ink-secondary mb-2">{a.subject_name} · {a.max_marks} marks</p>
              <p className="text-sm text-ink-primary/90 mb-3 line-clamp-2">{a.description}</p>
              {a.assignment_type === "Quiz" && a.quiz_questions && (
                <p className="text-xs text-ink-secondary mb-3">
                  📋 {JSON.parse(typeof a.quiz_questions === "string" ? a.quiz_questions : JSON.stringify(a.quiz_questions)).length} MCQ Questions
                </p>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-xs text-ink-secondary">
                  {a.graded_count}/{a.submission_count} graded
                </span>
                <button
                  onClick={() => setGrading(a)}
                  className="text-sm font-medium text-academic-blue hover:underline"
                >
                  View submissions →
                </button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState label="No assignments created yet." />
      )}

      {showForm && (
        <AssignmentForm
          classes={classes}
          assignment={editItem}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            setToast(editItem ? "Assignment updated." : "Assignment created.");
            load();
          }}
        />
      )}
      {grading && (
        <GradingDrawer
          assignment={grading}
          onClose={() => setGrading(null)}
          onGraded={() => {
            load();
          }}
        />
      )}
      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}

function AssignmentForm({ classes, assignment, onClose, onSaved }) {
  const isEdit = !!assignment;
  const [form, setForm] = useState({
    class_id: assignment?.class_id || classes[0]?.class_id || "",
    subject_id: assignment?.subject_id || classes[0]?.subject_id || "",
    title: assignment?.title || "",
    description: assignment?.description || "",
    file_url: assignment?.file_url || "",
    max_marks: assignment?.max_marks || 100,
    due_date: assignment?.due_date ? new Date(assignment.due_date).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
    assignment_type: assignment?.assignment_type || "File",
    quiz_questions: assignment?.quiz_questions ? (typeof assignment.quiz_questions === "string" ? JSON.parse(assignment.quiz_questions) : assignment.quiz_questions) : [],
  });
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState({});

  async function handleScanPdf(e) {
    const file = e.target.files[0];
    if (!file) return;
    setScanning(true);
    setError("");
    const formData = new FormData();
    formData.append("file", file);
    try {
      const { data } = await api.post("/teacher/assignments/scan-pdf/", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      if (data.questions && data.questions.length > 0) {
        setForm((f) => ({
          ...f,
          quiz_questions: [
            ...f.quiz_questions,
            ...data.questions
          ]
        }));
      } else {
        setError("No questions could be extracted from the PDF. Please check the PDF format.");
      }
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to scan PDF. Make sure it is a valid questions PDF.");
    } finally {
      setScanning(false);
    }
  }

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

  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setError("");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("bucket", "lms-resources");
    try {
      const { data } = await api.post("/upload/", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setForm((f) => ({ ...f, file_url: data.url }));
    } catch (err) {
      setError("Failed to upload file. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  function addQuestion() {
    setForm((f) => ({
      ...f,
      quiz_questions: [
        ...f.quiz_questions,
        { question_text: "", options: ["", "", "", ""], correct_answer: "" }
      ]
    }));
  }

  function removeQuestion(index) {
    setForm((f) => ({
      ...f,
      quiz_questions: f.quiz_questions.filter((_, i) => i !== index)
    }));
  }

  function updateQuestion(index, key, val) {
    setForm((f) => {
      const copy = [...f.quiz_questions];
      copy[index] = { ...copy[index], [key]: val };
      return { ...f, quiz_questions: copy };
    });
  }

  function updateOption(qIndex, oIndex, val) {
    setForm((f) => {
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
    if (!form.class_id || !form.subject_id) {
      errs.class_subject = "Please select a target class & subject.";
    }
    if (!isNonEmptyString(form.title)) {
      errs.title = "Title is required.";
    }
    if (!isNonEmptyString(form.description)) {
      errs.description = "Description is required.";
    }
    if (!isPositiveNumber(form.max_marks)) {
      errs.max_marks = "Max marks must be a positive number.";
    }
    if (!form.due_date) {
      errs.due_date = "Due date is required.";
    }

    if (form.assignment_type === "Quiz") {
      if (form.quiz_questions.length === 0) {
        errs.quiz = "Please add at least one question to the Quiz.";
      } else {
        const missing = form.quiz_questions.some(q => !q.question_text || !q.correct_answer || q.options.some(o => !o));
        if (missing) {
          errs.quiz = "All questions, options, and correct answers must be filled out.";
        }
      }
    }

    if (Object.keys(errs).length > 0) {
      setValidationErrors(errs);
      return;
    }
    setValidationErrors({});

    setBusy(true);
    setError("");
    try {
      if (isEdit) {
        await api.patch(`/teacher/assignments/${assignment.id}/`, { ...form, due_date: new Date(form.due_date).toISOString() });
      } else {
        await api.post("/teacher/assignments/", { ...form, due_date: new Date(form.due_date).toISOString() });
      }
      onSaved();
    } catch (err) {
      setError(err?.response?.data?.detail || "Couldn't save assignment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-card w-full max-w-2xl p-6 shadow-raised max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
          <p className="font-heading font-semibold text-lg">{isEdit ? "Edit assignment" : "New assignment"}</p>
          <button onClick={onClose} className="text-ink-secondary"><X size={18} /></button>
        </div>
        {error && <div className="mb-3 text-sm text-danger bg-red-50 rounded-xl px-3 py-2">{error}</div>}
        <form onSubmit={submit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-ink-secondary uppercase">Target Class & Subject</label>
              <select
                value={form.class_id && form.subject_id ? `${form.class_id}-${form.subject_id}` : ""}
                onChange={(e) => pickClassSubject(e.target.value)}
                className={`w-full rounded-xl border px-3 py-2.5 text-sm focus-ring outline-none ${
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
            <div>
              <label className="text-xs font-semibold text-ink-secondary uppercase">Assignment Type</label>
              <select
                value={form.assignment_type}
                onChange={(e) => setForm((f) => ({ ...f, assignment_type: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus-ring outline-none"
              >
                <option value="File">File Upload Submission</option>
                <option value="Quiz">Online Objective Quiz</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-ink-secondary uppercase">Title</label>
            <input
              required
              placeholder="e.g. Chapter 3 Integration Test"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className={`w-full rounded-xl border px-3 py-2.5 text-sm focus-ring outline-none ${
                validationErrors.title ? "border-danger" : "border-slate-200"
              }`}
            />
            {validationErrors.title && (
              <p className="text-xs text-danger mt-1">{validationErrors.title}</p>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-ink-secondary uppercase">Description</label>
            <textarea
              required
              rows={2}
              placeholder="Instructions or guidelines..."
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className={`w-full rounded-xl border px-3 py-2.5 text-sm focus-ring outline-none resize-none ${
                validationErrors.description ? "border-danger" : "border-slate-200"
              }`}
            />
            {validationErrors.description && (
              <p className="text-xs text-danger mt-1">{validationErrors.description}</p>
            )}
          </div>

          {form.assignment_type === "File" && (
            <div>
              <label className="text-xs font-semibold text-ink-secondary uppercase">Attachment Document (PDF, TXT, DOCX)</label>
              <div className="flex gap-2 items-center mt-1">
                <input
                  type="file"
                  accept=".pdf,.txt,.docx"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="teacher-assignment-file"
                />
                <label
                  htmlFor="teacher-assignment-file"
                  className="bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold cursor-pointer select-none transition-colors"
                >
                  {uploading ? "Uploading..." : "Choose File"}
                </label>
                {form.file_url ? (
                  <span className="text-xs text-academic-green font-semibold truncate max-w-[200px]" title={form.file_url}>
                    ✓ Uploaded: {form.file_url.split("/").pop()}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">No file uploaded</span>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-ink-secondary uppercase">Max Marks</label>
              <input
                type="number"
                value={form.max_marks}
                onChange={(e) => setForm((f) => ({ ...f, max_marks: Number(e.target.value) }))}
                className={`w-full rounded-xl border px-3 py-2 text-sm focus-ring outline-none ${
                  validationErrors.max_marks ? "border-danger" : "border-slate-200"
                }`}
              />
              {validationErrors.max_marks && (
                <p className="text-xs text-danger mt-1">{validationErrors.max_marks}</p>
              )}
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-secondary uppercase">Due Date & Time</label>
              <input
                type="datetime-local"
                value={form.due_date}
                onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                className={`w-full rounded-xl border px-3 py-2 text-sm focus-ring outline-none ${
                  validationErrors.due_date ? "border-danger" : "border-slate-200"
                }`}
              />
              {validationErrors.due_date && (
                <p className="text-xs text-danger mt-1">{validationErrors.due_date}</p>
              )}
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
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleScanPdf}
                    className="hidden"
                    id="teacher-quiz-scan-pdf"
                    disabled={scanning}
                  />
                  <label
                    htmlFor="teacher-quiz-scan-pdf"
                    className="flex items-center gap-1.5 bg-purple-50 border border-purple-200 text-purple-700 hover:bg-purple-100 rounded-xl px-3 py-1.5 text-xs font-semibold cursor-pointer select-none transition-all duration-200 disabled:opacity-50"
                  >
                    <Sparkles size={13} className="text-purple-600 animate-pulse" />
                    {scanning ? "Scanning..." : "Scan PDF"}
                  </label>
                  
                  <button
                    type="button"
                    onClick={addQuestion}
                    className="flex items-center gap-1 text-xs font-semibold text-academic-blue hover:text-academic-blue/80"
                  >
                    <PlusCircle size={14} /> Add Question
                  </button>
                </div>
              </div>

              {form.quiz_questions.length === 0 ? (
                <p className="text-xs text-center py-4 bg-slate-50 text-slate-400 rounded-xl">No questions added yet. Click Add Question above.</p>
              ) : (
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                  {form.quiz_questions.map((q, qIdx) => (
                    <div key={qIdx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 relative space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase">Question #{qIdx + 1}</span>
                        <button
                          type="button"
                          onClick={() => removeQuestion(qIdx)}
                          className="text-danger hover:text-red-700"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <input
                        required
                        placeholder="Question Text"
                        value={q.question_text}
                        onChange={(e) => updateQuestion(qIdx, "question_text", e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs outline-none focus-ring"
                      />

                      <div className="grid grid-cols-2 gap-2">
                        {q.options.map((opt, oIdx) => (
                          <div key={oIdx} className="flex items-center gap-1">
                            <span className="text-xs font-semibold text-slate-400 uppercase">{String.fromCharCode(65 + oIdx)}</span>
                            <input
                              required
                              placeholder={`Option ${oIdx + 1}`}
                              value={opt}
                              onChange={(e) => updateOption(qIdx, oIdx, e.target.value)}
                              className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs outline-none focus-ring"
                            />
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <label className="text-xs font-semibold text-slate-500 shrink-0">Fix Correct Answer:</label>
                        <select
                          value={q.correct_answer}
                          onChange={(e) => updateQuestion(qIdx, "correct_answer", e.target.value)}
                          className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs outline-none focus-ring flex-1"
                          required
                        >
                          <option value="">-- Choose correct option --</option>
                          {q.options.map((opt, oIdx) => (
                            opt ? <option key={oIdx} value={opt}>{String.fromCharCode(65 + oIdx)}: {opt}</option> : null
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            disabled={busy}
            className="w-full bg-academic-blue text-white rounded-xl py-2.5 font-medium hover:bg-academic-blue/90 disabled:opacity-60 transition-colors"
          >
            {busy ? "Saving…" : isEdit ? "Update Assignment" : "Create Assignment"}
          </button>
        </form>
      </div>
    </div>
  );
}

function GradingDrawer({ assignment, onClose, onGraded }) {
  const [subs, setSubs] = useState(null);

  function load() {
    api.get(`/teacher/assignments/${assignment.id}/submissions/`).then(({ data }) => setSubs(data));
  }
  useEffect(load, [assignment.id]);

  async function grade(sub, marks, feedback) {
    await api.patch(`/teacher/assignments/${assignment.id}/submissions/${sub.id}/`, {
      marks_obtained: marks, teacher_feedback: feedback,
    });
    load();
    onGraded();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-end z-50">
      <div className="bg-white w-full max-w-lg h-full overflow-y-auto p-6 shadow-raised">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
          <div>
            <p className="font-heading font-semibold text-lg">{assignment.title}</p>
            <p className="text-xs text-ink-secondary">Submissions & Grading List</p>
          </div>
          <button onClick={onClose} className="text-ink-secondary"><X size={18} /></button>
        </div>
        {!subs ? (
          <Loader rows={3} />
        ) : subs.length ? (
          <div className="space-y-3">
            {subs.map((s) => (
              <SubmissionRow key={s.id} sub={s} maxMarks={assignment.max_marks} onGrade={grade} assignmentType={assignment.assignment_type} />
            ))}
          </div>
        ) : (
          <EmptyState label="No submissions yet." />
        )}
      </div>
    </div>
  );
}

function SubmissionRow({ sub, maxMarks, onGrade, assignmentType }) {
  const [marks, setMarks] = useState(sub.marks_obtained ?? "");
  const [feedback, setFeedback] = useState(sub.teacher_feedback ?? "");
  const [saving, setSaving] = useState(false);

  return (
    <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-sm font-medium">{sub.student_name}</p>
          <p className="text-xs text-ink-secondary font-numeric">{sub.admission_number}</p>
        </div>
        <div>
          {assignmentType === "Quiz" ? (
            <Badge tone="purple">Auto-Graded</Badge>
          ) : sub.submission_url?.startsWith("http") ? (
            <a href={sub.submission_url} target="_blank" rel="noreferrer" className="text-xs text-academic-blue hover:underline">
              View submission file
            </a>
          ) : (
            <Badge tone="green">Online Response</Badge>
          )}
        </div>
      </div>
      
      {assignmentType === "Quiz" && sub.submission_url && (
        <div className="text-xs text-ink-secondary bg-white p-2 rounded-lg border border-slate-100 mb-2 font-mono break-all max-h-[80px] overflow-y-auto">
          Answers: {sub.submission_url}
        </div>
      )}

      {assignmentType !== "Quiz" && sub.submission_url && !sub.submission_url.startsWith("http") && (
        <div className="text-xs text-slate-800 bg-slate-50 border border-slate-200 p-3 rounded-lg mb-2 whitespace-pre-wrap max-h-[150px] overflow-y-auto font-sans leading-relaxed">
          <strong className="text-academic-blue text-[10px] uppercase block mb-1">Student Answer:</strong>
          {sub.submission_url}
        </div>
      )}

      <div className="flex gap-2 mb-2">
        <div className="w-28 relative">
          <input
            type="number"
            max={maxMarks}
            placeholder={`/ ${maxMarks}`}
            value={marks}
            onChange={(e) => setMarks(e.target.value)}
            className="w-full rounded-lg border border-slate-200 pl-2 pr-7 py-1.5 text-sm focus-ring outline-none"
            disabled={assignmentType === "Quiz"}
          />
          {sub.grade && (
            <span className="absolute right-2 top-2 text-xs font-bold text-academic-green">
              {sub.grade}
            </span>
          )}
        </div>
        <input
          placeholder="Feedback (optional)"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          className="flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus-ring outline-none"
        />
      </div>
      
      {assignmentType === "Quiz" ? (
        <button
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            await onGrade(sub, sub.marks_obtained, feedback);
            setSaving(false);
          }}
          className="text-xs font-medium bg-academic-blue text-white rounded-lg px-3 py-1.5 hover:bg-academic-blue/90 transition-colors"
        >
          {saving ? "Saving feedback…" : "Save feedback"}
        </button>
      ) : (
        <button
          disabled={saving || marks === ""}
          onClick={async () => {
            setSaving(true);
            await onGrade(sub, marks, feedback);
            setSaving(false);
          }}
          className="text-xs font-medium bg-academic-blue text-white rounded-lg px-3 py-1.5 hover:bg-academic-blue/90 disabled:opacity-60 transition-colors"
        >
          {saving ? "Saving…" : "Save grade"}
        </button>
      )}
    </div>
  );
}

