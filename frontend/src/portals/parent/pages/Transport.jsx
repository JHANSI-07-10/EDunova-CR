import {
  AlertCircle, AlertTriangle, Bell, Bus, CheckCircle2,
  Clock, Lock, MapPin, Navigation, Phone, RefreshCw, Shield, User, Zap
} from "lucide-react";
import { useEffect, useState } from "react";
import api from "../lib/api";
import { Card, EmptyState, Loader, SectionTitle, Toast } from "../components/Common";
import { useAuth } from "../context/AuthContext";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function InfoRow({ icon: Icon, label, value, accent }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${accent || "bg-slate-50 border border-slate-100 text-slate-500"}`}>
        <Icon size={16} />
      </div>
      <div>
        <p className="text-xs text-ink-secondary">{label}</p>
        <p className="text-sm font-semibold text-ink-primary">{value || "—"}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Parent Pass Display
// ---------------------------------------------------------------------------
function PassCard({ pass, studentName }) {
  if (!pass || !pass.is_active) return null;
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 p-5 text-white shadow-lg">
      <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/5" />
      <div className="absolute -left-4 -bottom-4 w-20 h-20 rounded-full bg-white/5" />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest opacity-60">Transport Pass</p>
          <p className="font-mono text-xl font-bold tracking-wider mt-1">{pass.pass_number}</p>
          <p className="text-xs opacity-70 mt-0.5">{studentName}</p>
        </div>
        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
          <Bus size={20} />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-4 border-t border-white/10 pt-3 text-xs opacity-70">
        <span>Issued: {pass.issued_at}</span>
        {pass.valid_until && <span>Valid till: {pass.valid_until}</span>}
        <span className="ml-auto flex items-center gap-1 bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full">
          <Shield size={10} /> Active
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Alert Banner
// ---------------------------------------------------------------------------
function AlertBanner({ alert }) {
  if (!alert) return null;
  const ICONS = { Emergency: Zap, "Delay Alert": AlertTriangle, "Route Changed": Navigation, "Bus Arrived": CheckCircle2 };
  const COLORS = {
    Emergency:       "bg-red-50 border-red-200 text-red-700",
    "Delay Alert":   "bg-amber-50 border-amber-200 text-amber-700",
    "Route Changed": "bg-blue-50 border-blue-200 text-blue-700",
    "Bus Arrived":   "bg-emerald-50 border-emerald-200 text-emerald-700",
    Info:            "bg-slate-50 border-slate-200 text-slate-600",
  };
  const Icon = ICONS[alert.type] || Bell;
  return (
    <div className={`flex items-start gap-3 p-4 rounded-2xl border ${COLORS[alert.type] || COLORS.Info}`}>
      <Icon size={16} className="mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-sm font-semibold">{alert.type}</p>
        <p className="text-xs mt-0.5 opacity-80">{alert.message}</p>
        <p className="text-xs mt-1 opacity-60">{new Date(alert.created_at).toLocaleString()}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Fee Status Badge
// ---------------------------------------------------------------------------
function FeeStatus({ fee }) {
  if (!fee) return null;
  const COLORS = { Paid: "bg-emerald-100 text-emerald-700", Pending: "bg-rose-100 text-rose-700", Partial: "bg-amber-100 text-amber-700", Waived: "bg-slate-100 text-slate-600" };
  return (
    <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50">
      <div className="text-sm">
        <p className="font-medium text-ink-primary">Transport Fee</p>
        <p className="text-xs text-ink-secondary">
          ₹{parseFloat(fee.amount_paid || 0).toLocaleString()} paid of ₹{parseFloat(fee.amount || 0).toLocaleString()}
          {fee.due_date && ` · Due ${fee.due_date}`}
        </p>
      </div>
      <span className={`text-xs font-semibold px-3 py-1 rounded-full ${COLORS[fee.status] || "bg-slate-100 text-slate-600"}`}>{fee.status}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Live Map
// ---------------------------------------------------------------------------
function LiveMap({ alloc, lastLocation }) {
  return (
    <Card className="relative overflow-hidden min-h-[260px] p-0">
      <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur border border-slate-200 shadow-sm rounded-xl px-3 py-1.5 flex items-center gap-2">
        <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
        <span className="text-xs font-semibold text-ink-primary">Live Tracking</span>
      </div>

      <div className="absolute inset-0 bg-slate-100">
        <svg className="w-full h-full stroke-slate-200 stroke-[4] fill-none" viewBox="0 0 400 280">
          <line x1="0" y1="90" x2="400" y2="90" />
          <line x1="0" y1="190" x2="400" y2="190" />
          <line x1="120" y1="0" x2="120" y2="280" />
          <line x1="280" y1="0" x2="280" y2="280" />
          <path d="M 0 150 Q 80 90 160 140 Q 240 190 320 130 Q 360 110 400 120" className="stroke-slate-300 stroke-[10]" />
          <path d="M 50 150 C 140 80, 260 210, 350 120" className="stroke-academic-blue/30 stroke-[6] stroke-dasharray-[8,6]" />
          <path d="M 50 150 C 140 80, 260 210, 350 120" className="stroke-academic-blue stroke-[3]" />
          <circle cx="50" cy="150" r="6" className="fill-academic-blue stroke-white stroke-[2]" />
          <circle cx="350" cy="120" r="6" className="fill-academic-gold stroke-white stroke-[2]" />
          <g className="animate-bounce" style={{ animationDuration: "3.5s" }}>
            <circle cx="190" cy="165" r="16" className="fill-academic-gold stroke-white stroke-[3]" />
            <rect x="184" y="159" width="12" height="10" rx="1" className="fill-academic-blue" />
          </g>
        </svg>
      </div>

      <div className="absolute bottom-4 left-4 right-4 z-10 bg-white/90 backdrop-blur border border-slate-200 shadow-sm rounded-xl p-3 flex justify-between items-center text-xs">
        <div>
          <p className="font-semibold text-ink-primary">📍 Location</p>
          {lastLocation ? (
            <p className="text-ink-secondary mt-0.5">
              Lat {parseFloat(lastLocation.latitude).toFixed(4)}, Lng {parseFloat(lastLocation.longitude).toFixed(4)}
              {lastLocation.updated_at && ` · ${new Date(lastLocation.updated_at).toLocaleTimeString()}`}
            </p>
          ) : (
            <p className="text-ink-secondary mt-0.5">Mock Transit Mode (No GPS ping yet)</p>
          )}
        </div>
        <span className="bg-academic-blue/10 text-academic-blue px-2 py-1 rounded-full font-medium">On Schedule</span>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function Transport() {
  const { activeChildId } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [requestType, setRequestType] = useState("Route Change");
  const [requestDetails, setRequestDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function load() {
    if (!activeChildId) return;
    setLoading(true);
    api.get(`/parent/transport/?child_id=${activeChildId}`)
      .then(({ data }) => setData(data))
      .catch(() => setData({ allocation: null, last_location: null }))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [activeChildId]);

  async function handleRequest(e) {
    e.preventDefault();
    if (!requestDetails.trim() || !activeChildId) return;
    setSubmitting(true);
    try {
      await api.post("/parent/messages/", {
        receiver: 1,
        message_text: `[Parent Transport ${requestType} Request for Child ID ${activeChildId}] ${requestDetails}`
      });
      setToast("Your request has been sent to the Transport Desk.");
      setRequestDetails("");
    } catch {
      setToast("Could not submit request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!activeChildId) return <EmptyState label="Select a child from the top bar to view transport info." />;
  if (loading) return <Loader rows={4} />;

  // Fee-locked transport check
  const feePending = data?.transport_fee?.status === "Pending" || data?.transport_fee?.status === "Partial";

  if (feePending && !data?.allocation) {
    return (
      <Card className="max-w-md mx-auto mt-12 p-8 text-center border-t-4 border-danger">
        <Lock size={48} className="text-danger mx-auto mb-4" />
        <h3 className="font-heading text-lg font-bold text-ink-primary mb-2">Transport Access Locked</h3>
        <p className="text-sm text-ink-secondary mb-6 leading-relaxed">
          Access to bus tracking and transport requests is locked due to a pending transport fee. Please clear the outstanding balance to restore access.
        </p>
        <a href="/parent/fees" className="inline-flex items-center justify-center bg-academic-green text-white rounded-xl py-2.5 px-6 text-sm font-semibold hover:bg-academic-green/90 transition-colors shadow-md">
          Pay Transport Fee
        </a>
      </Card>
    );
  }

  if (!data || !data.allocation) {
    return (
      <div className="space-y-6">
        <EmptyState label="No bus route has been assigned to this child yet." />
        <Card className="max-w-xl">
          <p className="font-heading font-semibold mb-2">Request Transport Access</p>
          <p className="text-sm text-ink-secondary mb-4">Submit a request to the transport department to assign a school bus route.</p>
          <form onSubmit={handleRequest} className="space-y-3">
            <div className="flex gap-4 flex-wrap">
              {["New Registration", "Route Enquiry"].map((t) => (
                <label key={t} className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <input type="radio" name="type" checked={requestType === t} onChange={() => setRequestType(t)} className="w-4 h-4 text-academic-blue" />
                  {t}
                </label>
              ))}
            </div>
            <textarea
              required rows={3} value={requestDetails}
              onChange={(e) => setRequestDetails(e.target.value)}
              placeholder="Provide pickup address, landmarks, and timings..."
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-academic-blue resize-none"
            />
            <button disabled={submitting} className="bg-academic-blue text-white rounded-xl px-5 py-2 font-medium text-sm hover:bg-academic-blue/90 disabled:opacity-50">
              {submitting ? "Submitting..." : "Submit Access Request"}
            </button>
          </form>
        </Card>
        <Toast message={toast} onClose={() => setToast("")} />
      </div>
    );
  }

  const a = data.allocation;

  return (
    <div className="space-y-6">
      {/* Latest Alert Banner */}
      {data.latest_alert && <AlertBanner alert={data.latest_alert} />}

      {/* Row 1: Route Info + Live Map */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Route & Driver Card */}
        <div className="space-y-4">
          {/* Transport Pass */}
          {data.transport_pass && <PassCard pass={data.transport_pass} studentName={a.student_name} />}

          <Card>
            <div className="flex items-center justify-between mb-4">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Bus size={13} /> Active Route
              </span>
              <button onClick={load} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                <RefreshCw size={14} />
              </button>
            </div>

            <h2 className="font-heading text-xl font-bold text-academic-blue mb-0.5">{a.route_name}</h2>
            <p className="text-xs text-ink-secondary mb-4">{a.start_point} → {a.end_point}</p>

            <div className="space-y-3 border-t border-slate-100 pt-4">
              <InfoRow icon={User}   label="Driver" value={a.driver_name} />
              {a.driver_phone && (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-academic-green/10 rounded-xl flex items-center justify-center text-academic-green flex-shrink-0">
                    <Phone size={15} />
                  </div>
                  <div>
                    <p className="text-xs text-ink-secondary">Driver Contact</p>
                    <a href={`tel:${a.driver_phone}`} className="text-sm font-semibold text-academic-green hover:underline">{a.driver_phone}</a>
                  </div>
                </div>
              )}
              <InfoRow icon={Bus}    label="Vehicle Number" value={a.vehicle_number} />
              <InfoRow icon={MapPin} label="Pickup Stop" value={a.pickup_point} />
              {data.pickup_detail && (
                <InfoRow
                  icon={Clock}
                  label="Scheduled Times"
                  value={[
                    data.pickup_detail.pickup_time ? `↑ Pick-up ${data.pickup_detail.pickup_time}` : "",
                    data.pickup_detail.drop_time   ? `↓ Drop-off ${data.pickup_detail.drop_time}` : "",
                  ].filter(Boolean).join("  ·  ")}
                />
              )}
            </div>

            {/* Fee Status */}
            {data.transport_fee && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <FeeStatus fee={data.transport_fee} />
              </div>
            )}

            <div className="mt-4 p-3 bg-blue-50/50 rounded-xl border border-blue-100/50 flex items-start gap-2.5 text-xs text-academic-blue leading-relaxed">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>Vehicles are equipped with GPS sensors. Location updates automatically during transit.</span>
            </div>
          </Card>
        </div>

        {/* Live Map */}
        <LiveMap alloc={a} lastLocation={data.last_location} />
      </div>

      {/* Row 2: Request Forms */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <p className="font-heading font-semibold mb-1">Route Change Request</p>
          <p className="text-sm text-ink-secondary mb-4">Request to modify pick/drop location or assign a different bus route.</p>
          <form onSubmit={handleRequest} className="space-y-3">
            <div className="flex gap-4 flex-wrap">
              {["Route Change", "Temporary Discontinue"].map((t) => (
                <label key={t} className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <input type="radio" name="reqtype" checked={requestType === t} onChange={() => setRequestType(t)} className="w-4 h-4 text-academic-blue" />
                  {t}
                </label>
              ))}
            </div>
            <textarea
              required rows={3} value={requestDetails}
              onChange={(e) => setRequestDetails(e.target.value)}
              placeholder="Provide exact details of the requested changes..."
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-academic-blue resize-none"
            />
            <button disabled={submitting} className="bg-academic-blue text-white rounded-xl px-5 py-2 font-medium text-sm hover:bg-academic-blue/90 disabled:opacity-50">
              {submitting ? "Submitting..." : "Submit Request"}
            </button>
          </form>
        </Card>

        <Card>
          <p className="font-heading font-semibold mb-1">Transport Complaint Ticket</p>
          <p className="text-sm text-ink-secondary mb-4">Report delay alerts, vehicle issues, or driver misconduct.</p>
          <form onSubmit={handleRequest} className="space-y-3">
            <div className="flex gap-4 flex-wrap">
              {["Delay Issue", "Driver Complaint", "Other Incident"].map((t) => (
                <label key={t} className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <input type="radio" name="reqtype2" checked={requestType === t} onChange={() => setRequestType(t)} className="w-4 h-4 text-academic-blue" />
                  {t}
                </label>
              ))}
            </div>
            <textarea
              required rows={3} value={requestDetails}
              onChange={(e) => setRequestDetails(e.target.value)}
              placeholder="Describe the complaint or concern..."
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-academic-blue resize-none"
            />
            <button disabled={submitting} className="bg-rose-600 text-white rounded-xl px-5 py-2 font-medium text-sm hover:bg-rose-700 disabled:opacity-50">
              {submitting ? "Submitting..." : "Submit Incident Report"}
            </button>
          </form>
        </Card>
      </div>

      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}
