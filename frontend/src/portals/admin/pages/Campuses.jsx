import { useEffect, useState } from "react";
import api from "../lib/api";
import { Card, EmptyState, Loader, SectionTitle, Toast, Badge } from "../components/Common";
import { MapPin, Phone, Mail, Globe, Clock, Plus, Edit2, Trash2, Calendar, Check, X, ShieldAlert } from "lucide-react";
import { isNonEmptyString, isValidEmail, isValidPhone } from "../../../utils/validation";

export default function Campuses() {
  const [campuses, setCampuses] = useState(null);
  const [visits, setVisits] = useState(null);
  const [activeTab, setActiveTab] = useState("locations"); // locations | visits
  
  // Form states
  const [editingCampus, setEditingCampus] = useState(null); // null for new, campus object for edit
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState("");
  const [validationErrors, setValidationErrors] = useState({});
  
  const [form, setForm] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    country: "India",
    postal_code: "",
    latitude: "",
    longitude: "",
    phone: "",
    email: "",
    website: "",
    office_hours: "8:00 AM - 4:00 PM",
    facilities_str: "",
    programs_str: "",
    image_url: "",
    status: "Active",
    student_count: "",
    faculty_count: ""
  });

  // Load locations
  function loadLocations() {
    api.get("/admin-portal/campuses/")
      .then(({ data }) => setCampuses(data))
      .catch(() => setCampuses([]));
  }

  // Load visits
  function loadVisits() {
    api.get("/admin-portal/campuses/visits/")
      .then(({ data }) => setVisits(data))
      .catch(() => setVisits([]));
  }

  useEffect(() => {
    loadLocations();
    loadVisits();
  }, []);

  // Save (Create/Update) Location
  async function handleSubmit(e) {
    e.preventDefault();
    const errs = {};
    if (!isNonEmptyString(form.name)) errs.name = "Campus name is required.";
    if (!isNonEmptyString(form.city)) errs.city = "City is required.";
    if (!isNonEmptyString(form.state)) errs.state = "State is required.";
    if (!isNonEmptyString(form.postal_code)) errs.postal_code = "Postal code is required.";
    if (!isValidEmail(form.email)) errs.email = "Please enter a valid email address.";
    if (!isNonEmptyString(form.phone)) errs.phone = "Phone number is required.";
    if (!isNonEmptyString(form.office_hours)) errs.office_hours = "Office hours are required.";
    if (form.latitude === "" || isNaN(parseFloat(form.latitude))) errs.latitude = "Valid latitude is required.";
    if (form.longitude === "" || isNaN(parseFloat(form.longitude))) errs.longitude = "Valid longitude is required.";
    if (Object.keys(errs).length > 0) { setValidationErrors(errs); return; }
    setValidationErrors({});
    const payload = {
      ...form,
      latitude: parseFloat(form.latitude),
      longitude: parseFloat(form.longitude),
      student_count: parseInt(form.student_count) || 0,
      faculty_count: parseInt(form.faculty_count) || 0,
      facilities: form.facilities_str.split(",").map(f => f.trim()).filter(Boolean),
      programs: form.programs_str.split(",").map(p => p.trim()).filter(Boolean)
    };

    try {
      if (editingCampus) {
        await api.put(`/admin-portal/campuses/${editingCampus.id}/`, payload);
        setToast("Campus location updated successfully.");
      } else {
        await api.post("/admin-portal/campuses/", payload);
        setToast("Campus location created successfully.");
      }
      resetForm();
      loadLocations();
    } catch (err) {
      setToast("Error saving campus location.");
    }
  }

  // Edit campus trigger
  function handleEdit(c) {
    setEditingCampus(c);
    setForm({
      name: c.name,
      address: c.address,
      city: c.city,
      state: c.state,
      country: c.country,
      postal_code: c.postal_code,
      latitude: c.latitude,
      longitude: c.longitude,
      phone: c.phone,
      email: c.email,
      website: c.website,
      office_hours: c.office_hours,
      facilities_str: Array.isArray(c.facilities) ? c.facilities.join(", ") : "",
      programs_str: Array.isArray(c.programs) ? c.programs.join(", ") : "",
      image_url: c.image_url || "",
      status: c.status,
      student_count: c.student_count.toString(),
      faculty_count: c.faculty_count.toString()
    });
    setShowForm(true);
  }

  // Delete campus location
  async function handleDelete(id) {
    if (!window.confirm("Are you sure you want to delete this campus location? This will clear all linked visits as well.")) return;
    try {
      await api.delete(`/admin-portal/campuses/${id}/`);
      setToast("Campus location deleted successfully.");
      loadLocations();
      loadVisits();
    } catch {
      setToast("Error deleting campus location.");
    }
  }

  // Update visit booking status
  async function handleVisitStatus(id, newStatus) {
    try {
      await api.put(`/admin-portal/campuses/visits/${id}/status/`, { status: newStatus });
      setToast(`Visit request marked as ${newStatus}.`);
      loadVisits();
    } catch {
      setToast("Could not update visit request status.");
    }
  }

  function resetForm() {
    setForm({
      name: "",
      address: "",
      city: "",
      state: "",
      country: "India",
      postal_code: "",
      latitude: "",
      longitude: "",
      phone: "",
      email: "",
      website: "",
      office_hours: "8:00 AM - 4:00 PM",
      facilities_str: "",
      programs_str: "",
      image_url: "",
      status: "Active",
      student_count: "",
      faculty_count: ""
    });
    setEditingCampus(null);
    setShowForm(false);
  }

  return (
    <div className="space-y-6">
      
      {/* Top Tabs */}
      <div className="flex gap-4 border-b border-slate-200">
        <button 
          onClick={() => { setActiveTab("locations"); resetForm(); }}
          className={`pb-2 px-4 text-sm font-semibold transition-all -mb-px
            ${activeTab === "locations" ? "border-b-2 border-academic-blue text-academic-blue" : "text-slate-500 hover:text-slate-800"}`}
        >
          Campuses List
        </button>
        <button 
          onClick={() => { setActiveTab("visits"); resetForm(); }}
          className={`pb-2 px-4 text-sm font-semibold transition-all -mb-px
            ${activeTab === "visits" ? "border-b-2 border-academic-blue text-academic-blue" : "text-slate-500 hover:text-slate-800"}`}
        >
          Campus Visit Requests
        </button>
      </div>

      {activeTab === "locations" && (
        <>
          {/* Action Header */}
          <div className="flex justify-between items-center">
            <div>
              <h2 className="font-heading text-xl font-bold text-slate-800">Branch Locations</h2>
              <p className="text-xs text-slate-500 font-sub">Manage school regional branches and maps</p>
            </div>
            {!showForm && (
              <button 
                onClick={() => setShowForm(true)} 
                className="flex items-center gap-1.5 bg-academic-blue text-white rounded-xl px-4 py-2.5 text-xs font-semibold hover:bg-slate-800 transition-all"
              >
                <Plus size={14} /> Add Campus
              </button>
            )}
          </div>

          {/* Form Card */}
          {showForm && (
            <Card>
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
                <SectionTitle>{editingCampus ? "Edit Campus Location" : "Add New Campus Location"}</SectionTitle>
                <button onClick={resetForm} className="text-slate-400 hover:text-slate-600 text-xs font-semibold">Cancel</button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Campus Name * (*)</label>
                    <input required placeholder="e.g. Noida Campus (*)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={`rounded-xl border px-3.5 py-2 text-sm focus:outline-none focus:border-academic-blue ${validationErrors.name ? "border-danger" : "border-slate-200"}`} />
                    {validationErrors.name && <p className="text-xs text-danger">{validationErrors.name}</p>}
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Email Address * (*)</label>
                    <input required type="email" placeholder="e.g. noida@edunovaacademy.edu.in (*)" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={`rounded-xl border px-3.5 py-2 text-sm focus:outline-none focus:border-academic-blue ${validationErrors.email ? "border-danger" : "border-slate-200"}`} />
                    {validationErrors.email && <p className="text-xs text-danger">{validationErrors.email}</p>}
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Phone Number * (*)</label>
                    <input required placeholder="e.g. +91-120-6543210 (*)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={`rounded-xl border px-3.5 py-2 text-sm focus:outline-none focus:border-academic-blue ${validationErrors.phone ? "border-danger" : "border-slate-200"}`} />
                    {validationErrors.phone && <p className="text-xs text-danger">{validationErrors.phone}</p>}
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">City * (*)</label>
                    <input required placeholder="e.g. Noida (*)" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={`rounded-xl border px-3.5 py-2 text-sm focus:outline-none focus:border-academic-blue ${validationErrors.city ? "border-danger" : "border-slate-200"}`} />
                    {validationErrors.city && <p className="text-xs text-danger">{validationErrors.city}</p>}
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">State * (*)</label>
                    <input required placeholder="e.g. Uttar Pradesh (*)" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className="rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:outline-none focus:border-academic-blue" />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Postal Code * (*)</label>
                    <input required placeholder="e.g. 201301 (*)" value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} className="rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:outline-none focus:border-academic-blue" />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Latitude * (*)</label>
                    <input required type="number" step="any" placeholder="e.g. 28.5355 (*)" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} className="rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:outline-none focus:border-academic-blue" />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Longitude * (*)</label>
                    <input required type="number" step="any" placeholder="e.g. 77.3910 (*)" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} className="rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:outline-none focus:border-academic-blue" />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Office Hours * (*)</label>
                    <input required placeholder="e.g. 8:00 AM - 4:00 PM (*)" value={form.office_hours} onChange={(e) => setForm({ ...form, office_hours: e.target.value })} className="rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:outline-none focus:border-academic-blue" />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Website URL</label>
                    <input placeholder="e.g. www.edunovaacademy.edu.in/noida" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} className="rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:outline-none focus:border-academic-blue" />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Image Asset URL</label>
                    <input placeholder="e.g. /noida_campus.png" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className="rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:outline-none focus:border-academic-blue" />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Status</label>
                    <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:outline-none focus:border-academic-blue">
                      <option>Active</option>
                      <option>Inactive</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Student Count</label>
                    <input type="number" placeholder="0" value={form.student_count} onChange={(e) => setForm({ ...form, student_count: e.target.value })} className="rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:outline-none focus:border-academic-blue" />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Faculty Count</label>
                    <input type="number" placeholder="0" value={form.faculty_count} onChange={(e) => setForm({ ...form, faculty_count: e.target.value })} className="rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:outline-none focus:border-academic-blue" />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Programs Offered (Comma-separated)</label>
                    <input placeholder="Pre Primary, Middle School, High School, CBSE" value={form.programs_str} onChange={(e) => setForm({ ...form, programs_str: e.target.value })} className="rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:outline-none focus:border-academic-blue" />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Core Facilities (Comma-separated)</label>
                    <input placeholder="Science Labs, Smart Classrooms, Computer Lab, Library" value={form.facilities_str} onChange={(e) => setForm({ ...form, facilities_str: e.target.value })} className="rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:outline-none focus:border-academic-blue" />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button type="submit" className="bg-academic-blue text-white rounded-xl px-6 py-2.5 text-sm font-semibold shadow-sm hover:bg-slate-800 transition-colors">
                    {editingCampus ? "Update Location" : "Create Location"}
                  </button>
                  <button type="button" onClick={resetForm} className="bg-slate-100 text-slate-700 rounded-xl px-6 py-2.5 text-sm font-semibold hover:bg-slate-200 transition-colors">
                    Cancel
                  </button>
                </div>
              </form>
            </Card>
          )}

          {/* Locations Table */}
          <Card>
            {campuses === null ? (
              <Loader />
            ) : campuses.length === 0 ? (
              <EmptyState label="No campus locations configured yet." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-ink-secondary border-b border-slate-100">
                      <th className="py-2.5 pr-4">Campus Name</th>
                      <th className="py-2.5 pr-4">Location</th>
                      <th className="py-2.5 pr-4">Contact</th>
                      <th className="py-2.5 pr-4">Stats</th>
                      <th className="py-2.5 pr-4">Status</th>
                      <th className="py-2.5 pr-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campuses.map(c => (
                      <tr key={c.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 pr-4 font-semibold text-slate-850">{c.name}</td>
                        <td className="py-3 pr-4 text-xs text-ink-secondary">
                          <p>{c.address}</p>
                          <p className="font-semibold text-slate-700">{c.city}, {c.state} - {c.postal_code}</p>
                          <p className="text-[10px] text-slate-400">Coords: {c.latitude}, {c.longitude}</p>
                        </td>
                        <td className="py-3 pr-4 text-xs text-ink-secondary space-y-0.5">
                          <p className="flex items-center gap-1"><Phone size={12} /> {c.phone}</p>
                          <p className="flex items-center gap-1"><Mail size={12} /> {c.email}</p>
                        </td>
                        <td className="py-3 pr-4 text-xs">
                          <p className="text-slate-600">Students: <strong className="text-slate-800">{c.student_count}</strong></p>
                          <p className="text-slate-600">Faculty: <strong className="text-slate-800">{c.faculty_count}</strong></p>
                        </td>
                        <td className="py-3 pr-4">
                          <Badge tone={c.status === "Active" ? "green" : "red"}>{c.status}</Badge>
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex gap-2">
                            <button onClick={() => handleEdit(c)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600" title="Edit location"><Edit2 size={14} /></button>
                            <button onClick={() => handleDelete(c.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-600" title="Delete location"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {activeTab === "visits" && (
        <>
          <div>
            <h2 className="font-heading text-xl font-bold text-slate-800">Campus Visits Scheduled</h2>
            <p className="text-xs text-slate-500 font-sub">Manage and approve physical visit requests</p>
          </div>

          <Card>
            {visits === null ? (
              <Loader />
            ) : visits.length === 0 ? (
              <EmptyState label="No visit requests logged yet." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-ink-secondary border-b border-slate-100">
                      <th className="py-2.5 pr-4">Visitor</th>
                      <th className="py-2.5 pr-4">Preferred Campus</th>
                      <th className="py-2.5 pr-4">Schedule</th>
                      <th className="py-2.5 pr-4">Purpose</th>
                      <th className="py-2.5 pr-4">Status</th>
                      <th className="py-2.5 pr-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visits.map(v => (
                      <tr key={v.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 pr-4">
                          <p className="font-semibold text-slate-850">{v.visitor_name}</p>
                          <p className="text-xs text-slate-400">{v.visitor_email} · {v.visitor_phone}</p>
                        </td>
                        <td className="py-3 pr-4 font-medium text-slate-700 text-xs">{v.campus_name || "Head Office / Other"}</td>
                        <td className="py-3 pr-4 text-xs text-ink-secondary">
                          <p className="font-semibold text-slate-700">{v.visit_date}</p>
                          <p className="text-[10px] text-slate-400">{v.visit_time}</p>
                        </td>
                        <td className="py-3 pr-4 text-xs italic text-slate-600">{v.purpose || "General Inquiry"}</td>
                        <td className="py-3 pr-4">
                          <Badge tone={v.status === "Confirmed" ? "green" : v.status === "Completed" ? "slate" : v.status === "Cancelled" ? "red" : "orange"}>
                            {v.status}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4 text-right">
                          {v.status === "Pending" && (
                            <div className="flex gap-1 justify-end">
                              <button onClick={() => handleVisitStatus(v.id, "Confirmed")} className="p-1 hover:bg-green-50 rounded text-green-600 font-semibold text-xs flex items-center gap-0.5 border border-green-200">
                                <Check size={12} /> Confirm
                              </button>
                              <button onClick={() => handleVisitStatus(v.id, "Cancelled")} className="p-1 hover:bg-red-50 rounded text-red-600 font-semibold text-xs flex items-center gap-0.5 border border-red-200">
                                <X size={12} /> Decline
                              </button>
                            </div>
                          )}
                          {v.status === "Confirmed" && (
                            <button onClick={() => handleVisitStatus(v.id, "Completed")} className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded border border-slate-200">
                              Mark Completed
                            </button>
                          )}
                          {["Completed", "Cancelled"].includes(v.status) && (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}
