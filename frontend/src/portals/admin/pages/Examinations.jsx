import { useState, useEffect } from "react";
import { Plus, Search, BookOpen, GraduationCap, X, UserCheck, BarChart2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { isNonEmptyString } from "../../../utils/validation";

export default function Examinations() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("types");
  const [examTypes, setExamTypes] = useState([]);
  const [examinations, setExaminations] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [isInvigilatorModalOpen, setIsInvigilatorModalOpen] = useState(false);
  
  // Form states
  const [typeForm, setTypeForm] = useState({ name: "", description: "" });
  const [invigilatorForm, setInvigilatorForm] = useState({ 
    exam_schedule_id: "", teacher_id: "", room_name: "", exam_date: "", start_time: "", end_time: ""
  });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const [typesRes, examsRes, teachersRes] = await Promise.all([
        api.get("/admin-portal/exam-workflow/types/"),
        api.get("/admin-portal/exams/"),
        api.get("/admin-portal/users/?role=Teacher")
      ]);
      setExamTypes(typesRes.data);
      setExaminations(examsRes.data);
      setTeachers(teachersRes.data);
    } catch (error) {
      console.error("Failed to load examinations data:", error);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateType = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!isNonEmptyString(typeForm.name)) { setFormError("Exam type name is required."); return; }
    setSubmitting(true);
    try {
      await api.post("/admin-portal/exam-workflow/types/", typeForm);
      setTypeForm({ name: "", description: "" });
      setIsTypeModalOpen(false);
      loadData();
    } catch (err) {
      setFormError(err?.response?.data?.detail || "Failed to create Exam Type.");
    } finally { setSubmitting(false); }
  };

  const handleAssignInvigilator = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!isNonEmptyString(invigilatorForm.teacher_id)) { setFormError("Please select a teacher."); return; }
    if (!isNonEmptyString(invigilatorForm.room_name)) { setFormError("Room name is required."); return; }
    if (!invigilatorForm.start_time || !invigilatorForm.end_time) { setFormError("Start and end times are required."); return; }
    if (invigilatorForm.start_time >= invigilatorForm.end_time) { setFormError("End time must be after start time."); return; }
    setSubmitting(true);
    try {
      await api.post("/admin-portal/exam-workflow/invigilators/", invigilatorForm);
      setInvigilatorForm({ exam_schedule_id: "", teacher_id: "", room_name: "", exam_date: "", start_time: "", end_time: "" });
      setIsInvigilatorModalOpen(false);
      setFormError("");
      loadData();
    } catch (err) {
      setFormError(err?.response?.data?.detail || "Failed to assign invigilator. There might be a schedule conflict.");
    } finally { setSubmitting(false); }
  };

  const openInvigilatorModal = (exam) => {
    setInvigilatorForm({
      exam_schedule_id: exam.id,
      teacher_id: "",
      room_name: exam.room_name || "",
      exam_date: exam.exam_date || "",
      start_time: "09:00:00",
      end_time: "12:00:00"
    });
    setIsInvigilatorModalOpen(true);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-heading">Examinations Planning</h1>
          <p className="text-sm text-gray-500 font-sub">Manage examination types, schedules, and invigilation.</p>
        </div>
        {activeTab === "types" && (
          <button 
            onClick={() => setIsTypeModalOpen(true)}
            className="inline-flex items-center gap-2 bg-academic-blue text-white px-4 py-2 rounded-xl font-medium shadow-sm hover:shadow-md transition-shadow font-sub"
          >
            <Plus size={18} />
            Add Exam Type
          </button>
        )}
      </div>

      <div className="flex border-b border-gray-200">
        <button
          className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === "types" ? "border-academic-blue text-academic-blue" : "border-transparent text-gray-500 hover:text-gray-700"}`}
          onClick={() => setActiveTab("types")}
        >
          Examination Types
        </button>
        <button
          className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === "exams" ? "border-academic-blue text-academic-blue" : "border-transparent text-gray-500 hover:text-gray-700"}`}
          onClick={() => setActiveTab("exams")}
        >
          Scheduled Exams
        </button>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="relative max-w-xs w-full">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder={`Search ${activeTab}...`} className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-academic-blue focus:ring-1 focus:ring-academic-blue" />
          </div>
        </div>
        
        {activeTab === "types" && (
          <table className="w-full text-left text-sm font-sub">
            <thead className="bg-gray-50/50 text-gray-500 font-medium">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {examTypes.length === 0 && (
                <tr><td colSpan="3" className="px-6 py-4 text-center text-gray-500">No Exam Types found.</td></tr>
              )}
              {examTypes.map((type) => (
                <tr key={type.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center"><BookOpen size={16} /></div>
                      {type.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-500">{type.description}</td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-academic-blue font-medium hover:underline text-sm">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === "exams" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm font-sub">
              <thead className="bg-gray-50/50 text-gray-500 font-medium">
                <tr>
                  <th className="px-6 py-4">Exam Name</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Class & Subject</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Invigilator</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {examinations.length === 0 && (
                  <tr><td colSpan="6" className="px-6 py-4 text-center text-gray-500">No Scheduled Exams found. Teachers must create them first.</td></tr>
                )}
                {examinations.map((exam) => (
                  <tr key={exam.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center"><GraduationCap size={16} /></div>
                        {exam.exam_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-500">{exam.exam_type}</td>
                    <td className="px-6 py-4 text-gray-500">{exam.class_name} • {exam.subject_name}</td>
                    <td className="px-6 py-4 text-gray-500">{exam.exam_date}</td>
                    <td className="px-6 py-4 text-gray-500">
                      {exam.teacher_name ? (
                        <span className="flex items-center gap-1 text-green-600 font-medium">
                          <UserCheck size={14} /> {exam.teacher_name}
                        </span>
                      ) : (
                        <span className="text-amber-500 italic">Not Assigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-3 whitespace-nowrap">
                      <button 
                        onClick={() => navigate('/admin/exam-results')}
                        className="text-gray-500 font-medium hover:text-gray-700 text-sm inline-flex items-center gap-1"
                        title="View Marks and Stats"
                      >
                        <BarChart2 size={16} /> Stats
                      </button>
                      <button 
                        onClick={() => openInvigilatorModal(exam)}
                        className="text-academic-blue font-medium hover:underline text-sm inline-flex items-center gap-1"
                      >
                        <UserCheck size={16} /> Assign
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isTypeModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-lg font-heading">Add Exam Type</h3>
              <button onClick={() => { setIsTypeModalOpen(false); setFormError(""); }} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={handleCreateType} className="space-y-4">
                {formError && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{formError}</p>}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Name</label>
                  <input required value={typeForm.name} onChange={(e) => setTypeForm({...typeForm, name: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none focus:border-academic-blue text-sm" placeholder="e.g. Unit Test" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                  <textarea value={typeForm.description} onChange={(e) => setTypeForm({...typeForm, description: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none focus:border-academic-blue text-sm" placeholder="Optional description..." rows={3} />
                </div>
                <button type="submit" disabled={submitting} className="w-full bg-academic-blue text-white py-2.5 rounded-xl font-medium disabled:opacity-50">{submitting ? "Creating..." : "Create Type"}</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {isInvigilatorModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-lg font-heading">Assign Invigilator</h3>
              <button onClick={() => { setIsInvigilatorModalOpen(false); setFormError(""); }} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={handleAssignInvigilator} className="space-y-4">
                {formError && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{formError}</p>}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Teacher</label>
                  <select required value={invigilatorForm.teacher_id} onChange={(e) => setInvigilatorForm({...invigilatorForm, teacher_id: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none focus:border-academic-blue text-sm">
                    <option value="">Select Teacher</option>
                    {teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name} ({t.username})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Room Name</label>
                  <input required value={invigilatorForm.room_name} onChange={(e) => setInvigilatorForm({...invigilatorForm, room_name: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none focus:border-academic-blue text-sm" placeholder="e.g. Room 101" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Start Time</label>
                    <input required type="time" value={invigilatorForm.start_time} onChange={(e) => setInvigilatorForm({...invigilatorForm, start_time: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none focus:border-academic-blue text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">End Time</label>
                    <input required type="time" value={invigilatorForm.end_time} onChange={(e) => setInvigilatorForm({...invigilatorForm, end_time: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none focus:border-academic-blue text-sm" />
                  </div>
                </div>
                <button type="submit" disabled={submitting} className="w-full bg-academic-blue text-white py-2.5 rounded-xl font-medium disabled:opacity-50">{submitting ? "Assigning..." : "Assign Duty"}</button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
