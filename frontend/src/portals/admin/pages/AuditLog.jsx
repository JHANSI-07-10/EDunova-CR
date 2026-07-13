import { useEffect, useState } from "react";
import api from "../lib/api";
import { Card, EmptyState, Loader, Badge, Toast, SectionTitle } from "../components/Common";
import { ShieldAlert, ShieldX, Database, FileSpreadsheet, Lock } from "lucide-react";

export default function AuditLog() {
  const [items, setItems] = useState(null);
  const [filter, setFilter] = useState("all");
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    api.get("/admin-portal/audit-log/").then(({ data }) => setItems(data)).catch(() => setItems([]));
  }

  useEffect(() => {
    load();
  }, []);

  if (!items) return <Loader rows={5} />;

  const tabs = [
    { id: "all", label: "All Logs" },
    { id: "suspicious", label: "Suspicious Activity" },
    { id: "student", label: "Student Audits" },
    { id: "teacher", label: "Teacher Audits" },
    { id: "parent", label: "Parent Audits" },
  ];

  function isSuspicious(action) {
    const act = action.toLowerCase();
    return act.includes("delete") || act.includes("role changed") || act.includes("backup") || act.includes("status.return");
  }

  const filteredItems = items.filter((a) => {
    const act = a.action.toLowerCase();
    if (filter === "suspicious") return isSuspicious(a.action);
    if (filter === "student") return act.includes("student");
    if (filter === "teacher") return act.includes("teacher");
    if (filter === "parent") return act.includes("parent");
    return true;
  });

  async function lockAccount(actorId, actorName) {
    if (!actorId) return;
    setBusy(true);
    try {
      await api.patch(`/admin-portal/users/${actorId}/`, { is_active: false });
      setToast(`Security lock active: ${actorName}'s account has been locked & deactivated.`);
    } catch {
      setToast("Could not lock user account.");
    } finally {
      setBusy(false);
    }
  }

  async function triggerBackup() {
    try {
      const { data } = await api.get("/admin-portal/backup/export/");
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `edunova_db_backup_${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      setToast("Database snapshot backup completed & download triggered.");
    } catch {
      setToast("Could not export database backup.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Workflow Controls: Generate Reports & Trigger Backup */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="flex items-center justify-between p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-academic-blue/10 text-academic-blue rounded-xl flex items-center justify-center">
              <Database size={24} />
            </div>
            <div>
              <p className="font-heading font-semibold text-base text-ink-primary">System Backups</p>
              <p className="text-xs text-ink-secondary">Export a complete JSON snapshot of DB tables.</p>
            </div>
          </div>
          <button
            onClick={triggerBackup}
            className="bg-academic-blue hover:bg-academic-blue/90 text-white text-xs px-3.5 py-2 rounded-xl font-medium transition-colors"
          >
            Trigger Backup
          </button>
        </Card>

        <Card className="flex items-center justify-between p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-academic-green/10 text-academic-green rounded-xl flex items-center justify-center">
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <p className="font-heading font-semibold text-base text-ink-primary">Operations Reports</p>
              <p className="text-xs text-ink-secondary">Generate and print system performance summaries.</p>
            </div>
          </div>
          <a
            href="/admin/reports"
            className="bg-academic-green hover:bg-academic-green/90 text-white text-xs px-3.5 py-2 rounded-xl font-medium transition-colors"
          >
            Generate Reports
          </a>
        </Card>
      </div>

      <Card>
        <div className="flex flex-wrap gap-2 mb-4 pb-3 border-b border-slate-100">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setFilter(t.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filter === t.id
                  ? "bg-academic-blue text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {filteredItems.length === 0 ? (
          <EmptyState label={`No ${filter !== "all" ? filter : ""} audit logs found.`} />
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredItems.map((a) => {
              const suspicious = isSuspicious(a.action);
              return (
                <div key={a.id} className="py-3.5 text-sm flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-800">{a.action}</p>
                      {suspicious && (
                        <span className="inline-flex items-center gap-1 bg-red-50 text-danger text-[10px] px-2 py-0.5 rounded border border-red-100 font-bold">
                          <ShieldAlert size={10} /> Suspicious
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-ink-secondary">
                      by {a.actor_name} · {a.target_type} #{a.target_id}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {suspicious && a.actor_name !== "System" && (
                      <button
                        onClick={() => lockAccount(a.actor_id, a.actor_name)}
                        disabled={busy}
                        className="inline-flex items-center gap-1 bg-red-50 hover:bg-red-100 text-danger border border-red-100 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all disabled:opacity-60"
                        title="Lock actor user account & restrict all access"
                      >
                        <Lock size={12} /> Lock Account
                      </button>
                    )}
                    <span className="text-xs text-slate-400 font-medium whitespace-nowrap">{new Date(a.created_at).toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}
