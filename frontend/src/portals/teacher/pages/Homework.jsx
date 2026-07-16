import { Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge, Card, EmptyState, Loader, Toast } from "../components/Common";
import api from "../lib/api";
import { isNonEmptyString, isValidDateRange } from "../../../utils/validation";


export default function Homework() {
  const [items, setItems] = useState(null);
  const [classes, setClasses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState("");

  function load() {
    api.get("/teacher/homework/").then(({ data }) => setItems(data)).catch(() => setItems([]));
  }
  useEffect(() => {
    load();
    api.get("/teacher/classes/").then(({ data }) => setClasses(data));
  }, []);

  if (!items) return <Loader rows={4} />;

  return (
    <div className="space-y-4">
      <button
        onClick={() => {
          if (!classes || classes.length === 0) {
            setToast("You have not been assigned to any classes or subjects yet. Please contact the administrator to assign classes.");
          } else {
            setShowForm(true);
          }
        }}
        className="flex items-center gap-2 bg-academic-blue text-white rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-academic-blue/90"
      >
        <Plus size={16} /> Assign homework
      </button>

      {items.length ? (
        <div className="grid md:grid-cols-2 gap-4">
          {items.map((h) => (
            <Card key={h.id}>
              <div className="flex items-start justify-between mb-2">
                <p className="font-heading font-semibold">{h.title}</p>
                <Badge tone="blue">{h.class_name}</Badge>
              </div>
              <p className="text-xs text-ink-secondary mb-2">{h.subject_name}</p>
              <p className="text-sm text-ink-primary/90 mb-3">{h.description}</p>
              <div className="flex justify-between text-xs text-ink-secondary">
                <span>Assigned {h.assigned_date}</span>
                <span>Due {h.due_date}</span>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState label="No homework assigned yet." />
      )}

      {showForm && (
        <HomeworkForm
          classes={classes}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            setToast("Homework assigned.");
            load();
          }}
        />
      )}
      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}

function HomeworkForm({ classes, onClose, onSaved }) {
  const [form, setForm] = useState({
    class_id: classes[0]?.class_id || "",
    subject_id: classes[0]?.subject_id || "",
    title: "", description: "",
    assigned_date: new Date().toISOString().slice(0, 10),
    due_date: new Date().toISOString().slice(0, 10),
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
      errs.class_subject = "Please select a class and subject.";
    }
    if (!isNonEmptyString(form.title)) {
      errs.title = "Title is required and cannot be empty.";
    }
    if (!isNonEmptyString(form.description)) {
      errs.description = "Description is required and cannot be empty.";
    }
    if (!isValidDateRange(form.assigned_date, form.due_date)) {
      errs.due_date = "Due date must be on or after the assigned date.";
    }

    if (Object.keys(errs).length > 0) {
      setValidationErrors(errs);
      return;
    }
    setValidationErrors({});
    setBusy(true);
    setError("");
    try {
      await api.post("/teacher/homework/", form);
      onSaved();
    } catch (err) {
      setError(err?.response?.data?.detail || "Couldn't save homework.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-card w-full max-w-md p-6 shadow-raised max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <p className="font-heading font-semibold">Assign homework</p>
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

          <div>
            <input
              required
              placeholder="Title (*)"
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
            <textarea
              required
              rows={3}
              placeholder="Description (*)"
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-ink-secondary">Assigned date</label>
              <input
                type="date"
                value={form.assigned_date}
                onChange={(e) => setForm((f) => ({ ...f, assigned_date: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus-ring outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-ink-secondary">Due date</label>
              <input
                type="date"
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
          <button
            disabled={busy}
            className="w-full bg-academic-blue text-white rounded-xl py-2.5 font-medium hover:bg-academic-blue/90 disabled:opacity-60"
          >
            {busy ? "Saving…" : "Assign homework"}
          </button>
        </form>
      </div>
    </div>
  );
}
