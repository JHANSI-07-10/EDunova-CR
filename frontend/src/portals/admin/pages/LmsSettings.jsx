import { Settings, Save, Video, BookOpen, FileText, Shield, Bell, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { Card, SectionTitle, Toast } from "../components/Common";
import api from "../lib/api";

const SETTING_GROUPS = [
  {
    key: "live_classes",
    label: "Live Classes",
    icon: Video,
    fields: [
      { key: "enable_live_classes", label: "Enable Live Classes", type: "toggle", desc: "Allow teachers to schedule and conduct live classes" },
      { key: "default_platform", label: "Default Platform", type: "select", options: ["Zoom", "Google Meet", "Microsoft Teams", "Jitsi"], desc: "Default meeting platform for new live classes" },
      { key: "max_duration_minutes", label: "Max Duration (minutes)", type: "number", desc: "Maximum allowed duration for a single live class" },
      { key: "auto_record", label: "Auto-record Classes", type: "toggle", desc: "Automatically start recording when a live class begins" },
    ],
  },
  {
    key: "recorded_classes",
    label: "Recorded Classes",
    icon: Video,
    fields: [
      { key: "enable_recorded_classes", label: "Enable Recorded Classes", type: "toggle", desc: "Allow teachers to upload and share recorded class videos" },
      { key: "max_upload_size_mb", label: "Max Upload Size (MB)", type: "number", desc: "Maximum file size allowed for recorded class uploads" },
      { key: "allow_download", label: "Allow Student Downloads", type: "toggle", desc: "Allow students to download recorded class videos for offline viewing" },
    ],
  },
  {
    key: "homework",
    label: "Homework",
    icon: FileText,
    fields: [
      { key: "enable_lms_homework", label: "Enable LMS Homework", type: "toggle", desc: "Allow teachers to create homework through the LMS module" },
      { key: "allow_late_submission", label: "Allow Late Submission", type: "toggle", desc: "Students can submit homework after the due date" },
      { key: "late_penalty_percent", label: "Late Penalty (%)", type: "number", desc: "Percentage deduction per day for late submissions" },
    ],
  },
  {
    key: "quizzes",
    label: "Quizzes & Exams",
    icon: BookOpen,
    fields: [
      { key: "shuffle_questions", label: "Shuffle Questions", type: "toggle", desc: "Randomize question order for each student attempt" },
      { key: "show_results_immediately", label: "Show Results Immediately", type: "toggle", desc: "Display quiz results to students right after submission" },
      { key: "max_attempts", label: "Max Attempts per Quiz", type: "number", desc: "Number of attempts allowed per quiz (0 = unlimited)" },
      { key: "time_limit_minutes", label: "Default Time Limit (minutes)", type: "number", desc: "Default time limit for quizzes (0 = no limit)" },
    ],
  },
  {
    key: "certificates",
    label: "Certificates",
    icon: Shield,
    fields: [
      { key: "enable_certificates", label: "Enable Course Certificates", type: "toggle", desc: "Allow teachers to generate course completion certificates" },
      { key: "min_completion_percent", label: "Min Completion for Certificate (%)", type: "number", desc: "Minimum course completion percentage required to issue a certificate" },
    ],
  },
  {
    key: "announcements",
    label: "Announcements",
    icon: Bell,
    fields: [
      { key: "enable_announcements", label: "Enable Course Announcements", type: "toggle", desc: "Allow teachers to post course-specific announcements" },
      { key: "notify_parents", label: "Notify Parents", type: "toggle", desc: "Send push notifications to parents for new announcements" },
    ],
  },
  {
    key: "general",
    label: "General Settings",
    icon: Clock,
    fields: [
      { key: "enable_ai_tutor", label: "Enable AI Tutor", type: "toggle", desc: "Allow students to use the AI-powered tutor feature" },
      { key: "enable_course_forum", label: "Enable Course Forums", type: "toggle", desc: "Allow discussion forums within courses" },
      { key: "enable_digital_notes", label: "Enable Digital Notes", type: "toggle", desc: "Allow students to take notes within the LMS" },
    ],
  },
];

export default function LmsSettings() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  function loadSettings() {
    setLoading(true);
    api.get("/admin-portal/lms/settings/")
      .then(({ data }) => setSettings(data))
      .catch(() => setSettings({}))
      .finally(() => setLoading(false));
  }

  function handleToggle(key) {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  }

  function handleNumberChange(key, value) {
    const num = parseInt(value, 10);
    setSettings(prev => ({ ...prev, [key]: isNaN(num) ? 0 : num }));
  }

  function handleSelectChange(key, value) {
    setSettings(prev => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await api.put("/admin-portal/lms/settings/", settings);
      setToast("LMS settings saved successfully.");
    } catch {
      setToast("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-[fadeIn_.2s_ease]">
        <div className="h-10 w-64 rounded-xl shimmer" />
        <div className="h-4 w-96 rounded shimmer" />
        <div className="grid gap-4 mt-6">
          {[1, 2, 3].map(i => <div key={i} className="h-40 rounded-xl shimmer" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-[fadeIn_.2s_ease]">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold text-ink-primary">LMS Settings</h2>
          <p className="text-sm text-ink-secondary font-sub">Configure learning management system features and policies for the school.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-academic-blue text-white rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-academic-blue/90 shadow-raised disabled:opacity-50 transition-all"
        >
          <Save size={16} />
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {SETTING_GROUPS.map(group => {
          const Icon = group.icon;
          return (
            <Card key={group.key} className="border border-slate-100">
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
                <div className="w-9 h-9 rounded-xl bg-academic-blue/10 text-academic-blue flex items-center justify-center">
                  <Icon size={18} />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-sm text-ink-primary">{group.label}</h3>
                  <p className="text-[10px] text-ink-secondary">{group.fields.length} settings</p>
                </div>
              </div>
              <div className="space-y-4">
                {group.fields.map(field => (
                  <div key={field.key} className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink-primary">{field.label}</p>
                      <p className="text-[11px] text-ink-secondary leading-snug">{field.desc}</p>
                    </div>
                    {field.type === "toggle" ? (
                      <button
                        onClick={() => handleToggle(field.key)}
                        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                          settings[field.key] ? "bg-academic-green" : "bg-slate-200"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                            settings[field.key] ? "translate-x-5" : ""
                          }`}
                        />
                      </button>
                    ) : field.type === "number" ? (
                      <input
                        type="number"
                        min={0}
                        value={settings[field.key] ?? 0}
                        onChange={e => handleNumberChange(field.key, e.target.value)}
                        className="w-20 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-right font-numeric focus-ring outline-none"
                      />
                    ) : field.type === "select" ? (
                      <select
                        value={settings[field.key] || ""}
                        onChange={e => handleSelectChange(field.key, e.target.value)}
                        className="w-36 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus-ring outline-none"
                      >
                        {field.options.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : null}
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}
