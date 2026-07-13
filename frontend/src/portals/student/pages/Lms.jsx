import { 
  CheckCircle2, Circle, FileText, MessageSquarePlus, PlayCircle, Radio, 
  Video, ArrowLeft, ChevronDown, ChevronRight, Lock, BookOpen, Clock, 
  ExternalLink, FileSpreadsheet, Play, Send, CheckCircle, UploadCloud, 
  HelpCircle, Award, Volume2, Image as ImageIcon, Sparkles, MessageSquare,
  RotateCw
} from "lucide-react";
import { useEffect, useState } from "react";
import { Card, EmptyState, Loader, Toast, Badge } from "../components/Common";
import api from "../lib/api";
import Quiz from "../components/Quiz";
import CourseForum from "../components/CourseForum";

const ICONS = {
  PDF: FileText,
  PDF_Notes: FileText,
  Video: Video,
  Video_Link: PlayCircle,
  Recorded_Video_File: Video,
  Live_Class_URL: Radio,
  PPT: FileSpreadsheet,
  Link: ExternalLink,
  Audio: Volume2,
  Image: ImageIcon,
  Notes: FileText,
  Quiz: HelpCircle,
  Assignment: FileSpreadsheet
};

export default function Lms() {
  const [courses, setCourses] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [completed, setCompleted] = useState({});
  const [toast, setToast] = useState("");
  
  const [hasPendingFees, setHasPendingFees] = useState(false);
  const [feesLoading, setFeesLoading] = useState(true);

  // Selection Flow States
  const [enrollments, setEnrollments] = useState([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");

  // Interaction States
  const [activeQuizId, setActiveQuizId] = useState(null);
  const [forumCourseId, setForumCourseId] = useState(null);
  const [expandedChapters, setExpandedChapters] = useState({});
  const [activeMedia, setActiveMedia] = useState(null); // { type, url, title, description, contentId }

  // Assignment upload states
  const [submittingAssignmentId, setSubmittingAssignmentId] = useState(null);
  const [assignmentFile, setAssignmentFile] = useState(null);
  const [submissionMode, setSubmissionMode] = useState("type"); // 'type' or 'upload'
  const [typedText, setTypedText] = useState("");
  const [uploadProgress, setUploadProgress] = useState("");
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    setFeesLoading(true);
    api.get("/student/fees/")
      .then(({ data }) => {
        setHasPendingFees(data.pending && data.pending.length > 0);
      })
      .catch(() => {})
      .finally(() => setFeesLoading(false));
    loadCourses();
  }, []);

  if (feesLoading) return <Loader rows={5} />;

  if (hasPendingFees) {
    return (
      <Card className="max-w-md mx-auto mt-12 p-8 text-center border-t-4 border-danger">
        <Lock size={48} className="text-danger mx-auto mb-4 animate-bounce" />
        <h3 className="font-heading text-lg font-bold text-ink-primary mb-2">Learning Management System Locked</h3>
        <p className="text-sm text-ink-secondary mb-6 leading-relaxed">
          Access to courses, lectures, quizzes, and digital notes is locked due to pending fee balance. Please clear your outstanding fees to restore access.
        </p>
        <a href="/student/fees" className="inline-flex items-center justify-center bg-academic-blue text-white rounded-xl py-2.5 px-6 text-sm font-semibold hover:bg-academic-blue/90 transition-colors shadow-md">
          Pay Pending Fees
        </a>
      </Card>
    );
  }

  function loadCourses(targetClassId = null) {
    const url = targetClassId ? `/student/courses/?class_id=${targetClassId}` : "/student/courses/";
    api.get(url)
      .then(({ data }) => {
        setEnrollments(data.enrollments || []);
        setCourses(data.courses || []);
        
        if (data.enrollments?.length > 0) {
          const first = data.enrollments[0];
          const activeClassId = targetClassId || selectedClassId || first.class_id;
          const match = data.enrollments.find(e => String(e.class_id) === String(activeClassId));
          if (match) {
            setSelectedAcademicYear(match.academic_year);
            setSelectedClassId(match.class_id);
          } else {
            setSelectedAcademicYear(first.academic_year);
            setSelectedClassId(first.class_id);
          }
        }
        
        // Track completed resources
        const compMap = {};
        const courseList = data.courses || [];
        courseList.forEach(c => {
          if (c.chapters) {
            c.chapters.forEach(ch => {
              if (ch.resources) {
                ch.resources.forEach(r => {
                  if (r.is_completed) compMap[r.id] = true;
                });
              }
              if (ch.lessons) {
                ch.lessons.forEach(l => {
                  if (l.resources) {
                    l.resources.forEach(r => {
                      if (r.is_completed) compMap[r.id] = true;
                    });
                  }
                });
              }
            });
          }
          if (c.legacy_content) {
            c.legacy_content.forEach(r => {
              if (r.is_completed) compMap[r.id] = true;
            });
          }
        });
        setCompleted(compMap);
      })
      .catch(() => {
        setCourses([]);
        setEnrollments([]);
      });
  }

  const handleYearChange = (year) => {
    setSelectedAcademicYear(year);
    const classesForYear = enrollments.filter(e => e.academic_year === year);
    if (classesForYear.length > 0) {
      const targetClass = classesForYear[0].class_id;
      setSelectedClassId(targetClass);
      loadCourses(targetClass);
    }
  };

  const handleClassChange = (classId) => {
    setSelectedClassId(classId);
    loadCourses(classId);
  };

  async function toggleComplete(contentId) {
    const isCurrentlyDone = completed[contentId];
    setCompleted((c) => ({ ...c, [contentId]: !isCurrentlyDone }));
    try {
      await api.post("/lms/mark-complete/", { content_id: contentId });
      setToast(isCurrentlyDone ? "Marked incomplete." : "Marked complete! Keep going! 🎉");
    } catch { 
      // Rollback on fail
      setCompleted((c) => ({ ...c, [contentId]: isCurrentlyDone }));
      setToast("Failed to update status.");
    }
  }

  const toggleChapter = (chapterId) => {
    setExpandedChapters(prev => ({ ...prev, [chapterId]: !prev[chapterId] }));
  };

  const getCourseProgress = (course) => {
    let total = 0;
    let done = 0;
    if (course.chapters) {
      course.chapters.forEach(ch => {
        if (ch.lessons) {
          ch.lessons.forEach(l => {
            if (l.resources) {
              l.resources.forEach(r => {
                total++;
                if (completed[r.id]) done++;
              });
            }
          });
        }
      });
    }
    if (course.legacy_content) {
      course.legacy_content.forEach(r => {
        total++;
        if (completed[r.id]) done++;
      });
    }
    if (total === 0) return 0;
    return Math.round((done / total) * 100);
  };

  // Submit assignment response
  async function handleAssignmentSubmit(assignmentId) {
    if (submissionMode === "type" && !typedText.trim()) {
      setErrorText("Please type your response first.");
      return;
    }
    if (submissionMode === "upload" && !assignmentFile) {
      setErrorText("Please pick a file to upload.");
      return;
    }

    setErrorText("");
    try {
      let submissionVal = typedText;
      if (submissionMode === "upload") {
        setUploadProgress("Uploading file to secure storage...");
        const fd = new FormData();
        fd.append("file", assignmentFile);
        fd.append("bucket", "assignmentsubmissions");
        const uploadResp = await api.post("/upload/", fd, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        submissionVal = uploadResp.data.url;
      }

      setUploadProgress("Submitting response...");
      await api.post(`/student/assignments/${assignmentId}/submit/`, { submission_url: submissionVal });
      
      setToast("Homework submitted successfully!");
      setAssignmentFile(null);
      setTypedText("");
      setSubmittingAssignmentId(null);
      loadCourses(); // Reload updated submission status
    } catch (err) {
      setErrorText("Submission failed. Please try again.");
    } finally {
      setUploadProgress("");
    }
  }

  if (!selectedCourse) {
    const uniqueAcademicYears = [...new Set(enrollments.map(e => e.academic_year))];
    const classesForYear = enrollments.filter(e => e.academic_year === selectedAcademicYear);

    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="font-heading text-2xl font-bold text-ink-primary">My LMS Courses</h2>
            <p className="text-sm text-ink-secondary">Select a course to view chapters, stream classes, and submit homework.</p>
          </div>

          {/* Academic Year and Class Selectors */}
          <div className="flex flex-col sm:flex-row gap-3 bg-white p-3 rounded-xl border border-slate-100 shadow-sm self-start md:self-auto">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-500 whitespace-nowrap">Academic Year:</label>
              <select
                value={selectedAcademicYear}
                onChange={e => handleYearChange(e.target.value)}
                className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold focus-ring outline-none bg-slate-50 cursor-pointer text-ink-primary"
              >
                {uniqueAcademicYears.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-500 whitespace-nowrap">Class:</label>
              <select
                value={selectedClassId}
                onChange={e => handleClassChange(e.target.value)}
                className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold focus-ring outline-none bg-slate-50 cursor-pointer text-ink-primary"
              >
                {classesForYear.map(c => (
                  <option key={c.class_id} value={c.class_id}>{c.class_name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {!courses ? (
          <Loader rows={4} />
        ) : !courses.length ? (
          <EmptyState label="No courses published for the selected class yet." />
        ) : (
          <div className="grid sm:grid-cols-2 gap-5 animate-[fadeIn_.2s_ease]">
            {courses.map(c => {
              const progress = getCourseProgress(c);
              return (
                <Card 
                  key={c.id} 
                  className="hover:border-academic-blue border border-slate-100 hover:shadow-raised transition-all cursor-pointer p-6"
                  onClick={() => {
                    setSelectedCourse(c);
                    // Expand the first chapter by default
                    if (c.chapters?.length > 0) {
                      setExpandedChapters({ [c.chapters[0].id]: true });
                    }
                  }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-heading font-bold text-lg text-ink-primary">{c.subject_name}</h3>
                      <p className="text-xs text-ink-secondary mt-0.5">{c.title}</p>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 bg-academic-blue/10 text-academic-blue rounded-full">
                      {progress}% Done
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-4">
                    <div className="bg-academic-blue h-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                  </div>
                  <p className="text-sm text-ink-secondary line-clamp-2 mb-4">{c.description || "Course description."}</p>
                  <div className="flex justify-end text-xs font-bold text-academic-blue">
                    Explore Syllabus &rarr;
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Active progress inside course explorer
  const progressPercent = getCourseProgress(selectedCourse);

  return (
    <div className="space-y-6">
      {/* Header and Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              setSelectedCourse(null);
              setActiveMedia(null);
            }}
            className="w-9 h-9 bg-white border border-slate-200 rounded-xl flex items-center justify-center hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft size={16} className="text-ink-secondary" />
          </button>
          <div>
            <h2 className="font-heading text-2xl font-bold text-ink-primary">{selectedCourse.subject_name}</h2>
            <p className="text-xs text-ink-secondary">{selectedCourse.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button
            onClick={() => {
              loadCourses();
              api.get("/student/courses/").then(({ data }) => {
                const updated = data.find(c => c.id === selectedCourse.id);
                if (updated) setSelectedCourse(updated);
              });
              setToast("Syllabus synced with teacher updates!");
            }}
            className="flex items-center gap-1.5 text-sm font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl px-4 py-2.5 shadow-sm transition-colors"
            title="Refresh course syllabus"
          >
            <RotateCw size={16} /> Sync Syllabus
          </button>
          <button
            onClick={() => setForumCourseId(selectedCourse.id)}
            className="flex items-center gap-1.5 text-sm font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-academic-blue rounded-xl px-4 py-2.5 shadow-sm transition-colors"
          >
            <MessageSquare size={16} /> Course Discussion Forum
          </button>
        </div>
      </div>

      {/* Progress Bar & Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-card flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex justify-between items-center text-sm font-bold text-ink-primary mb-1">
            <span>Overall Course Progress</span>
            <span>{progressPercent}% Complete</span>
          </div>
          <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
            <div className="bg-academic-green h-full transition-all duration-300" style={{ width: `${progressPercent}%` }}></div>
          </div>
        </div>
        <div className="text-xs text-ink-secondary text-center md:text-right font-medium">
          Complete resources and homework in order to unlock certificate.
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Course Outline & Accordion */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-heading font-semibold text-ink-primary text-base">Course Outline & Syllabus</h3>
          
          {selectedCourse.chapters?.length === 0 ? (
            <EmptyState label="No chapters published for this syllabus yet." />
          ) : (
            selectedCourse.chapters?.map((ch, idx) => {
              const isExpanded = expandedChapters[ch.id];
              return (
                <div key={ch.id} className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-card hover:shadow-raised transition-shadow">
                  {/* Chapter Header */}
                  <button 
                    onClick={() => toggleChapter(ch.id)}
                    className="w-full flex items-center justify-between p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className="min-w-0 pr-4">
                      <span className="text-[10px] font-bold text-academic-orange tracking-wider uppercase block mb-0.5">Chapter {idx + 1}</span>
                      <h4 className="font-heading font-bold text-ink-primary text-base truncate">{ch.title}</h4>
                      {ch.description && <p className="text-xs text-ink-secondary line-clamp-1 mt-0.5">{ch.description}</p>}
                    </div>
                    {isExpanded ? <ChevronDown size={18} className="text-slate-400 shrink-0" /> : <ChevronRight size={18} className="text-slate-400 shrink-0" />}
                  </button>

                  {/* Chapter Lessons */}
                  {isExpanded && (
                    <div className="p-4 space-y-4 border-t border-slate-50 animate-[fadeIn_.2s_ease]">
                      {/* Chapter Syllabus/Notes uploaded directly */}
                      {ch.resources?.length > 0 && (
                        <div className="space-y-2 border-b border-slate-100 pb-3 mb-2">
                          <p className="text-xs font-bold text-academic-blue uppercase tracking-wider">Chapter Syllabus & Notes</p>
                          {ch.resources.map(r => {
                            const isDone = completed[r.id];
                            return (
                              <div 
                                key={r.id}
                                className={`flex items-center gap-3 p-3 rounded-xl border bg-white hover:border-slate-300 transition-colors hover:shadow-sm ${isDone ? 'border-emerald-100 bg-emerald-50/10' : 'border-slate-100'}`}
                              >
                                <button 
                                  onClick={() => toggleComplete(r.id)}
                                  className="text-academic-green focus:outline-none shrink-0"
                                >
                                  {isDone ? <CheckCircle size={18} /> : <Circle size={18} className="text-slate-300 hover:text-slate-400" />}
                                </button>
                                <div 
                                  onClick={() => {
                                    window.open(r.resource_url, "_blank");
                                    if (!isDone) toggleComplete(r.id);
                                  }}
                                  className="flex-1 min-w-0 cursor-pointer flex items-center gap-2"
                                >
                                  <FileText size={14} className="text-academic-blue shrink-0" />
                                  <span className="text-sm font-semibold text-ink-primary hover:underline truncate">{r.title}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {!ch.lessons?.length ? (
                        <p className="text-xs text-ink-secondary italic">No lessons published in this chapter yet.</p>
                      ) : (
                        ch.lessons.map((les, lesIdx) => (
                          <div key={les.id} className="bg-slate-50/30 rounded-xl p-3 border border-slate-100/50 space-y-3">
                            <h5 className="font-heading font-bold text-xs text-ink-primary uppercase tracking-wide">
                              Lesson {idx + 1}.{lesIdx + 1}: {les.title}
                            </h5>
                            {les.description && <p className="text-xs text-ink-secondary">{les.description}</p>}
                            {/* Lesson Resources categorized */}
                            <div className="space-y-3 pt-2">
                              {(() => {
                                const resList = les.resources || [];
                                const types = [
                                  { key: "Video", label: "🎥 Videos", icon: Video },
                                  { key: "PDF", label: "📄 PDFs", icon: FileText },
                                  { key: "PPT", label: "📊 PPT Presentations", icon: FileSpreadsheet },
                                  { key: "Audio", label: "🎧 Audio Lectures", icon: Volume2 },
                                  { key: "Image", label: "🖼 Images & Diagrams", icon: ImageIcon },
                                  { key: "Notes", label: "📝 Lesson Notes", icon: FileText },
                                  { key: "Assignment", label: "📚 Assignments", icon: FileSpreadsheet },
                                  { key: "Quiz", label: "🧠 Quizzes / Tests", icon: HelpCircle }
                                ];
                                
                                const filteredTypes = types.map(t => ({
                                  ...t,
                                  items: resList.filter(r => r.content_type === t.key)
                                })).filter(t => t.items.length > 0);

                                if (filteredTypes.length === 0) {
                                  return <p className="text-[11px] text-slate-400 italic">No resources uploaded for this lesson yet.</p>;
                                }

                                return (
                                  <div className="space-y-3">
                                    {filteredTypes.map(t => {
                                      const TIcon = t.icon;
                                      return (
                                        <div key={t.key} className="space-y-1.5 border-l-2 border-academic-blue/20 pl-3">
                                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                            <TIcon size={12} className="text-academic-blue/70 shrink-0" />
                                            {t.label}
                                          </p>
                                          <div className="space-y-1.5">
                                            {t.items.map(r => {
                                              const isDone = completed[r.id];
                                              return (
                                                <div 
                                                  key={r.id} 
                                                  className={`flex items-center gap-3 p-2.5 rounded-lg border bg-white hover:border-slate-300 transition-colors hover:shadow-sm ${isDone ? 'border-emerald-100 bg-emerald-50/10' : 'border-slate-100'}`}
                                                >
                                                  {/* Completion Checkbox */}
                                                  <button 
                                                    onClick={() => toggleComplete(r.id)}
                                                    title={isDone ? "Mark incomplete" : "Mark as complete"}
                                                    className="text-academic-green focus:outline-none shrink-0"
                                                  >
                                                    {isDone ? <CheckCircle size={16} /> : <Circle size={16} className="text-slate-300 hover:text-slate-400" />}
                                                  </button>

                                                  {/* Resource Details */}
                                                  <div 
                                                    onClick={() => {
                                                      if (r.content_type === "Video") {
                                                        setActiveMedia({
                                                          type: "Video",
                                                          url: r.resource_url,
                                                          title: r.title,
                                                          description: r.description,
                                                          contentId: r.id
                                                        });
                                                      } else if (r.content_type === "Quiz") {
                                                        setActiveQuizId(r.quiz_id);
                                                      } else {
                                                        window.open(r.resource_url, "_blank");
                                                        if (!isDone) toggleComplete(r.id);
                                                      }
                                                    }}
                                                    className="flex-1 min-w-0 cursor-pointer"
                                                  >
                                                    <div className="flex items-center gap-1.5 font-semibold text-xs text-ink-primary hover:text-academic-blue">
                                                      <span className="truncate">{r.title}</span>
                                                    </div>
                                                    {r.description && <p className="text-[10px] text-slate-500 mt-0.5 truncate">{r.description}</p>}
                                                  </div>

                                                  {/* Additional Actions */}
                                                  <div className="shrink-0 text-xs text-ink-secondary font-medium">
                                                    {r.content_type === "Assignment" ? (
                                                      r.submission ? (
                                                        r.submission.marks_obtained !== null ? (
                                                          <Badge tone="green">{r.submission.marks_obtained}/{r.max_marks} marks</Badge>
                                                        ) : (
                                                          <Badge tone="orange">Awaiting Grade</Badge>
                                                        )
                                                      ) : (
                                                        <button 
                                                          onClick={() => setSubmittingAssignmentId(r.assignment_id)}
                                                          className="px-3 py-1 bg-academic-blue text-white text-[10px] rounded-lg hover:bg-academic-blue/90"
                                                        >
                                                          Write Test
                                                        </button>
                                                      )
                                                    ) : r.content_type === "Quiz" ? (
                                                      <button
                                                        onClick={() => setActiveQuizId(r.quiz_id)}
                                                        className="px-3 py-1 bg-academic-orange text-white text-[10px] rounded-lg hover:bg-academic-orange/90"
                                                      >
                                                        Write Test
                                                      </button>
                                                    ) : null}
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Legacy content files not assigned to a chapter */}
          {selectedCourse.legacy_content?.length > 0 && (
            <Card>
              <h4 className="font-heading font-semibold text-sm mb-3">Additional Downloads & References</h4>
              <div className="space-y-2">
                {selectedCourse.legacy_content.map(r => {
                  const isDone = completed[r.id];
                  return (
                    <div key={r.id} className="flex items-center gap-3 p-2 bg-slate-50 rounded-xl text-xs">
                      <button onClick={() => toggleComplete(r.id)} className="text-academic-green">
                        {isDone ? <CheckCircle size={16} /> : <Circle size={16} className="text-slate-300" />}
                      </button>
                      <a href={r.resource_url} target="_blank" rel="noreferrer" className="font-medium hover:underline truncate flex-1">
                        {r.title}
                      </a>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>

        {/* Media Player Column & Assignments submissions */}
        <div className="space-y-4">
          <h3 className="font-heading font-semibold text-ink-primary text-base">Active Player / Content</h3>
          
          {activeMedia ? (
            <Card className="space-y-3 border border-academic-blue bg-white shadow-raised animate-[fadeIn_.2s_ease]">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h4 className="font-heading font-bold text-sm text-ink-primary truncate">{activeMedia.title}</h4>
                <button 
                  onClick={() => setActiveMedia(null)}
                  className="text-xs text-ink-secondary hover:text-ink-primary font-semibold"
                >
                  Close
                </button>
              </div>

              {activeMedia.url.includes("youtube.com") || activeMedia.url.includes("youtu.be") ? (
                <div className="relative pt-[56.25%] rounded-lg overflow-hidden bg-black border border-slate-200">
                  <iframe 
                    className="absolute inset-0 w-full h-full"
                    src={`https://www.youtube.com/embed/${activeMedia.url.split("v=")[1]?.split("&")[0] || activeMedia.url.split("/").pop()}`}
                    title="Video player"
                    allowFullScreen
                  ></iframe>
                </div>
              ) : (
                <video 
                  controls 
                  src={activeMedia.url} 
                  className="w-full rounded-lg border border-slate-200 bg-black"
                ></video>
              )}

              {activeMedia.description && <p className="text-xs text-ink-secondary leading-relaxed bg-slate-50 p-2.5 rounded-lg">{activeMedia.description}</p>}
              
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => {
                    toggleComplete(activeMedia.contentId);
                  }}
                  className="text-xs flex items-center gap-1 bg-academic-green/10 text-academic-green hover:bg-academic-green/20 px-3 py-1.5 rounded-xl font-bold transition-all"
                >
                  <CheckCircle2 size={12} /> {completed[activeMedia.contentId] ? "Completed (Undo)" : "Mark Video Complete"}
                </button>
              </div>
            </Card>
          ) : (
            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400">
              <PlayCircle size={28} className="mx-auto mb-2 opacity-55 text-academic-blue" />
              <p className="text-xs">No video or media content selected. Select a lesson resource from the outline timeline to play it inline.</p>
            </div>
          )}

          {/* Discussion Forum Widget Shortcut */}
          <Card className="bg-gradient-to-br from-academic-blue/5 to-academic-blue/10 border border-academic-blue/20">
            <h4 className="font-heading font-bold text-sm text-academic-blue flex items-center gap-1.5">
              <Sparkles size={16} /> Need help? Ask the AI Tutor
            </h4>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Stuck on Chapter assignments or course quizzes? Use your side navigation chatbot for instantaneous explanation.
            </p>
          </Card>
        </div>
      </div>

      {/* SUBMIT ASSIGNMENT MODAL */}
      {submittingAssignmentId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-card p-6 w-full max-w-md shadow-raised animate-[fadeIn_.2s_ease]">
            <h4 className="font-heading font-bold text-base text-ink-primary mb-3">Submit Homework Assignment</h4>
            
            <div className="space-y-4">
              {/* Tab Selector */}
              <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setSubmissionMode("type")}
                  className={`flex-1 text-xs py-1.5 font-semibold rounded-lg transition-all ${submissionMode === "type" ? 'bg-white text-ink-primary shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Write Online
                </button>
                <button
                  type="button"
                  onClick={() => setSubmissionMode("upload")}
                  className={`flex-1 text-xs py-1.5 font-semibold rounded-lg transition-all ${submissionMode === "upload" ? 'bg-white text-ink-primary shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Upload File
                </button>
              </div>

              {submissionMode === "type" ? (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-ink-secondary block">Type your answers/response below:</label>
                  <textarea
                    required
                    rows={6}
                    placeholder="Start typing your response here..."
                    value={typedText}
                    onChange={e => setTypedText(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-3 text-sm focus-ring outline-none h-40"
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-ink-secondary">Select and upload your completed assignment document (PDF, TXT, DOCX):</p>
                  <input 
                    type="file"
                    onChange={e => setAssignmentFile(e.target.files[0])}
                    className="w-full text-xs"
                  />
                </div>
              )}

              {uploadProgress && <div className="text-xs text-academic-blue font-semibold">{uploadProgress}</div>}
              {errorText && <div className="text-xs text-red-500 font-semibold bg-red-50 p-2 rounded-lg">{errorText}</div>}
              
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  onClick={() => {
                    setSubmittingAssignmentId(null);
                    setAssignmentFile(null);
                    setTypedText("");
                    setErrorText("");
                  }}
                  className="px-3 py-1.5 border border-slate-200 text-ink-secondary text-xs rounded-xl font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleAssignmentSubmit(submittingAssignmentId)}
                  className="px-4 py-1.5 bg-academic-blue text-white text-xs rounded-xl font-semibold hover:bg-academic-blue/90"
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeQuizId && <Quiz courseId={selectedCourse.id} quizId={activeQuizId} onClose={() => setActiveQuizId(null)} />}
      {forumCourseId && <CourseForum api={api} courseId={forumCourseId} onClose={() => setForumCourseId(null)} />}
      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}
