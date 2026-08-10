import { 
  CheckCircle2, AlertTriangle, BookOpen, CalendarDays, Award, Clock, 
  ChevronRight, Smile, Bookmark, BookOpenCheck, Frown, ArrowLeft,
  CheckCircle, Circle, PlayCircle, FileText, FileSpreadsheet, Volume2,
  Image as ImageIcon, HelpCircle, ChevronDown
} from "lucide-react";
import { useEffect, useState } from "react";
import { Card, EmptyState, Loader, SectionTitle, Badge } from "../../shared/components/Common";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";

export default function LmsProgress() {
  const { activeChildId } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Drill down syllabus states
  const [activeCourseId, setActiveCourseId] = useState(null);
  const [courseDetails, setCourseDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [expandedChapters, setExpandedChapters] = useState({});

  useEffect(() => {
    if (!activeChildId) return;
    setLoading(true);
    setActiveCourseId(null);
    setCourseDetails(null);
    api.get(`/parent/lms/progress/?child_id=${activeChildId}`)
      .then(({ data }) => setData(data))
      .catch(() => setData({ courses: [] }))
      .finally(() => setLoading(false));
  }, [activeChildId]);

  const handleCourseClick = (courseId) => {
    setActiveCourseId(courseId);
    setDetailsLoading(true);
    api.get(`/parent/lms/progress/?child_id=${activeChildId}&course_id=${courseId}`)
      .then(({ data }) => {
        setCourseDetails(data);
        if (data.chapters?.length > 0) {
          setExpandedChapters({ [data.chapters[0].id]: true });
        }
      })
      .catch(() => setCourseDetails(null))
      .finally(() => setDetailsLoading(false));
  };

  if (!activeChildId) {
    return <EmptyState label="Please select a child from the top bar to view their learning progress." />;
  }

  if (loading || !data) return <Loader rows={4} />;

  const courses = data.courses || [];
  const weakCourses = courses.filter(c => c.is_weak);
  const avgProgress = courses.length 
    ? Math.round(courses.reduce((s, c) => s + c.progress_percent, 0) / courses.length) 
    : 0;

  if (activeCourseId) {
    if (detailsLoading || !courseDetails) return <Loader rows={5} />;

    return (
      <div className="space-y-6 animate-[fadeIn_.2s_ease]">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              setActiveCourseId(null);
              setCourseDetails(null);
            }}
            className="w-9 h-9 bg-white border border-slate-200 rounded-xl flex items-center justify-center hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft size={16} className="text-ink-secondary" />
          </button>
          <div>
            <h2 className="font-heading text-xl font-bold text-ink-primary">{courseDetails.title}</h2>
            <p className="text-xs text-ink-secondary">Detailed child completion stats for chapters and lessons.</p>
          </div>
        </div>

        {/* Chapters Outline */}
        <div className="space-y-4">
          {!courseDetails.chapters?.length ? (
            <EmptyState label="No chapters published for this subject yet." />
          ) : (
            courseDetails.chapters.map((ch, idx) => {
              const isExpanded = expandedChapters[ch.id];
              return (
                <div key={ch.id} className="bg-white rounded-card border border-slate-100/85 overflow-hidden shadow-sm">
                  {/* Chapter Header Accordion */}
                  <button 
                    onClick={() => setExpandedChapters(p => ({ ...p, [ch.id]: !p[ch.id] }))}
                    className="w-full flex items-center justify-between p-4 hover:bg-slate-50/50 transition-colors text-left outline-none"
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
                    <div className="p-4 space-y-4 border-t border-slate-50 bg-slate-50/10 animate-[fadeIn_.2s_ease]">
                      {ch.resources?.length > 0 && (
                        <div className="space-y-2 border-b border-slate-100 pb-3 mb-2">
                          <p className="text-xs font-bold text-academic-blue uppercase tracking-wider">Chapter Syllabus & Notes</p>
                          {ch.resources.map(r => (
                            <div key={r.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-100 bg-white">
                              <span className="text-academic-green">
                                {r.is_completed ? <CheckCircle size={16} /> : <Circle size={16} className="text-slate-300" />}
                              </span>
                              <div className="flex-1 min-w-0">
                                <span className="text-xs font-semibold text-ink-primary block truncate">{r.title}</span>
                              </div>
                            </div>
                          ))}
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
                            <div className="space-y-3 pt-1">
                              {(() => {
                                const resList = les.resources || [];
                                const types = [
                                  { key: "Video", label: "🎥 Videos", icon: PlayCircle },
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
                                  return <p className="text-[11px] text-slate-400 italic">No study resources uploaded for this lesson yet.</p>;
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
                                              const isDone = r.is_completed;
                                              return (
                                                <div 
                                                  key={r.id} 
                                                  className={`flex items-center justify-between p-2.5 rounded-lg border bg-white ${isDone ? 'border-emerald-100 bg-emerald-50/5' : 'border-slate-100'}`}
                                                >
                                                  <div className="flex items-center gap-2 min-w-0">
                                                    <span className="text-academic-green shrink-0">
                                                      {isDone ? <CheckCircle size={15} /> : <Circle size={15} className="text-slate-300" />}
                                                    </span>
                                                    <span className="text-xs font-semibold text-ink-primary truncate">{r.title}</span>
                                                  </div>
                                                  
                                                  {/* Marks or submissions */}
                                                  {r.content_type === "Assignment" && r.submission && (
                                                    <div className="text-[10px] font-bold text-academic-blue bg-academic-blue/5 px-2 py-0.5 rounded-md">
                                                      {r.submission.marks_obtained !== null ? `Score: ${r.submission.marks_obtained}/${r.max_marks}` : 'Submitted'}
                                                    </div>
                                                  )}
                                                  {r.content_type === "Quiz" && isDone && (
                                                    <Badge tone="green">Completed</Badge>
                                                  )}
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
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-[fadeIn_.2s_ease]">
      <div>
        <h2 className="font-heading text-2xl font-bold text-ink-primary">Learning Progress Monitor</h2>
        <p className="text-sm text-ink-secondary">Review child's completed chapters, marks, teacher feedback, and upcoming tests.</p>
      </div>

      {/* Child Summary Stats Grid */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-card shadow-card p-5 border border-slate-100 flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-academic-blue/10 text-academic-blue flex items-center justify-center shrink-0">
            <BookOpen size={20} />
          </div>
          <div>
            <p className="text-ink-secondary text-xs font-semibold uppercase tracking-wider">Total Subjects</p>
            <p className="text-2xl font-bold font-numeric text-ink-primary mt-0.5">{courses.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-card shadow-card p-5 border border-slate-100 flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-academic-green/10 text-academic-green flex items-center justify-center shrink-0">
            <BookOpenCheck size={20} />
          </div>
          <div>
            <p className="text-ink-secondary text-xs font-semibold uppercase tracking-wider">Avg Syllabus Progress</p>
            <p className="text-2xl font-bold font-numeric text-ink-primary mt-0.5">{avgProgress}%</p>
          </div>
        </div>

        <div className="bg-white rounded-card shadow-card p-5 border border-slate-100 flex items-start gap-4">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${weakCourses.length > 0 ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-academic-green'}`}>
            {weakCourses.length > 0 ? <AlertTriangle size={20} /> : <Smile size={20} />}
          </div>
          <div>
            <p className="text-ink-secondary text-xs font-semibold uppercase tracking-wider">Focus Subjects</p>
            <p className="text-2xl font-bold font-numeric text-ink-primary mt-0.5">
              {weakCourses.length > 0 ? `${weakCourses.length} Subject(s)` : "None (Great Job!)"}
            </p>
          </div>
        </div>
      </div>

      {/* Weak Subjects Warning */}
      {weakCourses.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-amber-800 text-sm">
          <AlertTriangle className="shrink-0 text-amber-600" size={20} />
          <div>
            <p className="font-semibold">Action Required: Weak Subject Performance Warning</p>
            <p className="mt-0.5 text-xs text-amber-700">
              Your child has scored below 50% on average in: <strong>{weakCourses.map(c => c.subject_name).join(", ")}</strong>. Please review teacher remarks and assignment scores below.
            </p>
          </div>
        </div>
      )}

      {/* Course List Card Grid */}
      <div className="space-y-4">
        <SectionTitle>Subject breakdown</SectionTitle>
        {courses.length === 0 ? (
          <EmptyState label="No active LMS courses enrolled for this child." />
        ) : (
          <div className="grid md:grid-cols-2 gap-5">
            {courses.map(c => (
              <Card 
                key={c.id} 
                className={`border transition-all flex flex-col justify-between hover:shadow-raised cursor-pointer hover:border-academic-blue/80 ${c.is_weak ? 'border-amber-200 shadow-sm shadow-amber-50' : 'border-slate-100'}`}
                onClick={() => handleCourseClick(c.id)}
              >
                <div>
                  {/* Course Header */}
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-heading font-bold text-base text-ink-primary">{c.subject_name}</h4>
                      <p className="text-xs text-ink-secondary">{c.course_title}</p>
                    </div>
                    {c.is_weak && (
                      <span className="text-[10px] bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full border border-amber-200 uppercase tracking-wide">
                        Focus Subject
                      </span>
                    )}
                  </div>

                  {/* Progress Ring / Bar */}
                  <div className="my-4">
                    <div className="flex justify-between items-center text-xs font-semibold text-ink-secondary mb-1">
                      <span>Syllabus Progress</span>
                      <span>{c.progress_percent}% ({c.completed_resources}/{c.total_resources} resources)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${c.is_weak ? 'bg-amber-500' : 'bg-academic-green'}`} 
                        style={{ width: `${c.progress_percent}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Progress Details Grid */}
                  <div className="grid grid-cols-2 gap-3 text-xs text-ink-secondary border-t border-slate-50 pt-3 mb-4">
                    <div>
                      <span className="font-semibold text-slate-400 block uppercase text-[10px]">Chapters Completed</span>
                      <span className="font-bold text-ink-primary">{c.chapters_completed} / {c.chapters_total}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-400 block uppercase text-[10px]">Subject Attendance</span>
                      <span className="font-bold text-ink-primary">{c.attendance_percent}%</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-400 block uppercase text-[10px]">Assignments Submitted</span>
                      <span className="font-bold text-ink-primary">{c.assignments_completed} / {c.assignments_total}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-400 block uppercase text-[10px]">Quizzes Taken</span>
                      <span className="font-bold text-ink-primary">{c.quizzes_total} quiz(zes)</span>
                    </div>
                  </div>

                  {/* Upcoming Tests timeline */}
                  {c.upcoming_tests && c.upcoming_tests.length > 0 && (
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100/50 mb-4 text-xs">
                      <p className="font-semibold text-ink-primary mb-1.5 flex items-center gap-1">
                        <Clock size={12} className="text-academic-blue" /> Upcoming Tests
                      </p>
                      <div className="space-y-1">
                        {c.upcoming_tests.map((test, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-white px-2 py-1 rounded border border-slate-100">
                            <span className="font-medium truncate max-w-[150px]">{test.exam_name.replace(/_/g, ' ')}</span>
                            <span className="text-[10px] text-ink-secondary shrink-0 font-semibold">{test.exam_date}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Teacher Feedback / Remarks */}
                  {c.recent_remark && (
                    <div className="p-3 bg-academic-blue/5 border border-academic-blue/10 rounded-xl text-xs">
                      <span className="font-bold text-academic-blue block mb-0.5">Subject Teacher Remarks</span>
                      <p className="text-slate-700 italic leading-relaxed">"{c.recent_remark}"</p>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
