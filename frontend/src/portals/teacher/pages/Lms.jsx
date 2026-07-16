import { 
  Plus, Trash2, BookOpen, FileText, Video, Award, HelpCircle, 
  ChevronRight, ArrowLeft, Loader2, Link, FileCheck, HelpCircle as QuizIcon, 
  Clock, CheckCircle, PlusCircle, AlertCircle, Pencil, RotateCw, MessageSquare
} from "lucide-react";
import { useEffect, useState } from "react";
import { Card, EmptyState, Loader, SectionTitle, Toast } from "../components/Common";
import api from "../lib/api";
import { isNonEmptyString, isPositiveNumber } from "../../../utils/validation";
import CourseForum from "../../student/components/CourseForum";


const RESOURCE_TYPES = [
  { value: "PDF", label: "📄 PDF Notes", desc: "Upload syllabus notes or slides" },
  { value: "Video", label: "🎥 Video Lesson", desc: "YouTube, Drive or recorded file link" },
  { value: "PPT", label: "📊 PPT Presentation", desc: "Upload classroom slide deck" },
  { value: "Notes", label: "📝 Study Notes", desc: "Markdown formatting text notes" },
  { value: "Link", label: "🔗 External Link", desc: "Articles, blogs or online portals" },
  { value: "Audio", label: "🎧 Audio Lecture", desc: "Podcasts or audio notes" },
  { value: "Image", label: "🖼 Diagram / Image", desc: "Educational diagrams and infographics" },
  { value: "Assignment", label: "📚 Assignment", desc: "Graded homework with submission link" },
  { value: "Quiz", label: "🧠 Interactive Quiz", desc: "Self-evaluating MCQ questions" }
];

