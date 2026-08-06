import { Megaphone, Pin, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Card, EmptyState, Loader } from "../components/Common";
import api from "../lib/api";

export default function Notices() {
  const [items, setItems] = useState(null);
  const [classes, setClasses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ class_id: "", title: "", message: "" });
  const [submitting, setSubmitting] = useState(false);

  function loadData() {
    api.get("/teacher/notices/").then(({ data }) => setItems(data)).catch(() => setItems([]));
  }

  useEffect(() => {
    loadData();
    api.get("/teacher/classes/").then(({ data }) => setClasses(data || []));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!formData.class_id || !formData.title || !formData.message) return;
    setSubmitting(true);
    try {
      await api.post("/teacher/notices/", formData);
      setFormData({ class_id: "", title: "", message: "" });
      setShowForm(false);
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  if (!items) return <Loader rows={4} />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-heading font-semibold text-ink-primary">Notices & Announcements</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-academic-blue text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-academic-blue/90 transition-colors"
        >
          <Plus size={16} />
          {showForm ? "Cancel" : "Post Notice"}
        </button>
      </div>

      {showForm && (
        <Card className="border border-academic-blue/20 bg-academic-blue/5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="font-medium text-ink-primary">Post to a Class</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-ink-secondary mb-1">Select Class</label>
                <select
                  required
                  value={formData.class_id}
                  onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus-ring outline-none"
                >
                  <option value="">-- Choose Class --</option>
                  {classes.map((c) => (
                    <option key={c.class_id} value={c.class_id}>
                      {c.class_name} - {c.subject_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-secondary mb-1">Title</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Tomorrow's test syllabus"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus-ring outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-secondary mb-1">Message</label>
              <textarea
                required
                rows={3}
                placeholder="Write your announcement here..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus-ring outline-none resize-none"
              />
            </div>
            <div className="flex justify-end">
              <button
                disabled={submitting}
                type="submit"
                className="bg-academic-blue text-white px-6 py-2 rounded-xl text-sm font-medium hover:bg-academic-blue/90 disabled:opacity-50 transition-colors"
              >
                {submitting ? "Posting..." : "Post Now"}
              </button>
            </div>
          </form>
        </Card>
      )}

      {items.length === 0 && !showForm ? (
        <EmptyState label="No notices posted." />
      ) : (
        <div className="space-y-3">
          {items.map((n) => (
            <Card key={n.id} className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-academic-orange/10 text-academic-orange flex items-center justify-center shrink-0">
                <Megaphone size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  {n.is_pinned && <Pin size={12} className="text-academic-gold" />}
                  <p className="font-medium">{n.title}</p>
                  <span className="text-xs text-ink-secondary">{new Date(n.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-sm text-ink-secondary mt-1 whitespace-pre-wrap">{n.content}</p>
                {n.file_attachment_url && (
                  <a href={n.file_attachment_url} target="_blank" rel="noreferrer" className="text-xs text-academic-blue hover:underline mt-1 block">
                    View attachment
                  </a>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
