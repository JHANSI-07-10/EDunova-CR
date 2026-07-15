import {
  AlertCircle, Bus, CheckCircle2, Clock, FileText, MapPin,
  Navigation, Phone, RefreshCw, Shield, User
} from "lucide-react";
import { useEffect, useState } from "react";
import { Card, EmptyState, Loader, Toast } from "../components/Common";
import api from "../lib/api";
import { isNonEmptyString } from "../../../utils/validation";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-500 flex-shrink-0">
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
// Transport Pass Card
// ---------------------------------------------------------------------------
function TransportPassCard({ pass }) {
  if (!pass || !pass.is_active) return null;
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-academic-blue via-blue-700 to-blue-900 p-5 text-white shadow-lg">
      {/* background decor */}
      <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/5" />
      <div className="absolute -left-4 -bottom-4 w-24 h-24 rounded-full bg-white/5" />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest opacity-60 font-sub">Transport Pass</p>
          <p className="font-mono text-2xl font-bold tracking-widest mt-1">{pass.pass_number}</p>
        </div>
        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
          <Bus size={20} />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3 border-t border-white/20 pt-3 text-xs opacity-80">
        <div>
          <p className="opacity-60">Issued</p>
          <p>{pass.issued_at}</p>
        </div>
        {pass.valid_until && (
          <div className="ml-6">
            <p className="opacity-60">Valid Until</p>
            <p>{pass.valid_until}</p>
          </div>
        )}
        <div className="ml-auto flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1">
          <Shield size={10} />
          <span>Active</span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Route Timeline
// ---------------------------------------------------------------------------
function RouteTimeline({ stops, pickupPoint }) {
  if (!stops || stops.length === 0) return null;
  return (
    <div className="space-y-0">
      {stops.map((s, i) => {
        const isMe = s.name === pickupPoint;
        const isLast = i === stops.length - 1;
        return (
          <div key={s.id || i} className="flex items-start gap-3">
            {/* Spine */}
            <div className="flex flex-col items-center">
              <div className={`w-4 h-4 rounded-full flex-shrink-0 border-2 mt-1 ${
                isMe
                  ? "bg-academic-blue border-academic-blue shadow-md shadow-academic-blue/30"
                  : "bg-white border-slate-300"
              }`} />
              {!isLast && <div className="w-0.5 bg-slate-200 flex-1 min-h-[24px]" />}
            </div>
            {/* Stop info */}
            <div className={`pb-4 flex-1 ${isMe ? "font-semibold" : ""}`}>
              <div className="flex items-center justify-between">
                <p className={`text-sm ${isMe ? "text-academic-blue" : "text-ink-primary"}`}>{s.name}</p>
                {isMe && (
                  <span className="text-xs bg-academic-blue/10 text-academic-blue px-2 py-0.5 rounded-full font-medium">Your Stop</span>
                )}
              </div>
              {(s.pickup_time || s.drop_time) && (
                <p className="text-xs text-ink-secondary mt-0.5">
                  {s.pickup_time && `↑ ${s.pickup_time}`}{s.pickup_time && s.drop_time ? "  " : ""}{s.drop_time && `↓ ${s.drop_time}`}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Live Map
// ---------------------------------------------------------------------------
function LiveMap({ transport, lastLocation }) {
  return (
    <Card className="relative overflow-hidden min-h-[280px] p-0">
      {/* Live badge */}
      <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur border border-slate-200 shadow-sm rounded-xl px-3 py-1.5 flex items-center gap-2">
        <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
        <span className="text-xs font-semibold text-ink-primary">Live Tracking Active</span>
      </div>

      {/* SVG Map */}
      <div className="absolute inset-0 bg-slate-100 flex items-center justify-center">
        <svg className="w-full h-full stroke-slate-200 stroke-[4] fill-none" viewBox="0 0 400 300">
          {/* Grid */}
          <line x1="0" y1="100" x2="400" y2="100" />
          <line x1="0" y1="200" x2="400" y2="200" />
          <line x1="133" y1="0" x2="133" y2="300" />
          <line x1="266" y1="0" x2="266" y2="300" />
          {/* Road */}
          <path d="M 0 160 Q 80 80 160 140 Q 240 200 320 120 Q 360 80 400 100" className="stroke-slate-300 stroke-[10] fill-none" />
          {/* Route path */}
          <path d="M 40 160 C 120 80, 260 220, 360 110" className="stroke-academic-blue/30 stroke-[6] stroke-dasharray-[8,6]" />
          <path d="M 40 160 C 120 80, 260 220, 360 110" className="stroke-academic-blue stroke-[3]" />
          {/* Stops */}
          <circle cx="40" cy="160" r="6" className="fill-academic-blue stroke-white stroke-[2]" />
          <circle cx="360" cy="110" r="6" className="fill-academic-gold stroke-white stroke-[2]" />
          <circle cx="180" cy="165" r="5" className="fill-slate-400 stroke-white stroke-[2]" />
          <circle cx="280" cy="140" r="5" className="fill-slate-400 stroke-white stroke-[2]" />
          {/* Animated bus */}
          <g className="animate-bounce" style={{ animationDuration: "3s" }}>
            <circle cx="200" cy="150" r="16" className="fill-academic-gold stroke-white stroke-[3]" style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.2))" }} />
            <rect x="194" y="144" width="12" height="10" rx="1" className="fill-academic-blue" />
            <line x1="196" y1="148" x2="196" y2="150" className="stroke-white stroke-[1.5]" />
            <line x1="200" y1="148" x2="200" y2="150" className="stroke-white stroke-[1.5]" />
            <line x1="204" y1="148" x2="204" y2="150" className="stroke-white stroke-[1.5]" />
          </g>
        </svg>
      </div>

      {/* Bottom info overlay */}
      <div className="absolute bottom-4 left-4 right-4 z-10 bg-white/90 backdrop-blur border border-slate-200 shadow-sm rounded-xl p-3 flex justify-between items-center text-xs">
        <div>
          <p className="font-semibold text-ink-primary flex items-center gap-1">
            <Navigation size={12} className="text-academic-blue" />
            {transport.route_name}
          </p>
          {lastLocation ? (
            <p className="text-ink-secondary mt-0.5">
              Lat {parseFloat(lastLocation.latitude).toFixed(4)}, Lng {parseFloat(lastLocation.longitude).toFixed(4)}
            </p>
          ) : (
            <p className="text-ink-secondary mt-0.5">En route to {transport.end_point}</p>
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
  const [transport, setTransport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [requestType, setRequestType] = useState("Route Change");
  const [requestDetails, setRequestDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  function load() {
    setLoading(true);
    api.get("/student/transport/")
      .then(({ data }) => setTransport(data))
      .catch(() => setTransport(null))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleRequest(e) {
    e.preventDefault();
    if (!isNonEmptyString(requestDetails)) {
      setValidationErrors({ requestDetails: "Details cannot be empty." });
      return;
    }
    setValidationErrors({});
    setSubmitting(true);
    try {
      await api.post("/teacher/messages/", {
        receiver: 1,
        message_text: `[Transport ${requestType} Request] ${requestDetails}`
      });
      setToast("Your request has been submitted to the Transport Administrator.");
      setRequestDetails("");
    } catch {
      setToast("Could not submit request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <Loader rows={4} />;

  // Not allocated
  if (!transport || !transport.vehicle_number) {
    return (
      <div className="space-y-6">
        <EmptyState label="You are not currently allocated a transport route." />
        <Card className="max-w-xl">
          <p className="font-heading font-semibold mb-2">Request Transport Access</p>
          <p className="text-sm text-ink-secondary mb-4">
            If you need school bus transport, please submit a request below.
          </p>
          <form onSubmit={handleRequest} className="space-y-3">
            <div className="flex gap-4 flex-wrap">
              {["New Registration", "Route Query"].map((t) => (
                <label key={t} className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <input type="radio" name="type" checked={requestType === t} onChange={() => setRequestType(t)} className="w-4 h-4 text-academic-blue" />
                  {t}
                </label>
              ))}
            </div>
            <div>
              <textarea
                required
                rows={3}
                value={requestDetails}
                onChange={(e) => setRequestDetails(e.target.value)}
                placeholder="Provide details (e.g. nearest pickup landmark, address)..."
                className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-academic-blue resize-none ${
                  validationErrors.requestDetails ? "border-danger" : "border-slate-200"
                }`}
              />
              {validationErrors.requestDetails && <p className="text-xs text-danger mt-1">{validationErrors.requestDetails}</p>}
            </div>
            <button disabled={submitting} className="bg-academic-blue text-white rounded-xl px-5 py-2 font-medium text-sm hover:bg-academic-blue/90 disabled:opacity-50">
              {submitting ? "Submitting..." : "Submit Transport Request"}
            </button>
          </form>
        </Card>
        <Toast message={toast} onClose={() => setToast("")} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Row 1: Transport Pass + Route Info */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Pass + Basic Info */}
        <div className="space-y-4">
          {transport.transport_pass && <TransportPassCard pass={transport.transport_pass} />}

          <Card className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Bus size={13} /> Active Allocation
              </span>
              <button onClick={load} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                <RefreshCw size={14} />
              </button>
            </div>

            <div>
              <h2 className="font-heading text-xl font-bold text-academic-blue">{transport.route_name}</h2>
              <p className="text-xs text-ink-secondary mt-0.5">{transport.start_point} → {transport.end_point}</p>
            </div>

            <div className="space-y-3 border-t border-slate-100 pt-3">
              <InfoRow icon={User}   label="Driver" value={transport.driver_name} />
              <InfoRow icon={Bus}    label="Vehicle Number" value={transport.vehicle_number} />
              <InfoRow icon={MapPin} label="Your Pickup Stop" value={transport.pickup_point} />
              {transport.pickup_detail && (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-500 flex-shrink-0">
                    <Clock size={16} />
                  </div>
                  <div>
                    <p className="text-xs text-ink-secondary">Scheduled Times</p>
                    <p className="text-sm font-semibold text-ink-primary">
                      {transport.pickup_detail.pickup_time ? `Pick-up ${transport.pickup_detail.pickup_time}` : ""}
                      {transport.pickup_detail.pickup_time && transport.pickup_detail.drop_time ? "  ·  " : ""}
                      {transport.pickup_detail.drop_time ? `Drop-off ${transport.pickup_detail.drop_time}` : ""}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100/50 flex items-start gap-2.5 text-xs text-academic-blue leading-relaxed">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>Driver details and route updates are managed by the Transport Desk. Contact us for any changes.</span>
            </div>
          </Card>
        </div>

        {/* Live Map */}
        <LiveMap transport={transport} lastLocation={transport.last_location} />
      </div>

      {/* Row 2: Route Timeline + Requests */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Route Timeline */}
        {transport.all_stops && transport.all_stops.length > 0 && (
          <Card>
            <p className="font-heading font-semibold mb-4">Route Stops Timeline</p>
            <RouteTimeline stops={transport.all_stops} pickupPoint={transport.pickup_point} />
          </Card>
        )}

        {/* Request / Complaint */}
        <div className="space-y-4">
          <Card>
            <p className="font-heading font-semibold mb-1">Route Change Request</p>
            <p className="text-sm text-ink-secondary mb-4">Need to change your pickup stop? Submit a request here.</p>
            <form onSubmit={handleRequest} className="space-y-3">
              <div className="flex gap-4 flex-wrap">
                {["Route Change", "Temporary Pause"].map((t) => (
                  <label key={t} className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                    <input type="radio" name="req_type" checked={requestType === t} onChange={() => setRequestType(t)} className="w-4 h-4 text-academic-blue" />
                    {t}
                  </label>
                ))}
              </div>
              <div>
                <textarea
                  required
                  rows={3}
                  value={requestDetails}
                  onChange={(e) => setRequestDetails(e.target.value)}
                  placeholder="Describe your requested change..."
                  className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-academic-blue resize-none ${
                    validationErrors.requestDetails ? "border-danger" : "border-slate-200"
                  }`}
                />
                {validationErrors.requestDetails && <p className="text-xs text-danger mt-1">{validationErrors.requestDetails}</p>}
              </div>
              <button disabled={submitting} className="bg-academic-blue text-white rounded-xl px-5 py-2 font-medium text-sm hover:bg-academic-blue/90 disabled:opacity-50">
                {submitting ? "Submitting..." : "Submit Stop Request"}
              </button>
            </form>
          </Card>

          <Card>
            <p className="font-heading font-semibold mb-1">Transport Complaint / Help</p>
            <p className="text-sm text-ink-secondary mb-4">Report delays, driver issues, or queries.</p>
            <form onSubmit={handleRequest} className="space-y-3">
              <div className="flex gap-4 flex-wrap">
                {["Delay Report", "Other Issue"].map((t) => (
                  <label key={t} className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                    <input type="radio" name="req_type2" checked={requestType === t} onChange={() => setRequestType(t)} className="w-4 h-4 text-academic-blue" />
                    {t}
                  </label>
                ))}
              </div>
              <textarea
                required
                rows={3}
                value={requestDetails}
                onChange={(e) => setRequestDetails(e.target.value)}
                placeholder="Write your complaint or query in detail..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-academic-blue resize-none"
              />
              <button disabled={submitting} className="bg-rose-600 text-white rounded-xl px-5 py-2 font-medium text-sm hover:bg-rose-700 disabled:opacity-50">
                {submitting ? "Submitting..." : "Report Incident"}
              </button>
            </form>
          </Card>
        </div>
      </div>

      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}
