import {
  AlertTriangle, BedDouble, Bell, CheckCircle2, ChevronDown, ChevronRight,
  Clock, FileText, MapPin, Pencil, Phone, Plus, RefreshCw, Settings, Shield,
  Trash2, User, Users, X, Activity, DollarSign
} from "lucide-react";
import { useEffect, useState } from "react";
import api from "../lib/api";
import { Badge, Card, EmptyState, Loader, SectionTitle, StatCard, Toast } from "../components/Common";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const TABS = [
  { id: "overview",     label: "Overview & Reports",  icon: Activity },
  { id: "hostels",      label: "Hostel Buildings",    icon: BedDouble },
  { id: "rooms",        label: "Floors & Rooms",      icon: MapPin },
  { id: "applications", label: "Applications",        icon: FileText },
  { id: "allocations",  label: "Allocations & Pass",  icon: Users },
  { id: "leaves",       label: "Leaves",              icon: Clock },
  { id: "complaints",   label: "Complaints",          icon: AlertTriangle }
];

const STATUS_COLORS = {
  Pending: "orange",
  Approved: "green",
  Rejected: "red",
  Open: "orange",
  "In Progress": "blue",
  Resolved: "green",
  Paid: "green",
  Partial: "orange",
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
      className={`w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-academic-blue focus:ring-2 focus:ring-academic-blue/10 transition ${className}`}
      {...props}
    />
  );
}

function Select({ className = "", children, ...props }) {
  return (
    <select
      className={`w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-academic-blue focus:ring-2 focus:ring-academic-blue/10 bg-white transition ${className}`}
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
    primary: "bg-academic-blue text-white hover:bg-academic-blue/90 shadow-sm",
    green: "bg-academic-green text-white hover:bg-academic-green/90 shadow-sm",
    danger: "bg-rose-600 text-white hover:bg-rose-700 shadow-sm",
    ghost: "bg-slate-100 text-ink-primary hover:bg-slate-200",
    outline: "border border-slate-200 text-ink-primary hover:bg-slate-50",
  };
  return <button className={`${base} ${sz} ${variants[variant]} ${className}`} {...props}>{children}</button>;
}

