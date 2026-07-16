import {
  AlertCircle, AlertTriangle, BedDouble, Calendar, CheckCircle2, Clock,
  FileText, Info, MapPin, Phone, Plus, RefreshCw, Shield, User, Users, X
} from "lucide-react";
import { useEffect, useState } from "react";
import { Badge, Card, EmptyState, Loader, SectionTitle, Toast } from "../components/Common";
import api from "../lib/api";

function Btn({ variant = "primary", size = "md", className = "", children, ...props }) {
  const base = "inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all disabled:opacity-50";
  const sz = size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm";
  const variants = {
    primary: "bg-academic-blue text-white hover:bg-academic-blue/90 shadow-sm",
    green: "bg-academic-green text-white hover:bg-academic-green/90 shadow-sm",
    danger: "bg-rose-600 text-white hover:bg-rose-700 shadow-sm",
    ghost: "bg-slate-100 text-ink-primary hover:bg-slate-200",
    outline: "border border-slate-200 text-ink-primary hover:bg-slate-50",
  };
  return <button className={`${base} ${sz} ${variants[variant]} ${className}`} {...props}>{children}</button>;
}

const STATUS_COLORS = {
  Pending: "orange",
  Approved: "green",
  Rejected: "red",
  Open: "orange",
  "In Progress": "blue",
  Resolved: "green",
};

