import { useState, useEffect } from "react";
import { Plus, Search, BookOpen, GraduationCap, X } from "lucide-react";
import api from "../lib/api";

export default function Examinations() {
  const [activeTab, setActiveTab] = useState("types");
  const [examTypes, setExamTypes] = useState([]);
  const [examinations, setExaminations] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form states
  const [typeForm, setTypeForm] = useState({ name: "", description: "" });
  const [examForm, setExamForm] = useState({ 
    name: "", exam_type: "", academic_year: "2026-2027", term: "Term 1", 
    start_date: "", end_date: "", status: "Draft" 
  });

  const loadData = async () => {
    try {
      const [typesRes, examsRes] = await Promise.all([
        api.get("/examination/types/"),
        api.get("/examination/exams/")
      ]);
      setExamTypes(typesRes.data);
      setExaminations(examsRes.data);
    } catch (error) {
      console.error("Failed to load examinations data:", error);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateType = async (e) => {
    e.preventDefault();
    try {
      await api.post("/examination/types/", typeForm);
      setTypeForm({ name: "", description: "" });
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      alert("Failed to create Exam Type");
    }
  };

  const handleCreateExam = async (e) => {
    e.preventDefault();
    try {
      await api.post("/examination/exams/", examForm);
      setExamForm({ ...examForm, name: "", start_date: "", end_date: "" });
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      alert("Failed to create Examination");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-heading">Examinations Planning</h1>
          <p className="text-sm text-gray-500 font-sub">Manage examination types, schedules, and structures.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 bg-academic-blue text-white px-4 py-2 rounded-xl font-medium shadow-sm hover:shadow-md transition-shadow font-sub"
        >
          <Plus size={18} />
          {activeTab === "types" ? "Add Exam Type" : "Create Examination"}
        </button>
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
          Examinations
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
          <table className="w-full text-left text-sm font-sub">
            <thead className="bg-gray-50/50 text-gray-500 font-medium">
              <tr>
                <th className="px-6 py-4">Exam Name</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Academic Year & Term</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {examinations.length === 0 && (
                <tr><td colSpan="5" className="px-6 py-4 text-center text-gray-500">No Examinations found.</td></tr>
              )}
              {examinations.map((exam) => (
                <tr key={exam.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center"><GraduationCap size={16} /></div>
                      {exam.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-500">{exam.exam_type_details?.name}</td>
                  <td className="px-6 py-4 text-gray-500">{exam.academic_year} • {exam.term}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-green-50 text-green-700 rounded-md text-xs font-medium border border-green-200">
                      {exam.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-3">
                    <button className="text-academic-blue font-medium hover:underline text-sm">Manage</button>
                    <button className="text-gray-500 hover:text-gray-700 font-medium text-sm">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-lg font-heading">
                {activeTab === "types" ? "Add Exam Type" : "Create Examination"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6">
              {activeTab === "types" ? (
                <form onSubmit={handleCreateType} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Name</label>
                    <input required value={typeForm.name} onChange={(e) => setTypeForm({...typeForm, name: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none focus:border-academic-blue text-sm" placeholder="e.g. Unit Test" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                    <textarea value={typeForm.description} onChange={(e) => setTypeForm({...typeForm, description: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none focus:border-academic-blue text-sm" placeholder="Optional description..." rows={3} />
                  </div>
                  <button type="submit" className="w-full bg-academic-blue text-white py-2.5 rounded-xl font-medium">Create Type</button>
                </form>
              ) : (
                <form onSubmit={handleCreateExam} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Exam Name</label>
                    <input required value={examForm.name} onChange={(e) => setExamForm({...examForm, name: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none focus:border-academic-blue text-sm" placeholder="e.g. Term 1 Unit Test" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Exam Type</label>
                    <select required value={examForm.exam_type} onChange={(e) => setExamForm({...examForm, exam_type: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none focus:border-academic-blue text-sm">
                      <option value="">Select Type</option>
                      {examTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Start Date</label>
                      <input required type="date" value={examForm.start_date} onChange={(e) => setExamForm({...examForm, start_date: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none focus:border-academic-blue text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">End Date</label>
                      <input required type="date" value={examForm.end_date} onChange={(e) => setExamForm({...examForm, end_date: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none focus:border-academic-blue text-sm" />
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-academic-blue text-white py-2.5 rounded-xl font-medium">Create Examination</button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