// ---------------------------------------------------------------------------
// Tab: Overview & Reports
// ---------------------------------------------------------------------------
function OverviewTab({ reports, refresh }) {
  if (!reports) return <Loader rows={4} />;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={BedDouble} label="Total Hostels" value={reports.total_hostels} accent="blue" />
        <StatCard icon={MapPin} label="Total Rooms" value={reports.total_rooms} accent="green" />
        <StatCard icon={Users} label="Occupied Beds" value={`${reports.occupied_beds}/${reports.total_beds}`} accent="orange" />
        <StatCard icon={FileText} label="Pending Applications" value={reports.pending_applications} accent="gold" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <SectionTitle>Hostel Occupancy Report</SectionTitle>
          {!reports.hostel_occupancy || reports.hostel_occupancy.length === 0 ? (
            <EmptyState label="No occupancy stats available." />
          ) : (
            <div className="space-y-4">
              {reports.hostel_occupancy.map((h, i) => {
                const pct = h.total_capacity > 0 ? Math.round((h.total_occupied / h.total_capacity) * 100) : 0;
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-semibold text-ink-primary">{h.hostel_name} <span className="text-xs text-ink-secondary">({h.type})</span></span>
                      <span className="text-ink-secondary">{h.total_occupied} / {h.total_capacity} beds ({pct}%)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${pct > 85 ? "bg-rose-500" : pct > 60 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="flex flex-col justify-between">
          <div>
            <SectionTitle>System Stats</SectionTitle>
            <div className="divide-y divide-slate-100 text-sm">
              <div className="py-2.5 flex justify-between">
                <span className="text-ink-secondary">Active Leaves Gate Passes</span>
                <span className="font-semibold text-ink-primary">{reports.active_leaves}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-ink-secondary">Open/In Progress Complaints</span>
                <span className="font-semibold text-ink-primary">{reports.open_complaints}</span>
              </div>
            </div>
          </div>
          <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-100 text-xs text-academic-blue mt-4">
            <RefreshCw size={14} className="inline mr-2 animate-spin-slow" />
            Live metrics aggregated from allocations, pass records, leaves registry, and the mess plans system.
          </div>
        </Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Hostel Buildings
// ---------------------------------------------------------------------------
function HostelsTab({ hostels, refresh, setToast }) {
  const [modal, setModal] = useState(null); // "add" | hostel_obj
  const [form, setForm] = useState({ name: "", type: "Boys", warden_id: "" });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (modal === "add") await api.post("/admin-portal/hostels/", form);
      else await api.patch("/admin-portal/hostels/", { ...form, id: modal.id });
      setToast(modal === "add" ? "Hostel created." : "Hostel updated.");
      setModal(null); refresh();
    } catch { setToast("Could not save hostel."); }
    finally { setSaving(false); }
  }

  async function del(h) {
    if (!window.confirm(`Delete hostel "${h.name}"? This removes all rooms inside.`)) return;
    try {
      await api.delete(`/admin-portal/hostels/?id=${h.id}`);
      setToast("Hostel deleted."); refresh();
    } catch { setToast("Could not delete hostel."); }
  }

  if (!hostels) return <Loader rows={3} />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-heading font-semibold text-ink-primary">Buildings ({hostels.length})</h2>
        <Btn onClick={() => { setForm({ name: "", type: "Boys", warden_id: "" }); setModal("add"); }}><Plus size={15} /> Add Hostel</Btn>
      </div>

      {hostels.length === 0 ? <EmptyState label="No hostel buildings created yet." /> : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {hostels.map(h => (
            <div key={h.id} className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-academic-blue/10 text-academic-blue rounded-xl flex items-center justify-center">
                    <BedDouble size={20} />
                  </div>
                  <div>
                    <p className="font-semibold text-ink-primary text-sm">{h.name}</p>
                    <Badge tone={h.type === "Boys" ? "blue" : h.type === "Girls" ? "gold" : "slate"}>{h.type} Hostel</Badge>
                  </div>
                </div>
              </div>
              <div className="text-xs text-ink-secondary border-t border-slate-100 pt-3 mb-4 space-y-1">
                <p className="flex items-center gap-1.5"><User size={13} className="text-slate-400" /> Warden: {h.warden_name || "Unassigned"}</p>
                {h.warden_id && <p className="text-[10px] text-slate-400 pl-5">Staff User ID: {h.warden_id}</p>}
              </div>
              <div className="flex gap-2">
                <Btn variant="ghost" size="sm" className="flex-1" onClick={() => { setForm({ name: h.name, type: h.type, warden_id: h.warden_id || "" }); setModal(h); }}><Pencil size={12} /> Edit</Btn>
                <Btn variant="danger" size="sm" onClick={() => del(h)}><Trash2 size={12} /></Btn>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <Modal title={modal === "add" ? "Add Hostel Building" : "Edit Hostel"} onClose={() => setModal(null)}>
          <Field label="Hostel Name *">
            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Newton Hall of Residence" />
          </Field>
          <Field label="Hostel Type">
            <Select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
              {["Boys", "Girls", "Staff"].map(t => <option key={t}>{t}</option>)}
            </Select>
          </Field>
          <Field label="Warden User ID (Staff)">
            <Input type="number" value={form.warden_id} onChange={e => setForm({ ...form, warden_id: e.target.value })} placeholder="auth_user ID of warden staff" />
          </Field>
          <div className="flex gap-3 pt-2">
            <Btn variant="outline" className="flex-1" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn className="flex-1" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save Building"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Floors & Rooms
// ---------------------------------------------------------------------------
function RoomsTab({ rooms, hostels, refresh, setToast }) {
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ hostel_id: "", room_number: "", floor: "1", capacity: 2, facilities: "" });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.hostel_id || !form.room_number.trim()) return;
    setSaving(true);
    try {
      if (modal === "add") await api.post("/admin-portal/rooms/", form);
      else await api.patch("/admin-portal/rooms/", { ...form, id: modal.id });
      setToast(modal === "add" ? "Room added." : "Room updated.");
      setModal(null); refresh();
    } catch { setToast("Could not save room."); }
    finally { setSaving(false); }
  }

  async function del(r) {
    if (!window.confirm(`Delete room "${r.room_number}"?`)) return;
    try {
      await api.delete(`/admin-portal/rooms/?id=${r.id}`);
      setToast("Room deleted."); refresh();
    } catch { setToast("Could not delete room."); }
  }

  if (!rooms || !hostels) return <Loader rows={3} />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-heading font-semibold text-ink-primary">Rooms ({rooms.length})</h2>
        <Btn onClick={() => { setForm({ hostel_id: hostels[0]?.id || "", room_number: "", floor: "1", capacity: 2, facilities: "Bed, Study Desk, Locker" }); setModal("add"); }}><Plus size={15} /> Add Room</Btn>
      </div>

      {rooms.length === 0 ? <EmptyState label="No rooms configured yet." /> : (
        <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-ink-secondary font-medium border-b border-slate-100 bg-slate-50/50">
                <th className="text-left py-3 px-4">Hostel</th>
                <th className="text-left py-3 px-4">Room No</th>
                <th className="text-left py-3 px-4">Floor</th>
                <th className="text-left py-3 px-4">Capacity</th>
                <th className="text-left py-3 px-4">Facilities</th>
                <th className="py-3 px-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rooms.map(r => (
                <tr key={r.id} className="hover:bg-slate-50/30">
                  <td className="py-3 px-4 font-medium text-ink-primary">{r.hostel_name}</td>
                  <td className="py-3 px-4">{r.room_number}</td>
                  <td className="py-3 px-4 text-xs font-semibold text-slate-500 font-mono">Floor {r.floor}</td>
                  <td className="py-3 px-4">
                    <Badge tone={r.occupied_beds >= r.capacity ? "red" : "green"}>
                      {r.occupied_beds} / {r.capacity} Occupied
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-xs text-ink-secondary truncate max-w-xs">{r.facilities}</td>
                  <td className="py-3 px-4 flex justify-end gap-1.5">
                    <Btn variant="ghost" size="sm" onClick={() => { setForm({ hostel_id: r.hostel_id, room_number: r.room_number, floor: r.floor, capacity: r.capacity, facilities: r.facilities }); setModal(r); }}><Pencil size={12} /></Btn>
                    <Btn variant="danger" size="sm" onClick={() => del(r)}><Trash2 size={12} /></Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal title={modal === "add" ? "Add Floor Room" : "Edit Room"} onClose={() => setModal(null)}>
          <Field label="Hostel Building">
            <Select value={form.hostel_id} onChange={e => setForm({ ...form, hostel_id: e.target.value })}>
              {hostels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </Select>
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Field label="Room Number *">
                <Input value={form.room_number} onChange={e => setForm({ ...form, room_number: e.target.value })} placeholder="e.g. 104-A" />
              </Field>
            </div>
            <div>
              <Field label="Floor">
                <Input value={form.floor} onChange={e => setForm({ ...form, floor: e.target.value })} placeholder="e.g. 1" />
              </Field>
            </div>
          </div>
          <Field label="Room Capacity">
            <Input type="number" min="1" value={form.capacity} onChange={e => setForm({ ...form, capacity: parseInt(e.target.value) || 2 })} />
          </Field>
          <Field label="Facilities / In-Room Utilities">
            <Input value={form.facilities} onChange={e => setForm({ ...form, facilities: e.target.value })} placeholder="e.g. Bed, Wardrobe, AC, Study Desk" />
          </Field>
          <div className="flex gap-3 pt-2">
            <Btn variant="outline" className="flex-1" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn className="flex-1" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save Room"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Applications
// ---------------------------------------------------------------------------
function ApplicationsTab({ refresh, setToast }) {
  const [apps, setApps] = useState(null);
  const [modal, setModal] = useState(null);
  const [reviewForm, setReviewForm] = useState({ id: "", status: "Approved", review_notes: "" });
  const [saving, setSaving] = useState(false);

  async function loadApps() {
    try {
      const { data } = await api.get("/hostels/applications/");
      setApps(data);
    } catch { setApps([]); }
  }

  useEffect(() => { loadApps(); }, []);

  async function submitReview() {
    setSaving(true);
    try {
      await api.patch("/hostels/applications/", reviewForm);
      setToast(`Application ${reviewForm.status.toLowerCase()}.`);
      setModal(null); loadApps();
    } catch { setToast("Could not submit review."); }
    finally { setSaving(false); }
  }

  if (!apps) return <Loader rows={3} />;

  return (
    <div className="space-y-4">
      <h2 className="font-heading font-semibold text-ink-primary">Applications ({apps.length})</h2>

      {apps.length === 0 ? <EmptyState label="No hostel registration requests." /> : (
        <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-ink-secondary font-medium border-b border-slate-100 bg-slate-50/50">
                <th className="text-left py-3 px-4">Student</th>
                <th className="text-left py-3 px-4">Hostel Preferred</th>
                <th className="text-left py-3 px-4">Room Preference</th>
                <th className="text-left py-3 px-4">Reason</th>
                <th className="text-left py-3 px-4">Applied On</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="py-3 px-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {apps.map(a => (
                <tr key={a.id} className="hover:bg-slate-50/30">
                  <td className="py-3 px-4 font-medium text-ink-primary">{a.student_name}</td>
                  <td className="py-3 px-4">{a.hostel_name}</td>
                  <td className="py-3 px-4 text-xs font-semibold text-slate-500">{a.preferred_room_type}</td>
                  <td className="py-3 px-4 text-xs text-ink-secondary truncate max-w-xs">{a.reason || "—"}</td>
                  <td className="py-3 px-4 text-xs text-ink-secondary">{new Date(a.created_at).toLocaleDateString()}</td>
                  <td className="py-3 px-4"><Badge tone={STATUS_COLORS[a.status] || "slate"}>{a.status}</Badge></td>
                  <td className="py-3 px-4 text-right">
                    {a.status === "Pending" && (
                      <Btn size="sm" onClick={() => { setReviewForm({ id: a.id, status: "Approved", review_notes: "" }); setModal(a); }}>Review</Btn>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal title={`Review Request: ${modal.student_name}`} onClose={() => setModal(null)}>
          <div className="space-y-1.5 text-xs text-ink-secondary p-3.5 bg-slate-50 rounded-xl border border-slate-100">
            <p><strong>Hostel Preferred:</strong> {modal.hostel_name}</p>
            <p><strong>Room Type Preferred:</strong> {modal.preferred_room_type}</p>
            <p><strong>Reason for Application:</strong> {modal.reason || "None specified"}</p>
          </div>
          <Field label="Review Status Action">
            <Select value={reviewForm.status} onChange={e => setReviewForm({ ...reviewForm, status: e.target.value })}>
              <option value="Approved">Approve Request</option>
              <option value="Rejected">Reject Request</option>
            </Select>
          </Field>
          <Field label="Review Decision Notes">
            <textarea
              rows={3}
              value={reviewForm.review_notes}
              onChange={e => setReviewForm({ ...reviewForm, review_notes: e.target.value })}
              placeholder="e.g. Allocation approved for Floor 2 room assignments..."
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-academic-blue resize-none"
            />
          </Field>
          <div className="flex gap-3 pt-2">
            <Btn variant="outline" className="flex-1" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn variant={reviewForm.status === "Approved" ? "green" : "danger"} className="flex-1" onClick={submitReview} disabled={saving}>
              {saving ? "Submitting…" : `Submit Decision`}
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Allocations & Pass
// ---------------------------------------------------------------------------
function AllocationsTab({ allocations, rooms, refresh, setToast }) {
  const [modal, setModal] = useState(false);
  const [passModal, setPassModal] = useState(null);
  const [form, setForm] = useState({ student_id: "", room_id: "", mess_plan: "Veg Standard" });
  const [saving, setSaving] = useState(false);

  async function allocate() {
    if (!form.student_id || !form.room_id) return;
    setSaving(true);
    try {
      await api.post("/admin-portal/hostel-allocations/", form);
      setToast("Student allocated successfully."); setModal(false); refresh();
    } catch (err) { setToast(err.response?.data?.detail || "Could not allocate."); }
    finally { setSaving(false); }
  }

  async function vacate(allocId) {
    if (!window.confirm("Vacate this hostel allocation?")) return;
    try {
      await api.post(`/admin-portal/hostel-allocations/${allocId}/vacate/`, {});
      setToast("Student vacated."); refresh();
    } catch { setToast("Could not vacate."); }
  }

  if (!allocations || !rooms) return <Loader rows={3} />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-heading font-semibold text-ink-primary">Active Resident Allocations ({allocations.length})</h2>
        <Btn onClick={() => { setForm({ student_id: "", room_id: rooms[0]?.id || "", mess_plan: "Veg Standard" }); setModal(true); }}><Plus size={15} /> Add Allocation</Btn>
      </div>

      {allocations.length === 0 ? <EmptyState label="No students allocated yet." /> : (
        <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-ink-secondary font-medium border-b border-slate-100 bg-slate-50/50">
                <th className="text-left py-3 px-4">Student</th>
                <th className="text-left py-3 px-4">Hostel Building</th>
                <th className="text-left py-3 px-4">Room No</th>
                <th className="text-left py-3 px-4">Floor</th>
                <th className="text-left py-3 px-4">Mess Plan</th>
                <th className="text-left py-3 px-4">Hostel Pass</th>
                <th className="py-3 px-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {allocations.map(a => (
                <tr key={a.id} className="hover:bg-slate-50/30">
                  <td className="py-3 px-4 font-medium text-ink-primary">{a.student_name}</td>
                  <td className="py-3 px-4">{a.hostel_name}</td>
                  <td className="py-3 px-4">{a.room_number}</td>
                  <td className="py-3 px-4 text-xs font-semibold text-slate-500">Floor {a.floor}</td>
                  <td className="py-3 px-4 text-xs font-medium text-slate-600">{a.mess_plan}</td>
                  <td className="py-3 px-4">
                    {a.pass_number ? (
                      <button onClick={() => setPassModal(a)} className="text-xs font-mono text-academic-blue hover:underline">{a.pass_number}</button>
                    ) : "—"}
                  </td>
                  <td className="py-3 px-4 flex justify-end gap-1.5">
                    {a.pass_number && (
                      <Btn variant="ghost" size="sm" onClick={() => setPassModal(a)}><FileText size={12} /> View Pass</Btn>
                    )}
                    <Btn variant="danger" size="sm" onClick={() => vacate(a.id)}>Vacate</Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Allocate Modal */}
      {modal && (
        <Modal title="Allocate Student to Hostel Room" onClose={() => setModal(false)}>
          <Field label="Student User ID *">
            <Input type="number" value={form.student_id} onChange={e => setForm({ ...form, student_id: e.target.value })} placeholder="Student's auth_user ID" />
          </Field>
          <Field label="Select Available Room">
            <Select value={form.room_id} onChange={e => setForm({ ...form, room_id: e.target.value })}>
              {rooms.filter(r => r.occupied_beds < r.capacity).map(r => (
                <option key={r.id} value={r.id}>{r.hostel_name} — Room {r.room_number} ({r.occupied_beds}/{r.capacity} filled)</option>
              ))}
            </Select>
          </Field>
          <Field label="Assign Mess Meal Plan">
            <Select value={form.mess_plan} onChange={e => setForm({ ...form, mess_plan: e.target.value })}>
              {["Veg Standard", "Veg Premium", "Non-Veg Standard", "Non-Veg Premium", "None"].map(p => <option key={p}>{p}</option>)}
            </Select>
          </Field>
          <div className="flex gap-3 pt-2">
            <Btn variant="outline" className="flex-1" onClick={() => setModal(false)}>Cancel</Btn>
            <Btn variant="green" className="flex-1" onClick={allocate} disabled={saving}>{saving ? "Allocating…" : "Allocate Student"}</Btn>
          </div>
        </Modal>
      )}

      {/* Pass Modal */}
      {passModal && (
        <Modal title="Hostel Pass Card" onClose={() => setPassModal(null)}>
          <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-black rounded-2xl p-6 text-white text-center space-y-4">
            <Shield size={36} className="mx-auto text-amber-500 opacity-90" />
            <div>
              <p className="text-xs uppercase tracking-widest opacity-60">EduNova Hostel Resident Pass</p>
              <p className="text-2xl font-bold font-mono mt-1 text-amber-400">{passModal.pass_number}</p>
            </div>
            <div className="border-t border-white/10 pt-4 space-y-1.5 text-sm">
              <p className="font-semibold text-base">{passModal.student_name}</p>
              <p className="opacity-80 text-xs">{passModal.hostel_name} · Room {passModal.room_number} · Floor {passModal.floor}</p>
              <p className="opacity-70 text-[11px]">Meal Plan: {passModal.mess_plan}</p>
            </div>
          </div>
          <p className="text-xs text-ink-secondary text-center">Auto-synchronized with gate security protocols. Valid for the current academic session.</p>
        </Modal>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Leaves
// ---------------------------------------------------------------------------
function LeavesTab({ refresh, setToast }) {
  const [leaves, setLeaves] = useState(null);
  const [saving, setSaving] = useState(false);

  async function loadLeaves() {
    try {
      const { data } = await api.get("/hostels/leaves/");
      setLeaves(data);
    } catch { setLeaves([]); }
  }

  useEffect(() => { loadLeaves(); }, []);

  async function updateStatus(id, status) {
    setSaving(true);
    try {
      await api.patch("/hostels/leaves/", { id, status });
      setToast(`Gate pass marked ${status.toLowerCase()}.`);
      loadLeaves();
    } catch { setToast("Could not update gate pass."); }
    finally { setSaving(false); }
  }

  if (!leaves) return <Loader rows={3} />;

  return (
    <div className="space-y-4">
      <h2 className="font-heading font-semibold text-ink-primary">Leaves & Night-Out Registrations ({leaves.length})</h2>

      {leaves.length === 0 ? <EmptyState label="No gate passes logged." /> : (
        <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-ink-secondary font-medium border-b border-slate-100 bg-slate-50/50">
                <th className="text-left py-3 px-4">Student</th>
                <th className="text-left py-3 px-4">Start Date</th>
                <th className="text-left py-3 px-4">End Date</th>
                <th className="text-left py-3 px-4">Reason / Purpose</th>
                <th className="text-left py-3 px-4">Parent Action</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="py-3 px-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {leaves.map(l => (
                <tr key={l.id} className="hover:bg-slate-50/30">
                  <td className="py-3 px-4 font-medium text-ink-primary">{l.student_name}</td>
                  <td className="py-3 px-4 text-xs">{l.start_date}</td>
                  <td className="py-3 px-4 text-xs">{l.end_date}</td>
                  <td className="py-3 px-4 text-xs text-ink-secondary truncate max-w-xs">{l.reason}</td>
                  <td className="py-3 px-4">
                    <Badge tone={l.parent_approved ? "green" : "orange"}>
                      {l.parent_approved ? "Parent Approved" : "Parent Pending"}
                    </Badge>
                  </td>
                  <td className="py-3 px-4"><Badge tone={STATUS_COLORS[l.status] || "slate"}>{l.status}</Badge></td>
                  <td className="py-3 px-4 text-right flex justify-end gap-1.5">
                    {l.status === "Pending" && (
                      <>
                        <Btn size="sm" variant="green" onClick={() => updateStatus(l.id, "Approved")} disabled={saving}>Approve</Btn>
                        <Btn size="sm" variant="danger" onClick={() => updateStatus(l.id, "Rejected")} disabled={saving}>Reject</Btn>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Complaints
// ---------------------------------------------------------------------------
function ComplaintsTab({ refresh, setToast }) {
  const [complaints, setComplaints] = useState(null);
  const [modal, setModal] = useState(null);
  const [resolveForm, setResolveForm] = useState({ id: "", status: "Resolved", admin_notes: "" });
  const [saving, setSaving] = useState(false);

  async function loadComplaints() {
    try {
      const { data } = await api.get("/hostels/complaints/");
      setComplaints(data);
    } catch { setComplaints([]); }
  }

  useEffect(() => { loadComplaints(); }, []);

  async function submitResolution() {
    setSaving(true);
    try {
      await api.patch("/hostels/complaints/", resolveForm);
      setToast("Complaint updated.");
      setModal(null); loadComplaints();
    } catch { setToast("Could not update complaint."); }
    finally { setSaving(false); }
  }

  if (!complaints) return <Loader rows={3} />;

  return (
    <div className="space-y-4">
      <h2 className="font-heading font-semibold text-ink-primary">Complaints Registry ({complaints.length})</h2>

      {complaints.length === 0 ? <EmptyState label="No complaints logged." /> : (
        <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-ink-secondary font-medium border-b border-slate-100 bg-slate-50/50">
                <th className="text-left py-3 px-4">Student</th>
                <th className="text-left py-3 px-4">Category</th>
                <th className="text-left py-3 px-4">Title</th>
                <th className="text-left py-3 px-4">Description</th>
                <th className="text-left py-3 px-4">Filed On</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="py-3 px-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {complaints.map(c => (
                <tr key={c.id} className="hover:bg-slate-50/30">
                  <td className="py-3 px-4 font-medium text-ink-primary">{c.student_name}</td>
                  <td className="py-3 px-4 text-xs font-semibold text-slate-500">{c.category}</td>
                  <td className="py-3 px-4">{c.title}</td>
                  <td className="py-3 px-4 text-xs text-ink-secondary truncate max-w-xs">{c.description}</td>
                  <td className="py-3 px-4 text-xs text-ink-secondary">{new Date(c.created_at).toLocaleDateString()}</td>
                  <td className="py-3 px-4"><Badge tone={STATUS_COLORS[c.status] || "slate"}>{c.status}</Badge></td>
                  <td className="py-3 px-4 text-right">
                    {c.status !== "Resolved" && (
                      <Btn size="sm" onClick={() => { setResolveForm({ id: c.id, status: "Resolved", admin_notes: "" }); setModal(c); }}>Action</Btn>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal title={`Action Complaint: ${modal.title}`} onClose={() => setModal(null)}>
          <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl text-xs space-y-1.5 text-ink-secondary">
            <p><strong>Filed By:</strong> {modal.student_name}</p>
            <p><strong>Description:</strong> {modal.description}</p>
          </div>
          <Field label="Progress Status Action">
            <Select value={resolveForm.status} onChange={e => setResolveForm({ ...resolveForm, status: e.target.value })}>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Mark Resolved</option>
            </Select>
          </Field>
          <Field label="Action Resolution Comments">
            <textarea
              rows={3}
              value={resolveForm.admin_notes}
              onChange={e => setResolveForm({ ...resolveForm, admin_notes: e.target.value })}
              placeholder="e.g. Plumber has fixed the water leakage in Floor 1 washrooms..."
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-academic-blue resize-none"
            />
          </Field>
          <div className="flex gap-3 pt-2">
            <Btn variant="outline" className="flex-1" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn className="flex-1" onClick={submitResolution} disabled={saving}>{saving ? "Updating…" : "Submit Status"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root Dashboard Component
// ---------------------------------------------------------------------------
export default function Hostel() {
  const [tab, setTab] = useState("overview");
  const [toast, setToast] = useState("");

  const [hostels, setHostels] = useState(null);
  const [rooms, setRooms] = useState(null);
  const [allocations, setAllocations] = useState(null);
  const [reports, setReports] = useState(null);

  function loadAll() {
    api.get("/admin-portal/hostels/").then(({ data }) => setHostels(data)).catch(() => setHostels([]));
    api.get("/admin-portal/rooms/").then(({ data }) => setRooms(data)).catch(() => setRooms([]));
    api.get("/admin-portal/hostel-allocations/").then(({ data }) => setAllocations(data)).catch(() => setAllocations([]));
    api.get("/hostels/reports/").then(({ data }) => setReports(data)).catch(() => setReports(null));
  }

  useEffect(() => { loadAll(); }, []);

  const tabProps = { hostels, rooms, allocations, reports, refresh: loadAll, setToast };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-academic-blue rounded-2xl flex items-center justify-center shadow-sm">
          <BedDouble size={22} className="text-white" />
        </div>
        <div>
          <h1 className="font-heading text-xl font-bold text-ink-primary">Hostel Registry Desk</h1>
          <p className="text-sm text-ink-secondary">Buildings · Floors & Rooms · Applications Review · Passes · Leaves · Complaints</p>
        </div>
        <Btn variant="ghost" size="sm" className="ml-auto" onClick={loadAll}><RefreshCw size={14} /> Refresh</Btn>
      </div>

      {/* Tabs list */}
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

      {/* Tab views */}
      {tab === "overview"     && <OverviewTab {...tabProps} />}
      {tab === "hostels"      && <HostelsTab {...tabProps} />}
      {tab === "rooms"        && <RoomsTab {...tabProps} />}
      {tab === "applications" && <ApplicationsTab {...tabProps} />}
      {tab === "allocations"  && <AllocationsTab {...tabProps} />}
      {tab === "leaves"       && <LeavesTab {...tabProps} />}
      {tab === "complaints"   && <ComplaintsTab {...tabProps} />}

      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}
