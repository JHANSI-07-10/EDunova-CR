import { Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge, Card, EmptyState, Loader, Toast } from "../components/Common";
import api from "../lib/api";
import { isNonEmptyString } from "../../../utils/validation";


const DIFF_TONE = { Easy: "green", Medium: "gold", Hard: "red" };

export default function QuestionBank() {
  const [items, setItems] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState("");

  function load() {
    api.get("/teacher/question-bank/").then(({ data }) => setItems(data)).catch(() => setItems([]));
  }
  useEffect(() => {
    load();
    api.get("/teacher/classes/").then(({ data }) => {
      const unique = Array.from(new Map(data.map((c) => [c.subject_id, c])).values());
      setSubjects(unique);
    });
  }, []);

  async function remove(id) {
    await api.delete(`/teacher/question-bank/${id}/`);
    load();
  }

  if (!items) return <Loader rows={4} />;

  return (
    <div className="space-y-4">
      <button
        onClick={() => setShowForm(true)}
        className="flex items-center gap-2 bg-academic-blue text-white rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-academic-blue/90"
      >
        <Plus size={16} /> Add question
      </button>

      {items.length ? (
        <div className="space-y-3">
          {items.map((q) => (
            <Card key={q.id} className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge tone={DIFF_TONE[q.difficulty_level]}>{q.difficulty_level}</Badge>
                  <span className="text-xs text-ink-secondary">{q.subject_name}</span>
                </div>
                <p className="text-sm">{q.question_text}</p>
              </div>
              <button onClick={() => remove(q.id)} className="text-ink-secondary hover:text-danger shrink-0">
                <Trash2 size={16} />
              </button>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState label="No questions added yet." />
      )}

      {showForm && (
        <QuestionForm
          subjects={subjects}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            setToast("Question added to the bank.");
            load();
          }}
        />
      )}
      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}

function QuestionForm({ subjects, onClose, onSaved }) {
  const [subject, setSubject] = useState(subjects[0]?.subject_id || "");
  const [difficulty, setDifficulty] = useState("Easy");
  const [text, setText] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState({});

  async function submit(e) {
    e.preventDefault();
    const errs = {};
    if (!subject) {
      errs.subject = "Please select a subject.";
    }
    if (!isNonEmptyString(text)) {
      errs.text = "Question text is required.";
    }
    if (!isNonEmptyString(answer)) {
      errs.answer = "Expected answer is required.";
    }

    if (Object.keys(errs).length > 0) {
      setValidationErrors(errs);
      return;
    }
    setValidationErrors({});
    setBusy(true);
    setError("");
    try {
      await api.post("/teacher/question-bank/", { subject_id: Number(subject), difficulty_level: difficulty, question_text: text, expected_answer: answer });
      onSaved();
    } catch (err) {
      setError(err?.response?.data?.detail || "Couldn't save question.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-card w-full max-w-md p-6 shadow-raised">
        <div className="flex items-center justify-between mb-4">
          <p className="font-heading font-semibold">Add question</p>
          <button onClick={onClose} className="text-ink-secondary"><X size={18} /></button>
        </div>
        {error && <div className="mb-3 text-sm text-danger bg-red-50 rounded-xl px-3 py-2">{error}</div>}
        <form onSubmit={submit} className="space-y-3">
          <div>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className={`w-full rounded-xl border px-3 py-2.5 text-sm focus-ring outline-none ${
                validationErrors.subject ? "border-danger" : "border-slate-200"
              }`}
            >
              <option value="">Select Subject</option>
              {subjects.map((s) => (
                <option key={s.subject_id} value={s.subject_id}>{s.subject_name}</option>
              ))}
            </select>
            {validationErrors.subject && (
              <p className="text-xs text-danger mt-1">{validationErrors.subject}</p>
            )}
          </div>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus-ring outline-none"
          >
            <option>Easy</option>
            <option>Medium</option>
            <option>Hard</option>
          </select>
          <div>
            <textarea
              required
              rows={3}
              placeholder="Question text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className={`w-full rounded-xl border px-3 py-2.5 text-sm focus-ring outline-none resize-none ${
                validationErrors.text ? "border-danger" : "border-slate-200"
              }`}
            />
            {validationErrors.text && (
              <p className="text-xs text-danger mt-1">{validationErrors.text}</p>
            )}
          </div>
          <div>
            <input
              required
              placeholder="Expected answer"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              className={`w-full rounded-xl border px-3 py-2.5 text-sm focus-ring outline-none ${
                validationErrors.answer ? "border-danger" : "border-slate-200"
              }`}
            />
            {validationErrors.answer && (
              <p className="text-xs text-danger mt-1">{validationErrors.answer}</p>
            )}
          </div>
          <button
            disabled={busy}
            className="w-full bg-academic-blue text-white rounded-xl py-2.5 font-medium hover:bg-academic-blue/90 disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save question"}
          </button>
        </form>
      </div>
    </div>
  );
}
