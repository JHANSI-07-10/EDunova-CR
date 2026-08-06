import { useState, useEffect } from "react";
import {
  CheckCircle2,
  UploadCloud,
  X,
  HelpCircle,
  Search,
  Filter,
  AlertTriangle,
  Clock,
  FileText,
  Award,
  MessageSquare,
  BookOpen,
} from "lucide-react";
import {
  Badge,
  Card,
  EmptyState,
  Loader,
  SectionTitle,
  StatCard,
  Toast,
} from "../components/Common";
import api from "../lib/api";
import { isNonEmptyString } from "../../../utils/validation";

const STATUS_FILTERS = ["All", "Pending", "Submitted", "Graded", "Late"];

const STATUS_BADGE = {
  pending: "blue",
  submitted: "green",
  graded: "green",
  late: "red",
};

function getAssignmentStatus(a) {
  if (a.my_submission) {
    if (a.my_submission.marks_obtained != null) return "graded";
    return "submitted";
  }
  const now = new Date();
  const due = new Date(a.due_date);
  if (due < now) return "late";
  return "pending";
}

function getAssignmentStatusTone(status) {
  const map = {
    pending: "blue",
    submitted: "green",
    graded: "green",
    late: "red",
  };
  return map[status] || "slate";
}

export default function Assignments() {
  const [items, setItems] = useState(null);
  const [active, setActive] = useState(null);
  const [toast, setToast] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [subjectFilter, setSubjectFilter] = useState("All");

  function load() {
    api
      .get("/student/assignments/")
      .then(({ data }) => setItems(data))
      .catch(() => setItems([]));
  }

  useEffect(() => {
    load();
  }, []);

  if (!items) return <Loader rows={4} />;

  const allAssignments = items || [];

  const subjects = [...new Set(allAssignments.map((a) => a.subject_name).filter(Boolean))];

  const filtered = allAssignments.filter((a) => {
    const status = getAssignmentStatus(a);
    if (statusFilter !== "All" && status !== statusFilter.toLowerCase()) return false;
    if (subjectFilter !== "All" && a.subject_name !== subjectFilter) return false;
    if (search && !a.title?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const total = allAssignments.length;
  const pendingCount = allAssignments.filter((a) => getAssignmentStatus(a) === "pending").length;
  const submittedCount = allAssignments.filter((a) => getAssignmentStatus(a) === "submitted").length;
  const gradedCount = allAssignments.filter((a) => getAssignmentStatus(a) === "graded").length;
  const gradedItems = allAssignments.filter((a) => getAssignmentStatus(a) === "graded");
  const avgMarks =
    gradedItems.length > 0
      ? Math.round(
          gradedItems.reduce((sum, a) => {
            const max = a.max_marks || 100;
            const obtained = a.my_submission?.marks_obtained || 0;
            return sum + (obtained / max) * 100;
          }, 0) / gradedItems.length
        )
      : 0;

  const stats = [
    { icon: FileText, label: "Total", value: total, accent: "blue" },
    { icon: Clock, label: "Pending", value: pendingCount, accent: "orange" },
    { icon: CheckCircle2, label: "Submitted", value: submittedCount, accent: "green" },
    { icon: Award, label: "Graded", value: gradedCount, accent: "blue" },
    { icon: Award, label: "Avg Score", value: `${avgMarks}%`, accent: "gold" },
  ];

  return (
    <div className="space-y-6 animate-[fadeIn_.2s_ease]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl font-bold text-ink-primary">
            My Assignments
          </h2>
          <p className="text-sm text-ink-secondary">
            Track assignments, submit work, and view graded feedback.
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-5 gap-4">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-secondary" />
          <input
            type="text"
            placeholder="Search by title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus-ring outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-ink-secondary" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold focus-ring outline-none bg-white"
          >
            {STATUS_FILTERS.map((f) => (
              <option key={f} value={f}>
                {f === "All" ? "All Status" : f}
              </option>
            ))}
          </select>
        </div>
        {subjects.length > 0 && (
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold focus-ring outline-none bg-white"
          >
            <option value="All">All Subjects</option>
            {subjects.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState label="No assignments match your filters." />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map((a) => {
            const status = getAssignmentStatus(a);
            const submitted = !!a.my_submission;
            const overdue = status === "late";
            const submittedLate =
              submitted &&
              new Date(a.my_submission.submitted_at) > new Date(a.due_date);
            const isGraded = status === "graded";
            const now = new Date();
            const dueDate = new Date(a.due_date);
            const isPastDue = dueDate < now;
            const timeLeft = isPastDue
              ? "Overdue"
              : `${Math.ceil((dueDate - now) / (1000 * 60 * 60))}h left`;

            return (
              <Card key={a.id} className="flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-heading font-semibold text-lg text-ink-primary truncate">
                        {a.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge tone={a.assignment_type === "Quiz" ? "blue" : "slate"}>
                          {a.assignment_type}
                        </Badge>
                        <Badge tone={getAssignmentStatusTone(status)}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </Badge>
                      </div>
                    </div>
                    {isPastDue && !submitted && (
                      <div className="flex items-center gap-1 text-danger text-[11px] font-bold bg-red-50 border border-red-100 rounded-lg px-2 py-1 ml-2">
                        <AlertTriangle size={10} /> Overdue
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-ink-secondary mt-2">
                    <span className="flex items-center gap-1">
                      <BookOpen size={12} /> {a.subject_name}
                    </span>
                    {a.teacher_name && (
                      <span className="flex items-center gap-1">
                        <MessageSquare size={12} /> {a.teacher_name}
                      </span>
                    )}
                    <span>{a.max_marks} marks</span>
                  </div>
                  {a.description && (
                    <p className="text-sm text-ink-primary/80 mt-2 line-clamp-2">
                      {a.description}
                    </p>
                  )}
                  {submitted && (
                    <p className="text-xs font-semibold mt-2 text-ink-secondary">
                      {submittedLate
                        ? "⚠ Submission recorded after deadline. Marked late."
                        : "✓ Submission recorded. Teacher has been notified."}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-3">
                  <div className="text-xs text-ink-secondary">
                    <span
                      className={
                        isPastDue && !submitted ? "text-danger font-semibold" : ""
                      }
                    >
                      Due {new Date(a.due_date).toLocaleDateString()}
                    </span>
                    <span className="mx-1.5">·</span>
                    <span>{timeLeft}</span>
                  </div>

                  {isGraded ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-numeric font-semibold text-academic-green">
                        {a.my_submission.marks_obtained}/{a.max_marks}
                      </span>
                      {a.my_submission.grade && (
                        <span className="text-xs font-semibold px-2 py-0.5 bg-green-50 text-green-700 rounded-md border border-green-200">
                          Grade: {a.my_submission.grade}
                        </span>
                      )}
                    </div>
                  ) : submitted ? (
                    <span className="text-xs text-ink-secondary flex items-center gap-1">
                      <CheckCircle2 size={14} className="text-academic-green" />{" "}
                      Awaiting evaluation
                    </span>
                  ) : (
                    <button
                      onClick={() => setActive(a)}
                      disabled={overdue && a.late_policy === "blocked"}
                      className="flex items-center gap-1.5 text-sm font-medium text-white bg-academic-blue px-3.5 py-2 rounded-lg hover:bg-academic-blue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {a.assignment_type === "Quiz" ? (
                        <HelpCircle size={14} />
                      ) : (
                        <UploadCloud size={14} />
                      )}
                      {a.assignment_type === "Quiz" ? "Start Quiz" : "Submit"}
                    </button>
                  )}
                </div>

                {isGraded && a.my_submission.feedback && (
                  <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <p className="text-[11px] font-bold text-academic-blue uppercase tracking-wide mb-1">
                      Teacher Feedback
                    </p>
                    <p className="text-xs text-ink-primary italic">
                      "{a.my_submission.feedback}"
                    </p>
                  </div>
                )}

                {overdue && !submitted && a.late_policy && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <p className="text-xs text-amber-800 font-semibold flex items-center gap-1">
                      <AlertTriangle size={12} />
                      Late policy:{" "}
                      {a.late_policy === "blocked"
                        ? "Submissions are blocked past the deadline."
                        : a.late_policy === "penalized"
                        ? "A penalty will be applied to late submissions."
                        : a.late_policy}
                    </p>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {active && (
        <SubmitModal
          assignment={active}
          onClose={() => setActive(null)}
          onSubmitted={(res) => {
            setActive(null);
            if (res && res.grade) {
              setToast(
                `Quiz submitted! Auto-graded: ${res.marks_obtained}/${active.max_marks} (Grade: ${res.grade})`
              );
            } else {
              setToast("Assignment submitted — your teacher has been notified.");
            }
            load();
          }}
        />
      )}

      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}

function SubmitModal({ assignment, onClose, onSubmitted }) {
  const [url, setUrl] = useState("");
  const [typedText, setTypedText] = useState("");
  const [submissionMode, setSubmissionMode] = useState("type");
  const [answers, setAnswers] = useState({});
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState({});

  const isQuiz = assignment.assignment_type === "Quiz";
  const questions = isQuiz
    ? typeof assignment.quiz_questions === "string"
      ? JSON.parse(assignment.quiz_questions)
      : assignment.quiz_questions || []
    : [];

  async function handleSubmissionUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setError("");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("bucket", "assignmentsubmissions");
    try {
      const { data } = await api.post("/upload/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUrl(data.url);
    } catch {
      setError("Failed to upload file. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function submit(e) {
    e.preventDefault();
    const errs = {};
    if (isQuiz) {
      const unanswered = [];
      questions.forEach((q, idx) => {
        if (!answers[idx]) unanswered.push(idx + 1);
      });
      if (unanswered.length > 0) {
        errs.quiz = `Please answer all questions. Unanswered: ${unanswered.join(", ")}`;
      }
    } else {
      if (submissionMode === "type" && !isNonEmptyString(typedText)) {
        errs.typedText = "Please write a response before submitting.";
      }
      if (submissionMode === "upload" && !isNonEmptyString(url)) {
        errs.url = "Please upload a file before submitting.";
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
      const submissionVal = isQuiz
        ? JSON.stringify(answers)
        : submissionMode === "type"
        ? typedText
        : url;
      const { data } = await api.post(
        `/student/assignments/${assignment.id}/submit/`,
        { submission_url: submissionVal }
      );
      onSubmitted(data);
    } catch (err) {
      setError(err?.response?.data?.detail || "Couldn't submit. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
          <div>
            <p className="font-heading font-semibold text-lg text-ink-primary">
              {isQuiz ? `Quiz: ${assignment.title}` : `Submit: ${assignment.title}`}
            </p>
            <p className="text-xs text-ink-secondary mt-0.5">
              {assignment.subject_name} · {assignment.max_marks} marks
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-ink-secondary hover:text-ink-primary transition-colors p-1"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mb-3 text-sm text-danger bg-red-50 rounded-xl px-3 py-2">
            {error}
          </div>
        )}

        {assignment.description && (
          <div className="mb-4 bg-slate-50 border border-slate-200/60 p-3 rounded-xl text-xs text-ink-primary leading-relaxed">
            <span className="font-bold text-academic-blue block mb-1">
              Instructions & Details:
            </span>
            <p className="whitespace-pre-line">{assignment.description}</p>
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          {isQuiz ? (
            <div className="space-y-4">
              <p className="text-xs text-ink-secondary">
                Complete the following multiple-choice questions online:
              </p>
              {questions.map((q, idx) => (
                <div
                  key={idx}
                  className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200"
                >
                  <p className="font-semibold text-sm text-ink-primary">
                    {idx + 1}. {q.question_text}
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {q.options.map((opt, oIdx) => (
                      <label
                        key={oIdx}
                        className={`flex items-center gap-2 text-xs cursor-pointer p-2.5 rounded-lg border transition-colors ${
                          answers[idx] === opt
                            ? "bg-academic-blue/5 border-academic-blue"
                            : "bg-white border-slate-100 hover:border-academic-blue"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`q-${idx}`}
                          value={opt}
                          checked={answers[idx] === opt}
                          onChange={() => setAnswers({ ...answers, [idx]: opt })}
                          className="text-academic-blue focus:ring-0"
                        />
                        <span className="font-medium text-ink-primary">
                          {String.fromCharCode(65 + oIdx)}: {opt}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setSubmissionMode("type")}
                  className={`flex-1 text-xs py-1.5 font-semibold rounded-lg transition-all ${
                    submissionMode === "type"
                      ? "bg-white text-ink-primary shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Write Answers Online
                </button>
                <button
                  type="button"
                  onClick={() => setSubmissionMode("upload")}
                  className={`flex-1 text-xs py-1.5 font-semibold rounded-lg transition-all ${
                    submissionMode === "upload"
                      ? "bg-white text-ink-primary shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Upload Document File
                </button>
              </div>

              {submissionMode === "type" ? (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-ink-secondary block">
                    Type your response below:
                  </label>
                  <textarea
                    required
                    rows={6}
                    placeholder="Start typing your response here..."
                    value={typedText}
                    onChange={(e) => setTypedText(e.target.value)}
                    className={`w-full rounded-xl border p-3 text-sm focus-ring outline-none h-40 ${
                      validationErrors.typedText ? "border-danger" : "border-slate-200"
                    }`}
                  />
                  {validationErrors.typedText && (
                    <p className="text-xs text-danger mt-1">
                      {validationErrors.typedText}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-ink-secondary">
                    Select and upload your completed assignment (PDF, TXT, DOCX):
                  </p>
                  <div className="flex gap-2 items-center">
                    <input
                      type="file"
                      accept=".pdf,.txt,.docx"
                      onChange={handleSubmissionUpload}
                      className="hidden"
                      id="student-submission-file"
                    />
                    <label
                      htmlFor="student-submission-file"
                      className="bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold cursor-pointer select-none transition-colors"
                    >
                      {uploading ? "Uploading..." : "Choose File"}
                    </label>
                    {url ? (
                      <span
                        className="text-xs text-academic-green font-semibold truncate max-w-[250px]"
                        title={url}
                      >
                        ✓ File Uploaded: {url.split("/").pop()}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">No file selected</span>
                    )}
                  </div>
                  {validationErrors.url && (
                    <p className="text-xs text-danger mt-1">{validationErrors.url}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {validationErrors.quiz && (
            <div className="mb-3 text-sm text-danger bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              {validationErrors.quiz}
            </div>
          )}

          <button
            disabled={busy}
            className="w-full bg-academic-blue text-white rounded-xl py-2.5 font-medium hover:bg-academic-blue/90 disabled:opacity-60 transition-colors"
          >
            {busy ? "Submitting…" : isQuiz ? "Submit Quiz" : "Submit Assignment"}
          </button>
        </form>
      </div>
    </div>
  );
}
