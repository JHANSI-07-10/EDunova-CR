import { useEffect, useState, useMemo } from "react";
import {
  Clock,
  BookOpen,
  Users,
  Calendar,
  LayoutGrid,
  List,
  BarChart3,
} from "lucide-react";
import { Card, EmptyState, Loader } from "../components/Common";
import api from "../lib/api";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_COLORS = {
  Monday:    { dot: "#3b82f6", bg: "bg-blue-50",    text: "text-blue-700" },
  Tuesday:   { dot: "#8b5cf6", bg: "bg-purple-50",  text: "text-purple-700" },
  Wednesday: { dot: "#10b981", bg: "bg-emerald-50", text: "text-emerald-700" },
  Thursday:  { dot: "#f59e0b", bg: "bg-amber-50",   text: "text-amber-700" },
  Friday:    { dot: "#ef4444", bg: "bg-red-50",     text: "text-red-700" },
  Saturday:  { dot: "#6366f1", bg: "bg-indigo-50",  text: "text-indigo-700" },
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
      .get("/teacher/timetable/")
      .then(({ data }) => setEntries(data))
      .catch(() => setEntries([]));
  }, []);

  const today = todayName();

  const stats = useMemo(() => {
    if (!entries) return { totalPeriods: 0, uniqueClasses: 0, uniqueSubjects: 0, dailyAvg: 0 };
    const totalPeriods = entries.length;
    const uniqueClasses = new Set(entries.map((e) => e.class_name)).size;
    const uniqueSubjects = new Set(entries.map((e) => e.subject_name)).size;
    const activeDays = new Set(entries.map((e) => e.day_of_week)).size;
    const dailyAvg = activeDays > 0 ? (totalPeriods / activeDays).toFixed(1) : 0;
    return { totalPeriods, uniqueClasses, uniqueSubjects, dailyAvg };
  }, [entries]);

  const activePeriods = useMemo(
    () =>
      (entries || [])
        .filter((e) => e.day_of_week === activeDay)
        .sort((a, b) => (a.start_time || "").localeCompare(b.start_time || "")),
    [entries, activeDay],
  );

  const groupedByClass = useMemo(() => {
    const map = new Map();
    activePeriods.forEach((p) => {
      const key = p.class_name || "Unknown Class";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(p);
    });
    return Array.from(map.entries());
  }, [activePeriods]);

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
    return <EmptyState label="No timetable assigned yet. Contact the administrator to get your teaching schedule." />;

  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-ink-primary">My Teaching Schedule</h1>
          <p className="text-sm text-ink-secondary mt-1">Your weekly timetable across all assigned classes</p>
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-xl p-4 flex items-center gap-3">
          <Clock size={20} className="text-academic-blue" />
          <div>
            <p className="text-2xl font-bold text-academic-blue">{stats.totalPeriods}</p>
            <p className="text-xs text-blue-600">Periods / Week</p>
          </div>
        </div>
        <div className="bg-emerald-50 rounded-xl p-4 flex items-center gap-3">
          <Users size={20} className="text-emerald-600" />
          <div>
            <p className="text-2xl font-bold text-emerald-700">{stats.uniqueClasses}</p>
            <p className="text-xs text-emerald-600">Classes</p>
          </div>
        </div>
        <div className="bg-purple-50 rounded-xl p-4 flex items-center gap-3">
          <BookOpen size={20} className="text-purple-600" />
          <div>
            <p className="text-2xl font-bold text-purple-700">{stats.uniqueSubjects}</p>
            <p className="text-xs text-purple-600">Subjects</p>
          </div>
        </div>
        <div className="bg-amber-50 rounded-xl p-4 flex items-center gap-3">
          <BarChart3 size={20} className="text-amber-600" />
          <div>
            <p className="text-2xl font-bold text-amber-700">{stats.dailyAvg}</p>
            <p className="text-xs text-amber-600">Daily Average</p>
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
                if (hasPeriods) {
                  setActiveDay(day);
                  setShowWeekly(false);
                }
              }}
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
                {day.slice(0, 3)}
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
          {groupedByClass.length === 0 ? (
            <Card>
              <p className="text-center text-slate-400 py-8 text-sm">
                No classes on {activeDay}
              </p>
            </Card>
          ) : (
            <div className="space-y-6">
              {groupedByClass.map(([className, periods]) => {
                const firstColor = DAY_COLORS[activeDay];
                return (
                  <div key={className}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: firstColor.dot }} />
                      <h3 className="font-heading font-bold text-sm text-ink-primary">
                        {className}
                      </h3>
                      <span className="text-xs text-slate-400">
                        {periods.length} period{periods.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="space-y-3 ml-1 border-l-2 border-slate-100 pl-4">
                      {periods.map((p) => {
                        const colors = DAY_COLORS[activeDay];
                        return (
                          <Card key={`${className}-${p.start_time}`} className="hover:shadow-md transition-all">
                            <div className="flex items-start gap-4">
                              <div className={`${colors.bg} ${colors.text} rounded-xl px-3 py-2 text-center shrink-0`}>
                                <p className="text-xs font-mono font-bold">{fmt(p.start_time)}</p>
                                <p className="text-[10px] text-current/60">–</p>
                                <p className="text-xs font-mono font-bold">{fmt(p.end_time)}</p>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-ink-primary">{p.subject_name}</p>
                                <p className="text-sm text-ink-secondary mt-0.5">{p.class_name}</p>
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
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
            Full Week View
          </h2>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {DAYS.map((day) => {
              const periods = (entries || [])
                .filter((e) => e.day_of_week === day)
                .sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""));
              const isToday = day === today;
              const colors = DAY_COLORS[day];
              return (
                <Card
                  key={day}
                  className={`cursor-pointer hover:shadow-md transition-all ${
                    isToday ? "ring-2 ring-academic-blue/40" : ""
                  }`}
                  onClick={() => {
                    if (periods.length) {
                      setActiveDay(day);
                      setShowWeekly(false);
                    }
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: colors.dot }} />
                      <p className="font-heading font-bold text-sm text-ink-primary">{day}</p>
                      {isToday && (
                        <span className="text-[9px] font-bold bg-academic-blue text-white px-1.5 py-0.5 rounded-full">
                          TODAY
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400">
                      {periods.length} period{periods.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {periods.length === 0 ? (
                    <p className="text-xs text-slate-300 italic">No classes</p>
                  ) : (
                    <div className="space-y-1.5">
                      {periods.map((p, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <Clock size={11} className="text-slate-400 shrink-0" />
                          <span className="text-slate-600 truncate font-medium">{p.class_name}</span>
                          <span className="text-slate-400 truncate">{p.subject_name}</span>
                          <span className="ml-auto text-slate-400 font-mono shrink-0">
                            {fmt(p.start_time)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
