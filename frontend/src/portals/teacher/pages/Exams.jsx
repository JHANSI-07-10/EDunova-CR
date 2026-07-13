import { Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge, Card, EmptyState, Loader, Toast } from "../components/Common";
import api from "../lib/api";
import { isPositiveNumber } from "../../../utils/validation";


export default function Exams() {
  const [items, setItems] = useState(null);
  const [classes, setClasses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState("");

  function load() {
    api.get("/teacher/exams/").then(({ data }) => setItems(data)).catch(() => setItems([]));
  }
  useEffect(() => {
    load();
    api.get("/teacher/classes/").then(({ data }) => setClasses(data));
  }, []);

  if (!items) return <Loader rows={4} />;

  return (
    <div className="space-y-4">
      <button
        onClick={() => setShowForm(true)}
        className="flex items-center gap-2 bg-academic-blue text-white rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-academic-blue/90"
      >
        <Plus size={16} /> Schedule exam
      </button>

      {items.length ? (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-secondary text-xs uppercase tracking-wide">
                  <th className="py-2">Exam</th>
                  <th className="py-2">Class</th>
                  <th className="py-2">Subject</th>
                  <th className="py-2">Type</th>
                  <th className="py-2">Date</th>
                  <th className="py-2">Max marks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((e) => (
                  <tr key={e.id}>
                    <td className="py-2.5 font-medium">{e.exam_name}</td>
                    <td className="py-2.5">{e.class_name}</td>
                    <td className="py-2.5">{e.subject_name}</td>
                    <td className="py-2.5"><Badge tone="blue">{e.exam_type}</Badge></td>
                    <td className="py-2.5">{e.exam_date}</td>
                    <td className="py-2.5">{e.max_marks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <EmptyState label="No exams scheduled yet." />
      )}

      {showForm && (
        <ExamForm
          classes={classes}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            setToast("Exam scheduled.");
            load();
          }}
        />
      )}
      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}

const EXAM_NAME_CHOICES = ["Unit_Test_1", "Unit_Test_2", "Unit_Test_3", "Unit_Test_4", "Mid_Term", "Final_Term", "Pre_Board", "Board_Exam"];

function ExamForm({ classes, onClose, onSaved }) {
  const [form, setForm] = useState({
    class_id: classes[0]?.class_id || "",
    subject_id: classes[0]?.subject_id || "",
    exam_name: EXAM_NAME_CHOICES[0], exam_type: "Offline",
    exam_date: new Date().toISOString().slice(0, 10),
    start_time: "09:00", duration_minutes: 60, max_marks: 100,
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
          <button onClick={onClose} className="text-ink-secondary"><X size={18} /></button>
        </div>
        {error && <div className="mb-3 text-sm text-danger bg-red-50 rounded-xl px-3 py-2">{error}</div>}
        <form onSubmit={submit} className="space-y-3">
          <div>
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

          <select
            required
            value={form.exam_name}
            onChange={(e) => setForm((f) => ({ ...f, exam_name: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus-ring outline-none"
          >
            {EXAM_NAME_CHOICES.map((name) => (
              <option key={name} value={name}>{name.replace(/_/g, " ")}</option>
            ))}
          </select>
          <select
            value={form.exam_type}
            onChange={(e) => setForm((f) => ({ ...f, exam_type: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus-ring outline-none"
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
