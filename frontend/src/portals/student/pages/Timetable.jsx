import { useEffect, useState, useMemo } from "react";
import {
  Clock,
  User,
  Building2,
  Link2,
  Coffee,
  Calendar,
  BookOpen,
  Users,
  BarChart3,
  LayoutGrid,
  List,
} from "lucide-react";
import { Card, EmptyState, Loader } from "../components/Common";
import api from "../lib/api";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_COLORS = {
  Monday:    { bg: "bg-blue-50",    text: "text-blue-700",    dot: "#3b82f6" },
  Tuesday:   { bg: "bg-purple-50",  text: "text-purple-700",  dot: "#8b5cf6" },
  Wednesday: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "#10b981" },
  Thursday:  { bg: "bg-amber-50",   text: "text-amber-700",   dot: "#f59e0b" },
  Friday:    { bg: "bg-red-50",     text: "text-red-700",     dot: "#ef4444" },
  Saturday:  { bg: "bg-indigo-50",  text: "text-indigo-700",  dot: "#6366f1" },
};

function fmt(t) {
  return t ? t.slice(0, 5) : "";
}

function todayName() {
  return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][new Date().getDay()];
}

export default function Timetable() {
  const [entries, setEntries] = useState(null);
  const [activeDay, setActiveDay] = useState(todayName());
  const [showWeekly, setShowWeekly] = useState(false);

  useEffect(() => {
    api
      .get("/student/timetable/")
      .then(({ data }) => setEntries(data))
      .catch(() => setEntries([]));
  }, []);

  const today = todayName();

  const lessons = useMemo(() => (entries || []).filter((e) => !e.is_break), [entries]);

  const stats = useMemo(() => {
    const totalPeriods = lessons.length;
    const uniqueSubjects = new Set(lessons.map((e) => e.subject_name)).size;
    const uniqueTeachers = new Set(lessons.filter((e) => e.teacher_name).map((e) => e.teacher_name)).size;
    return { totalPeriods, uniqueSubjects, uniqueTeachers };
  }, [lessons]);

  const activePeriods = useMemo(
    () =>
      (entries || [])
        .filter((e) => e.day_of_week === activeDay)
        .sort((a, b) => (a.start_time || "").localeCompare(b.start_time || "")),
    [entries, activeDay],
  );

  const byDay = useMemo(
    () =>
      DAYS.map((day) => ({
        day,
        periods: (entries || [])
          .filter((e) => e.day_of_week === day)
          .sort((a, b) => (a.start_time || "").localeCompare(b.start_time || "")),
      })).filter((d) => d.periods.length > 0),
    [entries],
  );

  if (!entries) return <Loader rows={6} />;
  if (!entries.length)
    return <EmptyState label="No timetable published for your class yet. Check back after the admin publishes the schedule." />;

  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-ink-primary">My Timetable</h1>
          <p className="text-sm text-ink-secondary mt-1">Your weekly class schedule</p>
        </div>
        <button
          onClick={() => setShowWeekly((v) => !v)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-white border border-slate-200 text-ink-secondary hover:bg-slate-50 transition-colors shrink-0 self-start"
        >
          {showWeekly ? <List size={16} /> : <LayoutGrid size={16} />}
          {showWeekly ? "Day View" : "Weekly Overview"}
        </button>
      </div>

      {/* ─── Stats ─── */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-xl p-4 flex items-center gap-3">
          <Clock size={20} className="text-academic-blue" />
          <div>
            <p className="text-2xl font-bold text-academic-blue">{stats.totalPeriods}</p>
            <p className="text-xs text-blue-600">Periods / Week</p>
          </div>
        </div>
        <div className="bg-purple-50 rounded-xl p-4 flex items-center gap-3">
          <BookOpen size={20} className="text-purple-600" />
          <div>
            <p className="text-2xl font-bold text-purple-700">{stats.uniqueSubjects}</p>
            <p className="text-xs text-purple-600">Subjects</p>
          </div>
        </div>
        <div className="bg-emerald-50 rounded-xl p-4 flex items-center gap-3">
          <Users size={20} className="text-emerald-600" />
          <div>
            <p className="text-2xl font-bold text-emerald-700">{stats.uniqueTeachers}</p>
            <p className="text-xs text-emerald-600">Teachers</p>
          </div>
        </div>
      </div>

      {/* ─── Day selector ─── */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {DAYS.map((day) => {
          const hasPeriods = entries.some((e) => e.day_of_week === day);
          const colors = DAY_COLORS[day];
          const isToday = day === today;
          const isActive = day === activeDay && !showWeekly;
          return (
            <button
              key={day}
              onClick={() => {
                setActiveDay(day);
                setShowWeekly(false);
              }}
              disabled={!hasPeriods}
              className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? `${colors.bg} ${colors.text} ring-2 ring-current/30 shadow-sm`
                  : hasPeriods
                    ? "bg-white border border-slate-200 text-ink-secondary hover:bg-slate-50"
                    : "bg-slate-50 text-slate-300 cursor-not-allowed"
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: hasPeriods ? colors.dot : "#cbd5e1" }}
                />
                <span>{day.slice(0, 3)}</span>
                {isToday && (
                  <span className="text-[9px] font-bold bg-academic-blue text-white px-1.5 py-0.5 rounded-full">
                    NOW
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* ─── Content ─── */}
      {!showWeekly ? (
        /* ── Day View ── */
        <div>
          <h2 className="font-heading font-semibold text-ink-primary mb-4 flex items-center gap-2">
            <Calendar size={18} className="text-slate-400" />
            {activeDay}
            {activeDay === today && (
              <span className="text-[10px] font-bold bg-academic-blue text-white px-2 py-0.5 rounded-full">
                Today
              </span>
            )}
          </h2>
          {activePeriods.length === 0 ? (
            <Card>
              <p className="text-center text-slate-400 py-8 text-sm">
                No classes on {activeDay}
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {activePeriods.map((p, idx) => {
                if (p.is_break) {
                  return (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200"
                    >
                      <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                        <Coffee size={16} className="text-amber-500" />
                      </div>
                      <span className="text-sm font-medium text-amber-700">
                        {p.break_label || "Break"}
                      </span>
                      <span className="ml-auto text-xs font-mono text-amber-500">
                        {fmt(p.start_time)} – {fmt(p.end_time)}
                      </span>
                    </div>
                  );
                }
                const colors = DAY_COLORS[activeDay];
                return (
                  <Card key={p.id} className="hover:shadow-md transition-all">
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-11 h-11 rounded-xl ${colors.bg} ${colors.text} flex items-center justify-center text-sm font-bold shrink-0`}
                      >
                        P{p.period_number || idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-ink-primary">{p.subject_name}</p>
                          <span
                            className={`text-xs font-mono font-semibold ${colors.text} ${colors.bg} px-2 py-1 rounded-lg shrink-0`}
                          >
                            {fmt(p.start_time)} – {fmt(p.end_time)}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-3 mt-2">
                          {p.teacher_name && (
                            <span className="flex items-center gap-1.5 text-xs text-slate-500">
                              <User size={12} className="shrink-0" />
                              {p.teacher_name}
                            </span>
                          )}
                          {p.room_number && (
                            <span className="flex items-center gap-1.5 text-xs text-slate-500">
                              <Building2 size={12} className="shrink-0" />
                              {p.room_number}
                            </span>
                          )}
                          {p.meeting_link && (
                            <a
                              href={p.meeting_link}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1.5 text-xs text-academic-blue hover:underline font-medium"
                            >
                              <Link2 size={12} />
                              Join Online
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ── Weekly Grid View ── */
        <div>
          <h2 className="font-heading font-semibold text-ink-primary mb-4 flex items-center gap-2">
            <LayoutGrid size={18} className="text-slate-400" />
            Weekly Overview
          </h2>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {byDay.map(({ day, periods }) => {
              const isToday = day === today;
              const colors = DAY_COLORS[day];
              const classCount = periods.filter((p) => !p.is_break).length;
              return (
                <Card
                  key={day}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    isToday ? "ring-2 ring-academic-blue/40" : ""
                  }`}
                  onClick={() => {
                    setActiveDay(day);
                    setShowWeekly(false);
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ background: colors.dot }}
                      />
                      <p className="font-heading font-bold text-ink-primary text-sm">{day}</p>
                      {isToday && (
                        <span className="text-[9px] font-bold bg-academic-blue text-white px-1.5 py-0.5 rounded-full">
                          TODAY
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400">
                      {classCount} class{classCount !== 1 ? "es" : ""}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {periods.slice(0, 5).map((p) => (
                      <div key={p.id} className="flex items-center gap-2 text-xs">
                        {p.is_break ? (
                          <>
                            <Coffee size={11} className="text-amber-400 shrink-0" />
                            <span className="text-amber-600">{p.break_label || "Break"}</span>
                            <span className="ml-auto text-amber-400 font-mono shrink-0">
                              {fmt(p.start_time)}
                            </span>
                          </>
                        ) : (
                          <>
                            <Clock size={11} className="text-slate-400 shrink-0" />
                            <span className="text-slate-600 truncate font-medium">
                              {p.subject_name}
                            </span>
                            <span className="ml-auto text-slate-400 font-mono shrink-0">
                              {fmt(p.start_time)}
                            </span>
                          </>
                        )}
                      </div>
                    ))}
                    {periods.length > 5 && (
                      <p className="text-xs text-slate-400 italic">
                        +{periods.length - 5} more
                      </p>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
