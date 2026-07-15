import {
  AlertCircle, AlertTriangle, BedDouble, Calendar, CheckCircle2,
  Clock, Lock, MapPin, RefreshCw, Shield, User, DollarSign
} from "lucide-react";
import { useEffect, useState } from "react";
import api from "../lib/api";
import { Badge, Card, EmptyState, Loader, SectionTitle, Toast } from "../components/Common";
import { useAuth } from "../context/AuthContext";

const STATUS_COLORS = {
  Pending: "orange",
  Approved: "green",
  Rejected: "red",
  Open: "orange",
  "In Progress": "blue",
  Resolved: "green",
};

export default function Hostel() {
  const { activeChildId } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [updating, setUpdating] = useState(false);

  function load() {
    if (!activeChildId) return;
    setLoading(true);
    api.get(`/parent/hostel/?child_id=${activeChildId}`)
      .then(({ data }) => setData(data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [activeChildId]);

  async function handleParentApproval(leaveId, approveBool) {
    setUpdating(true);
    try {
      await api.post("/hostels/leaves/", { id: leaveId, parent_approved: approveBool });
      setToast(approveBool ? "Leave request approved by parent." : "Leave request disapproved by parent.");
      load();
    } catch { setToast("Could not update approval status."); }
    finally { setUpdating(false); }
  }

  if (!activeChildId) return <EmptyState label="Select a child from the top bar to view hostel details." />;
  if (loading) return <Loader rows={4} />;

  const isFeePending = data?.fee?.status === "Pending" || data?.fee?.status === "Partial";

  // Case 1: Unallocated / Lock Check
  if (isFeePending && (!data || !data.allocation)) {
    return (
      <Card className="max-w-md mx-auto mt-12 p-8 text-center border-t-4 border-rose-500">
        <Lock size={48} className="text-rose-500 mx-auto mb-4" />
        <h3 className="font-heading text-lg font-bold text-ink-primary mb-2">Hostel Access Locked</h3>
        <p className="text-sm text-ink-secondary mb-6 leading-relaxed">
          Access to hostel room information and leave gate pass approval is locked due to an outstanding hostel fee balance.
        </p>
        <a href="/parent/fees" className="inline-flex items-center justify-center bg-academic-green text-white rounded-xl py-2.5 px-6 text-sm font-semibold hover:bg-academic-green/90 transition shadow">
          Pay Hostel Fee
        </a>
      </Card>
    );
  }

  if (!data || !data.allocation) {
    return <EmptyState label="Your child is not currently allocated to a hostel room." />;
  }

  const alloc = data.allocation;

  return (
    <div className="space-y-6">
      {/* Row 1: Room Info & Pass Card */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          {/* Visual Pass card */}
          {data.pass && (
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 p-5 text-white shadow-lg">
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
                  <p className="font-semibold text-ink-primary">{alloc.warden_name || "Unassigned"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 flex-shrink-0"><Clock size={15} /></div>
                <div>
                  <p className="text-[10px] text-ink-secondary uppercase">Mess Plan Assigned</p>
                  <p className="font-semibold text-ink-primary">{alloc.mess_plan}</p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Fee status */}
        <Card className="flex flex-col justify-between">
          <div>
            <SectionTitle>Hostel Fee Ledger</SectionTitle>
            {data.fee ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Session Total Fee</p>
                    <p className="text-2xl font-bold text-ink-primary mt-1">₹{parseFloat(data.fee.amount).toLocaleString()}</p>
                  </div>
                  <Badge tone={data.fee.status === "Paid" ? "green" : "orange"}>{data.fee.status}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl">
                    <p className="text-slate-500 font-medium">Amount Paid</p>
                    <p className="text-base font-bold text-emerald-700 mt-0.5">₹{parseFloat(data.fee.amount_paid).toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-rose-50/50 border border-rose-100 rounded-xl">
                    <p className="text-slate-500 font-medium">Pending Due</p>
                    <p className="text-base font-bold text-rose-700 mt-0.5">₹{parseFloat(data.fee.amount - data.fee.amount_paid).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState label="No fee configuration set for this session." />
            )}
          </div>
          <div className="text-[11px] text-slate-400 pt-4 flex items-center gap-1.5">
            <DollarSign size={13} /> Settle balances directly through the Fee payments portal.
          </div>
        </Card>
      </div>

      {/* Row 2: Leave Approval & Complaints */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Leaves */}
        <Card>
          <SectionTitle>Gate Pass & Leaves Approval</SectionTitle>
          {data.leaves.length === 0 ? (
            <p className="text-xs text-ink-secondary">No leave records registered.</p>
          ) : (
            <div className="space-y-3.5 max-h-[250px] overflow-y-auto pr-1">
              {data.leaves.map(l => (
                <div key={l.id} className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl space-y-3 text-xs">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-ink-primary">{l.reason}</p>
                      <p className="text-ink-secondary mt-0.5">{l.start_date} to {l.end_date}</p>
                    </div>
                    <Badge tone={STATUS_COLORS[l.status] || "slate"}>{l.status}</Badge>
                  </div>
                  {l.status === "Pending" && (
                    <div className="flex gap-2 pt-1 border-t border-slate-100/50">
                      <button
                        disabled={updating}
                        onClick={() => handleParentApproval(l.id, true)}
                        className={`flex-1 text-center py-1.5 rounded-lg text-xs font-semibold border ${
                          l.parent_approved
                            ? "bg-academic-green text-white border-academic-green"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {l.parent_approved ? "Parent Approved" : "Approve Pass"}
                      </button>
                      <button
                        disabled={updating}
                        onClick={() => handleParentApproval(l.id, false)}
                        className={`flex-1 text-center py-1.5 rounded-lg text-xs font-semibold border ${
                          !l.parent_approved
                            ? "bg-rose-500 text-white border-rose-500"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        Disapprove Pass
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Complaints */}
        <Card>
          <SectionTitle>Maintenance Complaint Updates</SectionTitle>
          {data.complaints.length === 0 ? (
            <p className="text-xs text-ink-secondary">No complaints registered by child.</p>
          ) : (
            <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
              {data.complaints.map(c => (
                <div key={c.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold text-ink-primary">{c.title}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{c.category} · {new Date(c.created_at).toLocaleDateString()}</p>
                    {c.admin_notes && (
                      <div className="mt-2 p-2 bg-emerald-50 border border-emerald-100 rounded-lg text-[10px] text-emerald-700 leading-relaxed">
                        <strong>Resolution:</strong> {c.admin_notes}
                      </div>
                    )}
                  </div>
                  <Badge tone={STATUS_COLORS[c.status] || "slate"}>{c.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}
