import { useEffect, useState } from "react";
import api from "../lib/api";
import { Badge, Card, EmptyState, Loader } from "../components/Common";
import { useAuth } from "../context/AuthContext";
import { GraduationCap, Award, MessageSquare, Download, RefreshCw, FileText, CheckCircle2 } from "lucide-react";

export default function Results() {
  const { activeChildId } = useAuth();
  const [tab, setTab] = useState("overview");
  const [items, setItems] = useState(null);
  const [revals, setRevals] = useState([]);
  const [certs, setCerts] = useState([]);
  const [selectedExam, setSelectedExam] = useState("");
  const [toast, setToast] = useState("");

  async function loadChildExams() {
    if (!activeChildId) return;
    try {
      const { data } = await api.get(`/parent/results/?child_id=${activeChildId}`);
      setItems(data);
      if (data.length > 0) {
        setSelectedExam(data[0].exam?.exam_name);
      } else {
        setSelectedExam("");
      }

      if (tab === "reval") {
        const { data: revalData } = await api.get(`/parent/exams/revaluation/?child_id=${activeChildId}`);
        setRevals(revalData);
      } else if (tab === "certificates") {
        const { data: certData } = await api.get(`/parent/exams/certificates/?child_id=${activeChildId}`);
        setCerts(certData);
      }
    } catch {
      setItems([]);
    }
  }

  useEffect(() => {
    loadChildExams();
  }, [activeChildId, tab]);

  if (!activeChildId) return <EmptyState label="Select a child from the top bar to view results." />;
  if (!items) return <Loader rows={4} />;

  const uniqueExams = [...new Set(items.map(r => r.exam?.exam_name))].filter(Boolean);
  const filtered = items.filter(r => r.exam?.exam_name === selectedExam);

  // Statistics calculation
  const totalMax = filtered.reduce((s, r) => s + (r.exam?.max_marks || 0), 0);
  const totalObtained = filtered.reduce((s, r) => s + (r.marks_obtained || 0), 0);
  const overallPercentage = totalMax ? Math.round((totalObtained * 100) / totalMax) : 0;
  const classRank = filtered.find(r => r.rank_position !== null)?.rank_position || "N/A";
  const teacherRemarks = filtered.map(r => r.remarks).filter(Boolean).join(". ") || "Consistent academic effort shown throughout the term.";

  return (
    <div className="space-y-6 animate-[fadeIn_.2s_ease]">
      {/* Selector and Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl font-bold text-ink-primary">Academic Progress Report</h2>
          <p className="text-sm text-ink-secondary">Review child marks, rank positions, and overall performance.</p>
        </div>

        {tab === "overview" && uniqueExams.length > 0 && (
          <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-100 shadow-sm self-start sm:self-auto">
            <label className="text-xs font-bold text-slate-500 whitespace-nowrap">Select Term:</label>
            <select
              value={selectedExam}
              onChange={e => setSelectedExam(e.target.value)}
              className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold focus-ring outline-none bg-slate-50 cursor-pointer text-ink-primary"
            >
              {uniqueExams.map(name => (
                <option key={name} value={name}>{name.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setTab("overview")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            tab === "overview" ? "bg-academic-blue text-white shadow-sm" : "bg-white text-ink-secondary"
          }`}
        >
          <GraduationCap size={14} /> Performance Breakdown
        </button>
        <button
          onClick={() => setTab("reval")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            tab === "reval" ? "bg-academic-blue text-white shadow-sm" : "bg-white text-ink-secondary"
          }`}
        >
          <RefreshCw size={14} /> Revaluation Requests
        </button>
        <button
          onClick={() => setTab("certificates")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            tab === "certificates" ? "bg-academic-blue text-white shadow-sm" : "bg-white text-ink-secondary"
          }`}
        >
          <Award size={14} /> Academic Certificates
        </button>
      </div>

      {items.length === 0 ? (
        <EmptyState label="No academic results published yet for this child." />
      ) : (
        <>
          {/* TAB 1: Overview and Statistics */}
          {tab === "overview" && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-card shadow-card p-5 border border-slate-100 flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-academic-blue/10 text-academic-blue flex items-center justify-center shrink-0">
                    <GraduationCap size={20} />
                  </div>
                  <div>
                    <p className="text-ink-secondary text-xs font-semibold uppercase tracking-wider">Overall score</p>
                    <p className="text-2xl font-bold font-numeric text-ink-primary mt-0.5">{overallPercentage}%</p>
                  </div>
                </div>

                <div className="bg-white rounded-card shadow-card p-5 border border-slate-100 flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-academic-gold/10 text-academic-gold flex items-center justify-center shrink-0">
                    <Award size={20} />
                  </div>
                  <div>
                    <p className="text-ink-secondary text-xs font-semibold uppercase tracking-wider">Class Rank</p>
                    <p className="text-2xl font-bold font-numeric text-ink-primary mt-0.5">#{classRank}</p>
                  </div>
                </div>

                <div className="bg-white rounded-card shadow-card p-5 border border-slate-100 flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-academic-green/10 text-academic-green flex items-center justify-center shrink-0">
                    <MessageSquare size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-ink-secondary text-xs font-semibold uppercase tracking-wider">Term remarks</p>
                    <p className="text-xs text-ink-primary mt-1 line-clamp-2 italic">"{teacherRemarks}"</p>
                  </div>
                </div>
              </div>

              {/* Subject Breakdown */}
              <Card>
                <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                  <span className="font-heading font-semibold text-sm text-ink-primary">Subject Performance Breakdown</span>
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-1 text-[11px] font-bold text-academic-blue bg-academic-blue/5 hover:bg-academic-blue/10 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <Download size={12} /> Print Report
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                        <th className="py-2.5">Subject</th>
                        <th className="py-2.5 text-center">Marks Obtained</th>
                        <th className="py-2.5 text-center">Max Marks</th>
                        <th className="py-2.5 text-center">Percentage</th>
                        <th className="py-2.5 text-right">Grade</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filtered.map(r => (
                        <tr key={r.id} className="text-ink-primary">
                          <td className="py-3 font-medium">{r.exam?.subject_name}</td>
                          <td className="py-3 text-center font-numeric font-semibold">{r.marks_obtained}</td>
                          <td className="py-3 text-center font-numeric text-slate-500">{r.exam?.max_marks}</td>
                          <td className="py-3 text-center font-numeric text-academic-blue font-semibold">{r.percentage}%</td>
                          <td className="py-3 text-right">
                            <Badge tone={r.grade_letter === "F" ? "red" : "green"}>Grade {r.grade_letter}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* TAB 2: Revaluation Requests History */}
          {tab === "reval" && (
            <Card>
              <div className="flex items-center justify-between mb-4 border-b pb-3">
                <span className="font-heading font-semibold text-sm text-ink-primary">Child Revaluation Applications</span>
              </div>
              {revals.length === 0 ? <EmptyState label="No revaluation requests filed for this child." /> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-ink-secondary border-b">
                        <th className="py-2.5">Exam Cycle</th>
                        <th className="py-2.5">Subject</th>
                        <th className="py-2.5">Original Score</th>
                        <th className="py-2.5">Application Reason</th>
                        <th className="py-2.5">Status</th>
                        <th className="py-2.5">Teacher Resolution Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {revals.map(r => (
                        <tr key={r.id}>
                          <td className="py-3 font-semibold text-ink-primary">{r.exam_name.replace(/_/g, " ")}</td>
                          <td className="py-3 font-medium text-ink-primary">{r.subject_name}</td>
                          <td className="py-3 font-bold font-numeric">{r.original_marks}</td>
                          <td className="py-3 text-xs text-ink-secondary truncate max-w-xs">{r.reason}</td>
                          <td className="py-3">
                            <Badge tone={r.status === "Completed" ? "green" : r.status === "Approved" ? "blue" : r.status === "Rejected" ? "red" : "orange"}>
                              {r.status}
                            </Badge>
                          </td>
                          <td className="py-3 text-xs italic text-ink-secondary">{r.teacher_remarks || "Awaiting review"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}

          {/* TAB 3: Academic Certificates Issued */}
          {tab === "certificates" && (
            <Card>
              <div className="flex items-center justify-between mb-4 border-b pb-3">
                <span className="font-heading font-semibold text-sm text-ink-primary">Issued Academic Document Memos</span>
              </div>
              {certs.length === 0 ? <EmptyState label="No certificates generated for this child." /> : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {certs.map(c => (
                    <div key={c.id} className="border border-slate-200 rounded-2xl p-4 bg-white hover:shadow-md transition flex items-center justify-between">
                      <div>
                        <p className="font-bold text-sm text-ink-primary">{c.certificate_type}</p>
                        <p className="text-xs text-ink-secondary">Issued: {c.issued_date}</p>
                        <span className="inline-block mt-2 font-mono text-[10px] text-academic-blue bg-blue-50 px-2 py-0.5 rounded font-semibold border border-blue-100">
                          Verification Code: {c.verification_code}
                        </span>
                      </div>
                      <button className="text-academic-blue hover:scale-115 transition-transform p-1" title="Print/Download Official Memo">
                        <Download size={20} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
}