export default function Hostel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [hostels, setHostels] = useState([]);

  // Forms & Modal states
  const [appModal, setAppModal] = useState(false);
  const [appForm, setAppForm] = useState({ hostel_id: "", preferred_room_type: "2-Sharing", reason: "" });
  const [appLoading, setAppLoading] = useState(false);

  const [leaveModal, setLeaveModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ start_date: "", end_date: "", reason: "" });
  const [leaveLoading, setLeaveLoading] = useState(false);

  const [complaintModal, setComplaintModal] = useState(false);
  const [complaintForm, setComplaintForm] = useState({ category: "Maintenance", title: "", description: "" });
  const [complaintLoading, setComplaintLoading] = useState(false);

  const [applications, setApplications] = useState([]);

  function load() {
    setLoading(true);
    // Student hostel allocation details
    api.get("/student/hostel/")
      .then(({ data }) => {
        setData(data);
        if (!data || !data.allocation) {
          // If not allocated, load available hostels and past applications
          api.get("/admin-portal/hostels/").then(res => setHostels(res.data)).catch(() => {});
          api.get("/hostels/applications/").then(res => setApplications(res.data)).catch(() => {});
        }
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function submitApplication(e) {
    e.preventDefault();
    if (!appForm.hostel_id) return;
    setAppLoading(true);
    try {
      await api.post("/hostels/applications/", appForm);
      setToast("Hostel registration application submitted.");
      setAppModal(false);
      load();
    } catch { setToast("Could not submit application."); }
    finally { setAppLoading(false); }
  }

  async function submitLeave(e) {
    e.preventDefault();
    if (!leaveForm.start_date || !leaveForm.end_date || !leaveForm.reason.trim()) return;
    setLeaveLoading(true);
    try {
      await api.post("/hostels/leaves/", leaveForm);
      setToast("Leave gate pass request submitted.");
      setLeaveModal(false);
      load();
    } catch { setToast("Could not submit leave request."); }
    finally { setLeaveLoading(false); }
  }

  async function submitComplaint(e) {
    e.preventDefault();
    if (!complaintForm.title.trim() || !complaintForm.description.trim()) return;
    setComplaintLoading(true);
    try {
      await api.post("/hostels/complaints/", complaintForm);
      setToast("Complaint logged in registry.");
      setComplaintModal(false);
      load();
    } catch { setToast("Could not submit complaint."); }
    finally { setComplaintLoading(false); }
  }

  if (loading) return <Loader rows={4} />;

  // Case 1: Student not allocated to any room
  if (!data || !data.allocation) {
    return (
      <div className="space-y-6">
        <EmptyState label="You are not currently allocated a hostel room." />

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <p className="font-heading font-semibold text-ink-primary mb-2">Request Hostel Registration</p>
            <p className="text-sm text-ink-secondary mb-4 leading-relaxed">
              Submit a registration request specifying your hostel preference and room sharing type. The administrative warden will review and verify your request.
            </p>
            <button
              onClick={() => {
                setAppForm({ hostel_id: hostels[0]?.id || "", preferred_room_type: "2-Sharing", reason: "" });
                setAppModal(true);
              }}
              className="bg-academic-blue text-white rounded-xl px-5 py-2.5 font-medium text-sm hover:bg-academic-blue/90"
            >
              Apply for Hostel Room
            </button>
          </Card>

          <Card>
            <SectionTitle>Application History</SectionTitle>
            {applications.length === 0 ? (
              <p className="text-sm text-ink-secondary">No previous requests found.</p>
            ) : (
              <div className="space-y-3">
                {applications.map(a => (
                  <div key={a.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-ink-primary">{a.hostel_name}</p>
                      <p className="text-xs text-ink-secondary">{a.preferred_room_type} · {new Date(a.created_at).toLocaleDateString()}</p>
                      {a.review_notes && <p className="text-[10px] text-slate-400 mt-1">Note: {a.review_notes}</p>}
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      a.status === "Approved" ? "bg-emerald-100 text-emerald-700" :
                      a.status === "Rejected" ? "bg-rose-100 text-rose-700" : "bg-orange-100 text-orange-700"
                    }`}>{a.status}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Application Modal */}
        {appModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-heading font-semibold text-ink-primary">Hostel Application</h3>
                <button onClick={() => setAppModal(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
              </div>
              <form onSubmit={submitApplication} className="space-y-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-ink-secondary uppercase">Preferred Hostel Building * (*)</label>
                  <select
                    required
                    value={appForm.hostel_id}
                    onChange={e => setAppForm({ ...appForm, hostel_id: e.target.value })}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white"
                  >
                    <option value="">Select building</option>
                    {hostels.map(h => <option key={h.id} value={h.id}>{h.name} ({h.type})</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-ink-secondary uppercase">Preferred Sharing *</label>
                  <select
                    value={appForm.preferred_room_type}
                    onChange={e => setAppForm({ ...appForm, preferred_room_type: e.target.value })}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white"
                  >
                    {["Single", "2-Sharing", "3-Sharing", "4-Sharing"].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-ink-secondary uppercase">Reason for application</label>
                  <textarea
                    rows={3}
                    value={appForm.reason}
                    onChange={e => setAppForm({ ...appForm, reason: e.target.value })}
                    placeholder="e.g. Distance from home, study atmosphere..."
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm resize-none"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setAppModal(false)} className="flex-1 border border-slate-200 text-ink-primary rounded-xl py-2 font-medium">Cancel</button>
                  <button type="submit" disabled={appLoading || !appForm.hostel_id} className="flex-1 bg-academic-blue text-white rounded-xl py-2 font-medium hover:bg-academic-blue/90 disabled:opacity-50">
                    {appLoading ? "Submitting…" : "Apply"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        <Toast message={toast} onClose={() => setToast("")} />
      </div>
    );
  }

  // Case 2: Room allocated
  const alloc = data.allocation;
  const isFeePending = data.fee?.status === "Pending" || data.fee?.status === "Partial";

  return (
    <div className="space-y-6">
      {/* Fee Lock Alert */}
      {isFeePending && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3 text-rose-700">
          <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
          <div className="text-xs">
            <p className="font-semibold">Hostel Fee Payment Outstanding</p>
            <p className="opacity-95 mt-0.5">Please settle your current session hostel fees. Unpaid fees may result in allocation freeze.</p>
          </div>
        </div>
      )}

      {/* Row 1: Pass & Basic Allocation Card */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          {/* Hostel Pass Card */}
          {data.pass && (
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 via-slate-900 to-black p-5 text-white shadow-lg">
              <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/5" />
              <div className="absolute -left-4 -bottom-4 w-20 h-20 rounded-full bg-white/5" />
              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest opacity-60">Hostel Pass</p>
                  <p className="font-mono text-xl font-bold tracking-wider mt-1">{data.pass.pass_number}</p>
                </div>
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Shield size={20} className="text-amber-400" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-4 border-t border-white/10 pt-3 text-xs opacity-70">
                <span>Issued: {data.pass.issued_at}</span>
                <span className="ml-auto bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full font-medium">Resident</span>
              </div>
            </div>
          )}

          {/* Allocation details */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <BedDouble size={13} /> Active Allocation
              </span>
              <button onClick={load} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                <RefreshCw size={14} />
              </button>
            </div>

            <h2 className="font-heading text-xl font-bold text-academic-blue">{alloc.hostel_name}</h2>
            <p className="text-xs text-ink-secondary mt-0.5">{alloc.hostel_type} Block · Floor {alloc.floor} · Room {alloc.room_number}</p>

            <div className="space-y-3.5 border-t border-slate-100 pt-4 mt-4 text-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 flex-shrink-0"><User size={15} /></div>
                <div>
                  <p className="text-[10px] text-ink-secondary uppercase">Warden</p>
                  <p className="font-semibold text-ink-primary">{alloc.warden_name}</p>
                </div>
              </div>
              {alloc.warden_phone && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 flex-shrink-0"><Phone size={15} /></div>
                  <div>
                    <p className="text-[10px] text-ink-secondary uppercase">Warden Contact</p>
                    <a href={`tel:${alloc.warden_phone}`} className="font-semibold text-academic-blue hover:underline">{alloc.warden_phone}</a>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 flex-shrink-0"><Info size={15} /></div>
                <div>
                  <p className="text-[10px] text-ink-secondary uppercase">Utilities & Room Facilities</p>
                  <p className="text-xs text-ink-primary font-medium">{alloc.facilities}</p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Roommates & Mess Schedule */}
        <div className="space-y-4">
          <Card>
            <p className="font-heading font-semibold mb-3">Roommates</p>
            {data.roommates.length === 0 ? (
              <p className="text-xs text-ink-secondary">You have no roommates in this room.</p>
            ) : (
              <div className="space-y-3">
                {data.roommates.map((r, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs">
                      {r.name[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-ink-primary">{r.name}</p>
                      <p className="text-xs text-ink-secondary">{r.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <p className="font-heading font-semibold mb-2">Mess Schedule & Meal Plan</p>
            <div className="flex justify-between items-center bg-slate-50 border border-slate-100 rounded-xl p-3 mb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase">Assigned Plan</span>
              <Badge tone="blue">{alloc.mess_plan}</Badge>
            </div>
            <div className="text-xs text-ink-secondary space-y-1.5 bg-amber-50/40 p-3 rounded-xl border border-amber-100/50">
              <p><strong>Breakfast:</strong> 7:30 AM — 9:00 AM</p>
              <p><strong>Lunch:</strong> 12:30 PM — 2:00 PM</p>
              <p><strong>Dinner:</strong> 7:30 PM — 9:00 PM</p>
            </div>
          </Card>
        </div>
      </div>

      {/* Row 2: Leaves (Gate Passes) & Complaint Registration */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Leaves */}
        <Card>
          <div className="flex justify-between items-center mb-3">
            <p className="font-heading font-semibold">Leaves & Night-Out Pass</p>
            <Btn variant="outline" size="sm" onClick={() => { setLeaveForm({ start_date: "", end_date: "", reason: "" }); setLeaveModal(true); }}>Request Pass</Btn>
          </div>
          {data.leaves.length === 0 ? (
            <p className="text-xs text-ink-secondary">No leave requests found.</p>
          ) : (
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {data.leaves.map(l => (
                <div key={l.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold text-ink-primary">{l.reason}</p>
                    <p className="text-ink-secondary mt-0.5">{l.start_date} to {l.end_date}</p>
                    <p className="text-[10px] text-slate-400 mt-1">Parent: {l.parent_approved ? "Approved" : "Pending Approval"}</p>
                  </div>
                  <Badge tone={STATUS_COLORS[l.status] || "slate"}>{l.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Complaints */}
        <Card>
          <div className="flex justify-between items-center mb-3">
            <p className="font-heading font-semibold">Complaints & Maintenance Desk</p>
            <Btn variant="outline" size="sm" onClick={() => { setComplaintForm({ category: "Maintenance", title: "", description: "" }); setComplaintModal(true); }}>File Complaint</Btn>
          </div>
          {data.complaints.length === 0 ? (
            <p className="text-xs text-ink-secondary">No complaints registered.</p>
          ) : (
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {data.complaints.map(c => (
                <div key={c.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold text-ink-primary">{c.title}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{c.category} · {new Date(c.created_at).toLocaleDateString()}</p>
                    {c.admin_notes && <p className="text-[10px] text-emerald-600 font-medium mt-1">Resolved: {c.admin_notes}</p>}
                  </div>
                  <Badge tone={STATUS_COLORS[c.status] || "slate"}>{c.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Leave Modal */}
      {leaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-heading font-semibold text-ink-primary">Request Leave Pass</h3>
              <button onClick={() => setLeaveModal(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <form onSubmit={submitLeave} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-ink-secondary">Start Date * (*)</label>
                  <input required type="date" value={leaveForm.start_date} onChange={e => setLeaveForm({ ...leaveForm, start_date: e.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-ink-secondary">End Date * (*)</label>
                  <input required type="date" value={leaveForm.end_date} onChange={e => setLeaveForm({ ...leaveForm, end_date: e.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white" />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-ink-secondary uppercase">Reason for Leave * (*)</label>
                <textarea required rows={3} value={leaveForm.reason} onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })} placeholder="e.g. Traveling home for weekend..." className="rounded-xl border border-slate-200 px-3 py-2 text-sm resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setLeaveModal(false)} className="flex-1 border border-slate-200 text-ink-primary rounded-xl py-2 font-medium">Cancel</button>
                <button type="submit" disabled={leaveLoading} className="flex-1 bg-academic-blue text-white rounded-xl py-2 font-medium hover:bg-academic-blue/90 disabled:opacity-50">
                  {leaveLoading ? "Submitting…" : "Request Pass"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complaint Modal */}
      {complaintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-heading font-semibold text-ink-primary">File Complaint / Issue</h3>
              <button onClick={() => setComplaintModal(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <form onSubmit={submitComplaint} className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-ink-secondary">Category *</label>
                <select value={complaintForm.category} onChange={e => setComplaintForm({ ...complaintForm, category: e.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white">
                  {["Maintenance", "Electricity", "Water Leakage", "Mess/Food Issue", "Warden complaint", "Other"].map(cat => <option key={cat}>{cat}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-ink-secondary">Issue Title * (*)</label>
                <input required type="text" value={complaintForm.title} onChange={e => setComplaintForm({ ...complaintForm, title: e.target.value })} placeholder="e.g. Geyser not working" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-ink-secondary uppercase">Detailed Description * (*)</label>
                <textarea required rows={3} value={complaintForm.description} onChange={e => setComplaintForm({ ...complaintForm, description: e.target.value })} placeholder="Describe the issue in detail..." className="rounded-xl border border-slate-200 px-3 py-2 text-sm resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setComplaintModal(false)} className="flex-1 border border-slate-200 text-ink-primary rounded-xl py-2 font-medium">Cancel</button>
                <button type="submit" disabled={complaintLoading} className="flex-1 bg-rose-600 text-white rounded-xl py-2 font-medium hover:bg-rose-700 disabled:opacity-50">
                  {complaintLoading ? "Submitting…" : "File Issue"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}
