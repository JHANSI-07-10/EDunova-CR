import { useEffect, useState } from "react";
import api from "../lib/api";
import { Card, EmptyState, Loader, SectionTitle, Toast, Badge } from "../components/Common";
import { isNonEmptyString } from "../../../utils/validation";

export default function Hostel() {
  const [hostels, setHostels] = useState(null);
  const [rooms, setRooms] = useState(null);
  const [allocations, setAllocations] = useState(null);
  const [hostelForm, setHostelForm] = useState({ name: "", type: "Boys", warden_id: "" });
  const [roomForm, setRoomForm] = useState({ hostel_id: "", room_number: "", capacity: 2 });
  const [allocForm, setAllocForm] = useState({ student_id: "", room_id: "" });
  const [toast, setToast] = useState("");
  const [hostelErrors, setHostelErrors] = useState({});
  const [roomErrors, setRoomErrors] = useState({});
  const [allocErrors, setAllocErrors] = useState({});

  function load() {
    api.get("/admin-portal/hostels/").then(({ data }) => setHostels(data)).catch(() => setHostels([]));
    api.get("/admin-portal/rooms/").then(({ data }) => setRooms(data)).catch(() => setRooms([]));
    api.get("/admin-portal/hostel-allocations/").then(({ data }) => setAllocations(data)).catch(() => setAllocations([]));
  }
  useEffect(() => { load(); }, []);

  async function addHostel(e) {
    e.preventDefault();
    const errs = {};
    if (!isNonEmptyString(hostelForm.name)) errs.name = "Hostel name is required.";
    if (Object.keys(errs).length > 0) { setHostelErrors(errs); return; }
    setHostelErrors({});
    try {
      await api.post("/admin-portal/hostels/", hostelForm);
      setHostelForm({ name: "", type: "Boys", warden_id: "" });
      setToast("Hostel added.");
      load();
    } catch { setToast("Could not add hostel."); }
  }

  async function addRoom(e) {
    e.preventDefault();
    const errs = {};
    if (!isNonEmptyString(String(roomForm.hostel_id))) errs.hostel_id = "Please select a hostel.";
    if (!isNonEmptyString(roomForm.room_number)) errs.room_number = "Room number is required.";
    if (Object.keys(errs).length > 0) { setRoomErrors(errs); return; }
    setRoomErrors({});
    try {
      await api.post("/admin-portal/rooms/", roomForm);
      setRoomForm({ hostel_id: "", room_number: "", capacity: 2 });
      setToast("Room added.");
      load();
    } catch { setToast("Could not add room."); }
  }

  async function allocate(e) {
    e.preventDefault();
    const errs = {};
    if (!isNonEmptyString(allocForm.student_id)) errs.student_id = "Student ID is required.";
    if (!isNonEmptyString(String(allocForm.room_id))) errs.room_id = "Please select a room.";
    if (Object.keys(errs).length > 0) { setAllocErrors(errs); return; }
    setAllocErrors({});
    try {
      await api.post("/admin-portal/hostel-allocations/", allocForm);
      setAllocForm({ student_id: "", room_id: "" });
      setToast("Student allocated.");
      load();
    } catch (err) { setToast(err?.response?.data?.detail || "Could not allocate room."); }
  }

  async function vacate(id) {
    try {
      await api.post(`/admin-portal/hostel-allocations/${id}/vacate/`, {});
      setToast("Room vacated.");
      load();
    } catch { setToast("Could not vacate room."); }
  }

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-3 gap-6">
        <Card>
          <SectionTitle>Add hostel</SectionTitle>
          <form onSubmit={addHostel} className="space-y-3">
            <div>
              <input required placeholder="Hostel name" value={hostelForm.name} onChange={(e) => setHostelForm({ ...hostelForm, name: e.target.value })} className={`w-full rounded-xl border px-3 py-2 text-sm ${hostelErrors.name ? "border-danger" : "border-slate-200"}`} />
              {hostelErrors.name && <p className="text-xs text-danger mt-1">{hostelErrors.name}</p>}
            </div>
            <select value={hostelForm.type} onChange={(e) => setHostelForm({ ...hostelForm, type: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
              <option>Boys</option><option>Girls</option><option>Staff</option>
            </select>
            <input placeholder="Warden user ID (optional)" value={hostelForm.warden_id} onChange={(e) => setHostelForm({ ...hostelForm, warden_id: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            <button className="w-full bg-academic-blue text-white rounded-xl py-2 font-medium">Add hostel</button>
          </form>
        </Card>

        <Card>
          <SectionTitle>Add room</SectionTitle>
          <form onSubmit={addRoom} className="space-y-3">
            <div>
              <select required value={roomForm.hostel_id} onChange={(e) => setRoomForm({ ...roomForm, hostel_id: e.target.value })} className={`w-full rounded-xl border px-3 py-2 text-sm ${roomErrors.hostel_id ? "border-danger" : "border-slate-200"}`}>
                <option value="">Select hostel</option>
                {(hostels || []).map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
              {roomErrors.hostel_id && <p className="text-xs text-danger mt-1">{roomErrors.hostel_id}</p>}
            </div>
            <div>
              <input required placeholder="Room number" value={roomForm.room_number} onChange={(e) => setRoomForm({ ...roomForm, room_number: e.target.value })} className={`w-full rounded-xl border px-3 py-2 text-sm ${roomErrors.room_number ? "border-danger" : "border-slate-200"}`} />
              {roomErrors.room_number && <p className="text-xs text-danger mt-1">{roomErrors.room_number}</p>}
            </div>
            <input type="number" min="1" placeholder="Capacity" value={roomForm.capacity} onChange={(e) => setRoomForm({ ...roomForm, capacity: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            <button className="w-full bg-academic-blue text-white rounded-xl py-2 font-medium">Add room</button>
          </form>
        </Card>

        <Card>
          <SectionTitle>Allocate student to room</SectionTitle>
          <form onSubmit={allocate} className="space-y-3">
            <div>
              <input required placeholder="Student user ID" value={allocForm.student_id} onChange={(e) => setAllocForm({ ...allocForm, student_id: e.target.value })} className={`w-full rounded-xl border px-3 py-2 text-sm ${allocErrors.student_id ? "border-danger" : "border-slate-200"}`} />
              {allocErrors.student_id && <p className="text-xs text-danger mt-1">{allocErrors.student_id}</p>}
            </div>
            <div>
              <select required value={allocForm.room_id} onChange={(e) => setAllocForm({ ...allocForm, room_id: e.target.value })} className={`w-full rounded-xl border px-3 py-2 text-sm ${allocErrors.room_id ? "border-danger" : "border-slate-200"}`}>
                <option value="">Select room</option>
                {(rooms || []).map((r) => (
                  <option key={r.id} value={r.id}>{r.hostel_name} — {r.room_number} ({r.occupied_beds}/{r.capacity})</option>
                ))}
              </select>
              {allocErrors.room_id && <p className="text-xs text-danger mt-1">{allocErrors.room_id}</p>}
            </div>
            <button className="w-full bg-academic-green text-white rounded-xl py-2 font-medium">Allocate</button>
          </form>
        </Card>
      </div>

      <Card>
        <SectionTitle>Rooms</SectionTitle>
        {rooms === null ? <Loader /> : rooms.length === 0 ? <EmptyState label="No rooms yet." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-ink-secondary border-b border-slate-100">
                <th className="py-2 pr-4">Hostel</th><th className="py-2 pr-4">Room</th><th className="py-2 pr-4">Occupancy</th>
              </tr></thead>
              <tbody>
                {rooms.map((r) => (
                  <tr key={r.id} className="border-b border-slate-50">
                    <td className="py-2 pr-4">{r.hostel_name}</td>
                    <td className="py-2 pr-4">{r.room_number}</td>
                    <td className="py-2 pr-4">
                      <Badge tone={r.occupied_beds >= r.capacity ? "red" : "green"}>{r.occupied_beds}/{r.capacity}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <SectionTitle>Current allocations</SectionTitle>
        {allocations === null ? <Loader /> : allocations.length === 0 ? <EmptyState label="No students allocated yet." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-ink-secondary border-b border-slate-100">
                <th className="py-2 pr-4">Student</th><th className="py-2 pr-4">Hostel</th><th className="py-2 pr-4">Room</th><th className="py-2 pr-4">Since</th><th className="py-2 pr-4"></th>
              </tr></thead>
              <tbody>
                {allocations.map((a) => (
                  <tr key={a.id} className="border-b border-slate-50">
                    <td className="py-2 pr-4">{a.student_name}</td>
                    <td className="py-2 pr-4">{a.hostel_name}</td>
                    <td className="py-2 pr-4">{a.room_number}</td>
                    <td className="py-2 pr-4">{a.allocated_date}</td>
                    <td className="py-2 pr-4">
                      <button onClick={() => vacate(a.id)} className="text-danger text-xs font-medium hover:underline">Vacate</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}
