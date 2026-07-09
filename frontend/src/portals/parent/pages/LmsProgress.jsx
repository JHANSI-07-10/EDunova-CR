import { 
  CheckCircle2, AlertTriangle, BookOpen, CalendarDays, Award, Clock, 
  ChevronRight, Smile, Bookmark, BookOpenCheck, Frown
} from "lucide-react";
import { useEffect, useState } from "react";
import { Card, EmptyState, Loader, SectionTitle } from "../components/Common";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";

export default function LmsProgress() {
  const { activeChildId } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeChildId) return;
    setLoading(true);
    api.get(`/parent/lms/progress/?child_id=${activeChildId}`)
      .then(({ data }) => setData(data))
      .catch(() => setData({ courses: [] }))
      .finally(() => setLoading(false));
  }, [activeChildId]);

  if (!activeChildId) {
    return <EmptyState label="Please select a child from the top bar to view their learning progress." />;
  }

  if (loading || !data) return <Loader rows={4} />;

  const courses = data.courses || [];
  const weakCourses = courses.filter(c => c.is_weak);
  const avgProgress = courses.length 
    ? Math.round(courses.reduce((s, c) => s + c.progress_percent, 0) / courses.length) 
    : 0;

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
                className={`border transition-all flex flex-col justify-between hover:shadow-raised ${c.is_weak ? 'border-amber-200 shadow-sm shadow-amber-50' : 'border-slate-100'}`}
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
