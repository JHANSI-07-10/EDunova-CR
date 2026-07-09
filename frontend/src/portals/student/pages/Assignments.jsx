import { CheckCircle2, UploadCloud, X, HelpCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge, Card, EmptyState, Loader, Toast } from "../components/Common";
import api from "../lib/api";

export default function Assignments() {
  const [items, setItems] = useState(null);
  const [active, setActive] = useState(null);
  const [toast, setToast] = useState("");

  function load() {
    api.get("/student/assignments/").then(({ data }) => setItems(data)).catch(() => setItems([]));
  }

  useEffect(load, []);

  if (!items) return <Loader rows={4} />;

  return (
    <div className="space-y-4">
      {items.length ? (
        <div className="grid md:grid-cols-2 gap-4">
          {items.map((a) => {
            const submitted = !!a.my_submission;
            const overdue = new Date(a.due_date) < new Date();
            return (
              <Card key={a.id} className="flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-heading font-semibold text-lg">{a.title}</p>
                      <Badge tone={a.assignment_type === "Quiz" ? "purple" : "blue"}>
                        {a.assignment_type}
                      </Badge>
                    </div>
                    {submitted ? (
                      <Badge tone="green">Submitted</Badge>
                    ) : overdue ? (
                      <Badge tone="red">Overdue</Badge>
                    ) : (
                      <Badge tone="blue">Pending</Badge>
                    )}
                  </div>
                  <p className="text-xs text-ink-secondary mb-2">{a.subject_name} · {a.max_marks} marks</p>
                  <p className="text-sm text-ink-primary/90 mb-3">{a.description}</p>
                </div>
                
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <span className="text-xs text-ink-secondary">Due {new Date(a.due_date).toLocaleString()}</span>
                  {submitted ? (
                    a.my_submission.marks_obtained != null ? (
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
                    ) : (
                      <span className="text-xs text-ink-secondary flex items-center gap-1">
                        <CheckCircle2 size={14} className="text-academic-green" /> Awaiting evaluation
                      </span>
                    )
                  ) : (
                    <button
                      onClick={() => setActive(a)}
                      className="flex items-center gap-1.5 text-sm font-medium text-white bg-academic-blue px-3.5 py-2 rounded-lg hover:bg-academic-blue/90 transition-colors"
                    >
                      {a.assignment_type === "Quiz" ? <HelpCircle size={14} /> : <UploadCloud size={14} />}
                      {a.assignment_type === "Quiz" ? "Start Quiz" : "Submit"}
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState label="No assignments posted for your class yet." />
      )}

      {active && (
        <SubmitModal
          assignment={active}
          onClose={() => setActive(null)}
          onSubmitted={(res) => {
            setActive(null);
            if (res && res.grade) {
              setToast(`Quiz submitted! Auto-graded: ${res.marks_obtained}/${active.max_marks} (Grade: ${res.grade})`);
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
  const [answers, setAnswers] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const isQuiz = assignment.assignment_type === "Quiz";
  const questions = isQuiz
    ? (typeof assignment.quiz_questions === "string" ? JSON.parse(assignment.quiz_questions) : assignment.quiz_questions || [])
    : [];

  async function submit(e) {
    e.preventDefault();
    if (isQuiz && Object.keys(answers).length < questions.length) {
      setError("Please answer all questions before submitting.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const submissionVal = isQuiz ? JSON.stringify(answers) : url;
      const { data } = await api.post(`/student/assignments/${assignment.id}/submit/`, { submission_url: submissionVal });
      onSubmitted(data);
    } catch (err) {
      setError(err?.response?.data?.detail || "Couldn't submit. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-card p-6 w-full max-w-lg shadow-raised max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
          <p className="font-heading font-semibold text-lg">{isQuiz ? `Quiz: ${assignment.title}` : `Submit: ${assignment.title}`}</p>
          <button onClick={onClose} className="text-ink-secondary"><X size={18} /></button>
        </div>
        {error && <div className="mb-3 text-sm text-danger bg-red-50 rounded-xl px-3 py-2">{error}</div>}
        <form onSubmit={submit} className="space-y-4">
          {isQuiz ? (
            <div className="space-y-4">
              <p className="text-xs text-ink-secondary">Complete the following multiple-choice questions online:</p>
              {questions.map((q, idx) => (
                <div key={idx} className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="font-semibold text-sm">{idx + 1}. {q.question_text}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {q.options.map((opt, oIdx) => (
                      <label key={oIdx} className="flex items-center gap-2 text-xs cursor-pointer p-2 bg-white rounded-lg border border-slate-100 hover:border-academic-blue transition-colors">
                        <input
                          type="radio"
                          name={`q-${idx}`}
                          value={opt}
                          checked={answers[idx] === opt}
                          onChange={() => setAnswers({ ...answers, [idx]: opt })}
                          className="text-academic-blue focus:ring-0"
                        />
                        <span>{String.fromCharCode(65 + oIdx)}: {opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-ink-secondary">
                Upload your file to the school's <code>assignmentsubmissions</code> storage bucket first,
                then paste the resulting URL here.
              </p>
              <input
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://…/assignmentsubmissions/your-file.pdf"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus-ring outline-none"
              />
            </div>
          )}

          <button
            disabled={busy}
            className="w-full bg-academic-blue text-white rounded-xl py-2.5 font-medium hover:bg-academic-blue/90 disabled:opacity-60 transition-colors"
          >
            {busy ? "Submitting…" : isQuiz ? "Submit Quiz" : "Submit assignment"}
          </button>
        </form>
      </div>
    </div>
  );
}
