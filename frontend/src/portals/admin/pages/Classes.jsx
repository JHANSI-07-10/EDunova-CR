import { useEffect, useState } from "react";
import api from "../lib/api";
import { Card, EmptyState, Loader, SectionTitle, Toast } from "../components/Common";
import { BookOpen, UserCheck, GraduationCap, CheckCircle, ArrowRight, Users, User, X } from "lucide-react";
import { isNonEmptyString } from "../../../utils/validation";

export default function Classes() {
  const [activeTab, setActiveTab] = useState("config");
  const [classes, setClasses] = useState(null);
  const [subjects, setSubjects] = useState(null);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [classTeachers, setClassTeachers] = useState([]);

  const [classForm, setClassForm] = useState({ name: "", section: "", curriculum: "CBSE", room_number: "" });
  const [classErrors, setClassErrors] = useState({});
  const [subjectForm, setSubjectForm] = useState({ name: "", subject_code: "", type: "Theory" });
  const [subjectErrors, setSubjectErrors] = useState({});
  const [enrollForm, setEnrollForm] = useState({ student_id: "", class_id: "", roll_number: "", academic_year: "2025-26" });
  const [teacherAssignForm, setTeacherAssignForm] = useState({ class_id: "", teacher_id: "", subject_id: "" });

  // Newly created class — drives the guided setup banner
  const [newlyCreated, setNewlyCreated] = useState(null);

  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);

  function loadClasses() {
    api.get("/admin-portal/classes/").then(({ data }) => setClasses(data)).catch(() => setClasses([]));
  }
  function loadSubjects() {
    api.get("/admin-portal/subjects/").then(({ data }) => setSubjects(data)).catch(() => setSubjects([]));
  }
  function loadStudents() {
    api.get("/admin-portal/users/?role=Student").then(({ data }) => setStudents(data)).catch(() => setStudents([]));
  }
  function loadTeachers() {
    api.get("/admin-portal/users/?role=Teacher").then(({ data }) => setTeachers(data)).catch(() => setTeachers([]));
  }
  function loadEnrollments() {
    api.get("/admin-portal/enrollments/").then(({ data }) => setEnrollments(data)).catch(() => setEnrollments([]));
  }
  function loadClassTeachers() {
    api.get("/admin-portal/class-teachers/").then(({ data }) => setClassTeachers(data)).catch(() => setClassTeachers([]));
  }

  useEffect(() => {
    loadClasses();
    loadSubjects();
    loadStudents();
    loadTeachers();
    loadEnrollments();
    loadClassTeachers();
  }, []);

  async function addClass(e) {
    e.preventDefault();
    const errs = {};
    if (!isNonEmptyString(classForm.name)) errs.name = "Class name is required.";
    if (!isNonEmptyString(classForm.section)) errs.section = "Section is required.";
    if (Object.keys(errs).length > 0) { setClassErrors(errs); return; }
    setClassErrors({});
    try {
      const { data } = await api.post("/admin-portal/classes/", classForm);
      setClassForm({ name: "", section: "", curriculum: "CBSE", room_number: "" });
      setNewlyCreated(data); // trigger guided setup banner
      loadClasses();
      setToast(`Class "${data.name}-${data.section}" created! Complete setup below ↓`);
    } catch (err) {
      setToast(err?.response?.data?.detail || "Could not create class.");
    }
  }

  async function addSubject(e) {
    e.preventDefault();
    const errs = {};
    if (!isNonEmptyString(subjectForm.name)) errs.name = "Subject name is required.";
    if (!isNonEmptyString(subjectForm.subject_code)) errs.subject_code = "Subject code is required.";
    if (Object.keys(errs).length > 0) { setSubjectErrors(errs); return; }
    setSubjectErrors({});
    try {
      await api.post("/admin-portal/subjects/", subjectForm);
      setSubjectForm({ name: "", subject_code: "", type: "Theory" });
      loadSubjects();
      setToast("Subject created successfully.");
    } catch { setToast("Could not create subject."); }
  }

  async function handleEnroll(e) {
    e.preventDefault();
    if (!enrollForm.student_id || !enrollForm.class_id) {
      setToast("Please select both a student and a class.");
      return;
    }
    setBusy(true);
    try {
      await api.post("/admin-portal/enrollments/", enrollForm);
      setEnrollForm({ student_id: "", class_id: newlyCreated ? String(newlyCreated.id) : "", roll_number: "", academic_year: "2025-26" });
      loadEnrollments();
      loadClasses(); // refresh student counts
      setToast("Student enrolled! They can now log in and see their class, timetable & homework.");
    } catch (err) {
      setToast(err?.response?.data?.detail || "Could not enroll student.");
    } finally {
      setBusy(false);
    }
  }

  async function handleTeacherAssign(e) {
    e.preventDefault();
    if (!teacherAssignForm.class_id || !teacherAssignForm.teacher_id) {
      setToast("Please select both a class and a teacher.");
      return;
    }
    setBusy(true);
    try {
      await api.post("/admin-portal/class-teachers/", teacherAssignForm);
      setTeacherAssignForm({ class_id: newlyCreated ? String(newlyCreated.id) : "", teacher_id: "", subject_id: "" });
      loadClassTeachers();
      loadClasses(); // refresh teacher counts
      setToast("Teacher assigned! They can now see this class in their portal under 'My Classes'.");
    } catch (err) {
      setToast(err?.response?.data?.detail || "Could not assign class teacher.");
    } finally {
      setBusy(false);
    }
  }

  // Jump to teachers tab pre-filled with the new class
  function goAssignTeacher() {
    setTeacherAssignForm(f => ({ ...f, class_id: String(newlyCreated.id) }));
    setActiveTab("teachers");
  }

  // Jump to enroll tab pre-filled with the new class
  function goEnrollStudents() {
    setEnrollForm(f => ({ ...f, class_id: String(newlyCreated.id) }));
    setActiveTab("enroll");
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        {[
          { key: "config", icon: <BookOpen size={16} />, label: "Classes & Subjects" },
          { key: "enroll", icon: <GraduationCap size={16} />, label: "Student Enrollments" },
          { key: "teachers", icon: <UserCheck size={16} />, label: "Class Teachers" },
        ].map(({ key, icon, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === key
                ? "border-academic-blue text-academic-blue"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {/* ─── Guided Setup Banner ─────────────────────────────────────── */}
      {newlyCreated && (
        <div className="relative rounded-2xl border-2 border-academic-blue/30 bg-gradient-to-br from-blue-50 via-indigo-50 to-sky-50 p-5 shadow-sm">
          <button
            onClick={() => setNewlyCreated(null)}
            className="absolute top-3 right-3 text-slate-400 hover:text-slate-700 transition-colors"
            title="Dismiss"
          >
            <X size={16} />
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-academic-blue/10 border border-academic-blue/20 flex items-center justify-center text-academic-blue">
              <CheckCircle size={20} />
            </div>
            <div>
              <p className="font-bold text-academic-blue">
                Class "{newlyCreated.name}-{newlyCreated.section}" ({newlyCreated.curriculum}) Created!
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Complete 2 more steps so it appears in the teacher &amp; student portals.
              </p>
            </div>
          </div>

          {/* 3-step tracker */}
          <div className="grid sm:grid-cols-3 gap-3 mb-5">
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold shrink-0">✓</span>
              <div>
                <p className="text-xs font-bold text-green-700">Step 1 — Done</p>
                <p className="text-xs text-green-600">Class exists in the system</p>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-amber-400 text-white flex items-center justify-center text-xs font-bold shrink-0">2</span>
              <div>
                <p className="text-xs font-bold text-amber-700">Step 2 — Assign Teacher</p>
                <p className="text-xs text-amber-600">Teacher portal shows this class</p>
              </div>
            </div>
            <div className="bg-slate-100 border border-slate-200 rounded-xl p-3 flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-slate-400 text-white flex items-center justify-center text-xs font-bold shrink-0">3</span>
              <div>
                <p className="text-xs font-bold text-slate-600">Step 3 — Enroll Students</p>
                <p className="text-xs text-slate-500">Students &amp; parents see their class</p>
              </div>
            </div>
          </div>

          {/* Portal propagation explanation */}
          <div className="bg-white/80 rounded-xl border border-slate-200 p-4 mb-4">
            <p className="text-xs font-bold text-slate-700 mb-2">📡 How this class propagates to other portals:</p>
            <div className="grid sm:grid-cols-3 gap-3 text-xs text-slate-600">
              <div className="flex items-start gap-2">
                <User size={12} className="mt-0.5 text-academic-blue shrink-0" />
                <span><strong>Teacher Portal:</strong> Appears under "My Classes" once a teacher is assigned. They can then post homework, take attendance &amp; schedule exams.</span>
              </div>
              <div className="flex items-start gap-2">
                <GraduationCap size={12} className="mt-0.5 text-academic-green shrink-0" />
                <span><strong>Student Portal:</strong> Students see their class, timetable, homework &amp; exam schedule once enrolled.</span>
              </div>
              <div className="flex items-start gap-2">
                <Users size={12} className="mt-0.5 text-amber-500 shrink-0" />
                <span><strong>Parent Portal:</strong> Automatically inherits the child's enrollment — parents see class, results, homework &amp; attendance.</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={goAssignTeacher}
              className="flex items-center gap-2 bg-academic-blue text-white rounded-xl px-4 py-2 text-sm font-semibold hover:bg-academic-blue/90 transition-colors"
            >
              <UserCheck size={15} />
              Assign Teacher to this Class
              <ArrowRight size={14} />
            </button>
            <button
              onClick={goEnrollStudents}
              className="flex items-center gap-2 bg-academic-green text-white rounded-xl px-4 py-2 text-sm font-semibold hover:bg-academic-green/90 transition-colors"
            >
              <GraduationCap size={15} />
              Enroll Students into this Class
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ─── Tab 1: Classes & Subjects ───────────────────────────────── */}
      {activeTab === "config" && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Card>
              <SectionTitle>Add Class</SectionTitle>
              <form onSubmit={addClass} className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <input
                    placeholder="Name (e.g. Grade 6)"
                    value={classForm.name}
                    onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
                    className={`rounded-xl border px-3 py-2 text-sm focus-ring outline-none ${classErrors.name ? "border-danger" : "border-slate-200"}`}
                  />
                  {classErrors.name && <p className="text-xs text-danger">{classErrors.name}</p>}
                </div>
                <div className="flex flex-col gap-1">
                  <input
                    placeholder="Section (e.g. A)"
                    value={classForm.section}
                    onChange={(e) => setClassForm({ ...classForm, section: e.target.value })}
                    className={`rounded-xl border px-3 py-2 text-sm focus-ring outline-none ${classErrors.section ? "border-danger" : "border-slate-200"}`}
                  />
                  {classErrors.section && <p className="text-xs text-danger">{classErrors.section}</p>}
                </div>
                <select
                  value={classForm.curriculum}
                  onChange={(e) => setClassForm({ ...classForm, curriculum: e.target.value })}
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus-ring outline-none"
                >
                  <option>CBSE</option><option>Cambridge</option>
                </select>
                <input
                  placeholder="Room number"
                  value={classForm.room_number}
                  onChange={(e) => setClassForm({ ...classForm, room_number: e.target.value })}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus-ring outline-none"
                />
                <button className="col-span-2 bg-academic-blue text-white rounded-xl py-2.5 font-medium hover:bg-academic-blue/90 transition-colors">
                  Add Class
                </button>
              </form>
            </Card>

            <Card>
              <SectionTitle>All Classes</SectionTitle>
              {!classes ? <Loader rows={3} /> : classes.length === 0 ? <EmptyState label="No classes yet." /> : (
                <div className="divide-y divide-slate-100">
                  {classes.map((c) => (
                    <div key={c.id} className="py-2.5 flex items-center justify-between gap-2">
                      <div>
                        <span className="text-sm font-medium text-slate-700">{c.name}-{c.section}</span>
                        <span className="ml-2 text-xs text-ink-secondary">{c.curriculum}{c.room_number ? ` · Room ${c.room_number}` : ""}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs shrink-0">
                        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold border ${(c.enrolled_students ?? 0) > 0 ? "bg-green-50 text-green-700 border-green-200" : "bg-slate-50 text-slate-400 border-slate-200"}`}>
                          <GraduationCap size={10} /> {c.enrolled_students ?? 0}
                        </span>
                        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold border ${(c.assigned_teachers ?? 0) > 0 ? "bg-blue-50 text-academic-blue border-blue-200" : "bg-slate-50 text-slate-400 border-slate-200"}`}>
                          <UserCheck size={10} /> {c.assigned_teachers ?? 0}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {classes && classes.length > 0 && (
                <p className="text-[11px] text-slate-400 mt-2">
                  <GraduationCap size={10} className="inline mr-1" />students enrolled &nbsp;·&nbsp;
                  <UserCheck size={10} className="inline mr-1" />teachers assigned
                </p>
              )}
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <SectionTitle>Add Subject</SectionTitle>
              <form onSubmit={addSubject} className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <input
                    placeholder="Name"
                    value={subjectForm.name}
                    onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                    className={`rounded-xl border px-3 py-2 text-sm focus-ring outline-none ${subjectErrors.name ? "border-danger" : "border-slate-200"}`}
                  />
                  {subjectErrors.name && <p className="text-xs text-danger">{subjectErrors.name}</p>}
                </div>
                <div className="flex flex-col gap-1">
                  <input
                    placeholder="Subject code"
                    value={subjectForm.subject_code}
                    onChange={(e) => setSubjectForm({ ...subjectForm, subject_code: e.target.value })}
                    className={`rounded-xl border px-3 py-2 text-sm focus-ring outline-none ${subjectErrors.subject_code ? "border-danger" : "border-slate-200"}`}
                  />
                  {subjectErrors.subject_code && <p className="text-xs text-danger">{subjectErrors.subject_code}</p>}
                </div>
                <select
                  value={subjectForm.type}
                  onChange={(e) => setSubjectForm({ ...subjectForm, type: e.target.value })}
                  className="col-span-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus-ring outline-none"
                >
                  {["Theory", "Practical", "Lab", "Skill_Development"].map((t) => <option key={t}>{t}</option>)}
                </select>
                <button className="col-span-2 bg-academic-blue text-white rounded-xl py-2.5 font-medium hover:bg-academic-blue/90 transition-colors">
                  Add Subject
                </button>
              </form>
            </Card>

            <Card>
              <SectionTitle>All Subjects</SectionTitle>
              {!subjects ? <Loader rows={3} /> : subjects.length === 0 ? <EmptyState label="No subjects yet." /> : (
                <div className="divide-y divide-slate-100">
                  {subjects.map((s) => (
                    <div key={s.id} className="py-2.5 text-sm flex justify-between">
                      <span className="font-medium text-slate-700">{s.name}</span>
                      <span className="text-ink-secondary">{s.subject_code} · {s.type}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* ─── Tab 2: Student Enrollments ──────────────────────────────── */}
      {activeTab === "enroll" && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            {newlyCreated && enrollForm.class_id === String(newlyCreated.id) && (
              <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 flex items-center gap-3 text-sm text-green-800">
                <CheckCircle size={16} className="text-green-500 shrink-0" />
                <span>Enrolling students into <strong>{newlyCreated.name}-{newlyCreated.section}</strong> (newly created class)</span>
              </div>
            )}
            <Card>
              <SectionTitle>Enroll Student in Class</SectionTitle>
              <form onSubmit={handleEnroll} className="space-y-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Select Student (*)</label>
                  <select
                    required
                    value={enrollForm.student_id}
                    onChange={(e) => setEnrollForm({ ...enrollForm, student_id: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus-ring"
                  >
                    <option value="">-- Choose Student --</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.username})</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Select Class (*)</label>
                  <select
                    required
                    value={enrollForm.class_id}
                    onChange={(e) => setEnrollForm({ ...enrollForm, class_id: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus-ring"
                  >
                    <option value="">-- Choose Class --</option>
                    {classes?.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}-{c.section} ({c.curriculum})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase">Roll Number (Optional)</label>
                    <input
                      type="number"
                      placeholder="Roll No"
                      value={enrollForm.roll_number}
                      onChange={(e) => setEnrollForm({ ...enrollForm, roll_number: e.target.value })}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus-ring"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase">Academic Year (*)</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. 2025-26 (*)"
                      value={enrollForm.academic_year}
                      onChange={(e) => setEnrollForm({ ...enrollForm, academic_year: e.target.value })}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus-ring"
                    />
                  </div>
                </div>

                <button
                  disabled={busy}
                  className="w-full bg-academic-green text-white rounded-xl py-2.5 font-medium hover:bg-academic-green/90 disabled:opacity-60 transition-colors"
                >
                  {busy ? "Enrolling..." : "Enroll Student"}
                </button>
              </form>
              <p className="text-xs text-ink-secondary mt-3 pt-3 border-t border-slate-100">
                💡 Once enrolled, the student will see their class, timetable, homework &amp; exam schedule on login.
                Parents linked to this student will also see the class automatically.
              </p>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <SectionTitle>Enrolled Roster</SectionTitle>
              {enrollments.length === 0 ? (
                <EmptyState label="No students enrolled yet." />
              ) : (
                <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto pr-1">
                  {enrollments.map((e) => (
                    <div key={e.id} className="py-2.5 text-sm flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-700">{e.student_name}</p>
                        <p className="text-xs text-ink-secondary">Username: {e.student_username} · Year: {e.academic_year}</p>
                      </div>
                      <div className="text-right">
                        <span className="bg-academic-blue/10 text-academic-blue px-2.5 py-1 rounded-full text-xs font-semibold">
                          {e.class_name}
                        </span>
                        {e.roll_number && (
                          <p className="text-xs text-ink-secondary mt-1">Roll No: {e.roll_number}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* ─── Tab 3: Class Teachers ───────────────────────────────────── */}
      {activeTab === "teachers" && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            {newlyCreated && teacherAssignForm.class_id === String(newlyCreated.id) && (
              <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 flex items-center gap-3 text-sm text-blue-800">
                <CheckCircle size={16} className="text-academic-blue shrink-0" />
                <span>Assigning a teacher to <strong>{newlyCreated.name}-{newlyCreated.section}</strong> (newly created class)</span>
              </div>
            )}
            <Card>
              <SectionTitle>Assign Class Teacher</SectionTitle>
              <form onSubmit={handleTeacherAssign} className="space-y-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Select Class (*)</label>
                  <select
                    required
                    value={teacherAssignForm.class_id}
                    onChange={(e) => setTeacherAssignForm({ ...teacherAssignForm, class_id: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus-ring"
                  >
                    <option value="">-- Choose Class --</option>
                    {classes?.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}-{c.section}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Select Class Teacher (*)</label>
                  <select
                    required
                    value={teacherAssignForm.teacher_id}
                    onChange={(e) => setTeacherAssignForm({ ...teacherAssignForm, teacher_id: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus-ring"
                  >
                    <option value="">-- Choose Teacher --</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>{t.name} ({t.email})</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Select Subject (Optional)</label>
                  <select
                    value={teacherAssignForm.subject_id}
                    onChange={(e) => setTeacherAssignForm({ ...teacherAssignForm, subject_id: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus-ring"
                  >
                    <option value="">-- Choose Subject (Dealing With) --</option>
                    {subjects?.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.subject_code})</option>
                    ))}
                  </select>
                </div>

                <button
                  disabled={busy}
                  className="w-full bg-academic-blue text-white rounded-xl py-2.5 font-medium hover:bg-academic-blue/90 disabled:opacity-60 transition-colors"
                >
                  {busy ? "Assigning..." : "Assign Class Teacher & Subject"}
                </button>
              </form>
              <p className="text-xs text-ink-secondary mt-3 pt-3 border-t border-slate-100">
                💡 Once assigned, the teacher will see this class in their portal under "My Classes". They can post homework, take attendance &amp; schedule exams for it.
              </p>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <SectionTitle>Class Teacher Directory</SectionTitle>
              {classTeachers.length === 0 ? (
                <EmptyState label="No class teachers assigned yet." />
              ) : (
                <div className="divide-y divide-slate-100">
                  {classTeachers.map((ct) => (
                    <div key={ct.class_id} className="py-2.5 text-sm flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-slate-700 block">{ct.class_name}</span>
                        {ct.assigned_subjects && ct.assigned_subjects.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {ct.assigned_subjects.map((sub) => (
                              <span key={sub.id} className="bg-slate-100 text-slate-600 text-[10px] font-semibold px-2 py-0.5 rounded border border-slate-200">
                                {sub.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-1 rounded-full text-xs font-semibold">
                        👤 {ct.teacher_name}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}
