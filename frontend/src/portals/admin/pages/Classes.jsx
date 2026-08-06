import { useEffect, useState } from "react";
import api from "../lib/api";
import { Card, EmptyState, Loader, SectionTitle, Toast } from "../components/Common";
import { isNonEmptyString } from "../../../utils/validation";
import {
  BookOpen,
  Layers,
  FileText,
  Link2,
  BookMarked,
  UserCheck,
  Download,
  BarChart3,
  GraduationCap,
  Pencil,
  Trash2,
  X,
  Check,
  Plus,
} from "lucide-react";

function Btn({ children, onClick, variant = "primary", disabled = false, className = "" }) {
  const base = "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 flex items-center gap-1.5";
  const variants = {
    primary: "bg-academic-blue text-white hover:bg-academic-blue/90",
    danger: "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100",
    ghost: "bg-slate-100 text-slate-600 hover:bg-slate-200",
    success: "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100",
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
}

function ConfirmDeleteModal({ label, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.4)" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <p className="text-base font-bold text-slate-800 mb-2">Delete?</p>
        <p className="text-sm text-slate-500 mb-5">{label}</p>
        <div className="flex gap-3 justify-end">
          <Btn variant="ghost" onClick={onCancel}>Cancel</Btn>
          <Btn variant="danger" onClick={onConfirm}><Trash2 size={12} /> Delete</Btn>
        </div>
      </div>
    </div>
  );
}

