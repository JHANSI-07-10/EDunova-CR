import { 
  Plus, Trash2, BookOpen, FileText, Video, HardDrive, 
  Settings, ShieldAlert, BarChart3, Clock, User, CheckCircle, Search
} from "lucide-react";
import { useEffect, useState } from "react";
import { Card, EmptyState, Loader, SectionTitle, StatCard, Toast } from "../components/Common";
import api from "../lib/api";

export default function LmsMonitor() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("uploads");
  const [aiLogs, setAiLogs] = useState([]);

  useEffect(() => {
    loadAnalytics();
  }, []);

  function loadAnalytics() {
    setLoading(true);
    api.get("/admin-portal/lms/analytics/")
      .then(({ data }) => setData(data))
      .catch(() => setData({ uploads: [], stats: {} }))
      .finally(() => setLoading(false));

    api.get("/admin-portal/lms/ai-usage/")
      .then(({ data }) => setAiLogs(data))
      .catch(() => setAiLogs([]));
  }

  async function handleDelete(id) {
    if (!confirm("Are you sure you want to delete this learning resource? This will remove the file from all lesson views, including quizzes or assignments attached to it.")) return;
    try {
      await api.delete(`/admin-portal/lms/analytics/?id=${id}`);
      setToast("Resource deleted successfully by Admin.");
      loadAnalytics();
    } catch {
      setToast("Failed to delete resource.");
    }
  }

  if (loading || !data) return <Loader rows={4} />;

  const stats = data.stats || {};
  const uploads = data.uploads || [];

  const filteredUploads = uploads.filter(u => 
    u.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.teacher_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.subject_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAiLogs = aiLogs.filter(log => 
    log.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.subject_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.question.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-[fadeIn_.2s_ease]">
      <div>
        <h2 className="font-heading text-2xl font-bold text-ink-primary">LMS Monitoring Control</h2>
        <p className="text-sm text-ink-secondary font-sub">Monitor school-wide file uploads, check storage capacity, and manage learning assets.</p>
      </div>

      {/* Admin stats dashboard */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={BookOpen} label="Total Courses" value={stats.total_courses || 0} accent="blue" />
        <StatCard icon={BarChart3} label="Syllabus Assets" value={stats.total_resources || 0} accent="green" sub={`${stats.total_chapters || 0} chapters · ${stats.total_lessons || 0} lessons`} />
        <StatCard icon={HardDrive} label="Storage Consumed" value={`${stats.estimated_storage_mb || 0} MB`} accent="orange" sub="Estimated file sizes" />
        <StatCard icon={ShieldAlert} label="Global Policies" value="Active" accent="gold" sub="Admin overrides enabled" />
      </div>

      {/* Tab selection */}
      <div className="flex gap-2 border-b border-slate-100 pb-3">
        <button
          onClick={() => setActiveTab("uploads")}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all ${
            activeTab === "uploads" ? "bg-academic-blue text-white shadow-md" : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          Recent Uploads Audit
        </button>
        <button
          onClick={() => setActiveTab("ai")}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all ${
            activeTab === "ai" ? "bg-academic-blue text-white shadow-md" : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          AI Tutor Activity Audit
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main auditing table */}
        <div className="lg:col-span-2 space-y-4">
          {activeTab === "uploads" ? (
            <Card>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <SectionTitle className="mb-0">Recent Course Uploads Audit</SectionTitle>
                <div className="relative w-full sm:w-60">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text"
                    placeholder="Search uploads or teachers..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs outline-none focus-ring bg-slate-50/50"
                  />
                </div>
              </div>

              {filteredUploads.length === 0 ? (
                <EmptyState label="No learning resources found matching search query." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                        <th className="py-2.5 px-3">Resource / Title</th>
                        <th className="py-2.5 px-3">Class & Subject</th>
                        <th className="py-2.5 px-3">Uploaded By</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredUploads.map(u => (
                        <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-3">
                            <div className="font-semibold text-ink-primary flex items-center gap-1.5">
                              <span className="text-slate-400">
                                {u.content_type === "Video" ? "🎥" : u.content_type === "Quiz" ? "🧠" : u.content_type === "Assignment" ? "📚" : "📄"}
                              </span>
                              <span className="truncate max-w-[180px]">{u.title}</span>
                            </div>
                            <span className="text-[10px] text-ink-secondary">Uploaded {new Date(u.uploaded_at).toLocaleDateString()}</span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-medium text-ink-primary block">{u.class_name}</span>
                            <span className="text-[10px] text-ink-secondary">{u.subject_name}</span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="text-ink-primary font-medium block flex items-center gap-1 text-[11px]">
                              <User size={10} className="text-slate-400 shrink-0" /> {u.teacher_name}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button 
                              onClick={() => handleDelete(u.id)}
                              className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg inline-flex items-center justify-center transition-colors"
                              title="Delete file"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          ) : (
            <Card>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <SectionTitle className="mb-0">Student AI Tutor Inquiries Audit</SectionTitle>
                <div className="relative w-full sm:w-60">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text"
                    placeholder="Search students, subjects, or questions..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs outline-none focus-ring bg-slate-50/50"
                  />
                </div>
              </div>

              {filteredAiLogs.length === 0 ? (
                <EmptyState label="No AI Tutor inquiries found matching search query." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                        <th className="py-2.5 px-3">Student</th>
                        <th className="py-2.5 px-3">Subject / Course</th>
                        <th className="py-2.5 px-3">Question</th>
                        <th className="py-2.5 px-3">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredAiLogs.map(log => (
                        <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-3 font-semibold text-ink-primary">
                            {log.student_name}
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-medium text-ink-primary block">{log.subject_name}</span>
                            <span className="text-[10px] text-ink-secondary">{log.course_title}</span>
                          </td>
                          <td className="py-3 px-3 text-slate-600 italic font-medium max-w-[180px] truncate" title={log.question}>
                            "{log.question}"
                          </td>
                          <td className="py-3 px-3 text-ink-secondary text-[10px]">
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Resources count dashboard sidebar */}
        <div className="space-y-4">
          <Card>
            <h3 className="font-heading font-bold text-sm text-ink-primary mb-3">Asset Distribution</h3>
            <div className="space-y-2.5">
              {Object.entries(stats.resources_by_type || {}).map(([type, count]) => (
                <div key={type} className="flex justify-between items-center text-xs py-1.5 border-b border-slate-50 last:border-0">
                  <span className="font-medium text-ink-primary flex items-center gap-1.5">
                    {type === "PDF" || type === "PDF_Notes" ? "📄 PDF Notes" : type === "Video" ? "🎥 Video Tutorials" : type === "Assignment" ? "📚 Assignments" : type === "Quiz" ? "🧠 Quizzes" : "🔗 Links / Misc"}
                  </span>
                  <span className="font-bold text-academic-blue font-numeric bg-academic-blue/5 px-2 py-0.5 rounded-full">{count}</span>
                </div>
              ))}
              {(!stats.resources_by_type || Object.keys(stats.resources_by_type).length === 0) && (
                <p className="text-xs text-ink-secondary italic">No assets uploaded yet.</p>
              )}
            </div>
          </Card>

          <Card className="bg-slate-50/50 border border-slate-200/50">
            <h4 className="font-heading font-bold text-xs text-ink-primary uppercase tracking-wide mb-1">Backup notice</h4>
            <p className="text-[11px] text-ink-secondary leading-relaxed">
              All uploads are automatically stored in the Supabase S3-compatible cloud storage bucket. To purge local file storage or manage database sizing, invoke the Backup/Export tool on the admin sidebar.
            </p>
          </Card>
        </div>
      </div>
      
      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}
