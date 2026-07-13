import { AlertCircle, Bus, CheckCircle2, MapPin, Navigation, Phone, RefreshCw, User } from "lucide-react";
import { useEffect, useState } from "react";
import { Card, EmptyState, Loader, Toast } from "../components/Common";
import api from "../lib/api";
import { isNonEmptyString } from "../../../utils/validation";


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

  useEffect(() => {
    load();
  }, []);

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
        receiver: 1, // Admin/Support ID
        message_text: `[Transport ${requestType} Request] ${requestDetails}`
      });
      setToast("Your request has been submitted to the Transport Administrator.");
      setRequestDetails("");
    } catch (err) {
      setToast("Could not submit request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <Loader rows={3} />;

  if (!transport || !transport.vehicle_number) {
    return (
      <div className="space-y-6">
        <EmptyState label="You are not currently allocated a transport route." />
        <Card className="max-w-xl">
          <p className="font-heading font-semibold mb-2">Request Transport Access</p>
          <p className="text-sm text-ink-secondary mb-4">
            If you need school bus transport, please select a route and submit a request.
          </p>
          <form onSubmit={handleRequest} className="space-y-3">
            <div className="flex gap-4">
              {["New Registration", "Route Query"].map((t) => (
                <label key={t} className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <input
                    type="radio"
                    name="type"
                    checked={requestType === t}
                    onChange={() => setRequestType(t)}
                    className="w-4 h-4 text-academic-blue"
                  />
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
                className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus-ring resize-none ${
                  validationErrors.requestDetails ? "border-danger" : "border-slate-200"
                }`}
              />
              {validationErrors.requestDetails && (
                <p className="text-xs text-danger mt-1">{validationErrors.requestDetails}</p>
              )}
            </div>
            <button
              disabled={submitting}
              className="bg-academic-blue text-white rounded-xl px-5 py-2 font-medium text-sm hover:bg-academic-blue/90"
            >
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
      <div className="grid md:grid-cols-2 gap-6">
        
        {/* Route Allocation Details */}
        <Card className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Bus size={14} /> Active Allocation
              </span>
              <button onClick={load} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                <RefreshCw size={14} />
              </button>
            </div>
            
            <h2 className="font-heading text-xl font-bold text-academic-blue mb-1">{transport.route_name}</h2>
            <p className="text-sm text-ink-secondary flex items-center gap-1.5 mb-4">
              <MapPin size={14} className="text-slate-400" /> Pickup Point: <span className="font-medium text-ink-primary">{transport.pickup_point}</span>
            </p>

            <div className="space-y-3 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-500">
                  <User size={16} />
                </div>
                <div>
                  <p className="text-xs text-ink-secondary">Driver</p>
                  <p className="text-sm font-semibold text-ink-primary">{transport.driver_name || "—"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-500">
                  <Bus size={16} />
                </div>
                <div>
                  <p className="text-xs text-ink-secondary">Vehicle Number</p>
                  <p className="text-sm font-semibold text-ink-primary">{transport.vehicle_number}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 p-3 bg-blue-50/50 rounded-xl border border-blue-100/50 flex items-start gap-2.5 text-xs text-academic-blue leading-relaxed">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>Driver details and status updates are provided directly from the Transport Management Desk.</span>
          </div>
        </Card>

        {/* Live GPS tracking simulator */}
        <Card className="relative overflow-hidden min-h-[300px]">
          <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur border border-slate-200 shadow-sm rounded-xl px-3 py-1.5 flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
            <span className="text-xs font-semibold text-ink-primary">Live Tracking Active</span>
          </div>

          {/* Styled vector map background */}
          <div className="absolute inset-0 bg-slate-100 flex items-center justify-center">
            <svg className="w-full h-full stroke-slate-200 stroke-[4] fill-none" viewBox="0 0 400 300">
              {/* Grid Gridlines */}
              <line x1="0" y1="100" x2="400" y2="100" />
              <line x1="0" y1="200" x2="400" y2="200" />
              <line x1="150" y1="0" x2="150" y2="300" />
              <line x1="300" y1="0" x2="300" y2="300" />
              
              {/* Bus Path Route */}
              <path
                d="M 50 150 C 150 50, 250 250, 350 150"
                className="stroke-academic-blue/30 stroke-[6] stroke-dasharray-[5,5]"
              />
              <path
                d="M 50 150 C 150 50, 250 250, 350 150"
                className="stroke-academic-blue stroke-[4]"
              />

              {/* Start/End stops */}
              <circle cx="50" cy="150" r="6" className="fill-academic-blue stroke-white stroke-[2]" />
              <circle cx="350" cy="150" r="6" className="fill-academic-gold stroke-white stroke-[2]" />

              {/* Moving Bus Dot */}
              <g className="animate-bounce" style={{ animationDuration: '3s' }}>
                <circle cx="200" cy="150" r="14" className="fill-academic-gold stroke-white stroke-[3] shadow-md" />
                <path
                  d="M 195 145 H 205 V 155 H 195 Z"
                  className="fill-academic-blue"
                  transform="translate(0, 0)"
                />
              </g>
            </svg>
          </div>
          
          <div className="absolute bottom-4 left-4 right-4 z-10 bg-white/90 backdrop-blur border border-slate-200 shadow-sm rounded-xl p-3 flex justify-between items-center text-xs">
            <div>
              <p className="font-semibold text-ink-primary flex items-center gap-1">
                <Navigation size={12} className="text-academic-blue" /> Transit Status
              </p>
              <p className="text-ink-secondary mt-0.5">En route to {transport.end_point}</p>
            </div>
            <span className="bg-academic-blue/10 text-academic-blue px-2 py-1 rounded font-medium">On Schedule</span>
          </div>
        </Card>

      </div>

      {/* Change Requests and Complaints Form */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <p className="font-heading font-semibold mb-1">Route Change Request</p>
          <p className="text-sm text-ink-secondary mb-4">
            Need to change your pickup stop? Submit a request here.
          </p>
          <form onSubmit={handleRequest} className="space-y-3">
            <div className="flex gap-4">
              {["Route Change", "Temporary Pause"].map((t) => (
                <label key={t} className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <input
                    type="radio"
                    name="type"
                    checked={requestType === t}
                    onChange={() => setRequestType(t)}
                    className="w-4 h-4 text-academic-blue"
                  />
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
                placeholder="Describe your requested change (e.g. change pickup point to Sector-5 Stop)..."
                className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus-ring resize-none ${
                  validationErrors.requestDetails ? "border-danger" : "border-slate-200"
                }`}
              />
              {validationErrors.requestDetails && (
                <p className="text-xs text-danger mt-1">{validationErrors.requestDetails}</p>
              )}
            </div>
            <button
              disabled={submitting}
              className="bg-academic-blue text-white rounded-xl px-5 py-2 font-medium text-sm hover:bg-academic-blue/90"
            >
              {submitting ? "Submitting..." : "Submit Stop Request"}
            </button>
          </form>
        </Card>

        <Card>
          <p className="font-heading font-semibold mb-1">Transport Complaint / Help</p>
          <p className="text-sm text-ink-secondary mb-4">
            Report delays, route issues, driver behavior, or queries here.
          </p>
          <form onSubmit={handleRequest} className="space-y-3">
            <div className="flex gap-4">
              {["Delay Report", "Other Issue"].map((t) => (
                <label key={t} className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <input
                    type="radio"
                    name="type"
                    checked={requestType === t}
                    onChange={() => setRequestType(t)}
                    className="w-4 h-4 text-academic-blue"
                  />
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
                placeholder="Write your complaint or query in detail here..."
                className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus-ring resize-none ${
                  validationErrors.requestDetails ? "border-danger" : "border-slate-200"
                }`}
              />
              {validationErrors.requestDetails && (
                <p className="text-xs text-danger mt-1">{validationErrors.requestDetails}</p>
              )}
            </div>
            <button
              disabled={submitting}
              className="bg-rose-600 text-white rounded-xl px-5 py-2 font-medium text-sm hover:bg-rose-700"
            >
              {submitting ? "Submitting..." : "Report Incident"}
            </button>
          </form>
        </Card>
      </div>

      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}