function TabClassesSubjects({ classes, subjects, loadClasses, loadSubjects, setToast }) {
  const [classForm, setClassForm] = useState({ name: "", section: "", curriculum: "CBSE", room_number: "" });
  const [subjectForm, setSubjectForm] = useState({ name: "", subject_code: "", type: "Theory" });
  const [editingClass, setEditingClass] = useState(null);
  const [editingSubject, setEditingSubject] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function addClass(e) {
    e.preventDefault();
    if (!isNonEmptyString(classForm.name)) { setToast({ message: "Class name is required.", tone: "error" }); return; }
    if (!isNonEmptyString(classForm.section)) { setToast({ message: "Section is required.", tone: "error" }); return; }
    setSubmitting(true);
    try {
      await api.post("/admin-portal/classes/", classForm);
      setClassForm({ name: "", section: "", curriculum: "CBSE", room_number: "" });
      loadClasses();
      setToast({ message: "Class created.", tone: "success" });
    } catch (err) { setToast({ message: err?.response?.data?.detail || "Could not create class.", tone: "error" }); }
    finally { setSubmitting(false); }
  }

  async function saveEditClass() {
    try {
      await api.patch(`/admin-portal/classes/${editingClass.id}/`, editingClass);
      setEditingClass(null);
      loadClasses();
      setToast({ message: "Class updated.", tone: "success" });
    } catch (err) { setToast({ message: err?.response?.data?.detail || "Could not update class.", tone: "error" }); }
  }

  async function deleteClass(id) {
    try {
      await api.delete(`/admin-portal/classes/${id}/`);
      loadClasses();
      setToast({ message: "Class deleted.", tone: "success" });
    } catch (err) {
      setToast({ message: err?.response?.data?.detail || "Could not delete class.", tone: "error" });
    } finally { setDeleteTarget(null); }
  }

  async function addSubject(e) {
    e.preventDefault();
    if (!isNonEmptyString(subjectForm.name)) { setToast({ message: "Subject name is required.", tone: "error" }); return; }
    if (!isNonEmptyString(subjectForm.subject_code)) { setToast({ message: "Subject code is required.", tone: "error" }); return; }
    setSubmitting(true);
    try {
      await api.post("/admin-portal/subjects/", subjectForm);
      setSubjectForm({ name: "", subject_code: "", type: "Theory" });
      loadSubjects();
      setToast({ message: "Subject created.", tone: "success" });
    } catch (err) { setToast({ message: err?.response?.data?.detail || "Could not create subject.", tone: "error" }); }
    finally { setSubmitting(false); }
  }

  async function saveEditSubject() {
    try {
      await api.patch(`/admin-portal/subjects/${editingSubject.id}/`, editingSubject);
      setEditingSubject(null);
      loadSubjects();
      setToast({ message: "Subject updated.", tone: "success" });
    } catch (err) { setToast({ message: err?.response?.data?.detail || "Could not update subject.", tone: "error" }); }
  }

  async function deleteSubject(id) {
    try {
      await api.delete(`/admin-portal/subjects/${id}/`);
      loadSubjects();
      setToast({ message: "Subject deleted.", tone: "success" });
    } catch (err) {
      setToast({ message: err?.response?.data?.detail || "Could not delete subject.", tone: "error" });
    } finally { setDeleteTarget(null); }
  }

  return (
    <>
      {deleteTarget && (
        <ConfirmDeleteModal
          label={`Are you sure you want to delete "${deleteTarget.label}"? This cannot be undone.`}
          onConfirm={() => deleteTarget.kind === "class" ? deleteClass(deleteTarget.id) : deleteSubject(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Card>
            <SectionTitle>Add Class</SectionTitle>
            <form onSubmit={addClass} className="grid grid-cols-2 gap-3">
              <input required placeholder="Name (e.g. Grade 6) (*)" value={classForm.name}
                onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus-ring outline-none" />
              <input required placeholder="Section (e.g. A) (*)" value={classForm.section}
                onChange={(e) => setClassForm({ ...classForm, section: e.target.value })}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus-ring outline-none" />
              <select value={classForm.curriculum}
                onChange={(e) => setClassForm({ ...classForm, curriculum: e.target.value })}
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus-ring outline-none">
                <option>CBSE</option><option>Cambridge</option><option>IB</option><option>State</option>
              </select>
              <input placeholder="Room number" value={classForm.room_number}
                onChange={(e) => setClassForm({ ...classForm, room_number: e.target.value })}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus-ring outline-none" />
              <button disabled={submitting} className="col-span-2 bg-academic-blue text-white rounded-xl py-2.5 font-medium hover:bg-academic-blue/90 disabled:opacity-50">
                {submitting ? "Adding..." : "Add Class"}
              </button>
            </form>
          </Card>
          <Card>
            <SectionTitle>All Classes</SectionTitle>
            {!classes ? <Loader rows={3} /> : classes.length === 0 ? <EmptyState label="No classes yet." /> : (
              <div className="divide-y divide-slate-100">
                {classes.map((c) => (
                  <div key={c.id} className="py-2.5 text-sm">
                    {editingClass?.id === c.id ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <input value={editingClass.name}
                            onChange={(e) => setEditingClass({ ...editingClass, name: e.target.value })}
                            className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus-ring" />
                          <input value={editingClass.section}
                            onChange={(e) => setEditingClass({ ...editingClass, section: e.target.value })}
                            className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus-ring" />
                          <select value={editingClass.curriculum}
                            onChange={(e) => setEditingClass({ ...editingClass, curriculum: e.target.value })}
                            className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus-ring">
                            <option>CBSE</option><option>Cambridge</option><option>IB</option><option>State</option>
                          </select>
                          <input value={editingClass.room_number || ""} placeholder="Room"
                            onChange={(e) => setEditingClass({ ...editingClass, room_number: e.target.value })}
                            className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus-ring" />
                        </div>
                        <div className="flex gap-2">
                          <Btn variant="success" onClick={saveEditClass}><Check size={12} /> Save</Btn>
                          <Btn variant="ghost" onClick={() => setEditingClass(null)}><X size={12} /> Cancel</Btn>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span className="font-medium text-slate-700">{c.name}-{c.section}</span>
                          <span className="text-ink-secondary ml-2">{c.curriculum} · Room {c.room_number || "—"}</span>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <Btn variant="ghost" onClick={() => setEditingClass({ ...c })}><Pencil size={12} /> Edit</Btn>
                          <Btn variant="danger" onClick={() => setDeleteTarget({ kind: "class", id: c.id, label: `${c.name}-${c.section}` })}><Trash2 size={12} /></Btn>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
        <div className="space-y-4">
          <Card>
            <SectionTitle>Add Subject</SectionTitle>
            <form onSubmit={addSubject} className="grid grid-cols-2 gap-3">
              <input required placeholder="Name (*)" value={subjectForm.name}
                onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus-ring outline-none" />
              <input required placeholder="Subject code (*)" value={subjectForm.subject_code}
                onChange={(e) => setSubjectForm({ ...subjectForm, subject_code: e.target.value })}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus-ring outline-none" />
              <select value={subjectForm.type}
                onChange={(e) => setSubjectForm({ ...subjectForm, type: e.target.value })}
                className="col-span-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus-ring outline-none">
                {["Theory", "Practical", "Lab", "Skill_Development"].map((t) => <option key={t}>{t}</option>)}
              </select>
              <button disabled={submitting} className="col-span-2 bg-academic-blue text-white rounded-xl py-2.5 font-medium hover:bg-academic-blue/90 disabled:opacity-50">
                {submitting ? "Adding..." : "Add Subject"}
              </button>
            </form>
          </Card>
          <Card>
            <SectionTitle>All Subjects</SectionTitle>
            {!subjects ? <Loader rows={3} /> : subjects.length === 0 ? <EmptyState label="No subjects yet." /> : (
              <div className="divide-y divide-slate-100">
                {subjects.map((s) => (
                  <div key={s.id} className="py-2.5 text-sm">
                    {editingSubject?.id === s.id ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <input value={editingSubject.name}
                            onChange={(e) => setEditingSubject({ ...editingSubject, name: e.target.value })}
                            className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus-ring" />
                          <input value={editingSubject.subject_code}
                            onChange={(e) => setEditingSubject({ ...editingSubject, subject_code: e.target.value })}
                            className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus-ring" />
                          <select value={editingSubject.type}
                            onChange={(e) => setEditingSubject({ ...editingSubject, type: e.target.value })}
                            className="col-span-2 rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus-ring">
                            {["Theory", "Practical", "Lab", "Skill_Development"].map((t) => <option key={t}>{t}</option>)}
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <Btn variant="success" onClick={saveEditSubject}><Check size={12} /> Save</Btn>
                          <Btn variant="ghost" onClick={() => setEditingSubject(null)}><X size={12} /> Cancel</Btn>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span className="font-medium text-slate-700">{s.name}</span>
                          <span className="text-ink-secondary ml-2">{s.subject_code} · {s.type}</span>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <Btn variant="ghost" onClick={() => setEditingSubject({ ...s })}><Pencil size={12} /> Edit</Btn>
                          <Btn variant="danger" onClick={() => setDeleteTarget({ kind: "subject", id: s.id, label: s.name })}><Trash2 size={12} /></Btn>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

function TabClassContent({ classes, items, loadItems, setToast }) {
  const emptyForm = {
    class_id: "", academic_level: "", description: "", age_criteria: "",
    student_teacher_ratio: "", learning_objectives: "", academic_approach: "",
    facilities: "", activities: "", co_curricular: "", assessment_pattern: "",
    promotion_policy: "", learning_outcomes: "", cover_image_url: "", is_published: false,
  };
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  async function createItem(e) {
    e.preventDefault();
    try {
      await api.post("/admin-portal/academic/class-details/", form);
      setForm(emptyForm);
      loadItems();
      setToast({ message: "Class content created.", tone: "success" });
    } catch (err) { setToast({ message: err?.response?.data?.detail || "Could not create.", tone: "error" }); }
  }

  async function saveEdit() {
    try {
      await api.patch(`/admin-portal/academic/class-details/${editing.id}/`, editing);
      setEditing(null);
      loadItems();
      setToast({ message: "Class content updated.", tone: "success" });
    } catch (err) { setToast({ message: err?.response?.data?.detail || "Could not update.", tone: "error" }); }
  }

  async function deleteItem(id) {
    try {
      await api.delete(`/admin-portal/academic/class-details/${id}/`);
      loadItems();
      setToast({ message: "Deleted.", tone: "success" });
    } catch (err) { setToast({ message: err?.response?.data?.detail || "Could not delete.", tone: "error" }); }
    finally { setDeleteTarget(null); }
  }

  function classLabel(id) {
    const c = classes.find((x) => String(x.id) === String(id));
    return c ? `${c.name}-${c.section}` : id;
  }

  const field = (label, key, opts = {}) => (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-slate-500 uppercase">{label}</label>
      {opts.type === "textarea" ? (
        <textarea placeholder={label} value={(editing || form)[key]}
          onChange={(e) => editing ? setEditing({ ...editing, [key]: e.target.value }) : setForm({ ...form, [key]: e.target.value })}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus-ring outline-none" rows={3} />
      ) : opts.type === "toggle" ? (
        <button type="button" onClick={() => editing ? setEditing({ ...editing, [key]: !editing[key] }) : setForm({ ...form, [key]: !form[key] })}
          className={`px-3 py-2 rounded-xl border text-sm font-semibold text-left transition-all ${(editing || form)[key] ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "bg-slate-50 border-slate-200 text-slate-500"}`}>
          {(editing || form)[key] ? "Published" : "Draft"}
        </button>
      ) : (
        <input placeholder={label} value={(editing || form)[key] || ""}
          onChange={(e) => editing ? setEditing({ ...editing, [key]: e.target.value }) : setForm({ ...form, [key]: e.target.value })}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus-ring outline-none" />
      )}
    </div>
  );

  return (
    <>
      {deleteTarget && (
        <ConfirmDeleteModal label="Delete this class content?" onConfirm={() => deleteItem(deleteTarget)} onCancel={() => setDeleteTarget(null)} />
      )}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <SectionTitle>{editing ? "Edit Class Content" : "Add Class Content"}</SectionTitle>
          <form onSubmit={editing ? (e) => { e.preventDefault(); saveEdit(); } : createItem} className="space-y-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Class (*)</label>
              <select required value={(editing || form).class_id}
                onChange={(e) => editing ? setEditing({ ...editing, class_id: e.target.value }) : setForm({ ...form, class_id: e.target.value })}
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus-ring outline-none">
                <option value="">-- Select Class --</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}-{c.section}</option>)}
              </select>
            </div>
            {field("Academic Level", "academic_level")}
            {field("Description", "description", { type: "textarea" })}
            {field("Age Criteria", "age_criteria")}
            {field("Student-Teacher Ratio", "student_teacher_ratio")}
            {field("Learning Objectives", "learning_objectives", { type: "textarea" })}
            {field("Academic Approach", "academic_approach", { type: "textarea" })}
            {field("Facilities", "facilities", { type: "textarea" })}
            {field("Activities", "activities", { type: "textarea" })}
            {field("Co-Curricular", "co_curricular", { type: "textarea" })}
            {field("Assessment Pattern", "assessment_pattern", { type: "textarea" })}
            {field("Promotion Policy", "promotion_policy", { type: "textarea" })}
            {field("Learning Outcomes", "learning_outcomes", { type: "textarea" })}
            {field("Cover Image URL", "cover_image_url")}
            {field("Published", "is_published", { type: "toggle" })}
            <div className="flex gap-2">
              <button type="submit" className="flex-1 bg-academic-blue text-white rounded-xl py-2.5 font-medium hover:bg-academic-blue/90">
                {editing ? "Save Changes" : "Add Content"}
              </button>
              {editing && <Btn variant="ghost" onClick={() => setEditing(null)}><X size={12} /> Cancel</Btn>}
            </div>
          </form>
        </Card>
        <Card>
          <SectionTitle>All Class Content</SectionTitle>
          {!items ? <Loader rows={3} /> : items.length === 0 ? <EmptyState label="No class content yet." /> : (
            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
              {items.map((item) => (
                <div key={item.id} className="py-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-700">{classLabel(item.class_id)}</p>
                      <p className="text-xs text-ink-secondary truncate">{item.description || "No description"}</p>
                      <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${item.is_published ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                        {item.is_published ? "Published" : "Draft"}
                      </span>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <Btn variant="ghost" onClick={() => setEditing({ ...item })}><Pencil size={12} /> Edit</Btn>
                      <Btn variant="danger" onClick={() => setDeleteTarget(item.id)}><Trash2 size={12} /></Btn>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

function TabSubjectContent({ subjects, items, loadItems, setToast }) {
  const emptyForm = {
    subject_id: "", description: "", learning_outcomes: "", teaching_methodology: "",
    activities: "", projects: "", assessment: "", recommended_books: "",
    cover_image_url: "", is_published: false,
  };
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  async function createItem(e) {
    e.preventDefault();
    try {
      await api.post("/admin-portal/academic/subject-details/", form);
      setForm(emptyForm);
      loadItems();
      setToast({ message: "Subject content created.", tone: "success" });
    } catch (err) { setToast({ message: err?.response?.data?.detail || "Could not create.", tone: "error" }); }
  }

  async function saveEdit() {
    try {
      await api.patch(`/admin-portal/academic/subject-details/${editing.id}/`, editing);
      setEditing(null);
      loadItems();
      setToast({ message: "Subject content updated.", tone: "success" });
    } catch (err) { setToast({ message: err?.response?.data?.detail || "Could not update.", tone: "error" }); }
  }

  async function deleteItem(id) {
    try {
      await api.delete(`/admin-portal/academic/subject-details/${id}/`);
      loadItems();
      setToast({ message: "Deleted.", tone: "success" });
    } catch (err) { setToast({ message: err?.response?.data?.detail || "Could not delete.", tone: "error" }); }
    finally { setDeleteTarget(null); }
  }

  function subjectLabel(id) {
    const s = subjects.find((x) => String(x.id) === String(id));
    return s ? s.name : id;
  }

  const field = (label, key, opts = {}) => (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-slate-500 uppercase">{label}</label>
      {opts.type === "textarea" ? (
        <textarea placeholder={label} value={(editing || form)[key] || ""}
          onChange={(e) => editing ? setEditing({ ...editing, [key]: e.target.value }) : setForm({ ...form, [key]: e.target.value })}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus-ring outline-none" rows={3} />
      ) : opts.type === "toggle" ? (
        <button type="button" onClick={() => editing ? setEditing({ ...editing, [key]: !editing[key] }) : setForm({ ...form, [key]: !form[key] })}
          className={`px-3 py-2 rounded-xl border text-sm font-semibold text-left transition-all ${(editing || form)[key] ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "bg-slate-50 border-slate-200 text-slate-500"}`}>
          {(editing || form)[key] ? "Published" : "Draft"}
        </button>
      ) : (
        <input placeholder={label} value={(editing || form)[key] || ""}
          onChange={(e) => editing ? setEditing({ ...editing, [key]: e.target.value }) : setForm({ ...form, [key]: e.target.value })}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus-ring outline-none" />
      )}
    </div>
  );

  return (
    <>
      {deleteTarget && (
        <ConfirmDeleteModal label="Delete this subject content?" onConfirm={() => deleteItem(deleteTarget)} onCancel={() => setDeleteTarget(null)} />
      )}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <SectionTitle>{editing ? "Edit Subject Content" : "Add Subject Content"}</SectionTitle>
          <form onSubmit={editing ? (e) => { e.preventDefault(); saveEdit(); } : createItem} className="space-y-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Subject (*)</label>
              <select required value={(editing || form).subject_id}
                onChange={(e) => editing ? setEditing({ ...editing, subject_id: e.target.value }) : setForm({ ...form, subject_id: e.target.value })}
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus-ring outline-none">
                <option value="">-- Select Subject --</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.subject_code})</option>)}
              </select>
            </div>
            {field("Description", "description", { type: "textarea" })}
            {field("Learning Outcomes", "learning_outcomes", { type: "textarea" })}
            {field("Teaching Methodology", "teaching_methodology", { type: "textarea" })}
            {field("Activities", "activities", { type: "textarea" })}
            {field("Projects", "projects", { type: "textarea" })}
            {field("Assessment", "assessment", { type: "textarea" })}
            {field("Recommended Books", "recommended_books", { type: "textarea" })}
            {field("Cover Image URL", "cover_image_url")}
            {field("Published", "is_published", { type: "toggle" })}
            <div className="flex gap-2">
              <button type="submit" className="flex-1 bg-academic-blue text-white rounded-xl py-2.5 font-medium hover:bg-academic-blue/90">
                {editing ? "Save Changes" : "Add Content"}
              </button>
              {editing && <Btn variant="ghost" onClick={() => setEditing(null)}><X size={12} /> Cancel</Btn>}
            </div>
          </form>
        </Card>
        <Card>
          <SectionTitle>All Subject Content</SectionTitle>
          {!items ? <Loader rows={3} /> : items.length === 0 ? <EmptyState label="No subject content yet." /> : (
            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
              {items.map((item) => (
                <div key={item.id} className="py-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-700">{subjectLabel(item.subject_id)}</p>
                      <p className="text-xs text-ink-secondary truncate">{item.description || "No description"}</p>
                      <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${item.is_published ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                        {item.is_published ? "Published" : "Draft"}
                      </span>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <Btn variant="ghost" onClick={() => setEditing({ ...item })}><Pencil size={12} /> Edit</Btn>
                      <Btn variant="danger" onClick={() => setDeleteTarget(item.id)}><Trash2 size={12} /></Btn>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

function TabClassSubjectMapping({ classes, subjects, items, loadItems, setToast }) {
  const [form, setForm] = useState({ class_id: "", subject_id: "", is_compulsory: true, sort_order: 0 });
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  async function createItem(e) {
    e.preventDefault();
    try {
      await api.post("/admin-portal/academic/class-subjects/", form);
      setForm({ class_id: "", subject_id: "", is_compulsory: true, sort_order: 0 });
      loadItems();
      setToast({ message: "Mapping created.", tone: "success" });
    } catch (err) { setToast({ message: err?.response?.data?.detail || "Could not create.", tone: "error" }); }
  }

  async function saveEdit() {
    try {
      await api.patch(`/admin-portal/academic/class-subjects/${editing.id}/`, editing);
      setEditing(null);
      loadItems();
      setToast({ message: "Mapping updated.", tone: "success" });
    } catch (err) { setToast({ message: err?.response?.data?.detail || "Could not update.", tone: "error" }); }
  }

  async function deleteItem(id) {
    try {
      await api.delete(`/admin-portal/academic/class-subjects/${id}/`);
      loadItems();
      setToast({ message: "Deleted.", tone: "success" });
    } catch (err) { setToast({ message: err?.response?.data?.detail || "Could not delete.", tone: "error" }); }
    finally { setDeleteTarget(null); }
  }

  function classLabel(id) {
    const c = classes.find((x) => String(x.id) === String(id));
    return c ? `${c.name}-${c.section}` : id;
  }

  function subjectLabel(id) {
    const s = subjects.find((x) => String(x.id) === String(id));
    return s ? s.name : id;
  }

  const current = editing || form;

  return (
    <>
      {deleteTarget && (
        <ConfirmDeleteModal label="Delete this class-subject mapping?" onConfirm={() => deleteItem(deleteTarget)} onCancel={() => setDeleteTarget(null)} />
      )}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <SectionTitle>{editing ? "Edit Mapping" : "Add Class-Subject Mapping"}</SectionTitle>
          <form onSubmit={editing ? (e) => { e.preventDefault(); saveEdit(); } : createItem} className="space-y-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Class (*)</label>
              <select required value={current.class_id}
                onChange={(e) => editing ? setEditing({ ...editing, class_id: e.target.value }) : setForm({ ...form, class_id: e.target.value })}
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus-ring outline-none">
                <option value="">-- Select Class --</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}-{c.section}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Subject (*)</label>
              <select required value={current.subject_id}
                onChange={(e) => editing ? setEditing({ ...editing, subject_id: e.target.value }) : setForm({ ...form, subject_id: e.target.value })}
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus-ring outline-none">
                <option value="">-- Select Subject --</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.subject_code})</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Sort Order</label>
              <input type="number" value={current.sort_order || 0}
                onChange={(e) => editing ? setEditing({ ...editing, sort_order: parseInt(e.target.value) || 0 }) : setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus-ring outline-none" />
            </div>
            <button type="button" onClick={() => editing ? setEditing({ ...editing, is_compulsory: !editing.is_compulsory }) : setForm({ ...form, is_compulsory: !form.is_compulsory })}
              className={`px-3 py-2 rounded-xl border text-sm font-semibold text-left transition-all ${current.is_compulsory ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "bg-slate-50 border-slate-200 text-slate-500"}`}>
              {current.is_compulsory ? "Compulsory" : "Elective"}
            </button>
            <div className="flex gap-2">
              <button type="submit" className="flex-1 bg-academic-blue text-white rounded-xl py-2.5 font-medium hover:bg-academic-blue/90">
                {editing ? "Save Changes" : "Add Mapping"}
              </button>
              {editing && <Btn variant="ghost" onClick={() => setEditing(null)}><X size={12} /> Cancel</Btn>}
            </div>
          </form>
        </Card>
        <Card>
          <SectionTitle>All Mappings</SectionTitle>
          {!items ? <Loader rows={3} /> : items.length === 0 ? <EmptyState label="No class-subject mappings yet." /> : (
            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
              {items.map((item) => (
                <div key={item.id} className="py-3 text-sm flex items-center justify-between gap-2">
                  <div>
                    <span className="font-semibold text-slate-700">{classLabel(item.class_id)}</span>
                    <span className="text-ink-secondary mx-2">→</span>
                    <span className="font-semibold text-slate-700">{subjectLabel(item.subject_id)}</span>
                    <span className={`ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${item.is_compulsory ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                      {item.is_compulsory ? "Compulsory" : "Elective"}
                    </span>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <Btn variant="ghost" onClick={() => setEditing({ ...item })}><Pencil size={12} /> Edit</Btn>
                    <Btn variant="danger" onClick={() => setDeleteTarget(item.id)}><Trash2 size={12} /></Btn>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

function TabCurriculum({ classes, items, loadItems, setToast }) {
  const emptyForm = {
    class_id: "", curriculum_name: "CBSE", syllabus_description: "", learning_outcomes: "",
    semester_info: "", topics_covered: "", brochure_url: "", is_published: false,
  };
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  async function createItem(e) {
    e.preventDefault();
    try {
      await api.post("/admin-portal/academic/curriculum/", form);
      setForm(emptyForm);
      loadItems();
      setToast({ message: "Curriculum created.", tone: "success" });
    } catch (err) { setToast({ message: err?.response?.data?.detail || "Could not create.", tone: "error" }); }
  }

  async function saveEdit() {
    try {
      await api.patch(`/admin-portal/academic/curriculum/${editing.id}/`, editing);
      setEditing(null);
      loadItems();
      setToast({ message: "Curriculum updated.", tone: "success" });
    } catch (err) { setToast({ message: err?.response?.data?.detail || "Could not update.", tone: "error" }); }
  }

  async function deleteItem(id) {
    try {
      await api.delete(`/admin-portal/academic/curriculum/${id}/`);
      loadItems();
      setToast({ message: "Deleted.", tone: "success" });
    } catch (err) { setToast({ message: err?.response?.data?.detail || "Could not delete.", tone: "error" }); }
    finally { setDeleteTarget(null); }
  }

  function classLabel(id) {
    const c = classes.find((x) => String(x.id) === String(id));
    return c ? `${c.name}-${c.section}` : id;
  }

  const current = editing || form;

  return (
    <>
      {deleteTarget && (
        <ConfirmDeleteModal label="Delete this curriculum entry?" onConfirm={() => deleteItem(deleteTarget)} onCancel={() => setDeleteTarget(null)} />
      )}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <SectionTitle>{editing ? "Edit Curriculum" : "Add Curriculum"}</SectionTitle>
          <form onSubmit={editing ? (e) => { e.preventDefault(); saveEdit(); } : createItem} className="space-y-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Class (*)</label>
              <select required value={current.class_id}
                onChange={(e) => editing ? setEditing({ ...editing, class_id: e.target.value }) : setForm({ ...form, class_id: e.target.value })}
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus-ring outline-none">
                <option value="">-- Select Class --</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}-{c.section}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Curriculum (*)</label>
              <select required value={current.curriculum_name}
                onChange={(e) => editing ? setEditing({ ...editing, curriculum_name: e.target.value }) : setForm({ ...form, curriculum_name: e.target.value })}
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus-ring outline-none">
                <option>CBSE</option><option>Cambridge</option><option>IB</option><option>State</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Syllabus Description</label>
              <textarea placeholder="Syllabus Description" value={current.syllabus_description || ""}
                onChange={(e) => editing ? setEditing({ ...editing, syllabus_description: e.target.value }) : setForm({ ...form, syllabus_description: e.target.value })}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus-ring outline-none" rows={3} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Learning Outcomes</label>
              <textarea placeholder="Learning Outcomes" value={current.learning_outcomes || ""}
                onChange={(e) => editing ? setEditing({ ...editing, learning_outcomes: e.target.value }) : setForm({ ...form, learning_outcomes: e.target.value })}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus-ring outline-none" rows={3} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Semester Info</label>
              <input placeholder="Semester Info" value={current.semester_info || ""}
                onChange={(e) => editing ? setEditing({ ...editing, semester_info: e.target.value }) : setForm({ ...form, semester_info: e.target.value })}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus-ring outline-none" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Topics Covered</label>
              <textarea placeholder="Topics Covered" value={current.topics_covered || ""}
                onChange={(e) => editing ? setEditing({ ...editing, topics_covered: e.target.value }) : setForm({ ...form, topics_covered: e.target.value })}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus-ring outline-none" rows={3} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Brochure URL</label>
              <input placeholder="Brochure URL" value={current.brochure_url || ""}
                onChange={(e) => editing ? setEditing({ ...editing, brochure_url: e.target.value }) : setForm({ ...form, brochure_url: e.target.value })}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus-ring outline-none" />
            </div>
            <button type="button" onClick={() => editing ? setEditing({ ...editing, is_published: !editing.is_published }) : setForm({ ...form, is_published: !form.is_published })}
              className={`px-3 py-2 rounded-xl border text-sm font-semibold text-left transition-all ${current.is_published ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "bg-slate-50 border-slate-200 text-slate-500"}`}>
              {current.is_published ? "Published" : "Draft"}
            </button>
            <div className="flex gap-2">
              <button type="submit" className="flex-1 bg-academic-blue text-white rounded-xl py-2.5 font-medium hover:bg-academic-blue/90">
                {editing ? "Save Changes" : "Add Curriculum"}
              </button>
              {editing && <Btn variant="ghost" onClick={() => setEditing(null)}><X size={12} /> Cancel</Btn>}
            </div>
          </form>
        </Card>
        <Card>
          <SectionTitle>All Curriculum</SectionTitle>
          {!items ? <Loader rows={3} /> : items.length === 0 ? <EmptyState label="No curriculum entries yet." /> : (
            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
              {items.map((item) => (
                <div key={item.id} className="py-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-700">{classLabel(item.class_id)} — {item.curriculum_name}</p>
                      <p className="text-xs text-ink-secondary truncate">{item.syllabus_description || "No description"}</p>
                      <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${item.is_published ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                        {item.is_published ? "Published" : "Draft"}
                      </span>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <Btn variant="ghost" onClick={() => setEditing({ ...item })}><Pencil size={12} /> Edit</Btn>
                      <Btn variant="danger" onClick={() => setDeleteTarget(item.id)}><Trash2 size={12} /></Btn>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

function TabFacultyProfiles({ users, items, loadItems, setToast }) {
  const emptyForm = {
    user_id: "", designation: "", qualification_detail: "", experience_years: "",
    specializations: "", achievements: "", research: "", bio: "", photo_url: "", is_published: false,
  };
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  async function createItem(e) {
    e.preventDefault();
    try {
      await api.post("/admin-portal/academic/faculty/", form);
      setForm(emptyForm);
      loadItems();
      setToast({ message: "Faculty profile created.", tone: "success" });
    } catch (err) { setToast({ message: err?.response?.data?.detail || "Could not create.", tone: "error" }); }
  }

  async function saveEdit() {
    try {
      await api.patch(`/admin-portal/academic/faculty/${editing.id}/`, editing);
      setEditing(null);
      loadItems();
      setToast({ message: "Faculty profile updated.", tone: "success" });
    } catch (err) { setToast({ message: err?.response?.data?.detail || "Could not update.", tone: "error" }); }
  }

  async function deleteItem(id) {
    try {
      await api.delete(`/admin-portal/academic/faculty/${id}/`);
      loadItems();
      setToast({ message: "Deleted.", tone: "success" });
    } catch (err) { setToast({ message: err?.response?.data?.detail || "Could not delete.", tone: "error" }); }
    finally { setDeleteTarget(null); }
  }

  function userLabel(id) {
    const u = users.find((x) => String(x.id) === String(id));
    return u ? `${u.name || u.first_name + " " + u.last_name} (${u.email})` : id;
  }

  const current = editing || form;

  return (
    <>
      {deleteTarget && (
        <ConfirmDeleteModal label="Delete this faculty profile?" onConfirm={() => deleteItem(deleteTarget)} onCancel={() => setDeleteTarget(null)} />
      )}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <SectionTitle>{editing ? "Edit Faculty Profile" : "Add Faculty Profile"}</SectionTitle>
          <form onSubmit={editing ? (e) => { e.preventDefault(); saveEdit(); } : createItem} className="space-y-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">User (*)</label>
              <select required value={current.user_id}
                onChange={(e) => editing ? setEditing({ ...editing, user_id: e.target.value }) : setForm({ ...form, user_id: e.target.value })}
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus-ring outline-none">
                <option value="">-- Select User --</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name || `${u.first_name} ${u.last_name}`} ({u.email})</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Designation (*)</label>
              <input required placeholder="Designation" value={current.designation || ""}
                onChange={(e) => editing ? setEditing({ ...editing, designation: e.target.value }) : setForm({ ...form, designation: e.target.value })}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus-ring outline-none" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Qualification</label>
              <input placeholder="Qualification" value={current.qualification_detail || ""}
                onChange={(e) => editing ? setEditing({ ...editing, qualification_detail: e.target.value }) : setForm({ ...form, qualification_detail: e.target.value })}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus-ring outline-none" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Experience (Years)</label>
              <input type="number" placeholder="Years" value={current.experience_years || ""}
                onChange={(e) => editing ? setEditing({ ...editing, experience_years: e.target.value }) : setForm({ ...form, experience_years: e.target.value })}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus-ring outline-none" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Specializations (comma-separated)</label>
              <input placeholder="e.g. Mathematics, Physics" value={current.specializations || ""}
                onChange={(e) => editing ? setEditing({ ...editing, specializations: e.target.value }) : setForm({ ...form, specializations: e.target.value })}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus-ring outline-none" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Achievements</label>
              <textarea placeholder="Achievements" value={current.achievements || ""}
                onChange={(e) => editing ? setEditing({ ...editing, achievements: e.target.value }) : setForm({ ...form, achievements: e.target.value })}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus-ring outline-none" rows={3} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Research</label>
              <textarea placeholder="Research" value={current.research || ""}
                onChange={(e) => editing ? setEditing({ ...editing, research: e.target.value }) : setForm({ ...form, research: e.target.value })}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus-ring outline-none" rows={3} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Bio</label>
              <textarea placeholder="Bio" value={current.bio || ""}
                onChange={(e) => editing ? setEditing({ ...editing, bio: e.target.value }) : setForm({ ...form, bio: e.target.value })}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus-ring outline-none" rows={3} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Photo URL</label>
              <input placeholder="Photo URL" value={current.photo_url || ""}
                onChange={(e) => editing ? setEditing({ ...editing, photo_url: e.target.value }) : setForm({ ...form, photo_url: e.target.value })}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus-ring outline-none" />
            </div>
            <button type="button" onClick={() => editing ? setEditing({ ...editing, is_published: !editing.is_published }) : setForm({ ...form, is_published: !form.is_published })}
              className={`px-3 py-2 rounded-xl border text-sm font-semibold text-left transition-all ${current.is_published ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "bg-slate-50 border-slate-200 text-slate-500"}`}>
              {current.is_published ? "Published" : "Draft"}
            </button>
            <div className="flex gap-2">
              <button type="submit" className="flex-1 bg-academic-blue text-white rounded-xl py-2.5 font-medium hover:bg-academic-blue/90">
                {editing ? "Save Changes" : "Add Profile"}
              </button>
              {editing && <Btn variant="ghost" onClick={() => setEditing(null)}><X size={12} /> Cancel</Btn>}
            </div>
          </form>
        </Card>
        <Card>
          <SectionTitle>All Faculty Profiles</SectionTitle>
          {!items ? <Loader rows={3} /> : items.length === 0 ? <EmptyState label="No faculty profiles yet." /> : (
            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
              {items.map((item) => (
                <div key={item.id} className="py-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-700">{userLabel(item.user_id)}</p>
                      <p className="text-xs text-ink-secondary">{item.designation} · {item.experience_years || 0} yrs exp</p>
                      <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${item.is_published ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                        {item.is_published ? "Published" : "Draft"}
                      </span>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <Btn variant="ghost" onClick={() => setEditing({ ...item })}><Pencil size={12} /> Edit</Btn>
                      <Btn variant="danger" onClick={() => setDeleteTarget(item.id)}><Trash2 size={12} /></Btn>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

function TabFacultyAssignments({ facultyProfiles, classes, subjects, items, loadItems, setToast }) {
  const [form, setForm] = useState({ faculty_id: "", class_id: "", subject_id: "" });
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  async function createItem(e) {
    e.preventDefault();
    try {
      await api.post("/admin-portal/academic/faculty-subjects/", form);
      setForm({ faculty_id: "", class_id: "", subject_id: "" });
      loadItems();
      setToast({ message: "Assignment created.", tone: "success" });
    } catch (err) { setToast({ message: err?.response?.data?.detail || "Could not create.", tone: "error" }); }
  }

  async function saveEdit() {
    try {
      await api.patch(`/admin-portal/academic/faculty-subjects/${editing.id}/`, editing);
      setEditing(null);
      loadItems();
      setToast({ message: "Assignment updated.", tone: "success" });
    } catch (err) { setToast({ message: err?.response?.data?.detail || "Could not update.", tone: "error" }); }
  }

  async function deleteItem(id) {
    try {
      await api.delete(`/admin-portal/academic/faculty-subjects/${id}/`);
      loadItems();
      setToast({ message: "Deleted.", tone: "success" });
    } catch (err) { setToast({ message: err?.response?.data?.detail || "Could not delete.", tone: "error" }); }
    finally { setDeleteTarget(null); }
  }

  function facultyLabel(id) {
    const f = facultyProfiles.find((x) => String(x.id) === String(id));
    if (!f) return id;
    return `Faculty #${f.id}`;
  }

  function classLabel(id) {
    const c = classes.find((x) => String(x.id) === String(id));
    return c ? `${c.name}-${c.section}` : id;
  }

  function subjectLabel(id) {
    const s = subjects.find((x) => String(x.id) === String(id));
    return s ? s.name : id;
  }

  const current = editing || form;

  return (
    <>
      {deleteTarget && (
        <ConfirmDeleteModal label="Delete this faculty assignment?" onConfirm={() => deleteItem(deleteTarget)} onCancel={() => setDeleteTarget(null)} />
      )}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <SectionTitle>{editing ? "Edit Assignment" : "Add Faculty Assignment"}</SectionTitle>
          <form onSubmit={editing ? (e) => { e.preventDefault(); saveEdit(); } : createItem} className="space-y-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Faculty Profile (*)</label>
              <select required value={current.faculty_id}
                onChange={(e) => editing ? setEditing({ ...editing, faculty_id: e.target.value }) : setForm({ ...form, faculty_id: e.target.value })}
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus-ring outline-none">
                <option value="">-- Select Faculty --</option>
                {facultyProfiles.map((f) => <option key={f.id} value={f.id}>Faculty #{f.id} — {f.designation}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Class (*)</label>
              <select required value={current.class_id}
                onChange={(e) => editing ? setEditing({ ...editing, class_id: e.target.value }) : setForm({ ...form, class_id: e.target.value })}
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus-ring outline-none">
                <option value="">-- Select Class --</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}-{c.section}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Subject (*)</label>
              <select required value={current.subject_id}
                onChange={(e) => editing ? setEditing({ ...editing, subject_id: e.target.value }) : setForm({ ...form, subject_id: e.target.value })}
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus-ring outline-none">
                <option value="">-- Select Subject --</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.subject_code})</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="flex-1 bg-academic-blue text-white rounded-xl py-2.5 font-medium hover:bg-academic-blue/90">
                {editing ? "Save Changes" : "Add Assignment"}
              </button>
              {editing && <Btn variant="ghost" onClick={() => setEditing(null)}><X size={12} /> Cancel</Btn>}
            </div>
          </form>
        </Card>
        <Card>
          <SectionTitle>All Faculty Assignments</SectionTitle>
          {!items ? <Loader rows={3} /> : items.length === 0 ? <EmptyState label="No faculty assignments yet." /> : (
            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
              {items.map((item) => (
                <div key={item.id} className="py-3 text-sm flex items-center justify-between gap-2">
                  <div>
                    <span className="font-semibold text-slate-700">{facultyLabel(item.faculty_id)}</span>
                    <span className="text-ink-secondary mx-2">→</span>
                    <span className="text-slate-600">{classLabel(item.class_id)} · {subjectLabel(item.subject_id)}</span>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <Btn variant="ghost" onClick={() => setEditing({ ...item })}><Pencil size={12} /> Edit</Btn>
                    <Btn variant="danger" onClick={() => setDeleteTarget(item.id)}><Trash2 size={12} /></Btn>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

function TabDownloads({ classes, items, loadItems, setToast }) {
  const emptyForm = {
    title: "", description: "", file_url: "", file_type: "PDF", category: "Curriculum",
    target_class_id: "", target_audience: "", is_published: false,
  };
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  async function createItem(e) {
    e.preventDefault();
    try {
      await api.post("/admin-portal/academic/downloads/", form);
      setForm(emptyForm);
      loadItems();
      setToast({ message: "Download created.", tone: "success" });
    } catch (err) { setToast({ message: err?.response?.data?.detail || "Could not create.", tone: "error" }); }
  }

  async function saveEdit() {
    try {
      await api.patch(`/admin-portal/academic/downloads/${editing.id}/`, editing);
      setEditing(null);
      loadItems();
      setToast({ message: "Download updated.", tone: "success" });
    } catch (err) { setToast({ message: err?.response?.data?.detail || "Could not update.", tone: "error" }); }
  }

  async function deleteItem(id) {
    try {
      await api.delete(`/admin-portal/academic/downloads/${id}/`);
      loadItems();
      setToast({ message: "Deleted.", tone: "success" });
    } catch (err) { setToast({ message: err?.response?.data?.detail || "Could not delete.", tone: "error" }); }
    finally { setDeleteTarget(null); }
  }

  function classLabel(id) {
    if (!id) return "All";
    const c = classes.find((x) => String(x.id) === String(id));
    return c ? `${c.name}-${c.section}` : id;
  }

  const current = editing || form;

  return (
    <>
      {deleteTarget && (
        <ConfirmDeleteModal label="Delete this download?" onConfirm={() => deleteItem(deleteTarget)} onCancel={() => setDeleteTarget(null)} />
      )}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <SectionTitle>{editing ? "Edit Download" : "Add Academic Download"}</SectionTitle>
          <form onSubmit={editing ? (e) => { e.preventDefault(); saveEdit(); } : createItem} className="space-y-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Title (*)</label>
              <input required placeholder="Title" value={current.title || ""}
                onChange={(e) => editing ? setEditing({ ...editing, title: e.target.value }) : setForm({ ...form, title: e.target.value })}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus-ring outline-none" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Description</label>
              <textarea placeholder="Description" value={current.description || ""}
                onChange={(e) => editing ? setEditing({ ...editing, description: e.target.value }) : setForm({ ...form, description: e.target.value })}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus-ring outline-none" rows={3} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">File URL (*)</label>
              <input required placeholder="File URL" value={current.file_url || ""}
                onChange={(e) => editing ? setEditing({ ...editing, file_url: e.target.value }) : setForm({ ...form, file_url: e.target.value })}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus-ring outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">File Type (*)</label>
                <select value={current.file_type || "PDF"}
                  onChange={(e) => editing ? setEditing({ ...editing, file_type: e.target.value }) : setForm({ ...form, file_type: e.target.value })}
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus-ring outline-none">
                  <option>PDF</option><option>DOC</option><option>PPT</option><option>TXT</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">Category (*)</label>
                <select value={current.category || "Curriculum"}
                  onChange={(e) => editing ? setEditing({ ...editing, category: e.target.value }) : setForm({ ...form, category: e.target.value })}
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus-ring outline-none">
                  <option>Curriculum</option><option>Syllabus</option><option>Prospectus</option>
                  <option>FeeStructure</option><option>Calendar</option><option>Handbook</option><option>Other</option>
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Target Class (Optional)</label>
              <select value={current.target_class_id || ""}
                onChange={(e) => editing ? setEditing({ ...editing, target_class_id: e.target.value }) : setForm({ ...form, target_class_id: e.target.value })}
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus-ring outline-none">
                <option value="">All Classes</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}-{c.section}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Target Audience</label>
              <input placeholder="e.g. Students, Parents, Teachers" value={current.target_audience || ""}
                onChange={(e) => editing ? setEditing({ ...editing, target_audience: e.target.value }) : setForm({ ...form, target_audience: e.target.value })}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus-ring outline-none" />
            </div>
            <button type="button" onClick={() => editing ? setEditing({ ...editing, is_published: !editing.is_published }) : setForm({ ...form, is_published: !form.is_published })}
              className={`px-3 py-2 rounded-xl border text-sm font-semibold text-left transition-all ${current.is_published ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "bg-slate-50 border-slate-200 text-slate-500"}`}>
              {current.is_published ? "Published" : "Draft"}
            </button>
            <div className="flex gap-2">
              <button type="submit" className="flex-1 bg-academic-blue text-white rounded-xl py-2.5 font-medium hover:bg-academic-blue/90">
                {editing ? "Save Changes" : "Add Download"}
              </button>
              {editing && <Btn variant="ghost" onClick={() => setEditing(null)}><X size={12} /> Cancel</Btn>}
            </div>
          </form>
        </Card>
        <Card>
          <SectionTitle>All Downloads</SectionTitle>
          {!items ? <Loader rows={3} /> : items.length === 0 ? <EmptyState label="No downloads yet." /> : (
            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
              {items.map((item) => (
                <div key={item.id} className="py-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-700">{item.title}</p>
                      <p className="text-xs text-ink-secondary">
                        {item.file_type} · {item.category} · {classLabel(item.target_class_id)}
                      </p>
                      <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${item.is_published ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                        {item.is_published ? "Published" : "Draft"}
                      </span>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <Btn variant="ghost" onClick={() => setEditing({ ...item })}><Pencil size={12} /> Edit</Btn>
                      <Btn variant="danger" onClick={() => setDeleteTarget(item.id)}><Trash2 size={12} /></Btn>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

function TabAcademicLevels({ items, loadItems, setToast }) {
  const emptyForm = { name: "", description: "", icon_name: "", sort_order: 0, is_published: false };
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  async function createItem(e) {
    e.preventDefault();
    try {
      await api.post("/admin-portal/academic/levels/", form);
      setForm(emptyForm);
      loadItems();
      setToast({ message: "Academic level created.", tone: "success" });
    } catch (err) { setToast({ message: err?.response?.data?.detail || "Could not create.", tone: "error" }); }
  }

  async function saveEdit() {
    try {
      await api.patch(`/admin-portal/academic/levels/${editing.id}/`, editing);
      setEditing(null);
      loadItems();
      setToast({ message: "Academic level updated.", tone: "success" });
    } catch (err) { setToast({ message: err?.response?.data?.detail || "Could not update.", tone: "error" }); }
  }

  async function deleteItem(id) {
    try {
      await api.delete(`/admin-portal/academic/levels/${id}/`);
      loadItems();
      setToast({ message: "Deleted.", tone: "success" });
    } catch (err) { setToast({ message: err?.response?.data?.detail || "Could not delete.", tone: "error" }); }
    finally { setDeleteTarget(null); }
  }

  const current = editing || form;

  return (
    <>
      {deleteTarget && (
        <ConfirmDeleteModal label="Delete this academic level?" onConfirm={() => deleteItem(deleteTarget)} onCancel={() => setDeleteTarget(null)} />
      )}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <SectionTitle>{editing ? "Edit Academic Level" : "Add Academic Level"}</SectionTitle>
          <form onSubmit={editing ? (e) => { e.preventDefault(); saveEdit(); } : createItem} className="space-y-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Name (*)</label>
              <input required placeholder="Name" value={current.name || ""}
                onChange={(e) => editing ? setEditing({ ...editing, name: e.target.value }) : setForm({ ...form, name: e.target.value })}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus-ring outline-none" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Description</label>
              <textarea placeholder="Description" value={current.description || ""}
                onChange={(e) => editing ? setEditing({ ...editing, description: e.target.value }) : setForm({ ...form, description: e.target.value })}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus-ring outline-none" rows={3} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Icon Name</label>
              <input placeholder="e.g. GraduationCap" value={current.icon_name || ""}
                onChange={(e) => editing ? setEditing({ ...editing, icon_name: e.target.value }) : setForm({ ...form, icon_name: e.target.value })}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus-ring outline-none" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Sort Order</label>
              <input type="number" value={current.sort_order || 0}
                onChange={(e) => editing ? setEditing({ ...editing, sort_order: parseInt(e.target.value) || 0 }) : setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus-ring outline-none" />
            </div>
            <button type="button" onClick={() => editing ? setEditing({ ...editing, is_published: !editing.is_published }) : setForm({ ...form, is_published: !form.is_published })}
              className={`px-3 py-2 rounded-xl border text-sm font-semibold text-left transition-all ${current.is_published ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "bg-slate-50 border-slate-200 text-slate-500"}`}>
              {current.is_published ? "Published" : "Draft"}
            </button>
            <div className="flex gap-2">
              <button type="submit" className="flex-1 bg-academic-blue text-white rounded-xl py-2.5 font-medium hover:bg-academic-blue/90">
                {editing ? "Save Changes" : "Add Level"}
              </button>
              {editing && <Btn variant="ghost" onClick={() => setEditing(null)}><X size={12} /> Cancel</Btn>}
            </div>
          </form>
        </Card>
        <Card>
          <SectionTitle>All Academic Levels</SectionTitle>
          {!items ? <Loader rows={3} /> : items.length === 0 ? <EmptyState label="No academic levels yet." /> : (
            <div className="divide-y divide-slate-100">
              {items.map((item) => (
                <div key={item.id} className="py-3 text-sm flex items-center justify-between gap-2">
                  <div>
                    <span className="font-semibold text-slate-700">{item.name}</span>
                    <span className="text-ink-secondary ml-2">Order: {item.sort_order}</span>
                    <span className={`ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${item.is_published ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {item.is_published ? "Published" : "Draft"}
                    </span>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <Btn variant="ghost" onClick={() => setEditing({ ...item })}><Pencil size={12} /> Edit</Btn>
                    <Btn variant="danger" onClick={() => setDeleteTarget(item.id)}><Trash2 size={12} /></Btn>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

function TabAcademicDashboard({ setToast }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/admin-portal/academic/dashboard/")
      .then(({ data }) => setData(data))
      .catch(() => {
        setToast({ message: "Could not load dashboard stats.", tone: "error" });
        setData(null);
      });
  }, []);

  if (!data) return <Loader rows={4} />;

  const stats = [
    { label: "Total Classes", value: data.total_classes ?? 0, accent: "bg-blue-100 text-blue-700" },
    { label: "Total Subjects", value: data.total_subjects ?? 0, accent: "bg-emerald-100 text-emerald-700" },
    { label: "Class Details", value: data.total_class_details ?? 0, accent: "bg-violet-100 text-violet-700" },
    { label: "Subject Details", value: data.total_subject_details ?? 0, accent: "bg-amber-100 text-amber-700" },
    { label: "Faculty Profiles", value: data.total_faculty_profiles ?? 0, accent: "bg-rose-100 text-rose-700" },
    { label: "Faculty Assignments", value: data.total_faculty_assignments ?? 0, accent: "bg-cyan-100 text-cyan-700" },
    { label: "Curriculum Entries", value: data.total_curriculum ?? 0, accent: "bg-indigo-100 text-indigo-700" },
    { label: "Class-Subject Mappings", value: data.total_class_subject_mappings ?? 0, accent: "bg-teal-100 text-teal-700" },
    { label: "Academic Downloads", value: data.total_downloads ?? 0, accent: "bg-orange-100 text-orange-700" },
    { label: "Academic Levels", value: data.total_levels ?? 0, accent: "bg-pink-100 text-pink-700" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-card shadow-card p-5">
            <p className="text-ink-secondary text-xs font-sub font-medium uppercase tracking-wide">{s.label}</p>
            <p className="font-numeric text-2xl font-bold text-ink-primary leading-tight mt-1">{s.value}</p>
          </div>
        ))}
      </div>
      {data.recent_items && data.recent_items.length > 0 && (
        <Card>
          <SectionTitle>Recent Academic Items</SectionTitle>
          <div className="divide-y divide-slate-100">
            {data.recent_items.map((item, idx) => (
              <div key={idx} className="py-3 text-sm">
                <p className="font-semibold text-slate-700">{item.title || item.name || `Item #${item.id}`}</p>
                <p className="text-xs text-ink-secondary">{item.type || "Record"} · {item.date || ""}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

export default function Classes() {
  const [activeTab, setActiveTab] = useState("classes-subjects");
  const [classes, setClasses] = useState(null);
  const [subjects, setSubjects] = useState(null);
  const [users, setUsers] = useState([]);
  const [facultyProfiles, setFacultyProfiles] = useState([]);
  const [classDetails, setClassDetails] = useState(null);
  const [subjectDetails, setSubjectDetails] = useState(null);
  const [classSubjectMappings, setClassSubjectMappings] = useState(null);
  const [curriculum, setCurriculum] = useState(null);
  const [facultyAssignments, setFacultyAssignments] = useState(null);
  const [downloads, setDownloads] = useState(null);
  const [academicLevels, setAcademicLevels] = useState(null);
  const [toast, setToast] = useState(null);

  function loadClasses() { api.get("/admin-portal/classes/").then(({ data }) => setClasses(data)).catch(() => setClasses([])); }
  function loadSubjects() { api.get("/admin-portal/subjects/").then(({ data }) => setSubjects(data)).catch(() => setSubjects([])); }
  function loadUsers() { api.get("/admin-portal/users/").then(({ data }) => setUsers(data)).catch(() => setUsers([])); }
  function loadFacultyProfiles() { api.get("/admin-portal/academic/faculty/").then(({ data }) => setFacultyProfiles(data)).catch(() => setFacultyProfiles([])); }
  function loadClassDetails() { api.get("/admin-portal/academic/class-details/").then(({ data }) => setClassDetails(data)).catch(() => setClassDetails([])); }
  function loadSubjectDetails() { api.get("/admin-portal/academic/subject-details/").then(({ data }) => setSubjectDetails(data)).catch(() => setSubjectDetails([])); }
  function loadClassSubjectMappings() { api.get("/admin-portal/academic/class-subjects/").then(({ data }) => setClassSubjectMappings(data)).catch(() => setClassSubjectMappings([])); }
  function loadCurriculum() { api.get("/admin-portal/academic/curriculum/").then(({ data }) => setCurriculum(data)).catch(() => setCurriculum([])); }
  function loadFacultyAssignments() { api.get("/admin-portal/academic/faculty-subjects/").then(({ data }) => setFacultyAssignments(data)).catch(() => setFacultyAssignments([])); }
  function loadDownloads() { api.get("/admin-portal/academic/downloads/").then(({ data }) => setDownloads(data)).catch(() => setDownloads([])); }
  function loadAcademicLevels() { api.get("/admin-portal/academic/levels/").then(({ data }) => setAcademicLevels(data)).catch(() => setAcademicLevels([])); }

  useEffect(() => {
    loadClasses();
    loadSubjects();
    loadUsers();
    loadFacultyProfiles();
  }, []);

  useEffect(() => {
    if (activeTab === "class-content") loadClassDetails();
    if (activeTab === "subject-content") loadSubjectDetails();
    if (activeTab === "class-subject-map") loadClassSubjectMappings();
    if (activeTab === "curriculum") loadCurriculum();
    if (activeTab === "faculty-assignments") { loadFacultyProfiles(); loadFacultyAssignments(); }
    if (activeTab === "downloads") loadDownloads();
    if (activeTab === "academic-levels") loadAcademicLevels();
  }, [activeTab]);

  const TABS = [
    { key: "classes-subjects", icon: BookOpen, label: "Classes & Subjects" },
    { key: "class-content", icon: FileText, label: "Class Content" },
    { key: "subject-content", icon: FileText, label: "Subject Content" },
    { key: "class-subject-map", icon: Link2, label: "Class-Subject Map" },
    { key: "curriculum", icon: BookMarked, label: "Curriculum" },
    { key: "faculty-profiles", icon: GraduationCap, label: "Faculty Profiles" },
    { key: "faculty-assignments", icon: UserCheck, label: "Faculty Assignments" },
    { key: "downloads", icon: Download, label: "Downloads" },
    { key: "academic-levels", icon: Layers, label: "Academic Levels" },
    { key: "dashboard", icon: BarChart3, label: "Dashboard" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex border-b border-slate-200 overflow-x-auto">
        {TABS.map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
              activeTab === key
                ? "border-academic-blue text-academic-blue"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {activeTab === "classes-subjects" && (
        <TabClassesSubjects
          classes={classes}
          subjects={subjects}
          loadClasses={loadClasses}
          loadSubjects={loadSubjects}
          setToast={setToast}
        />
      )}

      {activeTab === "class-content" && (
        <TabClassContent
          classes={classes || []}
          items={classDetails}
          loadItems={loadClassDetails}
          setToast={setToast}
        />
      )}

      {activeTab === "subject-content" && (
        <TabSubjectContent
          subjects={subjects || []}
          items={subjectDetails}
          loadItems={loadSubjectDetails}
          setToast={setToast}
        />
      )}

      {activeTab === "class-subject-map" && (
        <TabClassSubjectMapping
          classes={classes || []}
          subjects={subjects || []}
          items={classSubjectMappings}
          loadItems={loadClassSubjectMappings}
          setToast={setToast}
        />
      )}

      {activeTab === "curriculum" && (
        <TabCurriculum
          classes={classes || []}
          items={curriculum}
          loadItems={loadCurriculum}
          setToast={setToast}
        />
      )}

      {activeTab === "faculty-profiles" && (
        <TabFacultyProfiles
          users={users}
          items={facultyProfiles}
          loadItems={loadFacultyProfiles}
          setToast={setToast}
        />
      )}

      {activeTab === "faculty-assignments" && (
        <TabFacultyAssignments
          facultyProfiles={facultyProfiles}
          classes={classes || []}
          subjects={subjects || []}
          items={facultyAssignments}
          loadItems={loadFacultyAssignments}
          setToast={setToast}
        />
      )}

      {activeTab === "downloads" && (
        <TabDownloads
          classes={classes || []}
          items={downloads}
          loadItems={loadDownloads}
          setToast={setToast}
        />
      )}

      {activeTab === "academic-levels" && (
        <TabAcademicLevels
          items={academicLevels}
          loadItems={loadAcademicLevels}
          setToast={setToast}
        />
      )}

      {activeTab === "dashboard" && (
        <TabAcademicDashboard setToast={setToast} />
      )}

      <Toast message={toast?.message} tone={toast?.tone} onClose={() => setToast(null)} />
    </div>
  );
}
