import {
  Video, PlayCircle, Clock, Bookmark, CheckCircle, Filter, Search
} from "lucide-react";
import { useEffect, useState } from "react";
import { Card, EmptyState, Loader, Badge } from "../components/Common";
import api from "../lib/api";

export default function RecordedClasses() {
  const [classes, setClasses] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [activeVideo, setActiveVideo] = useState(null);

  useEffect(() => {
    api.get("/lms/recorded-classes/")
      .then(({ data }) => setClasses(data))
      .catch(() => setClasses([]));
  }, []);

  if (classes === null) return <Loader rows={4} />;

  const filtered = classes.filter(rc => {
    if (filter === "bookmarked") return rc.progress?.bookmarked;
    if (filter === "completed") return rc.progress?.is_completed;
    if (filter === "in_progress") return rc.progress && !rc.progress?.is_completed && rc.progress?.last_position_seconds > 0;
    if (search) {
      const q = search.toLowerCase();
      return (rc.title || "").toLowerCase().includes(q) ||
             (rc.subject_name || "").toLowerCase().includes(q) ||
             (rc.course_title || "").toLowerCase().includes(q);
    }
    return true;
  });

  function formatDuration(seconds) {
    if (!seconds) return "0:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  async function toggleBookmark(rc) {
    try {
      await api.post("/lms/recorded-classes/progress/", {
        recorded_class_id: rc.id,
        bookmarked: !rc.progress?.bookmarked,
      });
      setClasses(prev => prev.map(c =>
        c.id === rc.id ? { ...c, progress: { ...c.progress, bookmarked: !c.progress?.bookmarked } } : c
      ));
    } catch { /* ignore */ }
  }

  async function handleProgressUpdate(rc, positionSeconds) {
    try {
      await api.post("/lms/recorded-classes/progress/", {
        recorded_class_id: rc.id,
        last_position_seconds: positionSeconds,
        is_completed: rc.duration_seconds > 0 && positionSeconds >= rc.duration_seconds * 0.9,
      });
    } catch { /* ignore */ }
  }

  return (
    <div className="space-y-6 animate-[fadeIn_.2s_ease]">
      <div>
        <h2 className="font-heading text-2xl font-bold text-ink-primary">Recorded Classes</h2>
        <p className="text-sm text-ink-secondary">Watch recorded lectures at your own pace.</p>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2 flex-wrap">
          {[
            { key: "all", label: "All" },
            { key: "in_progress", label: "In Progress" },
            { key: "completed", label: "Completed" },
            { key: "bookmarked", label: "Bookmarked" },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                filter === f.key ? "bg-academic-blue text-white shadow-md" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search recordings..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs outline-none focus-ring bg-slate-50/50"
          />
        </div>
      </div>

      {/* Video Player */}
      {activeVideo && (
        <Card className="border border-academic-blue shadow-raised">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-heading font-bold text-sm text-ink-primary truncate">{activeVideo.title}</h3>
            <button onClick={() => setActiveVideo(null)} className="text-xs text-ink-secondary hover:text-ink-primary font-semibold">
              Close Player
            </button>
          </div>
          <div className="relative pt-[56.25%] rounded-xl overflow-hidden bg-black border border-slate-200">
            {activeVideo.video_url?.includes("youtube.com") || activeVideo.video_url?.includes("youtu.be") ? (
              <iframe
                className="absolute inset-0 w-full h-full"
                src={`https://www.youtube.com/embed/${activeVideo.video_url.split("v=")[1]?.split("&")[0] || activeVideo.video_url.split("/").pop()}`}
                title={activeVideo.title}
                allowFullScreen
              />
            ) : (
              <video
                controls
                src={activeVideo.video_url}
                className="absolute inset-0 w-full h-full"
                onTimeUpdate={(e) => handleProgressUpdate(activeVideo, Math.floor(e.target.currentTime))}
                onEnded={() => handleProgressUpdate(activeVideo, activeVideo.duration_seconds || 99999)}
              />
            )}
          </div>
        </Card>
      )}

      {/* Recording Cards */}
      {filtered.length === 0 ? (
        <EmptyState label="No recorded classes found." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(rc => {
            const progress = rc.progress;
            const watchPercent = progress && rc.duration_seconds > 0
              ? Math.round((progress.last_position_seconds / rc.duration_seconds) * 100)
              : 0;

            return (
              <div
                key={rc.id}
                className="bg-white rounded-xl border border-slate-100 shadow-card hover:shadow-raised hover:border-academic-blue/30 transition-all cursor-pointer overflow-hidden group"
                onClick={() => setActiveVideo(rc)}
              >
                {/* Thumbnail */}
                <div className="relative aspect-video bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                  {rc.thumbnail_url ? (
                    <img src={rc.thumbnail_url} alt={rc.title} className="w-full h-full object-cover" />
                  ) : (
                    <Video size={32} className="text-slate-300" />
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                      <PlayCircle size={24} className="text-academic-blue ml-0.5" />
                    </div>
                  </div>
                  {rc.duration_seconds > 0 && (
                    <div className="absolute bottom-2 right-2 bg-black/75 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                      {formatDuration(rc.duration_seconds)}
                    </div>
                  )}
                  {progress?.bookmarked && (
                    <div className="absolute top-2 right-2">
                      <Bookmark size={16} className="text-academic-gold fill-academic-gold" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-3.5">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h4 className="font-heading font-bold text-sm text-ink-primary line-clamp-1">{rc.title}</h4>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleBookmark(rc); }}
                      className="shrink-0 p-1 hover:bg-slate-50 rounded-lg transition-colors"
                    >
                      <Bookmark size={14} className={progress?.bookmarked ? "text-academic-gold fill-academic-gold" : "text-slate-300"} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-ink-secondary mb-2">
                    <span>{rc.subject_name || rc.course_title}</span>
                    <span>·</span>
                    <span>{rc.teacher_name}</span>
                  </div>
                  {rc.duration_seconds > 0 && (
                    <div className="space-y-1">
                      <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${progress?.is_completed ? "bg-academic-green" : "bg-academic-blue"}`} style={{ width: `${watchPercent}%` }} />
                      </div>
                      <div className="flex justify-between text-[10px] text-ink-secondary">
                        <span>{progress?.is_completed ? "Completed" : watchPercent > 0 ? "In Progress" : "Not started"}</span>
                        {watchPercent > 0 && <span>{watchPercent}%</span>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
