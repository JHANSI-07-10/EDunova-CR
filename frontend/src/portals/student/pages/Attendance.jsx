import { useEffect, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Badge, Card, EmptyState, Loader, SectionTitle, Toast } from "../components/Common";
import api from "../lib/api";

const STATUS_TONE = { Present: "green", Absent: "red", Late: "gold", Medical_Leave: "blue" };
const COLORS = { Present: "#10B981", Absent: "#DC2626", Late: "#FBBF24", "Medical Leave": "#1E3A8A" };

export default function Attendance() {
  const [activeTab, setActiveTab] = useState("attendance"); // "attendance" or "leaves"
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Leave states
  const [leaves, setLeaves] = useState([]);
  const [loadingLeaves, setLoadingLeaves] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ leave_type: "Sick Leave", start_date: "", end_date: "", reason: "" });
  const [submittingLeave, setSubmittingLeave] = useState(false);
  const [toast, setToast] = useState("");

  function loadAttendance() {
    setLoading(true);
    api
      .get("/student/attendance/", { params: { month } })
      .then(({ data }) => setData(data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }

  function loadLeaves() {
    setLoadingLeaves(true);
    api
      .get("/student/leaves/")
      .then(({ data }) => setLeaves(data))
      .catch(() => setLeaves([]))
      .finally(() => setLoadingLeaves(false));
  }

  useEffect(() => {
    if (activeTab === "attendance") {
      loadAttendance();
    } else {
      loadLeaves();
    }
  }, [month, activeTab]);

  async function submitLeave(e) {
    e.preventDefault();
    setSubmittingLeave(true);
    try {
      await api.post("/student/leaves/", leaveForm);
      setToast("Leave request submitted successfully.");
      setLeaveForm({ leave_type: "Sick Leave", start_date: "", end_date: "", reason: "" });
      loadLeaves();
    } catch (err) {
      setToast("Failed to submit leave request.");
    } finally {
      setSubmittingLeave(false);
    }
  }

  const pieData = data
    ? [
        { name: "Present", value: data.summary.present },
        { name: "Absent", value: data.summary.absent },
        { name: "Late", value: data.summary.late },
        { name: "Medical Leave", value: data.summary.medical_leave },
      ].filter((d) => d.value > 0)
    : [];

  return (
    <div className="space-y-6">
      
      {/* Tab Navigation */}
      <div className="flex border-b border-slate-100 pb-px">
        <button
          onClick={() => setActiveTab("attendance")}
          className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "attendance"
              ? "border-academic-blue text-academic-blue"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          Attendance Record
        </button>
        <button
          onClick={() => setActiveTab("leaves")}
          className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "leaves"
              ? "border-academic-blue text-academic-blue"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          Leave Applications
        </button>
      </div>

      {activeTab === "attendance" ? (
        <>
          <div className="flex items-center justify-between">
            <p className="text-ink-secondary text-sm">Track your day-by-day attendance record.</p>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus-ring outline-none"
            />
          </div>

          {loading ? (
            <Loader rows={4} />
          ) : !data ? (
            <EmptyState label="Could not load attendance details." />
          ) : (
            <div className="grid lg:grid-cols-3 gap-4">
              <Card className="lg:col-span-1 flex flex-col items-center justify-center">
                <p className="font-numeric text-4xl font-bold text-academic-blue">
                  {data.summary.percentage != null ? `${data.summary.percentage}%` : "—"}
                </p>
                <p className="text-ink-secondary text-sm mb-3">This month's attendance</p>
                {pieData.length ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={3}>
                        {pieData.map((d) => (
                          <Cell key={d.name} fill={COLORS[d.name]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState label="No attendance marked this month." />
                )}
              </Card>

              <Card className="lg:col-span-2">
                <SectionTitle>Daily record — {month}</SectionTitle>
                {data.records.length ? (
                  <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
                    {data.records.map((r) => (
                      <div key={r.id} className="py-2.5 flex items-center justify-between text-sm">
                        <span>{r.date}</span>
                        <div className="flex items-center gap-2">
                          {r.remarks && <span className="text-xs text-ink-secondary">{r.remarks}</span>}
                          <Badge tone={STATUS_TONE[r.status] || "slate"}>{r.status.replace("_", " ")}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState label="No attendance records for this month." />
                )}
              </Card>
            </div>
          )}
        </>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          
          {/* Leave Submission Form */}
          <Card className="lg:col-span-1 h-fit">
            <SectionTitle>Apply for Leave</SectionTitle>
            <form onSubmit={submitLeave} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-ink-secondary">Leave Type</label>
                <select
                  value={leaveForm.leave_type}
                  onChange={(e) => setLeaveForm({ ...leaveForm, leave_type: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none"
                >
                  <option>Sick Leave</option>
                  <option>Casual Leave</option>
                  <option>Medical Leave</option>
                  <option>Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-ink-secondary">Start Date</label>
                  <input
                    required
                    type="date"
                    value={leaveForm.start_date}
                    onChange={(e) => setLeaveForm({ ...leaveForm, start_date: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-ink-secondary">End Date</label>
                  <input
                    required
                    type="date"
                    value={leaveForm.end_date}
                    onChange={(e) => setLeaveForm({ ...leaveForm, end_date: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-ink-secondary">Reason</label>
                <textarea
                  required
                  rows={3}
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  placeholder="Explain the reason for leave..."
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none resize-none"
                />
              </div>

              <button
                disabled={submittingLeave}
                className="w-full bg-academic-blue text-white rounded-xl py-2 font-medium text-sm hover:bg-academic-blue/90"
              >
                {submittingLeave ? "Submitting..." : "Apply"}
              </button>
            </form>
          </Card>

          {/* Leave History List */}
          <Card className="lg:col-span-2">
            <SectionTitle>Leave Applications Log</SectionTitle>
            {loadingLeaves ? (
              <Loader rows={3} />
            ) : leaves.length === 0 ? (
              <EmptyState label="No leave applications submitted yet." />
            ) : (
              <div className="divide-y divide-slate-100">
                {leaves.map((l) => (
                  <div key={l.id} className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm">
                    <div>
                      <p className="font-semibold text-ink-primary">{l.leave_type}</p>
                      <p className="text-xs text-ink-secondary mt-0.5">
                        {l.start_date} to {l.end_date}
                      </p>
                      <p className="text-xs text-ink-secondary italic mt-1">"{l.reason}"</p>
                    </div>
                    <Badge tone={l.status === "Approved" ? "green" : l.status === "Rejected" ? "red" : "slate"}>
                      {l.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}
