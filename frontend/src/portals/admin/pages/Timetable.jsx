import { useEffect, useState } from "react";
import api from "../lib/api";
import { Card, EmptyState, Loader, SectionTitle, Toast } from "../components/Common";
import { CalendarDays, Plus, Trash2, CheckCircle, X } from "lucide-react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const TIME_SLOTS = [
  { start: "08:00:00", end: "08:50:00" },
  { start: "08:50:00", end: "09:40:00" },
  { start: "09:40:00", end: "10:30:00" },
  { start: "10:30:00", end: "10:50:00", isBreak: true, label: "Break" },
  { start: "10:50:00", end: "11:40:00" },
  { start: "11:40:00", end: "12:30:00" },
  { start: "12:30:00", end: "13:20:00", isBreak: true, label: "Lunch" },
  { start: "13:20:00", end: "14:10:00" },
  { start: "14:10:00", end: "15:00:00" }
];

export default function Timetable() {
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [timetable, setTimetable] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [toast, setToast] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState({
    day_of_week: "",
    start_time: "",
    end_time: "",
    subject_id: "",
    teacher_id: "",
    room_number: ""
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      fetchTimetable();
    } else {
      setTimetable(null);
    }
  }, [selectedClassId]);

  const fetchInitialData = async () => {
    try {
      const [clsRes, subRes, userRes] = await Promise.all([
        api.get("/admin-portal/classes/"),
        api.get("/admin-portal/subjects/"),
        api.get("/admin-portal/users/?role=Teacher")
      ]);
      setClasses(clsRes.data);
      setSubjects(subRes.data);
      setTeachers(userRes.data.filter(u => u.role === "Teacher"));
    } catch (e) {
      setToast({ type: "error", message: "Failed to load configuration data." });
    }
  };

  const fetchTimetable = async () => {
    try {
      const res = await api.get(`/admin-portal/timetable/?class_id=${selectedClassId}`);
      setTimetable(res.data);
    } catch (e) {
      setToast({ type: "error", message: "Failed to load timetable." });
    }
  };

  const handleOpenModal = (day, slot) => {
    setModalData({
      day_of_week: day,
      start_time: slot.start,
      end_time: slot.end,
      subject_id: "",
      teacher_id: "",
      room_number: ""
    });
    setShowModal(true);
  };

  const handleSaveSlot = async (e) => {
    e.preventDefault();
    if (!selectedClassId) return;

    try {
      await api.post("/admin-portal/timetable/", {
        class_id: selectedClassId,
        ...modalData
      });
      setToast({ type: "success", message: "Slot added successfully." });
      setShowModal(false);
      fetchTimetable();
    } catch (e) {
      setToast({ type: "error", message: e.response?.data?.detail || "Failed to add slot due to conflict." });
    }
  };

  const handleDeleteSlot = async (id) => {
    if (!window.confirm("Delete this slot?")) return;
    try {
      await api.delete(`/admin-portal/timetable/?id=${id}`);
      setToast({ type: "success", message: "Slot deleted." });
      fetchTimetable();
    } catch (e) {
      setToast({ type: "error", message: "Failed to delete slot." });
    }
  };

  const handlePublish = async () => {
    if (!selectedClassId) return;
    if (!window.confirm("Publish this timetable? It will be visible to students and parents.")) return;
    try {
      await api.post("/admin-portal/timetable/publish/", { class_id: selectedClassId });
      setToast({ type: "success", message: "Timetable published successfully." });
      fetchTimetable();
    } catch (e) {
      setToast({ type: "error", message: "Failed to publish timetable." });
    }
  };

  const getSlot = (day, start) => {
    return timetable?.find(t => t.day_of_week === day && t.start_time === start);
  };

  const isPublished = timetable && timetable.length > 0 && timetable[0].is_published;

  return (
    <div className="space-y-6 animate-fade-in p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-bg-dark">Timetable Management</h1>
          <p className="text-sm text-gray-500 font-sub">Manage class schedules and teacher assignments</p>
        </div>
      </div>

      <Card className="p-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-6">
          <div className="w-full sm:w-1/3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Class</label>
            <select
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
            >
              <option value="">-- Select Class --</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name} - {c.section}</option>
              ))}
            </select>
          </div>

          {selectedClassId && timetable && (
            <button
              onClick={handlePublish}
              disabled={isPublished || timetable.length === 0}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
            >
              <CheckCircle size={16} />
              {isPublished ? "Published" : "Publish Timetable"}
            </button>
          )}
        </div>

        {!selectedClassId ? (
          <EmptyState icon={CalendarDays} title="No Class Selected" description="Please select a class to view or edit its timetable." />
        ) : !timetable ? (
          <Loader />
        ) : (
          <div className="overflow-x-auto border border-gray-100 rounded-xl">
            <table className="w-full min-w-[800px] text-sm text-left">
              <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3">Time</th>
                  {DAYS.map(day => (
                    <th key={day} className="px-4 py-3">{day}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {TIME_SLOTS.map((slot, i) => (
                  <tr key={i} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-700 whitespace-nowrap bg-gray-50 border-r border-gray-100">
                      {slot.start.substring(0, 5)} - {slot.end.substring(0, 5)}
                    </td>
                    {DAYS.map(day => {
                      if (slot.isBreak) {
                        if (day === DAYS[0]) {
                          return (
                            <td key={day} colSpan={DAYS.length} className="px-4 py-3 text-center text-gray-500 bg-gray-50 italic">
                              {slot.label}
                            </td>
                          );
                        }
                        return null; // Skip remaining days for break rows
                      }

                      const existingSlot = getSlot(day, slot.start);

                      return (
                        <td key={day} className="px-4 py-3 border-r border-gray-100 last:border-0 p-2 align-top">
                          {existingSlot ? (
                            <div className="bg-brand-primary/5 p-2 rounded-lg border border-brand-primary/20 relative group">
                              <p className="font-semibold text-brand-primary text-xs">{existingSlot.subject_name}</p>
                              <p className="text-gray-600 text-xs mt-1">{existingSlot.teacher_name}</p>
                              <p className="text-gray-500 text-[10px] mt-1">{existingSlot.room_number || "No Room"}</p>
                              <button
                                onClick={() => handleDeleteSlot(existingSlot.id)}
                                className="absolute top-1 right-1 p-1 bg-red-100 text-red-600 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Delete Slot"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ) : (
                            <div className="h-full w-full flex items-center justify-center py-4">
                              <button
                                onClick={() => handleOpenModal(day, slot)}
                                className="text-gray-400 hover:text-brand-primary hover:bg-brand-primary/10 p-2 rounded-full transition-colors"
                                title="Add Slot"
                              >
                                <Plus size={16} />
                              </button>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg font-heading">Add Timetable Slot</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-800"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSaveSlot} className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">
                  {modalData.day_of_week}, {modalData.start_time.substring(0, 5)} - {modalData.end_time.substring(0, 5)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <select
                  required
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                  value={modalData.subject_id}
                  onChange={e => setModalData({...modalData, subject_id: e.target.value})}
                >
                  <option value="">-- Select Subject --</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.subject_code})</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teacher</label>
                <select
                  required
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                  value={modalData.teacher_id}
                  onChange={e => setModalData({...modalData, teacher_id: e.target.value})}
                >
                  <option value="">-- Select Teacher --</option>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Room Number</label>
                <input
                  type="text"
                  placeholder="e.g. 101"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                  value={modalData.room_number}
                  onChange={e => setModalData({...modalData, room_number: e.target.value})}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-primary hover:bg-brand-secondary text-white rounded-xl text-sm font-medium transition-colors"
                >
                  Add Slot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
