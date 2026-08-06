import {
  Radio, Video, CalendarDays, Clock, ExternalLink, CheckCircle, Users,
  ArrowLeft, PlayCircle, BookOpen
} from "lucide-react";
import { useEffect, useState } from "react";
import { Card, EmptyState, Loader, Badge, Toast } from "../components/Common";
import api from "../lib/api";

export default function LiveClasses() {
  const [classes, setClasses] = useState(null);
  const [filter, setFilter] = useState("all");
  const [toast, setToast] = useState("");

  useEffect(() => {
    loadClasses();
  }, []);

  function loadClasses() {
    api.get("/lms/live-classes/")
      .then(({ data }) => setClasses(data))
      .catch(() => setClasses([]));
  }

  async function joinClass(lc) {
    try {
      await api.post("/lms/live-classes/attendance/", { live_class_id: lc.id });
      setToast("Attendance recorded! Joining class...");
      if (lc.meeting_link) {
        window.open(lc.meeting_link, "_blank");
      }
      loadClasses();
    } catch {
      setToast("Failed to record attendance.");
    }
  }

  if (classes === null) return <Loader rows={4} />;

  const now = new Date();
  const today = now.toISOString().split("T")[0];

  const filtered = classes.filter(lc => {
    if (filter === "today") return lc.scheduled_date === today;
    if (filter === "upcoming") return lc.scheduled_date >= today && lc.status === "Scheduled";
    if (filter === "completed") return lc.status === "Completed";
    if (filter === "live") return lc.status === "Live";
    return true;
  });

  const isToday = (d) => d === today;
  const isPast = (d, t) => {
    const classDate = new Date(`${d}T${t}`);
    return classDate < now;
  };

  return (
    <div className="space-y-6 animate-[fadeIn_.2s_ease]">
      <div>
        <h2 className="font-heading text-2xl font-bold text-ink-primary">Live Classes</h2>
        <p className="text-sm text-ink-secondary">Join scheduled live sessions with your teachers.</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: "all", label: "All" },
          { key: "today", label: "Today" },
          { key: "live", label: "Live Now" },
          { key: "upcoming", label: "Upcoming" },
          { key: "completed", label: "Completed" },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
              filter === f.key
                ? "bg-academic-blue text-white shadow-md"
                : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"
            }`}
          >
            {f.label}
            {f.key === "live" && (
              <span className="ml-1.5 inline-block w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState label="No live classes found for the selected filter." />
      ) : (
        <div className="space-y-3">
          {filtered.map(lc => (
            <Card key={lc.id} className={`border transition-all ${
              lc.status === "Live" ? "border-red-200 shadow-sm shadow-red-50" :
              lc.status === "Completed" ? "border-slate-100 opacity-80" :
              "border-slate-100 hover:border-academic-blue/50 hover:shadow-raised"
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                {/* Icon */}
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  lc.status === "Live" ? "bg-red-100 text-red-600" :
                  lc.status === "Completed" ? "bg-slate-100 text-slate-500" :
                  "bg-academic-blue/10 text-academic-blue"
                }`}>
                  {lc.status === "Live" ? <Radio size={22} className="animate-pulse" /> :
                   lc.status === "Completed" ? <CheckCircle size={22} /> :
                   <Video size={22} />}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-heading font-bold text-ink-primary text-sm truncate">{lc.title}</h3>
                    {lc.status === "Live" && <Badge tone="red">LIVE</Badge>}
                    {lc.status === "Completed" && <Badge tone="green">Completed</Badge>}
                    {lc.status === "Scheduled" && <Badge tone="blue">Scheduled</Badge>}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink-secondary">
                    <span className="flex items-center gap-1">
                      <BookOpen size={11} /> {lc.subject_name || lc.course_title}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users size={11} /> {lc.teacher_name}
                    </span>
                    <span className="flex items-center gap-1">
                      <CalendarDays size={11} /> {lc.scheduled_date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={11} /> {lc.start_time} - {lc.end_time}
                    </span>
                    {lc.meeting_platform && (
                      <Badge tone="slate">{lc.meeting_platform}</Badge>
                    )}
                  </div>
                  {lc.description && (
                    <p className="text-[11px] text-ink-secondary mt-1.5 line-clamp-1">{lc.description}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="shrink-0 flex items-center gap-2">
                  {lc.status === "Completed" && lc.recording_url ? (
                    <a
                      href={lc.recording_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 bg-academic-green/10 text-academic-green hover:bg-academic-green/20 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors"
                    >
                      <PlayCircle size={14} /> Watch Recording
                    </a>
                  ) : lc.status !== "Completed" ? (
                    <>
                      {lc.meeting_link && (
                        <button
                          onClick={() => joinClass(lc)}
                          className="flex items-center gap-1.5 bg-academic-blue text-white hover:bg-academic-blue/90 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-raised"
                        >
                          <Radio size={14} /> {lc.status === "Live" ? "Join Now" : "Join & Mark Attendance"}
                        </button>
                      )}
                      {!lc.meeting_link && (
                        <Badge tone="slate">No link provided</Badge>
                      )}
                    </>
                  ) : null}
                </div>
              </div>

              {/* Attendance info for completed classes */}
              {lc.status === "Completed" && lc.total_students > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 text-[10px] text-ink-secondary">
                  <Users size={11} />
                  {lc.attended_count || 0} of {lc.total_students} students attended
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}
