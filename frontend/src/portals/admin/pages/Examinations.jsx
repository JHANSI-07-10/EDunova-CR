import { useState, useEffect } from "react";
import { Plus, Search, BookOpen, GraduationCap } from "lucide-react";

export default function Examinations() {
  const [activeTab, setActiveTab] = useState("types");
  const [examTypes, setExamTypes] = useState([]);
  const [examinations, setExaminations] = useState([]);

  useEffect(() => {
    // In a real implementation, we would fetch from /api/examination/types/ and /api/examination/exams/
    setExamTypes([
      { id: 1, name: "Unit Test", description: "Monthly unit tests" },
      { id: 2, name: "Mid Term", description: "Half-yearly examination" },
    ]);
    setExaminations([
      { id: 1, name: "Term 1 Unit Test", exam_type_details: { name: "Unit Test" }, academic_year: "2026-2027", term: "Term 1", status: "Active" }
    ]);
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-heading">Examinations Planning</h1>
          <p className="text-sm text-gray-500 font-sub">Manage examination types, schedules, and structures.</p>
        </div>
        <button className="inline-flex items-center gap-2 bg-academic-blue text-white px-4 py-2 rounded-xl font-medium shadow-sm hover:shadow-md transition-shadow font-sub">
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
    </div>
  );
}
