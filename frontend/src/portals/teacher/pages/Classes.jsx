import { ClipboardCheck, Users, ChevronDown, ChevronUp, User } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, EmptyState, Loader } from "../../shared/components/Common";
import api from "../lib/api";

export default function Classes() {
  const [classes, setClasses] = useState(null);
  const [selectedYear, setSelectedYear] = useState("2025-26");
  const [expandedClassId, setExpandedClassId] = useState(null);
  const [roster, setRoster] = useState({});
  const [rosterLoading, setRosterLoading] = useState(false);

  useEffect(() => {
    api.get("/teacher/classes/").then(({ data }) => setClasses(data)).catch(() => setClasses([]));
  }, []);

  const handleToggleRoster = async (classId) => {
    if (expandedClassId === classId) {
      setExpandedClassId(null);
      return;
    }

    setExpandedClassId(classId);
    if (roster[classId]) return;

    setRosterLoading(true);
    try {
      const { data } = await api.get(`/teacher/classes/${classId}/roster/`);
      setRoster(prev => ({ ...prev, [classId]: data }));
    } catch {
      setRoster(prev => ({ ...prev, [classId]: [] }));
    } finally {
      setRosterLoading(false);
    }
  };

  if (!classes) return <Loader rows={4} />;
  if (!classes.length) return <EmptyState label="No classes allocated to you yet." />;

  return (
    <div className="space-y-6 animate-[fadeIn_.2s_ease]">
      {/* Header and selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl font-bold text-ink-primary">My Allocated Classes</h2>
          <p className="text-sm text-ink-secondary">Review class dashboards, attendance logs, and student rosters.</p>
        </div>

        <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-100 shadow-sm self-start sm:self-auto">
          <label className="text-xs font-bold text-slate-500 whitespace-nowrap">Academic Year:</label>
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(e.target.value)}
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold focus-ring outline-none bg-slate-50 cursor-pointer text-ink-primary"
          >
            <option value="2025-26">2025-26</option>
            <option value="2024-25">2024-25</option>
          </select>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        {classes.map((c) => {
          const isRosterOpen = expandedClassId === c.class_id;
          const students = roster[c.class_id] || [];

          return (
            <Card key={c.id} className="flex flex-col justify-between h-fit">
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-heading font-bold text-lg text-ink-primary">{c.class_name}</p>
                    <p className="text-sm text-academic-blue font-semibold">{c.subject_name}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-50 rounded-full px-2.5 py-1 border border-slate-100/60">
                    <Users size={12} /> {c.student_count} Student(s)
                  </div>
                </div>

                <div className="flex gap-2 my-4 border-b border-slate-100 pb-4">
                  <Link
                    to={`/teacher/attendance?class_id=${c.class_id}`}
                    className="flex-1 text-center text-xs font-bold text-white bg-academic-blue rounded-xl py-2.5 hover:bg-academic-blue/90 transition-colors shadow-raised"
                  >
                    Mark Attendance
                  </Link>
                  <Link
                    to={`/teacher/performance?class_id=${c.class_id}&subject_id=${c.subject_id}`}
                    className="flex-1 flex items-center justify-center gap-1 text-xs font-bold text-academic-blue border border-academic-blue/30 rounded-xl py-2.5 hover:bg-academic-blue/5 transition-colors"
                  >
                    <ClipboardCheck size={14} /> Performance
                  </Link>
                </div>
              </div>

              {/* Toggle Roster Button */}
              <div>
                <button
                  onClick={() => handleToggleRoster(c.class_id)}
                  className="w-full flex items-center justify-between text-xs font-bold text-slate-500 py-2 px-3 bg-slate-50 hover:bg-slate-100/70 rounded-lg transition-colors"
                >
                  <span className="flex items-center gap-1">👥 Student Roster List</span>
                  {isRosterOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {/* Class Student Roster Section */}
                {isRosterOpen && (
                  <div className="mt-3 p-3 bg-slate-50/50 rounded-xl border border-slate-100/80 space-y-2 max-h-60 overflow-y-auto animate-[fadeIn_.2s_ease]">
                    {rosterLoading && !students.length ? (
                      <Loader rows={2} />
                    ) : students.length === 0 ? (
                      <p className="text-xs text-ink-secondary italic text-center py-2">No students enrolled in this section.</p>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {students.map((student) => (
                          <div key={student.student} className="py-2 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-slate-200/60 flex items-center justify-center text-slate-500">
                                <User size={12} />
                              </div>
                              <div>
                                <p className="font-semibold text-ink-primary">{student.student_name}</p>
                                <p className="text-[10px] text-ink-secondary">Adm: {student.admission_number || "N/A"}</p>
                              </div>
                            </div>
                            <span className="font-numeric font-bold text-slate-400 bg-white border border-slate-100 px-2 py-0.5 rounded">
                              Roll {student.roll_number || "—"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
