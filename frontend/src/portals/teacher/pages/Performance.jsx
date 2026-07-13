import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, EmptyState, Loader, SectionTitle, Toast, Badge } from "../components/Common";
import api from "../lib/api";
import {
  Download, Send, X, ArrowRight, BookOpen, CalendarCheck, FileSpreadsheet,
  TrendingUp, User, Award, ShieldAlert, CheckCircle2, AlertCircle
} from "lucide-react";
import { isNonEmptyString } from "../../../utils/validation";

export default function Performance() {
  const [params] = useSearchParams();
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState(params.get("class_id") || "");
  const [subjectId, setSubjectId] = useState(params.get("subject_id") || "");
  const [data, setData] = useState(null);
  
  // Interactive detail states
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentDetails, setStudentDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  
  // Feedback form states
  const [feedback, setFeedback] = useState("");
  const [improvementPlan, setImprovementPlan] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [toast, setToast] = useState("");

  useEffect(() => {
    api.get("/teacher/classes/").then(({ data }) => {
      setClasses(data);
      if (!classId && data.length) {
        setClassId(String(data[0].class_id));
        setSubjectId(String(data[0].subject_id));
      }
    });
  }, []);

  useEffect(() => {
    if (!classId) return;
    setData(null);
    setSelectedStudent(null);
    setStudentDetails(null);
    api
      .get("/teacher/performance/", { params: { class_id: classId, subject_id: subjectId } })
      .then(({ data }) => setData(data));
  }, [classId, subjectId]);

  // Load detailed performance of a single selected student
  const handleViewStudentDetails = (student) => {
    setSelectedStudent(student);
    setDetailsLoading(true);
    setStudentDetails(null);
    setFeedback("");
    setImprovementPlan("");
    setValidationErrors({});
    
    api.get("/teacher/performance/", {
      params: {
        class_id: classId,
        subject_id: subjectId,
        student_id: student.student_id
      }
    })
    .then(({ data }) => setStudentDetails(data))
    .catch(() => setToast("Could not retrieve detailed statistics for this student."))
    .finally(() => setDetailsLoading(false));
  };

  // Submit Feedback & Improvement plan to Parent
  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    if (!studentDetails?.parent_id) {
      setToast("Error: No parent account linked to this student to receive notifications.");
      return;
    }

    const errors = {};
    if (!isNonEmptyString(feedback)) {
      errors.feedback = "Performance feedback comments are required.";
    }
    if (!isNonEmptyString(improvementPlan)) {
      errors.improvementPlan = "Recommended improvement plan details cannot be empty.";
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors({});
    setSubmittingFeedback(true);

    try {
      const msgText = `[Academic Performance Update] Student: ${selectedStudent.name}\nFeedback: ${feedback}\nRecommended Improvement Plan: ${improvementPlan}`;
      
      // Post to messages endpoint sending to student's parent
      await api.post("/teacher/messages/", {
        receiver: studentDetails.parent_id,
        message_text: msgText
      });
      
      setToast(`Academic feedback and improvement plan sent to ${selectedStudent.name}'s parent!`);
      setFeedback("");
      setImprovementPlan("");
      setSelectedStudent(null);
      setStudentDetails(null);
    } catch (err) {
      setToast("Failed to notify parent. Please try again.");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  // Simulated CSV report generator
  const handleExportReport = (reportType) => {
    if (!data || !data.students.length) return;
    
    let csvContent = "";
    const activeClass = classes.find(c => String(c.class_id) === String(classId));
    const className = activeClass ? activeClass.class_name : "Class";
    const subjectName = activeClass ? activeClass.subject_name : "Subject";
    
    if (reportType === "Attendance") {
      csvContent = "Student ID,Student Name,Attendance Percentage,Exams Attempted\n";
      data.students.forEach(s => {
        csvContent += `${s.student_id},"${s.name}",${s.attendance_percentage || 0}%,${s.exams_taken}\n`;
      });
    } else if (reportType === "Marks") {
      csvContent = "Student ID,Student Name,Subject Average Score %,Exams Taken\n";
      data.students.forEach(s => {
        csvContent += `${s.student_id},"${s.name}",${s.average_marks || 0}%,${s.exams_taken}\n`;
      });
    } else {
      // General Performance Summary
      csvContent = "Class Performance Summary Report\n";
      csvContent += `Class: ${className}\nSubject: ${subjectName}\nClass Average Score: ${data.class_average}%\n\n`;
      csvContent += "Student Name,Average Score,Attendance,Exams taken\n";
      data.students.forEach(s => {
        csvContent += `"${s.name}",${s.average_marks || 0}%,${s.attendance_percentage || 0}%,${s.exams_taken}\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${className}_${subjectName}_${reportType}_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setToast(`${reportType} Report generated and downloaded successfully!`);
  };

  const chartData = data?.students.map((s) => ({ name: s.name.split(" ")[0], marks: s.average_marks || 0 })) || [];

  return (
    <div className="space-y-6">
      
      {/* Filters and Exports Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Class Allocation:</label>
          <select
            value={`${classId}:${subjectId}`}
            onChange={(e) => {
              const [c, s] = e.target.value.split(":");
              setClassId(c);
              setSubjectId(s);
            }}
            className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold focus-ring outline-none bg-slate-50 cursor-pointer text-ink-primary"
          >
            {classes.map((c) => (
              <option key={c.id} value={`${c.class_id}:${c.subject_id}`}>{c.class_name} — {c.subject_name}</option>
            ))}
          </select>
        </div>

        {/* Report Exports controls */}
        {data && data.students.length > 0 && (
          <div className="flex items-center gap-2 self-start md:self-auto">
            <span className="text-xs text-slate-400 font-bold uppercase mr-1">Export Academic Reports:</span>
            <button
              onClick={() => handleExportReport("General")}
              className="flex items-center gap-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg px-2.5 py-1.5 text-xs font-semibold shadow-sm transition-colors"
            >
              <Download size={12} /> Summary
            </button>
            <button
              onClick={() => handleExportReport("Attendance")}
              className="flex items-center gap-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg px-2.5 py-1.5 text-xs font-semibold shadow-sm transition-colors"
            >
              <Download size={12} /> Attendance
            </button>
            <button
              onClick={() => handleExportReport("Marks")}
              className="flex items-center gap-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg px-2.5 py-1.5 text-xs font-semibold shadow-sm transition-colors"
            >
              <Download size={12} /> Marks
            </button>
          </div>
        )}
      </div>

      {!data ? (
        <Loader rows={4} />
      ) : data.students.length ? (
        <div className="grid lg:grid-cols-3 gap-6">
          
          {/* Chart & Tables side */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <SectionTitle>Class Performance Distribution (Avg: {data.class_average ?? "—"}%)</SectionTitle>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef1f6" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#6B7280" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#6B7280" domain={[0, 100]} />
                  <Tooltip formatter={(v) => [`${v}%`, "Avg Score"]} />
                  <Bar dataKey="marks" fill="#1E3A8A" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card>
              <SectionTitle>Student Directory breakdown (Click for Details)</SectionTitle>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="text-ink-secondary text-xs uppercase tracking-wide border-b border-slate-100">
                      <th className="py-2.5">Student Name</th>
                      <th className="py-2.5 text-center">Average Marks</th>
                      <th className="py-2.5 text-center">Exams Conducted</th>
                      <th className="py-2.5 text-center">Attendance %</th>
                      <th className="py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.students.map((s) => (
                      <tr 
                        key={s.student_id} 
                        className={`hover:bg-slate-50 transition-colors cursor-pointer ${
                          selectedStudent?.student_id === s.student_id ? "bg-blue-50/20" : ""
                        }`}
                        onClick={() => handleViewStudentDetails(s)}
                      >
                        <td className="py-3 font-medium text-ink-primary flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-academic-blue">
                            {s.name[0]}
                          </div>
                          {s.name}
                        </td>
                        <td className="py-3 font-numeric font-semibold text-center text-academic-blue">
                          {s.average_marks ?? "—"}%
                        </td>
                        <td className="py-3 text-center text-slate-500">{s.exams_taken}</td>
                        <td className="py-3 font-numeric text-center">
                          <span className={`font-semibold ${
                            Number(s.attendance_percentage) < 75 ? "text-danger" : "text-academic-green"
                          }`}>
                            {s.attendance_percentage != null ? `${s.attendance_percentage}%` : "—"}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewStudentDetails(s);
                            }}
                            className="text-xs font-bold text-academic-blue hover:underline inline-flex items-center gap-1"
                          >
                            Analyze &rarr;
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Student Profile Detail Sidebar Column */}
          <div className="space-y-6">
            <h3 className="font-heading font-semibold text-ink-primary text-base">Individual Evaluation Panel</h3>
            
            {selectedStudent ? (
              detailsLoading ? (
                <Card className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="animate-spin text-academic-blue mb-2" size={24} />
                  <p className="text-xs text-ink-secondary">Loading statistics for {selectedStudent.name}...</p>
                </Card>
              ) : studentDetails ? (
                <div className="space-y-5 animate-[fadeIn_.2s_ease]">
                  
                  {/* Detailed statistics card */}
                  <Card className="space-y-4">
                    <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                      <div className="w-10 h-10 rounded-xl bg-academic-blue/10 text-academic-blue flex items-center justify-center text-sm font-bold">
                        {selectedStudent.name[0]}
                      </div>
                      <div>
                        <h4 className="font-heading font-bold text-sm text-ink-primary">{selectedStudent.name}</h4>
                        <p className="text-xs text-ink-secondary">Roll ID: {selectedStudent.student_id}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-center">
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Attendance</p>
                        <p className="text-sm font-bold text-ink-primary mt-0.5">{selectedStudent.attendance_percentage}%</p>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Homework</p>
                        <p className="text-sm font-bold text-ink-primary mt-0.5">{studentDetails.homework_total} Assigned</p>
                      </div>
                    </div>

                    {/* Exams results list */}
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                        <Award size={14} className="text-academic-gold" /> Exam Performance
                      </p>
                      {!studentDetails.results?.length ? (
                        <p className="text-xs text-ink-secondary italic bg-slate-50 p-2 rounded-lg text-center">No exam marks entered.</p>
                      ) : (
                        <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                          {studentDetails.results.map((r, i) => (
                            <div key={i} className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded-lg border border-slate-100/50">
                              <span className="font-medium text-ink-primary">{r.exam_name}</span>
                              <span className="font-semibold text-academic-blue font-numeric">{r.marks_obtained}/{r.max_marks}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Assignments evaluation list */}
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                        <BookOpen size={14} className="text-academic-blue" /> Evaluated Homework
                      </p>
                      {!studentDetails.assignments?.length ? (
                        <p className="text-xs text-ink-secondary italic bg-slate-50 p-2 rounded-lg text-center">No assignments submitted.</p>
                      ) : (
                        <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                          {studentDetails.assignments.map((a, i) => (
                            <div key={i} className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded-lg border border-slate-100/50">
                              <span className="font-medium text-ink-primary truncate max-w-[120px]">{a.title}</span>
                              <span className="font-semibold text-emerald-600 font-numeric">{a.marks_obtained}/{a.max_marks}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </Card>

                  {/* Feedback and recommended improvement plan form */}
                  <Card>
                    <h4 className="font-heading font-bold text-xs text-slate-400 uppercase tracking-wider mb-3">Recommend Improvement Plan</h4>
                    
                    <form onSubmit={handleSubmitFeedback} className="space-y-3.5">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-600 block">Performance Feedback:</label>
                        <textarea
                          rows={3}
                          required
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                          placeholder="Provide performance feedback (strengths, weaknesses)..."
                          className={`w-full rounded-xl border px-3 py-2 text-xs focus-ring outline-none resize-none ${
                            validationErrors.feedback ? "border-danger" : "border-slate-200"
                          }`}
                        />
                        {validationErrors.feedback && (
                          <p className="text-[10px] text-danger font-semibold">{validationErrors.feedback}</p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-600 block">Improvement Strategy:</label>
                        <textarea
                          rows={3}
                          required
                          value={improvementPlan}
                          onChange={(e) => setImprovementPlan(e.target.value)}
                          placeholder="Describe the step-by-step improvement recommendations..."
                          className={`w-full rounded-xl border px-3 py-2 text-xs focus-ring outline-none resize-none ${
                            validationErrors.improvementPlan ? "border-danger" : "border-slate-200"
                          }`}
                        />
                        {validationErrors.improvementPlan && (
                          <p className="text-[10px] text-danger font-semibold">{validationErrors.improvementPlan}</p>
                        )}
                      </div>

                      <button
                        type="submit"
                        disabled={submittingFeedback}
                        className="w-full flex items-center justify-center gap-1.5 bg-academic-blue hover:bg-academic-blue/90 disabled:opacity-60 text-white rounded-xl py-2.5 text-xs font-bold shadow-sm transition-all"
                      >
                        {submittingFeedback ? (
                          <>
                            <Loader2 size={12} className="animate-spin" /> Sending plan...
                          </>
                        ) : (
                          <>
                            <Send size={12} /> Send to Parent
                          </>
                        )}
                      </button>
                    </form>
                  </Card>
                </div>
              ) : null
            ) : (
              <Card className="bg-slate-50 border border-dashed border-slate-200 p-6 text-center text-slate-400">
                <User size={28} className="mx-auto mb-2 opacity-55 text-academic-blue" />
                <p className="text-xs leading-relaxed">Select any student from the directory breakdown to analyze their attendance, assignments, and submit improvement feedback.</p>
              </Card>
            )}
            
          </div>
        </div>
      ) : (
        <EmptyState label="No results recorded for this class/subject yet." />
      )}

      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}
