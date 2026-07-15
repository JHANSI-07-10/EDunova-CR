import {
  AlertTriangle, Bell, BellRing, Bus, CheckCircle2, ChevronDown, ChevronRight,
  Clock, FileText, MapPin, Navigation, Pencil, Phone, Plus, RefreshCw,
  BarChart3, Settings, Shield, Trash2, TrendingUp, Truck, User, Users, X, Zap
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import api from "../lib/api";
import { Badge, Card, EmptyState, Loader, SectionTitle, StatCard, Toast } from "../components/Common";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const TABS = [
  { id: "overview",    label: "Overview",             icon: BarChart3 },
  { id: "vehicles",   label: "Vehicles",              icon: Bus },
  { id: "staff",      label: "Drivers & Attendants",  icon: Users },
  { id: "routes",     label: "Routes & Stops",        icon: MapPin },
  { id: "allocation", label: "Student Allocation",    icon: User },
  { id: "trips",      label: "Trip Logs",             icon: Clock },
  { id: "alerts",     label: "Notifications",         icon: Bell },
  { id: "settings",   label: "Settings & Reports",    icon: Settings },
];

const STATUS_COLORS = {
  Active:       "green",
  "In Service": "green",
  Maintenance:  "orange",
  Inactive:     "red",
  "In Progress":"blue",
  Completed:    "green",
  Scheduled:    "slate",
  Cancelled:    "red",
};

const ALERT_COLORS = {
  "Bus Arrived":   "green",
  "Delay Alert":   "orange",
  "Route Changed": "blue",
  Emergency:       "red",
  Info:            "slate",
};

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-heading font-semibold text-ink-primary">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children, error }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-ink-secondary uppercase tracking-wide">{label}</label>
      {children}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

function Input({ className = "", ...props }) {
  return (
    <input
      className={`rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-academic-blue focus:ring-2 focus:ring-academic-blue/10 transition ${className}`}
      {...props}
    />
  );
}

function Select({ className = "", children, ...props }) {
  return (
    <select
      className={`rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-academic-blue focus:ring-2 focus:ring-academic-blue/10 bg-white transition ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

function Btn({ variant = "primary", size = "md", className = "", children, ...props }) {
  const base = "inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all disabled:opacity-50";
  const sz = size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm";
  const variants = {
    primary:   "bg-academic-blue text-white hover:bg-academic-blue/90 shadow-sm",
    green:     "bg-academic-green text-white hover:bg-academic-green/90 shadow-sm",
    danger:    "bg-rose-600 text-white hover:bg-rose-700 shadow-sm",
    ghost:     "bg-slate-100 text-ink-primary hover:bg-slate-200",
    outline:   "border border-slate-200 text-ink-primary hover:bg-slate-50",
  };
  return <button className={`${base} ${sz} ${variants[variant]} ${className}`} {...props}>{children}</button>;
}

// ---------------------------------------------------------------------------
// Live Fleet Map SVG (dots per vehicle)
// ---------------------------------------------------------------------------
function FleetMap({ vehicles }) {
  const positions = [
    { cx: 80,  cy: 120 }, { cx: 200, cy: 80  }, { cx: 320, cy: 160 },
    { cx: 140, cy: 200 }, { cx: 260, cy: 220 }, { cx: 350, cy: 100 },
  ];
  return (
    <div className="relative rounded-2xl overflow-hidden bg-slate-100 min-h-[220px]">
      <svg className="w-full h-56 stroke-slate-200 stroke-[3] fill-none" viewBox="0 0 400 260">
        {/* Grid */}
        {[60,120,180,240].map(y => <line key={y} x1="0" y1={y} x2="400" y2={y} />)}
        {[80,160,240,320].map(x => <line key={x} x1={x} y1="0" x2={x} y2="260" />)}
        {/* Roads */}
        <path d="M 0 150 Q 100 100 200 150 Q 300 200 400 150" className="stroke-slate-300 stroke-[8]" />
        <path d="M 150 0 Q 180 130 160 260" className="stroke-slate-300 stroke-[6]" />
        {/* Vehicles */}
        {vehicles.slice(0, 6).map((v, i) => {
          const pos = positions[i] || { cx: 200, cy: 130 };
          const color = v.maintenance_status === "Active" ? "#10b981" : "#f59e0b";
          return (
            <g key={v.vehicle_id || i}>
              <circle cx={pos.cx} cy={pos.cy} r="16" fill={color} stroke="white" strokeWidth="3" className="drop-shadow-md" />
              <text x={pos.cx} y={pos.cy + 5} textAnchor="middle" fontSize="10" fill="white" fontWeight="bold" stroke="none">
                {(v.vehicle_number || "").slice(-3)}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="absolute top-3 left-3 bg-white/90 backdrop-blur rounded-xl px-3 py-1.5 flex items-center gap-2 shadow-sm border border-slate-200">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
        <span className="text-xs font-semibold text-ink-primary">Live Fleet Map</span>
      </div>
      <div className="absolute bottom-3 right-3 flex items-center gap-3 text-xs text-ink-secondary bg-white/90 backdrop-blur rounded-xl px-3 py-1.5 border border-slate-200">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />Active</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />Maintenance</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Overview
// ---------------------------------------------------------------------------
function OverviewTab({ reports, liveMap, notifications, refresh }) {
  if (!reports) return <Loader rows={4} />;
  return (
    <div className="space-y-6">
      {/* Stat bar */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard icon={Bus}   label="Total Vehicles"      value={reports.total_vehicles}      accent="blue" />
        <StatCard icon={MapPin} label="Active Routes"      value={reports.total_routes}         accent="green" />
        <StatCard icon={User}  label="Students Allocated"  value={reports.allocated_students}   accent="orange" />
        <StatCard icon={Truck} label="Active Trips Today"  value={reports.active_trips}         accent="gold" />
        <StatCard icon={FileText} label="Active Passes"    value={reports.active_passes}        accent="blue" />
      </div>

      {/* Fleet Map + Recent Alerts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <SectionTitle>Fleet Live Map</SectionTitle>
          <FleetMap vehicles={liveMap || []} />
        </Card>
        <Card>
          <SectionTitle action={<Btn variant="ghost" size="sm" onClick={refresh}><RefreshCw size={14} /></Btn>}>
            Recent Alerts
          </SectionTitle>
          {!notifications || notifications.length === 0
            ? <EmptyState label="No alerts yet." />
            : (
              <div className="space-y-2">
                {notifications.slice(0, 6).map(n => (
                  <div key={n.id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                      n.type === "Emergency" ? "bg-red-500" :
                      n.type === "Delay Alert" ? "bg-amber-500" :
                      n.type === "Bus Arrived" ? "bg-emerald-500" : "bg-blue-500"
                    }`} />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-ink-primary">{n.type} {n.route_name ? `— ${n.route_name}` : ""}</p>
                      <p className="text-xs text-ink-secondary truncate">{n.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
        </Card>
      </div>

      {/* Route Utilisation */}
      <Card>
        <SectionTitle>Route Utilisation</SectionTitle>
        {!reports.route_utilisation || reports.route_utilisation.length === 0
          ? <EmptyState label="No routes configured yet." />
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-ink-secondary font-medium border-b border-slate-100">
                    <th className="text-left pb-2 pr-4">Route</th>
                    <th className="text-left pb-2 pr-4">Start → End</th>
                    <th className="text-left pb-2 pr-4">Vehicle</th>
                    <th className="text-left pb-2 pr-4">Capacity</th>
                    <th className="text-left pb-2">Students</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {reports.route_utilisation.map((r, i) => {
                    const pct = r.capacity ? Math.round((r.student_count / r.capacity) * 100) : 0;
                    return (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 pr-4 font-medium">{r.route_name}</td>
                        <td className="py-2.5 pr-4 text-ink-secondary text-xs">{r.start_point} → {r.end_point}</td>
                        <td className="py-2.5 pr-4 text-ink-secondary">{r.vehicle_number || "—"}</td>
                        <td className="py-2.5 pr-4 text-ink-secondary">{r.capacity || "—"}</td>
                        <td className="py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{r.student_count}</span>
                            {r.capacity > 0 && (
                              <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${pct > 80 ? "bg-rose-500" : pct > 60 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Vehicles
// ---------------------------------------------------------------------------
function VehiclesTab({ vehicles, drivers, refresh, setToast }) {
  const [modal, setModal] = useState(null); // null | "add" | vehicle_obj
  const blank = { vehicle_number: "", capacity: "", gps_device_id: "", maintenance_status: "Active", driver_id: "", vehicle_type: "Bus" };
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  function openAdd() { setForm(blank); setErrors({}); setModal("add"); }
  function openEdit(v) { setForm({ ...v, capacity: v.capacity || "", driver_id: v.driver_id || "" }); setErrors({}); setModal(v); }

  async function save() {
    if (!form.vehicle_number.trim()) { setErrors({ vehicle_number: "Required" }); return; }
    setSaving(true);
    try {
      if (modal === "add") await api.post("/admin-portal/vehicles/", form);
      else await api.patch("/admin-portal/vehicles/", { ...form, id: modal.id });
      setToast(modal === "add" ? "Vehicle added." : "Vehicle updated.");
      setModal(null); refresh();
    } catch { setToast("Could not save vehicle."); }
    finally { setSaving(false); }
  }

  async function del(v) {
    if (!window.confirm(`Delete vehicle ${v.vehicle_number}?`)) return;
    try { await api.delete(`/admin-portal/vehicles/?id=${v.id}`); setToast("Vehicle removed."); refresh(); }
    catch { setToast("Could not delete vehicle."); }
  }

  if (!vehicles) return <Loader rows={4} />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-heading font-semibold text-ink-primary">Fleet ({vehicles.length})</h2>
        <Btn onClick={openAdd}><Plus size={15} /> Add Vehicle</Btn>
      </div>

      {vehicles.length === 0 ? <EmptyState label="No vehicles added yet." /> : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {vehicles.map(v => (
            <div key={v.id} className="bg-white rounded-2xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-academic-blue/10 rounded-xl flex items-center justify-center">
                    <Bus size={18} className="text-academic-blue" />
                  </div>
                  <div>
                    <p className="font-semibold text-ink-primary text-sm">{v.vehicle_number}</p>
                    <p className="text-xs text-ink-secondary">{v.capacity ? `Capacity: ${v.capacity}` : "Capacity N/A"}</p>
                  </div>
                </div>
                <Badge tone={STATUS_COLORS[v.maintenance_status] || "slate"}>{v.maintenance_status}</Badge>
              </div>
              <div className="space-y-1.5 text-xs text-ink-secondary border-t border-slate-100 pt-3 mb-3">
                <div className="flex items-center gap-2"><User size={12} className="text-slate-400" />{v.driver_name || "No driver assigned"}</div>
                {v.driver_phone && <div className="flex items-center gap-2"><Phone size={12} className="text-slate-400" />{v.driver_phone}</div>}
                {v.gps_device_id && <div className="flex items-center gap-2"><Navigation size={12} className="text-slate-400" />GPS: {v.gps_device_id}</div>}
              </div>
              <div className="flex gap-2">
                <Btn variant="ghost" size="sm" className="flex-1" onClick={() => openEdit(v)}><Pencil size={12} /> Edit</Btn>
                <Btn variant="danger" size="sm" onClick={() => del(v)}><Trash2 size={12} /></Btn>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <Modal title={modal === "add" ? "Add Vehicle" : "Edit Vehicle"} onClose={() => setModal(null)}>
          <Field label="Vehicle Number *" error={errors.vehicle_number}>
            <Input value={form.vehicle_number} onChange={e => setForm({ ...form, vehicle_number: e.target.value })} placeholder="e.g. MH-12-AB-1234" className={errors.vehicle_number ? "border-danger" : ""} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Vehicle Type">
              <Select value={form.vehicle_type || "Bus"} onChange={e => setForm({ ...form, vehicle_type: e.target.value })}>
                {["Bus", "Van", "Mini Bus"].map(t => <option key={t}>{t}</option>)}
              </Select>
            </Field>
            <Field label="Capacity">
              <Input type="number" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} placeholder="40" />
            </Field>
          </div>
          <Field label="Assign Driver (User ID)">
            <Select value={form.driver_id || ""} onChange={e => setForm({ ...form, driver_id: e.target.value })}>
              <option value="">— No driver —</option>
              {(drivers || []).map(d => <option key={d.id} value={d.user_id}>{d.name} ({d.phone || "no phone"})</option>)}
            </Select>
          </Field>
          <Field label="GPS Device ID">
            <Input value={form.gps_device_id} onChange={e => setForm({ ...form, gps_device_id: e.target.value })} placeholder="GPS-001" />
          </Field>
          <Field label="Maintenance Status">
            <Select value={form.maintenance_status} onChange={e => setForm({ ...form, maintenance_status: e.target.value })}>
              {["Active", "Maintenance", "Inactive"].map(s => <option key={s}>{s}</option>)}
            </Select>
          </Field>
          <div className="flex gap-3 pt-2">
            <Btn variant="outline" className="flex-1" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn className="flex-1" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save Vehicle"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Drivers & Attendants
// ---------------------------------------------------------------------------
function StaffTab({ drivers, attendants, routes, refresh, setToast }) {
  const [dModal, setDModal] = useState(null);
  const [aModal, setAModal] = useState(null);
  const [dForm, setDForm] = useState({ user_id: "", license_number: "", phone: "", vehicle_id: "" });
  const [aForm, setAForm] = useState({ user_id: "", phone: "", assigned_route_id: "" });
  const [saving, setSaving] = useState(false);

  async function saveDriver() {
    if (!dForm.user_id) return;
    setSaving(true);
    try {
      await (dModal === "add" ? api.post : api.patch)("/admin-portal/transport/drivers/", dModal === "add" ? dForm : { ...dForm, id: dModal.id });
      setToast("Driver saved."); setDModal(null); refresh();
    } catch { setToast("Could not save driver."); }
    finally { setSaving(false); }
  }

  async function saveAttendant() {
    if (!aForm.user_id) return;
    setSaving(true);
    try {
      await (aModal === "add" ? api.post : api.patch)("/admin-portal/transport/attendants/", aModal === "add" ? aForm : { ...aForm, id: aModal.id });
      setToast("Attendant saved."); setAModal(null); refresh();
    } catch { setToast("Could not save attendant."); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-8">
      {/* Drivers */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading font-semibold">Drivers ({(drivers || []).length})</h2>
          <Btn onClick={() => { setDForm({ user_id: "", license_number: "", phone: "" }); setDModal("add"); }}><Plus size={15} /> Add Driver</Btn>
        </div>
        {!drivers ? <Loader rows={3} /> : drivers.length === 0 ? <EmptyState label="No drivers registered yet." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-xs text-ink-secondary border-b border-slate-100">
                <th className="text-left pb-2 pr-4">Name</th>
                <th className="text-left pb-2 pr-4">Phone</th>
                <th className="text-left pb-2 pr-4">License</th>
                <th className="text-left pb-2 pr-4">Vehicle</th>
                <th className="text-left pb-2">Status</th>
                <th className="pb-2" />
              </tr></thead>
              <tbody className="divide-y divide-slate-50">
                {drivers.map(d => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="py-2.5 pr-4 font-medium">{d.name}</td>
                    <td className="py-2.5 pr-4 text-ink-secondary">{d.phone || "—"}</td>
                    <td className="py-2.5 pr-4 text-ink-secondary font-mono text-xs">{d.license_number || "—"}</td>
                    <td className="py-2.5 pr-4 text-ink-secondary">{d.vehicle_number || "—"}</td>
                    <td className="py-2.5"><Badge tone={d.is_active ? "green" : "red"}>{d.is_active ? "Active" : "Inactive"}</Badge></td>
                    <td className="py-2.5"><Btn variant="ghost" size="sm" onClick={() => { setDForm({ ...d }); setDModal(d); }}><Pencil size={12} /></Btn></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Attendants */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading font-semibold">Attendants ({(attendants || []).length})</h2>
          <Btn onClick={() => { setAForm({ user_id: "", phone: "", assigned_route_id: "" }); setAModal("add"); }}><Plus size={15} /> Add Attendant</Btn>
        </div>
        {!attendants ? <Loader rows={3} /> : attendants.length === 0 ? <EmptyState label="No attendants registered yet." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-xs text-ink-secondary border-b border-slate-100">
                <th className="text-left pb-2 pr-4">Name</th>
                <th className="text-left pb-2 pr-4">Phone</th>
                <th className="text-left pb-2 pr-4">Assigned Route</th>
                <th className="text-left pb-2">Status</th>
                <th className="pb-2" />
              </tr></thead>
              <tbody className="divide-y divide-slate-50">
                {attendants.map(a => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="py-2.5 pr-4 font-medium">{a.name}</td>
                    <td className="py-2.5 pr-4 text-ink-secondary">{a.phone || "—"}</td>
                    <td className="py-2.5 pr-4 text-ink-secondary">{a.route_name || "—"}</td>
                    <td className="py-2.5"><Badge tone={a.is_active ? "green" : "red"}>{a.is_active ? "Active" : "Inactive"}</Badge></td>
                    <td className="py-2.5"><Btn variant="ghost" size="sm" onClick={() => { setAForm({ ...a }); setAModal(a); }}><Pencil size={12} /></Btn></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Driver Modal */}
      {dModal && (
        <Modal title={dModal === "add" ? "Register Driver" : "Edit Driver"} onClose={() => setDModal(null)}>
          <Field label="User ID (auth_user.id) *"><Input type="number" value={dForm.user_id} onChange={e => setDForm({ ...dForm, user_id: e.target.value })} placeholder="e.g. 42" /></Field>
          <Field label="Phone"><Input value={dForm.phone} onChange={e => setDForm({ ...dForm, phone: e.target.value })} placeholder="+91 98765 43210" /></Field>
          <Field label="License Number"><Input value={dForm.license_number} onChange={e => setDForm({ ...dForm, license_number: e.target.value })} placeholder="DL-1234567890" /></Field>
          <div className="flex gap-3 pt-2">
            <Btn variant="outline" className="flex-1" onClick={() => setDModal(null)}>Cancel</Btn>
            <Btn className="flex-1" onClick={saveDriver} disabled={saving}>{saving ? "Saving…" : "Save Driver"}</Btn>
          </div>
        </Modal>
      )}

      {/* Attendant Modal */}
      {aModal && (
        <Modal title={aModal === "add" ? "Register Attendant" : "Edit Attendant"} onClose={() => setAModal(null)}>
          <Field label="User ID (auth_user.id) *"><Input type="number" value={aForm.user_id} onChange={e => setAForm({ ...aForm, user_id: e.target.value })} placeholder="e.g. 55" /></Field>
          <Field label="Phone"><Input value={aForm.phone} onChange={e => setAForm({ ...aForm, phone: e.target.value })} placeholder="+91 98765 43210" /></Field>
          <Field label="Assigned Route">
            <Select value={aForm.assigned_route_id || ""} onChange={e => setAForm({ ...aForm, assigned_route_id: e.target.value })}>
              <option value="">— Select route —</option>
              {(routes || []).map(r => <option key={r.id} value={r.id}>{r.route_name}</option>)}
            </Select>
          </Field>
          <div className="flex gap-3 pt-2">
            <Btn variant="outline" className="flex-1" onClick={() => setAModal(null)}>Cancel</Btn>
            <Btn className="flex-1" onClick={saveAttendant} disabled={saving}>{saving ? "Saving…" : "Save Attendant"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Routes & Stops
// ---------------------------------------------------------------------------
function RoutesTab({ routes, vehicles, attendants, refresh, setToast }) {
  const [modal, setModal] = useState(null);
  const [expandedRoute, setExpandedRoute] = useState(null);
  const [stops, setStops] = useState({});
  const [stopModal, setStopModal] = useState(null);
  const [form, setForm] = useState({ route_name: "", start_point: "", end_point: "", vehicle_id: "", attendant_id: "" });
  const [stopForm, setStopForm] = useState({ route_id: "", name: "", sequence_order: 1, pickup_time: "", drop_time: "" });
  const [saving, setSaving] = useState(false);

  async function loadStops(routeId) {
    try {
      const { data } = await api.get(`/admin-portal/transport/pickup-points/?route_id=${routeId}`);
      setStops(prev => ({ ...prev, [routeId]: data }));
    } catch {}
  }

  function toggleExpand(routeId) {
    if (expandedRoute === routeId) { setExpandedRoute(null); return; }
    setExpandedRoute(routeId);
    if (!stops[routeId]) loadStops(routeId);
  }

  async function saveRoute() {
    if (!form.route_name.trim()) return;
    setSaving(true);
    try {
      if (modal === "add") await api.post("/admin-portal/routes/", form);
      else await api.patch("/admin-portal/routes/", { ...form, id: modal.id });
      setToast(modal === "add" ? "Route created." : "Route updated.");
      setModal(null); refresh();
    } catch { setToast("Could not save route."); }
    finally { setSaving(false); }
  }

  async function delRoute(r) {
    if (!window.confirm(`Delete route "${r.route_name}"? This will remove all stop assignments.`)) return;
    try { await api.delete(`/admin-portal/routes/?id=${r.id}`); setToast("Route deleted."); refresh(); }
    catch { setToast("Could not delete route."); }
  }

  async function saveStop() {
    if (!stopForm.name.trim()) return;
    setSaving(true);
    try {
      await (stopModal === "add" ? api.post : api.patch)("/admin-portal/transport/pickup-points/",
        stopModal === "add" ? stopForm : { ...stopForm, id: stopModal.id });
      setToast("Stop saved."); setStopModal(null); loadStops(stopForm.route_id);
    } catch { setToast("Could not save stop."); }
    finally { setSaving(false); }
  }

  async function delStop(stop, routeId) {
    try { await api.delete(`/admin-portal/transport/pickup-points/?id=${stop.id}`); loadStops(routeId); }
    catch { setToast("Could not delete stop."); }
  }

  if (!routes) return <Loader rows={4} />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-heading font-semibold">Routes ({routes.length})</h2>
        <Btn onClick={() => { setForm({ route_name: "", start_point: "", end_point: "", vehicle_id: "", attendant_id: "" }); setModal("add"); }}><Plus size={15} /> Add Route</Btn>
      </div>

      {routes.length === 0 ? <EmptyState label="No routes created yet." /> : (
        <div className="space-y-3">
          {routes.map(r => (
            <div key={r.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors">
                <div className="w-10 h-10 bg-academic-green/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <MapPin size={18} className="text-academic-green" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-ink-primary text-sm">{r.route_name}</p>
                  <p className="text-xs text-ink-secondary">{r.start_point} → {r.end_point}</p>
                </div>
                <div className="flex items-center gap-4 text-xs text-ink-secondary">
                  <span className="hidden md:block">{r.vehicle_number || "No vehicle"}</span>
                  <Badge tone="slate">{r.stop_count} stop{r.stop_count !== 1 ? "s" : ""}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Btn variant="ghost" size="sm" onClick={() => { setForm({ ...r, vehicle_id: r.vehicle_id || "", attendant_id: r.attendant_id || "" }); setModal(r); }}><Pencil size={12} /></Btn>
                  <Btn variant="danger" size="sm" onClick={() => delRoute(r)}><Trash2 size={12} /></Btn>
                  <button onClick={() => toggleExpand(r.id)} className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors">
                    {expandedRoute === r.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                </div>
              </div>

              {expandedRoute === r.id && (
                <div className="border-t border-slate-100 p-4 bg-slate-50/50">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-ink-secondary uppercase tracking-wide">Pickup / Drop Stops</p>
                    <Btn size="sm" variant="outline" onClick={() => { setStopForm({ route_id: r.id, name: "", sequence_order: (stops[r.id]?.length || 0) + 1, pickup_time: "", drop_time: "" }); setStopModal("add"); }}>
                      <Plus size={12} /> Add Stop
                    </Btn>
                  </div>
                  {!stops[r.id] ? <Loader rows={2} /> : stops[r.id].length === 0 ? <EmptyState label="No stops added yet." /> : (
                    <div className="space-y-2">
                      {stops[r.id].map((s, idx) => (
                        <div key={s.id} className="flex items-center gap-3 bg-white rounded-xl p-3 border border-slate-100">
                          <span className="w-6 h-6 rounded-full bg-academic-blue text-white text-xs flex items-center justify-center font-semibold flex-shrink-0">{s.sequence_order}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-ink-primary">{s.name}</p>
                            <p className="text-xs text-ink-secondary">{s.pickup_time ? `↑ ${s.pickup_time}` : ""} {s.drop_time ? `↓ ${s.drop_time}` : ""}</p>
                          </div>
                          <div className="flex gap-1">
                            <Btn variant="ghost" size="sm" onClick={() => { setStopForm({ ...s, route_id: r.id }); setStopModal(s); }}><Pencil size={11} /></Btn>
                            <Btn variant="danger" size="sm" onClick={() => delStop(s, r.id)}><Trash2 size={11} /></Btn>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Route Modal */}
      {modal && (
        <Modal title={modal === "add" ? "Create Route" : "Edit Route"} onClose={() => setModal(null)}>
          <Field label="Route Name *"><Input value={form.route_name} onChange={e => setForm({ ...form, route_name: e.target.value })} placeholder="e.g. North Zone Route A" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start Point"><Input value={form.start_point} onChange={e => setForm({ ...form, start_point: e.target.value })} placeholder="School Gate" /></Field>
            <Field label="End Point"><Input value={form.end_point} onChange={e => setForm({ ...form, end_point: e.target.value })} placeholder="North Bus Stand" /></Field>
          </div>
          <Field label="Assigned Vehicle">
            <Select value={form.vehicle_id || ""} onChange={e => setForm({ ...form, vehicle_id: e.target.value })}>
              <option value="">— No vehicle —</option>
              {(vehicles || []).map(v => <option key={v.id} value={v.id}>{v.vehicle_number}</option>)}
            </Select>
          </Field>
          <Field label="Attendant">
            <Select value={form.attendant_id || ""} onChange={e => setForm({ ...form, attendant_id: e.target.value })}>
              <option value="">— No attendant —</option>
              {(attendants || []).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </Select>
          </Field>
          <div className="flex gap-3 pt-2">
            <Btn variant="outline" className="flex-1" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn variant="green" className="flex-1" onClick={saveRoute} disabled={saving}>{saving ? "Saving…" : "Save Route"}</Btn>
          </div>
        </Modal>
      )}

      {/* Stop Modal */}
      {stopModal && (
        <Modal title={stopModal === "add" ? "Add Stop" : "Edit Stop"} onClose={() => setStopModal(null)}>
          <Field label="Stop Name *"><Input value={stopForm.name} onChange={e => setStopForm({ ...stopForm, name: e.target.value })} placeholder="e.g. Main Market Stop" /></Field>
          <Field label="Sequence Order"><Input type="number" value={stopForm.sequence_order} onChange={e => setStopForm({ ...stopForm, sequence_order: parseInt(e.target.value) || 1 })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Pickup Time (Morning)"><Input type="time" value={stopForm.pickup_time} onChange={e => setStopForm({ ...stopForm, pickup_time: e.target.value })} /></Field>
            <Field label="Drop Time (Afternoon)"><Input type="time" value={stopForm.drop_time} onChange={e => setStopForm({ ...stopForm, drop_time: e.target.value })} /></Field>
          </div>
          <div className="flex gap-3 pt-2">
            <Btn variant="outline" className="flex-1" onClick={() => setStopModal(null)}>Cancel</Btn>
            <Btn className="flex-1" onClick={saveStop} disabled={saving}>{saving ? "Saving…" : "Save Stop"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Student Allocation
// ---------------------------------------------------------------------------
function AllocationTab({ allocations, vehicles, routes, refresh, setToast }) {
  const [modal, setModal] = useState(false);
  const [passModal, setPassModal] = useState(null);
  const [form, setForm] = useState({ student_id: "", vehicle_id: "", route_id: "", pickup_point: "" });
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const filtered = (allocations || []).filter(a =>
    !search || a.student_name?.toLowerCase().includes(search.toLowerCase()) ||
    a.route_name?.toLowerCase().includes(search.toLowerCase()) ||
    a.vehicle_number?.toLowerCase().includes(search.toLowerCase())
  );

  async function allocate() {
    if (!form.student_id || !form.vehicle_id || !form.route_id) return;
    setSaving(true);
    try {
      await api.post("/admin-portal/transport-allocations/", form);
      setToast("Student allocated."); setModal(false); refresh();
    } catch { setToast("Could not allocate student."); }
    finally { setSaving(false); }
  }

  async function remove(a) {
    if (!window.confirm(`Remove ${a.student_name} from transport?`)) return;
    try { await api.delete(`/admin-portal/transport-allocations/?student_id=${a.student_id}`); setToast("Allocation removed."); refresh(); }
    catch { setToast("Could not remove allocation."); }
  }

  async function generatePass(a) {
    try {
      const { data } = await api.post("/admin-portal/transport/passes/", { student_id: a.student_id });
      setPassModal({ ...a, pass_number: data.pass_number });
      setToast("Transport pass generated."); refresh();
    } catch { setToast("Could not generate pass."); }
  }

  if (!allocations) return <Loader rows={4} />;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Input className="flex-1 max-w-xs" placeholder="Search student / route / vehicle…" value={search} onChange={e => setSearch(e.target.value)} />
        <Btn onClick={() => { setForm({ student_id: "", vehicle_id: "", route_id: "", pickup_point: "" }); setModal(true); }}><Plus size={15} /> Allocate Student</Btn>
      </div>

      {filtered.length === 0 ? <EmptyState label="No students allocated yet." /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-ink-secondary border-b border-slate-100">
              <th className="text-left pb-2 pr-4">Student</th>
              <th className="text-left pb-2 pr-4">Route</th>
              <th className="text-left pb-2 pr-4">Vehicle</th>
              <th className="text-left pb-2 pr-4">Pickup Stop</th>
              <th className="text-left pb-2 pr-4">Pass</th>
              <th className="pb-2" />
            </tr></thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(a => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="py-2.5 pr-4 font-medium">{a.student_name}</td>
                  <td className="py-2.5 pr-4 text-ink-secondary">{a.route_name}</td>
                  <td className="py-2.5 pr-4 text-ink-secondary">{a.vehicle_number}</td>
                  <td className="py-2.5 pr-4 text-ink-secondary text-xs">{a.pickup_point || "—"}</td>
                  <td className="py-2.5 pr-4">
                    {a.pass_number
                      ? <button onClick={() => setPassModal(a)} className="text-xs font-mono text-academic-blue hover:underline">{a.pass_number}</button>
                      : <Btn variant="ghost" size="sm" onClick={() => generatePass(a)}><FileText size={12} /> Generate</Btn>}
                  </td>
                  <td className="py-2.5 flex gap-1.5">
                    <Btn variant="ghost" size="sm" onClick={() => generatePass(a)}><RefreshCw size={12} /></Btn>
                    <Btn variant="danger" size="sm" onClick={() => remove(a)}><Trash2 size={12} /></Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Allocate Modal */}
      {modal && (
        <Modal title="Allocate Student to Route" onClose={() => setModal(false)}>
          <Field label="Student User ID *"><Input type="number" value={form.student_id} onChange={e => setForm({ ...form, student_id: e.target.value })} placeholder="Student's auth_user ID" /></Field>
          <Field label="Route *">
            <Select value={form.route_id} onChange={e => setForm({ ...form, route_id: e.target.value })}>
              <option value="">— Select route —</option>
              {(routes || []).map(r => <option key={r.id} value={r.id}>{r.route_name}</option>)}
            </Select>
          </Field>
          <Field label="Vehicle *">
            <Select value={form.vehicle_id} onChange={e => setForm({ ...form, vehicle_id: e.target.value })}>
              <option value="">— Select vehicle —</option>
              {(vehicles || []).map(v => <option key={v.id} value={v.id}>{v.vehicle_number}</option>)}
            </Select>
          </Field>
          <Field label="Pickup Stop Name"><Input value={form.pickup_point} onChange={e => setForm({ ...form, pickup_point: e.target.value })} placeholder="e.g. Main Market Stop" /></Field>
          <div className="flex gap-3 pt-2">
            <Btn variant="outline" className="flex-1" onClick={() => setModal(false)}>Cancel</Btn>
            <Btn variant="green" className="flex-1" onClick={allocate} disabled={saving}>{saving ? "Allocating…" : "Allocate"}</Btn>
          </div>
        </Modal>
      )}

      {/* Pass Modal */}
      {passModal && (
        <Modal title="Transport Pass" onClose={() => setPassModal(null)}>
          <div className="bg-gradient-to-br from-academic-blue to-blue-700 rounded-2xl p-6 text-white text-center space-y-3">
            <Bus size={36} className="mx-auto opacity-80" />
            <div>
              <p className="text-xs uppercase tracking-widest opacity-70">EduNova Transport Pass</p>
              <p className="text-2xl font-bold font-mono mt-1">{passModal.pass_number}</p>
            </div>
            <div className="border-t border-white/20 pt-3 space-y-1 text-sm">
              <p className="font-semibold">{passModal.student_name}</p>
              <p className="opacity-70">{passModal.route_name} · {passModal.vehicle_number}</p>
              <p className="opacity-70 text-xs">{passModal.pickup_point || "—"}</p>
            </div>
          </div>
          <p className="text-xs text-ink-secondary text-center">This pass is issued to the student and must be presented when boarding.</p>
        </Modal>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Trip Logs
// ---------------------------------------------------------------------------
function TripsTab({ vehicles, routes, refresh, setToast }) {
  const [trips, setTrips] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ vehicle_id: "", route_id: "" });
  const [saving, setSaving] = useState(false);

  async function loadTrips(d) {
    try { const { data } = await api.get(`/admin-portal/transport/trips/?date=${d}`); setTrips(data); }
    catch { setTrips([]); }
  }

  useEffect(() => { loadTrips(date); }, [date]);

  async function startTrip() {
    if (!form.vehicle_id) return;
    setSaving(true);
    try {
      await api.post("/admin-portal/transport/trips/", form);
      setToast("Trip started."); setModal(false); loadTrips(date);
    } catch { setToast("Could not start trip."); }
    finally { setSaving(false); }
  }

  async function updateTrip(trip, status) {
    try {
      await api.patch("/admin-portal/transport/trips/", { id: trip.id, status });
      setToast(`Trip marked ${status}.`); loadTrips(date);
    } catch { setToast("Could not update trip."); }
  }

  const STATUS_BTN = { "In Progress": { label: "End Trip", variant: "danger" }, "Scheduled": { label: "Start", variant: "green" } };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <Input type="date" value={date} onChange={e => { setDate(e.target.value); setTrips(null); loadTrips(e.target.value); }} className="w-44" />
        <Btn onClick={() => { setForm({ vehicle_id: "", route_id: "" }); setModal(true); }}><Plus size={15} /> Start New Trip</Btn>
        <Btn variant="ghost" onClick={() => loadTrips(date)}><RefreshCw size={14} /></Btn>
      </div>

      {!trips ? <Loader rows={3} /> : trips.length === 0 ? <EmptyState label="No trips logged for this date." /> : (
        <div className="space-y-3">
          {trips.map(t => (
            <div key={t.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${t.status === "In Progress" ? "bg-emerald-100" : t.status === "Completed" ? "bg-blue-100" : "bg-slate-100"}`}>
                <Truck size={18} className={t.status === "In Progress" ? "text-emerald-600" : t.status === "Completed" ? "text-blue-600" : "text-slate-500"} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{t.vehicle_number} — {t.route_name || "—"}</p>
                <p className="text-xs text-ink-secondary">
                  {t.started_at ? `Started: ${new Date(t.started_at).toLocaleTimeString()}` : "Not started"}{" "}
                  {t.ended_at ? `· Ended: ${new Date(t.ended_at).toLocaleTimeString()}` : ""}
                </p>
              </div>
              <Badge tone={STATUS_COLORS[t.status] || "slate"}>{t.status}</Badge>
              {STATUS_BTN[t.status] && (
                <Btn variant={STATUS_BTN[t.status].variant} size="sm" onClick={() => updateTrip(t, t.status === "In Progress" ? "Completed" : "In Progress")}>
                  {STATUS_BTN[t.status].label}
                </Btn>
              )}
            </div>
          ))}
        </div>
      )}

      {modal && (
        <Modal title="Start a Trip" onClose={() => setModal(false)}>
          <Field label="Vehicle *">
            <Select value={form.vehicle_id} onChange={e => setForm({ ...form, vehicle_id: e.target.value })}>
              <option value="">— Select vehicle —</option>
              {(vehicles || []).map(v => <option key={v.id} value={v.id}>{v.vehicle_number}</option>)}
            </Select>
          </Field>
          <Field label="Route">
            <Select value={form.route_id || ""} onChange={e => setForm({ ...form, route_id: e.target.value })}>
              <option value="">— Select route —</option>
              {(routes || []).map(r => <option key={r.id} value={r.id}>{r.route_name}</option>)}
            </Select>
          </Field>
          <div className="flex gap-3 pt-2">
            <Btn variant="outline" className="flex-1" onClick={() => setModal(false)}>Cancel</Btn>
            <Btn variant="green" className="flex-1" onClick={startTrip} disabled={saving}>{saving ? "Starting…" : "Start Trip"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Notifications / Alerts
// ---------------------------------------------------------------------------
function AlertsTab({ notifications, vehicles, routes, refresh, setToast }) {
  const [form, setForm] = useState({ type: "Delay Alert", message: "", vehicle_id: "", route_id: "" });
  const [sending, setSending] = useState(false);

  const TYPES = ["Bus Arrived", "Delay Alert", "Route Changed", "Emergency", "Info"];
  const ICONS = { "Bus Arrived": CheckCircle2, "Delay Alert": AlertTriangle, "Route Changed": Navigation, Emergency: Zap, Info: Bell };

  async function send() {
    if (!form.message.trim()) return;
    setSending(true);
    try {
      await api.post("/admin-portal/transport/notifications/", form);
      setToast("Alert broadcast sent."); setForm({ ...form, message: "" }); refresh();
    } catch { setToast("Could not send alert."); }
    finally { setSending(false); }
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Broadcast Form */}
      <Card>
        <SectionTitle>Broadcast Alert</SectionTitle>
        <div className="space-y-4">
          <Field label="Alert Type">
            <Select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
              {TYPES.map(t => <option key={t}>{t}</option>)}
            </Select>
          </Field>
          <Field label="Route (optional)">
            <Select value={form.route_id || ""} onChange={e => setForm({ ...form, route_id: e.target.value })}>
              <option value="">— All routes —</option>
              {(routes || []).map(r => <option key={r.id} value={r.id}>{r.route_name}</option>)}
            </Select>
          </Field>
          <Field label="Vehicle (optional)">
            <Select value={form.vehicle_id || ""} onChange={e => setForm({ ...form, vehicle_id: e.target.value })}>
              <option value="">— All vehicles —</option>
              {(vehicles || []).map(v => <option key={v.id} value={v.id}>{v.vehicle_number}</option>)}
            </Select>
          </Field>
          <Field label="Message *">
            <textarea
              rows={3}
              value={form.message}
              onChange={e => setForm({ ...form, message: e.target.value })}
              placeholder="Enter alert message to broadcast to students and parents…"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-academic-blue resize-none"
            />
          </Field>
          <Btn
            variant={form.type === "Emergency" ? "danger" : "primary"}
            className="w-full"
            onClick={send}
            disabled={sending || !form.message.trim()}
          >
            <BellRing size={15} /> {sending ? "Broadcasting…" : `Broadcast ${form.type}`}
          </Btn>
        </div>
      </Card>

      {/* Recent Alerts */}
      <Card>
        <SectionTitle action={<Btn variant="ghost" size="sm" onClick={refresh}><RefreshCw size={14} /></Btn>}>
          Alert History
        </SectionTitle>
        {!notifications || notifications.length === 0 ? <EmptyState label="No alerts sent yet." /> : (
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {notifications.map(n => {
              const Icon = ICONS[n.type] || Bell;
              const tone = ALERT_COLORS[n.type] || "slate";
              return (
                <div key={n.id} className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    n.type === "Emergency" ? "bg-red-100 text-red-600" :
                    n.type === "Delay Alert" ? "bg-amber-100 text-amber-600" :
                    n.type === "Bus Arrived" ? "bg-emerald-100 text-emerald-600" : "bg-blue-100 text-blue-600"
                  }`}>
                    <Icon size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge tone={tone}>{n.type}</Badge>
                      {n.route_name && <span className="text-xs text-ink-secondary">{n.route_name}</span>}
                    </div>
                    <p className="text-sm text-ink-primary mt-1">{n.message}</p>
                    <p className="text-xs text-ink-secondary mt-0.5">
                      {new Date(n.created_at).toLocaleString()} · {n.created_by_name}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Settings & Reports
// ---------------------------------------------------------------------------
function SettingsTab({ reports, setToast }) {
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/admin-portal/transport/settings/")
      .then(({ data }) => setSettings(data))
      .catch(() => setSettings({}));
  }, []);

  async function save() {
    setSaving(true);
    try {
      await api.post("/admin-portal/transport/settings/", settings);
      setToast("Settings saved.");
    } catch { setToast("Could not save settings."); }
    finally { setSaving(false); }
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card>
        <SectionTitle>Transport Configuration</SectionTitle>
        {!settings ? <Loader rows={3} /> : (
          <div className="space-y-4">
            <Field label="Transport Desk Contact Number">
              <Input value={settings.contact_number || ""} onChange={e => setSettings({ ...settings, contact_number: e.target.value })} placeholder="+91 98765 43210" />
            </Field>
            <Field label="Annual Transport Fee (₹)">
              <Input type="number" value={settings.annual_transport_fee || ""} onChange={e => setSettings({ ...settings, annual_transport_fee: e.target.value })} placeholder="12000" />
            </Field>
            <Field label="Fee Due Date">
              <Input type="date" value={settings.fee_due_date || ""} onChange={e => setSettings({ ...settings, fee_due_date: e.target.value })} />
            </Field>
            <Field label="GPS Update Interval (seconds)">
              <Input type="number" value={settings.gps_update_interval_sec || "30"} onChange={e => setSettings({ ...settings, gps_update_interval_sec: e.target.value })} />
            </Field>
            <Btn className="w-full" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save Settings"}</Btn>
          </div>
        )}
      </Card>

      {/* Recent Trips Report */}
      <Card>
        <SectionTitle>Recent Trip History</SectionTitle>
        {!reports?.recent_trips || reports.recent_trips.length === 0
          ? <EmptyState label="No trip history yet." />
          : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {reports.recent_trips.map((t, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 border border-slate-100">
                  <Truck size={14} className="text-slate-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0 text-xs">
                    <p className="font-medium text-ink-primary">{t.vehicle_number} — {t.route_name || "—"}</p>
                    <p className="text-ink-secondary">{t.trip_date} · {t.started_at ? new Date(t.started_at).toLocaleTimeString() : "—"}</p>
                  </div>
                  <Badge tone={STATUS_COLORS[t.status] || "slate"}>{t.status}</Badge>
                </div>
              ))}
            </div>
          )}
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root Component
// ---------------------------------------------------------------------------
export default function Transport() {
  const [tab, setTab] = useState("overview");
  const [toast, setToast] = useState("");

  // Shared data
  const [vehicles, setVehicles] = useState(null);
  const [routes, setRoutes] = useState(null);
  const [drivers, setDrivers] = useState(null);
  const [attendants, setAttendants] = useState(null);
  const [allocations, setAllocations] = useState(null);
  const [notifications, setNotifications] = useState(null);
  const [reports, setReports] = useState(null);
  const [liveMap, setLiveMap] = useState([]);

  function loadAll() {
    api.get("/admin-portal/vehicles/").then(({ data }) => setVehicles(data)).catch(() => setVehicles([]));
    api.get("/admin-portal/routes/").then(({ data }) => setRoutes(data)).catch(() => setRoutes([]));
    api.get("/admin-portal/transport/drivers/").then(({ data }) => setDrivers(data)).catch(() => setDrivers([]));
    api.get("/admin-portal/transport/attendants/").then(({ data }) => setAttendants(data)).catch(() => setAttendants([]));
    api.get("/admin-portal/transport-allocations/").then(({ data }) => setAllocations(data)).catch(() => setAllocations([]));
    api.get("/admin-portal/transport/notifications/").then(({ data }) => setNotifications(data)).catch(() => setNotifications([]));
    api.get("/admin-portal/transport/reports/").then(({ data }) => setReports(data)).catch(() => setReports({ total_vehicles: 0, total_routes: 0, allocated_students: 0, active_trips: 0, active_passes: 0, route_utilisation: [], recent_trips: [] }));
    api.get("/admin-portal/transport/live-map/").then(({ data }) => setLiveMap(data)).catch(() => setLiveMap([]));
  }

  useEffect(() => { loadAll(); }, []);

  const tabProps = { vehicles, routes, drivers, attendants, allocations, notifications, reports, liveMap, refresh: loadAll, setToast };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-academic-blue rounded-2xl flex items-center justify-center shadow-sm">
          <Bus size={22} className="text-white" />
        </div>
        <div>
          <h1 className="font-heading text-xl font-bold text-ink-primary">Transport Management</h1>
          <p className="text-sm text-ink-secondary">Vehicles · Routes · Drivers · Students · Live Tracking</p>
        </div>
        <Btn variant="ghost" size="sm" className="ml-auto" onClick={loadAll}><RefreshCw size={14} /> Refresh</Btn>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none bg-slate-100/60 rounded-2xl p-1">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all
                ${tab === t.id ? "bg-white text-academic-blue shadow-sm" : "text-ink-secondary hover:text-ink-primary hover:bg-white/60"}`}
            >
              <Icon size={15} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {tab === "overview"    && <OverviewTab {...tabProps} />}
      {tab === "vehicles"   && <VehiclesTab {...tabProps} />}
      {tab === "staff"      && <StaffTab {...tabProps} />}
      {tab === "routes"     && <RoutesTab {...tabProps} />}
      {tab === "allocation" && <AllocationTab {...tabProps} />}
      {tab === "trips"      && <TripsTab {...tabProps} />}
      {tab === "alerts"     && <AlertsTab {...tabProps} />}
      {tab === "settings"   && <SettingsTab {...tabProps} />}

      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}