export default function Lms() {
  const [courses, setCourses] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [forumCourseId, setForumCourseId] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [lessons, setLessons] = useState({});
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");
  
  // Modals
  const [showChapterModal, setShowChapterModal] = useState(false);
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [showResourceModal, setShowResourceModal] = useState(false);
  
  // Selected targets
  const [targetChapterId, setTargetChapterId] = useState(null);
  const [targetLessonId, setTargetLessonId] = useState(null);

  // Forms
  const [chapterForm, setChapterForm] = useState({ title: "", description: "", course_id: "", file: null });
  const [lessonForm, setLessonForm] = useState({ title: "", description: "" });
  const [editingChapterId, setEditingChapterId] = useState(null);
  const [editingLessonId, setEditingLessonId] = useState(null);
  const [resourceForm, setResourceForm] = useState({
    title: "",
    content_type: "PDF",
    resource_url: "",
    description: "",
    due_date: "",
    max_marks: 50,
    file: null,
    questions: [
      { question_text: "", options: ["", "", "", ""], correct_answer: "" }
    ]
  });

  const [uploading, setUploading] = useState(false);
  const [scanningFile, setScanningFile] = useState(false);

  // Validation States
  const [chapterErrors, setChapterErrors] = useState({});
  const [lessonErrors, setLessonErrors] = useState({});
  const [resourceErrors, setResourceErrors] = useState({});


  useEffect(() => {
    loadCourses();
  }, []);

  function loadCourses() {
    setLoading(true);
    api.get("/teacher/lms/courses/")
      .then(({ data }) => setCourses(data))
      .catch(() => setCourses([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (selectedCourse) {
      loadChapters();
    }
  }, [selectedCourse]);

  function loadChapters() {
    api.get(`/teacher/lms/chapters/?course_id=${selectedCourse.id}`)
      .then(({ data }) => {
        setChapters(data);
        data.forEach(ch => loadLessons(ch.id));
      });
  }

  function loadLessons(chapterId) {
    api.get(`/teacher/lms/lessons/?chapter_id=${chapterId}`)
      .then(({ data }) => {
        setLessons(prev => ({ ...prev, [chapterId]: data }));
      });
  }

  async function handleAddChapter(e) {
    e.preventDefault();
    const activeCourseId = chapterForm.course_id || selectedCourse?.id;
    const errs = {};
    if (!isNonEmptyString(chapterForm.title)) {
      errs.title = "Chapter title is required and cannot be empty.";
    }
    if (!activeCourseId) {
      errs.course_id = "Please select a target class.";
    }
    if (Object.keys(errs).length > 0) {
      setChapterErrors(errs);
      return;
    }
    setChapterErrors({});
    
    setUploading(true);
    try {
      let pdfUrl = "";
      if (chapterForm.file) {
        pdfUrl = await uploadFile(chapterForm.file);
      }

      if (editingChapterId) {
        await api.put("/teacher/lms/chapters/", {
          id: editingChapterId,
          title: chapterForm.title,
          description: chapterForm.description,
          pdf_url: pdfUrl || null
        });
        setToast("Chapter updated successfully!");
      } else {
        await api.post("/teacher/lms/chapters/", {
          course_id: activeCourseId,
          title: chapterForm.title,
          description: chapterForm.description,
          pdf_url: pdfUrl || null
        });
        setToast("Chapter created with uploaded notes!");
      }

      setChapterForm({ title: "", description: "", course_id: "", file: null });
      setEditingChapterId(null);
      setShowChapterModal(false);
      
      if (selectedCourse) {
        loadChapters();
      }
    } catch {
      setToast(editingChapterId ? "Failed to update chapter." : "Failed to create chapter.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteChapter(id, e) {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this chapter and all its lessons/resources?")) return;
    try {
      await api.delete(`/teacher/lms/chapters/?id=${id}`);
      loadChapters();
      setToast("Chapter deleted.");
    } catch {
      setToast("Failed to delete chapter.");
    }
  }

  async function handleAddLesson(e) {
    e.preventDefault();
    if (!isNonEmptyString(lessonForm.title)) {
      setLessonErrors({ title: "Lesson title is required and cannot be empty." });
      return;
    }
    setLessonErrors({});
    try {
      if (editingLessonId) {
        await api.put("/teacher/lms/lessons/", {
          id: editingLessonId,
          title: lessonForm.title,
          description: lessonForm.description
        });
        setToast("Lesson updated successfully!");
      } else {
        await api.post("/teacher/lms/lessons/", {
          chapter_id: targetChapterId,
          title: lessonForm.title,
          description: lessonForm.description
        });
        setToast("Lesson added successfully!");
      }
      setLessonForm({ title: "", description: "" });
      setEditingLessonId(null);
      setShowLessonModal(false);
      loadLessons(targetChapterId);
    } catch {
      setToast(editingLessonId ? "Failed to update lesson." : "Failed to add lesson.");
    }
  }

  async function handleDeleteLesson(chapterId, id) {
    if (!confirm("Are you sure you want to delete this lesson and all its resources?")) return;
    try {
      await api.delete(`/teacher/lms/lessons/?id=${id}`);
      loadLessons(chapterId);
      setToast("Lesson deleted.");
    } catch {
      setToast("Failed to delete lesson.");
    }
  }

  const handleFileChange = (e) => {
    setResourceForm(f => ({ ...f, file: e.target.files[0] }));
  };

  const uploadFile = async (file) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("bucket", "lms-resources");
    const { data } = await api.post("/upload/", fd, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    return data.url;
  };

  const handleAddQuestion = () => {
    setResourceForm(f => ({
      ...f,
      questions: [...f.questions, { question_text: "", options: ["", "", "", ""], correct_answer: "" }]
    }));
  };

  const handleRemoveQuestion = (idx) => {
    setResourceForm(f => ({
      ...f,
      questions: f.questions.filter((_, i) => i !== idx)
    }));
  };

  const updateQuestion = (qIdx, field, val) => {
    setResourceForm(f => {
      const qs = [...f.questions];
      qs[qIdx][field] = val;
      return { ...f, questions: qs };
    });
  };

  const updateQuestionOption = (qIdx, optIdx, val) => {
    setResourceForm(f => {
      const qs = [...f.questions];
      qs[qIdx].options[optIdx] = val;
      return { ...f, questions: qs };
    });
  };

  const handlePdfQuizScan = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setScanningFile(true);
    setToast("Extracting questions from quiz document...");
    const fd = new FormData();
    fd.append("file", file);
    try {
      const { data } = await api.post("/teacher/assignments/scan-pdf/", fd, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      if (data.questions && data.questions.length > 0) {
        setResourceForm(f => ({
          ...f,
          questions: data.questions.map(q => ({
            question_text: q.question_text || "",
            options: q.options?.length === 4 ? q.options : ["Option A", "Option B", "Option C", "Option D"],
            correct_answer: q.correct_answer || ""
          }))
        }));
        setToast(`Successfully extracted ${data.questions.length} questions! You can edit them below.`);
      } else {
        setToast("Could not extract questions. Please check the PDF content.");
      }
    } catch (err) {
      setToast("Failed to parse the PDF. Ensure it is a valid quiz document.");
    } finally {
      setScanningFile(false);
    }
  };

  async function handleAddResource(e) {
    e.preventDefault();
    const errs = {};
    if (!isNonEmptyString(resourceForm.title)) {
      errs.title = "Resource title is required.";
    }
    if (resourceForm.content_type === "Assignment") {
      if (!isPositiveNumber(resourceForm.max_marks)) {
        errs.max_marks = "Max marks must be a positive number.";
      }
      if (!resourceForm.due_date) {
        errs.due_date = "Due date is required.";
      }
    }
    if (resourceForm.content_type === "Quiz") {
      if (resourceForm.questions.length === 0) {
        errs.quiz = "Please add at least one question.";
      } else {
        const missing = resourceForm.questions.some(q => !q.question_text || !q.correct_answer || q.options.some(o => !o));
        if (missing) {
          errs.quiz = "All questions, options, and correct answers must be filled out.";
        }
      }
    } else {
      if (resourceForm.resource_url && !resourceForm.file && !resourceForm.resource_url.startsWith("http://") && !resourceForm.resource_url.startsWith("https://") && !resourceForm.resource_url.startsWith("/")) {
        errs.resource_url = "Please enter a valid URL or path (e.g. starts with http://, https://, or /).";
      }
    }

    if (Object.keys(errs).length > 0) {
      setResourceErrors(errs);
      return;
    }
    setResourceErrors({});
    
    setUploading(true);
    try {
      let url = resourceForm.resource_url;
      if (resourceForm.file) {
        url = await uploadFile(resourceForm.file);
      }

      await api.post("/teacher/lms/resources/", {
        course_id: selectedCourse.id,
        lesson_id: targetLessonId,
        content_type: resourceForm.content_type,
        title: resourceForm.title,
        resource_url: url || "https://example.com/external",
        description: resourceForm.description,
        due_date: resourceForm.due_date || null,
        max_marks: resourceForm.max_marks || null,
        questions: resourceForm.questions
      });

      setResourceForm({
        title: "",
        content_type: "PDF",
        resource_url: "",
        description: "",
        due_date: "",
        max_marks: 50,
        file: null,
        questions: [{ question_text: "", options: ["", "", "", ""], correct_answer: "" }]
      });

      setShowResourceModal(false);
      loadChapters(); // Reload structure
      setToast("Resource published to lesson!");
    } catch (err) {
      console.error(err);
      setToast("Failed to upload resource.");
    } finally {
      setUploading(false);
    }
  }

  if (loading) return <Loader rows={5} />;

  if (!selectedCourse) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="font-heading text-2xl font-bold text-ink-primary">LMS Course Content</h2>
          <p className="text-sm text-ink-secondary">Select a course to author chapters, lessons, and study materials.</p>
        </div>
        {!courses?.length ? (
          <EmptyState label="You are not assigned to teach any subjects yet." />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {courses.map(c => (
              <div 
                key={c.id}
                onClick={() => setSelectedCourse(c)}
                className="bg-white hover:border-academic-blue border border-slate-100 rounded-card shadow-card hover:shadow-raised transition-all duration-200 cursor-pointer p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-academic-blue/10 text-academic-blue flex items-center justify-center mb-4">
                    <BookOpen size={20} />
                  </div>
                  <h3 className="font-heading font-semibold text-ink-primary text-lg mb-1">{c.subject_name}</h3>
                  <p className="text-xs font-semibold text-academic-blue tracking-wide uppercase mb-3">{c.class_name}</p>
                  <p className="text-sm text-ink-secondary line-clamp-2">{c.description || "Course syllabus & lessons."}</p>
                </div>
                <div className="mt-5 flex items-center justify-end text-xs font-bold text-academic-blue hover:translate-x-1 transition-transform">
                  Manage Course <ChevronRight size={14} className="ml-1" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back header */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => setSelectedCourse(null)}
          className="w-9 h-9 bg-white border border-slate-200 rounded-xl flex items-center justify-center hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft size={16} className="text-ink-secondary" />
        </button>
        <div>
          <h2 className="font-heading text-2xl font-bold text-ink-primary">{selectedCourse.subject_name}</h2>
          <p className="text-xs font-semibold text-academic-blue uppercase">{selectedCourse.class_name}</p>
        </div>
      </div>

      {/* Action Header */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-100 shadow-card">
        <div className="text-sm text-ink-secondary font-medium">
          {chapters.length} Chapters Published
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setForumCourseId(selectedCourse.id)}
            className="flex items-center gap-1.5 bg-white border border-slate-200 text-academic-blue rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 transition-all shadow-sm"
          >
            <MessageSquare size={16} /> Discussions & AI Monitor
          </button>
          <button
            onClick={() => {
              setChapterForm(f => ({ ...f, course_id: selectedCourse?.id || "", title: "", description: "", file: null }));
              setShowChapterModal(true);
            }}
            className="flex items-center gap-1.5 bg-academic-blue text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-academic-blue/90 transition-all shadow-raised"
          >
            <Plus size={16} /> New Chapter
          </button>
        </div>
      </div>

      {/* Chapters Outline */}
      {chapters.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-10 text-center space-y-4 max-w-2xl mx-auto shadow-sm">
          <div className="flex justify-center gap-3 text-academic-blue/60 text-2xl">
            <span>📄</span>
            <span>📊</span>
            <span>🎥</span>
            <span>📝</span>
            <span>🧠</span>
          </div>
          <div>
            <h4 className="font-heading font-bold text-lg text-ink-primary">Upload Subject Materials</h4>
            <p className="text-sm text-ink-secondary mt-2 leading-relaxed">
              To publish study notes, PDFs, PPTs, recorded video lectures, homework assignments, or online quizzes for <strong>{selectedCourse.subject_name} ({selectedCourse.class_name})</strong>, please structure your course.
            </p>
            <p className="text-xs text-slate-400 mt-2">
              Click the <strong className="text-academic-blue">+ New Chapter</strong> button above to create your first chapter.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {chapters.map((ch, idx) => (
            <Card key={ch.id} className="border border-slate-100 hover:border-slate-200 transition-colors">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold text-academic-orange tracking-wider uppercase mb-1 block">Chapter {idx + 1}</span>
                  <h3 className="font-heading text-lg font-bold text-ink-primary">{ch.title}</h3>
                  {ch.description && <p className="text-sm text-ink-secondary mt-1 max-w-2xl">{ch.description}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setTargetChapterId(ch.id);
                      setEditingLessonId(null);
                      setLessonForm({ title: "", description: "" });
                      setShowLessonModal(true);
                    }}
                    className="text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 text-ink-primary rounded-xl px-3 py-1.5 font-semibold transition-colors"
                  >
                    + Add Lesson
                  </button>
                  <button 
                    onClick={() => {
                      setEditingChapterId(ch.id);
                      setChapterForm({
                        title: ch.title,
                        description: ch.description || "",
                        course_id: selectedCourse?.id || "",
                        file: null
                      });
                      setShowChapterModal(true);
                    }}
                    className="text-slate-500 hover:bg-slate-100 p-2 rounded-xl transition-colors"
                    title="Edit Chapter"
                  >
                    <Pencil size={16} />
                  </button>
                  <button 
                    onClick={(e) => handleDeleteChapter(ch.id, e)}
                    className="text-red-500 hover:bg-red-50 p-2 rounded-xl transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Lessons Sub-Outline */}
              <div className="mt-5 border-t border-slate-50 pt-4 space-y-4">
                {!lessons[ch.id]?.length ? (
                  <p className="text-xs text-ink-secondary italic">No lessons created yet. Add a lesson to begin uploading PDFs, PPTs, videos, or quizzes for this chapter.</p>
                ) : (
                  lessons[ch.id].map((les, lIdx) => (
                    <div key={les.id} className="bg-slate-50/50 rounded-xl p-4 border border-slate-100/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-heading font-bold text-sm text-ink-primary">
                            Lesson {idx + 1}.{lIdx + 1}: {les.title}
                          </h4>
                          {les.description && <p className="text-xs text-ink-secondary mt-0.5">{les.description}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setTargetLessonId(les.id);
                              setShowResourceModal(true);
                            }}
                            className="text-xs bg-academic-blue/10 hover:bg-academic-blue/20 text-academic-blue rounded-xl px-2.5 py-1.5 font-bold transition-colors"
                          >
                            + Add Resource
                          </button>
                          <button
                            onClick={() => {
                              setEditingLessonId(les.id);
                              setLessonForm({
                                title: les.title,
                                description: les.description || ""
                              });
                              setTargetChapterId(ch.id);
                              setShowLessonModal(true);
                            }}
                            className="text-slate-500 hover:bg-slate-100 p-1.5 rounded-lg transition-colors"
                            title="Edit Lesson"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteLesson(ch.id, les.id)}
                            className="text-red-400 hover:text-red-600 p-1.5 rounded-lg transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Display resources if we fetch or just display placeholder */}
                      {/* Note: since chapters and lessons query in parent page fetches resources inside c.chapters.lessons.resources, 
                          we can either fetch them or query. In student courses we built a nested array. 
                          For the teacher, we can just load the course nested resources by restructuring. Let's do a load resources for each lesson */}
                      <LessonResourcesList lessonId={les.id} />
                    </div>
                  ))
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* MODALS */}
      {/* Chapter Modal */}
      {showChapterModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-[fadeIn_.2s_ease]">
          <div className="bg-white rounded-card w-full max-w-md p-6 shadow-raised">
            <h3 className="font-heading text-lg font-bold text-ink-primary mb-4">
              {editingChapterId ? "Edit Chapter Details" : "Create New Chapter"}
            </h3>
            <form onSubmit={handleAddChapter} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-ink-secondary block mb-1">Target Class & Subject (*)</label>
                <select
                  required
                  value={chapterForm.course_id ? String(chapterForm.course_id) : ""}
                  onChange={e => setChapterForm(f => ({ ...f, course_id: e.target.value }))}
                  className={`w-full rounded-xl border px-3 py-2.5 text-sm focus-ring outline-none ${
                    chapterErrors.course_id ? "border-danger" : "border-slate-200"
                  }`}
                >
                  <option value="">-- Choose Class --</option>
                  {courses?.map(c => (
                    <option key={c.id} value={String(c.id)}>{c.class_name} — {c.subject_name}</option>
                  ))}
                </select>
                {chapterErrors.course_id && (
                  <p className="text-xs text-danger mt-1">{chapterErrors.course_id}</p>
                )}
              </div>
              <div>
                <label className="text-xs font-semibold text-ink-secondary block mb-1">Chapter Title (*)</label>
                <input 
                  required
                  placeholder="e.g. Chapter 1: Introduction to Mechanics (*)"
                  value={chapterForm.title}
                  onChange={e => setChapterForm(f => ({ ...f, title: e.target.value }))}
                  className={`w-full rounded-xl border px-3 py-2.5 text-sm focus-ring outline-none ${
                    chapterErrors.title ? "border-danger" : "border-slate-200"
                  }`}
                />
                {chapterErrors.title && (
                  <p className="text-xs text-danger mt-1">{chapterErrors.title}</p>
                )}
              </div>
              <div>
                <label className="text-xs font-semibold text-ink-secondary block mb-1">Brief Description (Optional)</label>
                <textarea 
                  placeholder="What will students learn in this chapter?"
                  value={chapterForm.description}
                  onChange={e => setChapterForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus-ring outline-none h-20"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-ink-secondary block mb-1">Upload Chapter PDF / Material (Optional)</label>
                <input 
                  type="file"
                  accept=".pdf"
                  onChange={e => setChapterForm(f => ({ ...f, file: e.target.files[0] }))}
                  className="w-full rounded-xl border border-dashed border-slate-300 p-3 text-xs outline-none bg-slate-50/50 cursor-pointer"
                />
                {chapterForm.file && (
                  <span className="text-[11px] text-academic-green mt-1 block font-semibold">✓ Selected: {chapterForm.file.name}</span>
                )}
              </div>
              <div className="flex gap-2 justify-end">
                <button 
                  type="button" 
                  onClick={() => setShowChapterModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={uploading}
                  className="px-4 py-2 bg-academic-blue text-white rounded-xl text-sm font-semibold hover:bg-academic-blue/90 shadow-raised disabled:opacity-50"
                >
                  {uploading ? "Saving..." : "Create Chapter"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lesson Modal */}
      {showLessonModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-[fadeIn_.2s_ease]">
          <div className="bg-white rounded-card w-full max-w-md p-6 shadow-raised">
            <h3 className="font-heading text-lg font-bold text-ink-primary mb-4">
              {editingLessonId ? "Edit Lesson Details" : "Create New Lesson"}
            </h3>
            <form onSubmit={handleAddLesson} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-ink-secondary block mb-1">Lesson Title (*)</label>
                <input 
                  required
                  placeholder="e.g. Lesson 1.1: Newton's Laws of Motion (*)"
                  value={lessonForm.title}
                  onChange={e => setLessonForm(f => ({ ...f, title: e.target.value }))}
                  className={`w-full rounded-xl border px-3 py-2.5 text-sm focus-ring outline-none ${
                    lessonErrors.title ? "border-danger" : "border-slate-200"
                  }`}
                />
                {lessonErrors.title && (
                  <p className="text-xs text-danger mt-1">{lessonErrors.title}</p>
                )}
              </div>
              <div>
                <label className="text-xs font-semibold text-ink-secondary block mb-1">Description (Optional)</label>
                <textarea 
                  placeholder="e.g. Visualizing forces and vector dynamics"
                  value={lessonForm.description}
                  onChange={e => setLessonForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus-ring outline-none h-20"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button 
                  type="button" 
                  onClick={() => setShowLessonModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-academic-blue text-white rounded-xl text-sm font-semibold hover:bg-academic-blue/90 shadow-raised"
                >
                  Create Lesson
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resource Modal (Super Dynamic Form) */}
      {showResourceModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto animate-[fadeIn_.2s_ease]">
          <div className="bg-white rounded-card w-full max-w-2xl p-6 shadow-raised my-8">
            <h3 className="font-heading text-lg font-bold text-ink-primary mb-4">Create Learning Resource</h3>
            
            <form onSubmit={handleAddResource} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-ink-secondary block mb-1">Resource Title (*)</label>
                  <input 
                    required
                    placeholder="e.g. Intro to Trigonometry PDF (*)"
                    value={resourceForm.title}
                    onChange={e => setResourceForm(f => ({ ...f, title: e.target.value }))}
                    className={`w-full rounded-xl border px-3 py-2.5 text-sm focus-ring outline-none ${
                      resourceErrors.title ? "border-danger" : "border-slate-200"
                    }`}
                  />
                  {resourceErrors.title && (
                    <p className="text-xs text-danger mt-1">{resourceErrors.title}</p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-semibold text-ink-secondary block mb-1">Resource Type</label>
                  <select
                    value={resourceForm.content_type}
                    onChange={e => setResourceForm(f => ({ ...f, content_type: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus-ring outline-none"
                  >
                    {RESOURCE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-ink-secondary block mb-1">Description</label>
                <textarea 
                  placeholder="Provide instructions or background details for this content..."
                  value={resourceForm.description}
                  onChange={e => setResourceForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus-ring outline-none h-20"
                />
              </div>

              {/* DYNAMIC FIELD GATING */}
              {resourceForm.content_type === "Quiz" ? (
                // QUIZ QUESTION BUILDER
                <div className="space-y-4 border-t border-slate-100 pt-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-heading font-bold text-sm text-ink-primary">Quiz Questions Builder</h4>
                    <button 
                      type="button"
                      onClick={handleAddQuestion}
                      className="text-xs flex items-center gap-1 bg-academic-orange/10 text-academic-orange px-3 py-1.5 rounded-lg font-bold hover:bg-academic-orange/20 transition-colors"
                    >
                      <PlusCircle size={14} /> Add Question
                    </button>
                  </div>

                  {/* AI PDF Quiz Scanner */}
                  <div className="p-3.5 bg-academic-blue/5 border border-dashed border-academic-blue/20 rounded-xl space-y-2">
                    <label className="text-xs font-bold text-academic-blue block">AI-Powered Quiz Scanner (PDF)</label>
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      Upload a multiple-choice quiz/test PDF to automatically extract questions and answer options. You can review, edit, or adjust correct answers below.
                    </p>
                    <input 
                      type="file"
                      accept=".pdf"
                      disabled={scanningFile}
                      onChange={handlePdfQuizScan}
                      className="text-[11px] block w-full file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-academic-blue/15 file:text-academic-blue hover:file:bg-academic-blue/25 file:cursor-pointer disabled:opacity-50"
                    />
                    {scanningFile && (
                      <div className="text-[10px] text-academic-orange font-semibold animate-pulse flex items-center gap-1">
                        ⚡ Scanning PDF and extracting questions, please wait...
                      </div>
                    )}
                  </div>
                  {resourceForm.questions.map((q, qIdx) => (
                    <div key={qIdx} className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3 relative">
                      {resourceForm.questions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(qIdx)}
                          className="absolute top-2 right-2 text-red-500 hover:bg-red-50 p-1.5 rounded-lg text-xs"
                        >
                          Remove
                        </button>
                      )}
                      <div>
                        <label className="text-xs font-semibold text-ink-secondary block mb-1">Question {qIdx + 1} (*)</label>
                        <input
                          required
                          placeholder="Type question text... (*)"
                          value={q.question_text}
                          onChange={e => updateQuestion(qIdx, "question_text", e.target.value)}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus-ring outline-none"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {q.options.map((opt, oIdx) => (
                          <div key={oIdx}>
                            <label className="text-[10px] font-semibold text-slate-400 block">Option {chr(65+oIdx)} (*)</label>
                            <input
                              required
                              placeholder={`Option ${chr(65+oIdx)}`}
                              value={opt}
                              onChange={e => updateQuestionOption(qIdx, oIdx, e.target.value)}
                              className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs bg-white focus-ring outline-none"
                            />
                          </div>
                        ))}
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-ink-secondary block mb-1">Correct Option Text (*)</label>
                        <select
                          required
                          value={q.correct_answer}
                          onChange={e => updateQuestion(qIdx, "correct_answer", e.target.value)}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs bg-white focus-ring outline-none"
                        >
                          <option value="">-- Choose Correct Option --</option>
                          {q.options.map((opt, oIdx) => (
                            opt && <option key={oIdx} value={opt}>{chr(65+oIdx)}: {opt}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              ) : resourceForm.content_type === "Assignment" ? (
                // GRANTED ASSIGNMENT METADATA
                <div className="grid sm:grid-cols-2 gap-4 border-t border-slate-100 pt-4 animate-[fadeIn_.2s_ease]">
                  <div>
                    <label className="text-xs font-semibold text-ink-secondary block mb-1">Due Date (*)</label>
                    <input 
                      type="datetime-local"
                      required
                      value={resourceForm.due_date}
                      onChange={e => setResourceForm(f => ({ ...f, due_date: e.target.value }))}
                      className={`w-full rounded-xl border px-3 py-2.5 text-sm focus-ring outline-none ${
                        resourceErrors.due_date ? "border-danger" : "border-slate-200"
                      }`}
                    />
                    {resourceErrors.due_date && (
                      <p className="text-xs text-danger mt-1">{resourceErrors.due_date}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-ink-secondary block mb-1">Max Marks (*)</label>
                    <input 
                      type="number"
                      required
                      min={1}
                      value={resourceForm.max_marks}
                      onChange={e => setResourceForm(f => ({ ...f, max_marks: Number(e.target.value) }))}
                      className={`w-full rounded-xl border px-3 py-2.5 text-sm focus-ring outline-none ${
                        resourceErrors.max_marks ? "border-danger" : "border-slate-200"
                      }`}
                    />
                    {resourceErrors.max_marks && (
                      <p className="text-xs text-danger mt-1">{resourceErrors.max_marks}</p>
                    )}
                  </div>
                </div>
              ) : null}

              {/* Standard File upload or URL inputs */}
              {resourceForm.content_type !== "Quiz" && (
                <div className="border-t border-slate-100 pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-ink-secondary block">Attach Content File</span>
                    <span className="text-[10px] text-ink-secondary">Max 25MB (PDF, Video, ZIP, DOC, PPT, Audio, Image)</span>
                  </div>
                  <input 
                    type="file"
                    onChange={handleFileChange}
                    className="w-full rounded-xl border border-dashed border-slate-300 p-4 text-sm outline-none cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition-colors"
                  />
                  {resourceForm.file && (
                    <div className="text-xs font-semibold text-academic-green flex items-center gap-1">
                      <CheckCircle size={12} /> Selected file: {resourceForm.file.name}
                    </div>
                  )}
                  
                  <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-slate-200"></div>
                    <span className="flex-shrink mx-4 text-xs font-semibold text-slate-400">OR PROVIDE STATIC URL</span>
                    <div className="flex-grow border-t border-slate-200"></div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-ink-secondary block mb-1">Resource / Embed Link</label>
                    <input 
                      placeholder="e.g. https://youtube.com/... or https://drive.google.com/..."
                      value={resourceForm.resource_url}
                      onChange={e => setResourceForm(f => ({ ...f, resource_url: e.target.value }))}
                      className={`w-full rounded-xl border px-3 py-2.5 text-sm focus-ring outline-none ${
                        resourceErrors.resource_url ? "border-danger" : "border-slate-200"
                      }`}
                    />
                    {resourceErrors.resource_url && (
                      <p className="text-xs text-danger mt-1">{resourceErrors.resource_url}</p>
                    )}
                  </div>
                  {resourceErrors.quiz && (
                    <div className="text-sm text-danger bg-red-50 rounded-xl px-3 py-2 border border-danger/35">{resourceErrors.quiz}</div>
                  )}
                </div>
              )}

              <div className="flex gap-2 justify-end border-t border-slate-100 pt-4">
                <button 
                  type="button" 
                  disabled={uploading}
                  onClick={() => setShowResourceModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={uploading}
                  className="px-4 py-2 bg-academic-blue text-white rounded-xl text-sm font-semibold hover:bg-academic-blue/90 shadow-raised flex items-center gap-1.5 disabled:opacity-60"
                >
                  {uploading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Uploading...
                    </>
                  ) : "Publish Resource"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {forumCourseId && <CourseForum api={api} courseId={forumCourseId} role="teacher" onClose={() => setForumCourseId(null)} />}
      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}

// Sub-component to fetch and render resources in real-time under each lesson card
function LessonResourcesList({ lessonId }) {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    loadResources();
  }, [lessonId]);

  function loadResources() {
    // Actually we can load by query filtering, let's make an endpoint check or fallback
    // Since student CourseListView fetches nested resources, we can mock it here by querying the endpoint directly or returning empty
    // But wait, our django backend expects us to get resources. Can we query from the backend?
    // Let's call /teacher/lms/resources/?lesson_id=N
    setLoading(true);
    api.get(`/teacher/lms/resources/?lesson_id=${lessonId}`)
      .then(({ data }) => setResources(data))
      .catch(() => setResources([]))
      .finally(() => setLoading(false));
  }

  async function handleDelete(id) {
    if (!confirm("Are you sure you want to delete this resource?")) return;
    try {
      await api.delete(`/teacher/lms/resources/?id=${id}`);
      loadResources();
      setToast("Resource deleted.");
    } catch {
      setToast("Failed to delete resource.");
    }
  }

  if (loading) return <span className="text-[10px] text-slate-400">Loading resources...</span>;

  if (resources.length === 0) {
    return <p className="text-[11px] text-slate-400 italic">No resources uploaded to this lesson yet.</p>;
  }

  return (
    <div className="space-y-1.5 pl-4 border-l border-slate-200">
      {resources.map(r => {
        let Icon = FileText;
        if (r.content_type === "Video") Icon = Video;
        else if (r.content_type === "Link") Icon = Link;
        else if (r.content_type === "Quiz") Icon = QuizIcon;
        else if (r.content_type === "Assignment") Icon = FileCheck;

        return (
          <div key={r.id} className="flex items-center justify-between text-xs py-1.5 px-3 bg-white rounded-lg border border-slate-100 hover:shadow-sm transition-shadow">
            <a 
              href={r.resource_url} 
              target="_blank" 
              rel="noreferrer" 
              className="flex items-center gap-2 text-ink-primary hover:underline hover:text-academic-blue font-medium min-w-0"
            >
              <Icon size={14} className="text-academic-blue shrink-0" />
              <span className="truncate">{r.title}</span>
              <span className="text-[10px] bg-slate-100 text-slate-500 rounded px-1">{r.content_type}</span>
            </a>
            <div className="flex items-center gap-2 shrink-0">
              {r.max_marks && <span className="text-[10px] text-ink-secondary">{r.max_marks} marks</span>}
              <button 
                onClick={() => handleDelete(r.id)}
                className="text-red-400 hover:text-red-600 transition-colors"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        );
      })}
      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}

// Utility char conversion
const chr = (n) => String.fromCharCode(n);
