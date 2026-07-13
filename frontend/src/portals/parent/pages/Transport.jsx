import { AlertCircle, Bus, CheckCircle2, MapPin, Navigation, Phone, RefreshCw, User, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import api from "../lib/api";
import { Card, EmptyState, Loader, SectionTitle, Toast } from "../components/Common";
import { useAuth } from "../context/AuthContext";

export default function Transport() {
  const { activeChildId } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feesLoading, setFeesLoading] = useState(true);
  const [hasPendingFees, setHasPendingFees] = useState(false);
  const [toast, setToast] = useState("");
  const [requestType, setRequestType] = useState("Route Change");
  const [requestDetails, setRequestDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function load() {
    if (!activeChildId) return;
    setLoading(true);
    setFeesLoading(true);
    api.get(`/parent/transport/?child_id=${activeChildId}`)
      .then(({ data }) => setData(data))
      .catch(() => setData({ allocation: null, last_location: null }))
      .finally(() => setLoading(false));

    api.get(`/parent/fees/?child_id=${activeChildId}`)
      .then(({ data }) => {
        setHasPendingFees(data.pending && data.pending.length > 0);
      })
      .catch(() => {})
      .finally(() => setFeesLoading(false));
  }

  useEffect(() => {
    load();
  }, [activeChildId]);

  async function handleRequest(e) {
    e.preventDefault();
    if (!requestDetails.trim() || !activeChildId) return;
    setSubmitting(true);
    try {
      await api.post("/parent/messages/", {
        receiver: 1, // Admin/Support ID
        message_text: `[Parent Transport ${requestType} Request for Child ID ${activeChildId}] ${requestDetails}`
      });
      setToast("Your request has been sent to the Transport Desk.");
      setRequestDetails("");
    } catch (err) {
      setToast("Could not submit request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!activeChildId) {
    return <EmptyState label="Select a child from the top bar to view transport info." />;
  }

  if (loading || feesLoading) return <Loader rows={3} />;

  if (hasPendingFees) {
    return (
      <Card className="max-w-md mx-auto mt-12 p-8 text-center border-t-4 border-danger">
        <Lock size={48} className="text-danger mx-auto mb-4" />
        <h3 className="font-heading text-lg font-bold text-ink-primary mb-2">School Bus Tracking Locked</h3>
        <p className="text-sm text-ink-secondary mb-6 leading-relaxed">
          Access to live GPS school bus tracking and transport route requests is locked due to pending fees for your child. Please clear the outstanding balance to restore access.
        </p>
        <a href="/parent/fees" className="inline-flex items-center justify-center bg-academic-green text-white rounded-xl py-2.5 px-6 text-sm font-semibold hover:bg-academic-green/90 transition-colors shadow-md">
          Pay Pending Fees
        </a>
      </Card>
    );
  }
  if (!data || !data.allocation) {
    return (
      <div className="space-y-6">
        <EmptyState label="No bus/route has been assigned to this child yet." />
        <Card className="max-w-xl">
          <p className="font-heading font-semibold mb-2">Request Transport Access</p>
          <p className="text-sm text-ink-secondary mb-4">
            Submit a request to the transport department to assign a school bus route.
          </p>
          <form onSubmit={handleRequest} className="space-y-3">
            <div className="flex gap-4">
              {["New Registration", "Route Enquiry"].map((t) => (
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
            <textarea
              required
              rows={3}
              value={requestDetails}
              onChange={(e) => setRequestDetails(e.target.value)}
              placeholder="Provide pickup address, landmarks, and timings..."
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus-ring resize-none"
            />
            <button
              disabled={submitting}
              className="bg-academic-blue text-white rounded-xl px-5 py-2 font-medium text-sm hover:bg-academic-blue/90"
            >
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
      <div className="grid md:grid-cols-2 gap-6">
        
        {/* Route Details Card */}
        <Card className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Bus size={14} /> Active Route
              </span>
              <button onClick={load} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                <RefreshCw size={14} />
              </button>
            </div>
            
            <h2 className="font-heading text-xl font-bold text-academic-blue mb-1">{a.route_name}</h2>
            <p className="text-sm text-ink-secondary flex items-center gap-1.5 mb-4">
              <MapPin size={14} className="text-slate-400" /> Pickup Stop: <span className="font-medium text-ink-primary">{a.pickup_point || "—"}</span>
            </p>

            <div className="space-y-3 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-500">
                  <User size={16} />
                </div>
                <div>
                  <p className="text-xs text-ink-secondary">Driver</p>
                  <p className="text-sm font-semibold text-ink-primary">{a.driver_name || "Not assigned"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-500">
                  <Bus size={16} />
                </div>
                <div>
                  <p className="text-xs text-ink-secondary">Vehicle Number</p>
                  <p className="text-sm font-semibold text-ink-primary">{a.vehicle_number}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 p-3 bg-blue-50/50 rounded-xl border border-blue-100/50 flex items-start gap-2.5 text-xs text-academic-blue leading-relaxed">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>Vehicles are equipped with GPS logging sensors. Location coordinates update automatically in transit.</span>
          </div>
        </Card>

        {/* Live Vector Map GPS Tracking Simulator */}
        <Card className="relative overflow-hidden min-h-[300px]">
          <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur border border-slate-200 shadow-sm rounded-xl px-3 py-1.5 flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
            <span className="text-xs font-semibold text-ink-primary">Live Tracking Active</span>
          </div>

          {/* SVG map background */}
          <div className="absolute inset-0 bg-slate-100 flex items-center justify-center">
            <svg className="w-full h-full stroke-slate-200 stroke-[4] fill-none" viewBox="0 0 400 300">
              <line x1="0" y1="80" x2="400" y2="80" />
              <line x1="0" y1="220" x2="400" y2="220" />
              <line x1="120" y1="0" x2="120" y2="300" />
              <line x1="280" y1="0" x2="280" y2="300" />
              
              <path
                d="M 60 200 C 120 80, 280 280, 340 100"
                className="stroke-academic-blue/30 stroke-[6] stroke-dasharray-[5,5]"
              />
              <path
                d="M 60 200 C 120 80, 280 280, 340 100"
                className="stroke-academic-blue stroke-[4]"
              />

              <circle cx="60" cy="200" r="6" className="fill-academic-blue stroke-white stroke-[2]" />
              <circle cx="340" cy="100" r="6" className="fill-academic-gold stroke-white stroke-[2]" />

              {/* Moving bus pointer */}
              <g className="animate-bounce" style={{ animationDuration: '3.5s' }}>
                <circle cx="180" cy="190" r="14" className="fill-academic-gold stroke-white stroke-[3] shadow-md" />
                <path
                  d="M 175 185 H 185 V 195 H 175 Z"
                  className="fill-academic-blue"
                />
              </g>
            </svg>
          </div>
          
          <div className="absolute bottom-4 left-4 right-4 z-10 bg-white/90 backdrop-blur border border-slate-200 shadow-sm rounded-xl p-3 flex justify-between items-center text-xs">
            <div>
              <p className="font-semibold text-ink-primary">
                📍 Location Coordinates
              </p>
              {data.last_location ? (
                <p className="text-ink-secondary mt-0.5">Lat {data.last_location.latitude}, Lng {data.last_location.longitude}</p>
              ) : (
                <p className="text-ink-secondary mt-0.5">Mock Transit Mode (No GPS ping)</p>
              )}
            </div>
            <span className="bg-academic-blue/10 text-academic-blue px-2 py-1 rounded font-medium">On Schedule</span>
          </div>
        </Card>

      </div>

      {/* Change Requests and Complaints forms */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <p className="font-heading font-semibold mb-1">Route Change Request</p>
          <p className="text-sm text-ink-secondary mb-4">
            Request to modify pick/drop location coordinates or assign a different bus route.
          </p>
          <form onSubmit={handleRequest} className="space-y-3">
            <div className="flex gap-4">
              {["Route Change", "Temporary Discontinue"].map((t) => (
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
            <textarea
              required
              rows={3}
              value={requestDetails}
              onChange={(e) => setRequestDetails(e.target.value)}
              placeholder="Provide exact details of the requested changes..."
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus-ring resize-none"
            />
            <button
              disabled={submitting}
              className="bg-academic-blue text-white rounded-xl px-5 py-2 font-medium text-sm hover:bg-academic-blue/90"
            >
              {submitting ? "Submitting..." : "Submit Stop Request"}
            </button>
          </form>
        </Card>

        <Card>
          <p className="font-heading font-semibold mb-1">Transport Complaint Ticket</p>
          <p className="text-sm text-ink-secondary mb-4">
            Report delay alerts, vehicle maintenance issues, or driver misconduct.
          </p>
          <form onSubmit={handleRequest} className="space-y-3">
            <div className="flex gap-4">
              {["Delay Issue", "Driver Complaint", "Other Service Incident"].map((t) => (
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
            <textarea
              required
              rows={3}
              value={requestDetails}
              onChange={(e) => setRequestDetails(e.target.value)}
              placeholder="Describe the complaint or concern..."
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus-ring resize-none"
            />
            <button
              disabled={submitting}
              className="bg-rose-600 text-white rounded-xl px-5 py-2 font-medium text-sm hover:bg-rose-700"
            >
              {submitting ? "Submitting..." : "Submit Incident Report"}
            </button>
          </form>
        </Card>
      </div>

      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}
