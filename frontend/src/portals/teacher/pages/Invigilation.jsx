import { useState, useEffect } from "react";
import { Calendar, Clock, MapPin, Users, BookOpen } from "lucide-react";
import api from "../lib/api";

export default function Invigilation() {
  const [duties, setDuties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDuties();
  }, []);

  const loadDuties = async () => {
    try {
      const { data } = await api.get("/teacher/invigilation-duty/");
      setDuties(data);
    } catch (err) {
      console.error("Failed to load invigilation duties", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-6 text-gray-500 font-sub">Loading invigilation duties...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 font-heading">Invigilation Duties</h1>
        <p className="text-sm text-gray-500 font-sub">View your upcoming exam invigilation assignments.</p>
      </div>

      {duties.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 font-heading">No Duties Assigned</h3>
          <p className="text-gray-500 mt-2 font-sub">You currently have no exam invigilation duties scheduled.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {duties.map((duty) => (
            <div key={duty.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
              <div className="bg-academic-blue p-4 text-white">
                <h3 className="font-bold text-lg font-heading">{duty.exam_name}</h3>
                <p className="text-blue-100 text-sm font-sub">{duty.exam_type}</p>
              </div>
              <div className="p-5 space-y-4 font-sub text-sm">
                <div className="flex items-center text-gray-700 gap-3">
                  <BookOpen size={18} className="text-gray-400" />
                  <span>
                    <span className="font-semibold text-gray-900">{duty.subject_name}</span> ({duty.class_name})
                  </span>
                </div>
                
                <div className="flex items-center text-gray-700 gap-3">
                  <Calendar size={18} className="text-gray-400" />
                  <span>{new Date(duty.exam_date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
                
                <div className="flex items-center text-gray-700 gap-3">
                  <Clock size={18} className="text-gray-400" />
                  <span>{duty.start_time.slice(0, 5)} ({duty.duration_minutes} mins)</span>
                </div>
                
                <div className="flex items-center text-gray-700 gap-3">
                  <MapPin size={18} className="text-gray-400" />
                  <span>{duty.room_name || "Room not assigned"}</span>
                </div>
                
                <div className="flex items-center text-gray-700 gap-3">
                  <Users size={18} className="text-gray-400" />
                  <span>{duty.student_count} Students expected</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
