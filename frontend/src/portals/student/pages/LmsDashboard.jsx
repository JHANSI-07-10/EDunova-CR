import {
  BookOpen, Clock, CalendarDays, FileText, HelpCircle, Radio, Video,
  Award, Bell, TrendingUp, ChevronRight, CheckCircle, AlertTriangle,
  Sparkles, ArrowRight
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, EmptyState, Loader, Badge, StatCard } from "../components/Common";
import api from "../lib/api";

export default function LmsDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/student/lms/dashboard/")
      .then(({ data }) => setData(data))
      .catch(() => setData({
        active_courses: [], today_classes: [], pending_assignments: 0,
        pending_quizzes: 0, pending_homework: 0, recent_announcements: [],
        learning_progress: [],
      }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader rows={6} />;
  if (!data) return <EmptyState label="Failed to load dashboard data." />;

  const {
    active_courses = [], today_classes = [], pending_assignments = 0,
    pending_quizzes = 0, pending_homework = 0, recent_announcements = [],
    learning_progress = [],
  } = data;

  const totalPending = pending_assignments + pending_quizzes + pending_homework;
  const avgProgress = learning_progress.length
    ? Math.round(learning_progress.reduce((s, p) => s + p.progress_percent, 0) / learning_progress.length)
    : 0;

  return (
    <div className="space-y-6 animate-[fadeIn_.2s_ease]">
      <div>
        <h2 className="font-heading text-2xl font-bold text-ink-primary">LMS Dashboard</h2>
        <p className="text-sm text-ink-secondary">Your learning hub — track courses, classes, and progress.</p>
      </div>

      {/* Stats Row */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={BookOpen} label="Active Courses" value={active_courses.length} accent="blue" />
        <StatCard icon={TrendingUp} label="Avg Progress" value={`${avgProgress}%`} accent="green" />
        <StatCard icon={FileText} label="Pending Work" value={totalPending} accent="orange"
          sub={`${pending_assignments} assignments · ${pending_quizzes} quizzes · ${pending_homework} homework`} />
        <StatCard icon={Bell} label="Announcements" value={recent_announcements.length} accent="gold" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Schedule */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-bold text-sm text-ink-primary flex items-center gap-2">
                <CalendarDays size={16} className="text-academic-blue" /> Today's Schedule
              </h3>
              <Badge tone={today_classes.length > 0 ? "blue" : "slate"}>
                {today_classes.length} class{today_classes.length !== 1 ? "es" : ""}
              </Badge>
            </div>
            {today_classes.length === 0 ? (
              <p className="text-xs text-ink-secondary py-4 text-center">No classes scheduled for today. Enjoy your free time!</p>
            ) : (
              <div className="space-y-2">
                {today_classes.map((cls, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50/50 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-academic-blue/10 text-academic-blue flex items-center justify-center shrink-0">
                      {cls.meeting_link ? <Radio size={18} /> : <Clock size={18} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-ink-primary truncate">{cls.subject_name || cls.title}</p>
                      <p className="text-[11px] text-ink-secondary">
                        {cls.start_time} - {cls.end_time}
                        {cls.meeting_platform && ` · ${cls.meeting_platform}`}
                        {cls.class_name && ` · ${cls.class_name}`}
                      </p>
                    </div>
                    {cls.meeting_link && (
                      <a
                        href={cls.meeting_link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-bold text-academic-blue hover:underline flex items-center gap-1 shrink-0"
                      >
                        Join <ArrowRight size={12} />
                      </a>
                    )}
                    {cls.status && (
                      <Badge tone={cls.status === "Live" ? "red" : cls.status === "Completed" ? "green" : "blue"}>
                        {cls.status}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Course Progress */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-bold text-sm text-ink-primary flex items-center gap-2">
                <TrendingUp size={16} className="text-academic-green" /> Course Progress
              </h3>
              <button
                onClick={() => navigate("/student/lms")}
                className="text-xs font-bold text-academic-blue hover:underline flex items-center gap-1"
              >
                View All <ChevronRight size={12} />
              </button>
            </div>
            {learning_progress.length === 0 ? (
              <p className="text-xs text-ink-secondary py-4 text-center">No course progress data yet.</p>
            ) : (
              <div className="space-y-3">
                {learning_progress.map((p, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-ink-primary">{p.subject_name}</span>
                      <span className="font-bold text-ink-secondary">{p.progress_percent}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          p.progress_percent >= 80 ? "bg-academic-green" :
                          p.progress_percent >= 40 ? "bg-academic-blue" : "bg-academic-orange"
                        }`}
                        style={{ width: `${p.progress_percent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Active Courses Quick Access */}
          <Card>
            <h3 className="font-heading font-bold text-sm text-ink-primary flex items-center gap-2 mb-4">
              <BookOpen size={16} className="text-academic-orange" /> Active Courses
            </h3>
            {active_courses.length === 0 ? (
              <EmptyState label="No active courses enrolled." />
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {active_courses.slice(0, 6).map((c) => {
                  const progress = c.progress_percent || 0;
                  return (
                    <div
                      key={c.id}
                      onClick={() => navigate("/student/lms")}
                      className="p-3 rounded-xl border border-slate-100 hover:border-academic-blue/50 hover:shadow-sm transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-academic-blue/10 text-academic-blue flex items-center justify-center shrink-0">
                          <BookOpen size={14} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-ink-primary truncate">{c.subject_name}</p>
                          <p className="text-[10px] text-ink-secondary truncate">{c.title}</p>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-academic-blue h-full rounded-full" style={{ width: `${progress}%` }} />
                      </div>
                      <div className="flex justify-between mt-1.5">
                        <span className="text-[10px] text-ink-secondary">{c.completed_content}/{c.total_content} items</span>
                        <span className="text-[10px] font-bold text-academic-blue">{progress}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Pending Tasks */}
          <Card className="bg-gradient-to-br from-academic-orange/5 to-academic-orange/10 border border-academic-orange/20">
            <h3 className="font-heading font-bold text-sm text-academic-orange flex items-center gap-2 mb-3">
              <AlertTriangle size={16} /> Pending Tasks
            </h3>
            <div className="space-y-2">
              {pending_assignments > 0 && (
                <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-100">
                  <span className="text-xs font-semibold text-ink-primary flex items-center gap-1.5">
                    <FileText size={13} className="text-academic-blue" /> Assignments
                  </span>
                  <Badge tone="orange">{pending_assignments}</Badge>
                </div>
              )}
              {pending_quizzes > 0 && (
                <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-100">
                  <span className="text-xs font-semibold text-ink-primary flex items-center gap-1.5">
                    <HelpCircle size={13} className="text-academic-green" /> Quizzes
                  </span>
                  <Badge tone="blue">{pending_quizzes}</Badge>
                </div>
              )}
              {pending_homework > 0 && (
                <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-100">
                  <span className="text-xs font-semibold text-ink-primary flex items-center gap-1.5">
                    <BookOpen size={13} className="text-academic-orange" /> Homework
                  </span>
                  <Badge tone="gold">{pending_homework}</Badge>
                </div>
              )}
              {totalPending === 0 && (
                <div className="text-center py-3">
                  <CheckCircle size={24} className="text-academic-green mx-auto mb-2" />
                  <p className="text-xs text-ink-secondary">All caught up! Great job!</p>
                </div>
              )}
            </div>
          </Card>

          {/* Recent Announcements */}
          <Card>
            <h3 className="font-heading font-bold text-sm text-ink-primary flex items-center gap-2 mb-3">
              <Bell size={16} className="text-academic-gold" /> Recent Announcements
            </h3>
            {recent_announcements.length === 0 ? (
              <p className="text-xs text-ink-secondary text-center py-3">No recent announcements.</p>
            ) : (
              <div className="space-y-2">
                {recent_announcements.slice(0, 5).map((a) => (
                  <div key={a.id} className="p-2.5 bg-slate-50/50 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold text-ink-primary line-clamp-1">{a.title}</p>
                      {a.priority === "Urgent" && <Badge tone="red">Urgent</Badge>}
                      {a.priority === "High" && <Badge tone="orange">High</Badge>}
                    </div>
                    <p className="text-[11px] text-ink-secondary line-clamp-2 mt-0.5">{a.message}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] text-slate-400">{a.teacher_name}</span>
                      <span className="text-[10px] text-slate-300">·</span>
                      <span className="text-[10px] text-slate-400">{new Date(a.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Quick Links */}
          <Card className="bg-gradient-to-br from-academic-blue/5 to-academic-blue/10 border border-academic-blue/20">
            <h3 className="font-heading font-bold text-sm text-academic-blue flex items-center gap-2 mb-3">
              <Sparkles size={16} /> Quick Links
            </h3>
            <div className="space-y-1.5">
              <button onClick={() => navigate("/student/lms")} className="w-full text-left text-xs font-semibold text-ink-primary hover:text-academic-blue p-2 rounded-lg hover:bg-white transition-colors flex items-center gap-2">
                <BookOpen size={13} /> My Courses
              </button>
              <button onClick={() => navigate("/student/homework")} className="w-full text-left text-xs font-semibold text-ink-primary hover:text-academic-blue p-2 rounded-lg hover:bg-white transition-colors flex items-center gap-2">
                <FileText size={13} /> Homework
              </button>
              <button onClick={() => navigate("/student/assignments")} className="w-full text-left text-xs font-semibold text-ink-primary hover:text-academic-blue p-2 rounded-lg hover:bg-white transition-colors flex items-center gap-2">
                <CheckCircle size={13} /> Assignments
              </button>
              <button onClick={() => navigate("/student/certificates")} className="w-full text-left text-xs font-semibold text-ink-primary hover:text-academic-blue p-2 rounded-lg hover:bg-white transition-colors flex items-center gap-2">
                <Award size={13} /> Certificates
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
