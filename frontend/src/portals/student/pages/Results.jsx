import { Award, Printer, RefreshCw, Award as AwardIcon, FileText, CheckCircle2, ShieldAlert, Download } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge, Card, EmptyState, Loader, SectionTitle } from "../components/Common";
import api from "../lib/api";

export default function Results() {
  const [tab, setTab] = useState("overview");
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(false);

  // Lists loaded from backend
  const [results, setResults] = useState([]);
  const [revals, setRevals] = useState([]);
  const [supps, setSupps] = useState([]);
  const [certs, setCerts] = useState([]);

  // Report card states
  const [reportCard, setReportCard] = useState(null);
  const [selectedReportCycle, setSelectedReportCycle] = useState("");
  const [loadingCard, setLoadingCard] = useState(false);

  // Forms
  const [revalForm, setRevalForm] = useState({ result_id: "", reason: "" });
  const [submittingReval, setSubmittingReval] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const { data } = await api.get("/student/results/");
      setResults(data);

      const { data: revalData } = await api.get("/student/exams/revaluation/");
      setRevals(revalData);

      const { data: suppData } = await api.get("/student/supplementary/");
      setSupps(suppData);

      const { data: certData } = await api.get("/student/academic-certificates/");
      setCerts(certData);
    } catch {
      setToast("Error loading result history details.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [tab]);

  // Load report card
  async function viewReportCard(examName) {
    setLoadingCard(true);
    setSelectedReportCycle(examName);
    try {
      const { data } = await api.get(`/student/report-card/?exam_name=${encodeURIComponent(examName)}`);
      setReportCard(data);
    } catch {
      setToast("Could not load report card details.");
    } finally {
      setLoadingCard(false);
    }
  }

  // Submit revaluation request
  async function handleRevalSubmit(e) {
    e.preventDefault();
    if (!revalForm.result_id || !revalForm.reason.trim()) {
      setToast("Please select a subject result and fill revaluation reason.");
      return;
    }
    setSubmittingReval(true);
    try {
      await api.post("/student/exams/revaluation/", revalForm);
      setToast("Revaluation request submitted successfully.");
      setRevalForm({ result_id: "", reason: "" });
      loadData();
    } catch (err) {
      setToast(err.response?.data?.detail || "Could not register revaluation request.");
    } finally {
      setSubmittingReval(false);
    }
  }

  // Register supplementary exam
  async function handleRegisterSupplementary(r) {
    if (!window.confirm(`Register for supplementary exam in ${r.exam.subject_name}?`)) return;
    try {
      await api.post("/student/supplementary/", {
        subject_id: r.exam.subject_id || 1, // fallback
        original_exam_schedule_id: r.exam.id
      });
      setToast("Registered for supplementary exam successfully.");
      loadData();
    } catch (err) {
      setToast(err.response?.data?.detail || "Supplementary registration failed.");
    }
  }

  const examNames = [...new Set(results.map((r) => r.exam.exam_name))];

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex flex-wrap gap-2">
        {[
          ["overview", "Exam Grades Results", AwardIcon],
          ["report", "Report Card PDF", FileText],
          ["reval", "Revaluation Desk", RefreshCw],
          ["supplementary", "Supplementary Cycle", ShieldAlert],
          ["certificates", "Issued Memo Documents", Award]
        ].map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm ${
              tab === key
                ? "bg-academic-blue text-white shadow-md"
                : "bg-white text-ink-secondary hover:text-ink-primary hover:bg-slate-50"
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <Loader rows={4} />
      ) : (
        <>
          {/* TAB 1: Exam Grades Results */}
          {tab === "overview" && (
            <div className="space-y-6">
              {results.length === 0 ? (
                <EmptyState label="No examination results published yet." />
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {results.map((r) => {
                    const failed = r.grade_letter === "F";
                    return (
                      <Card key={r.id}>
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-heading font-bold text-ink-primary">{r.exam.exam_name.replace(/_/g, " ")}</p>
                            <p className="text-xs text-ink-secondary">{r.exam.subject_name}</p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {r.rank_position && (
                              <Badge tone="gold">
                                <span className="flex items-center gap-1"><Award size={12} /> Rank {r.rank_position}</span>
                              </Badge>
                            )}
                            {failed && (
                              <button
                                onClick={() => handleRegisterSupplementary(r)}
                                className="bg-rose-600 hover:bg-rose-700 text-white text-[10px] px-2 py-1 rounded font-bold transition-colors"
                              >
                                Register Supplementary
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-center bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                          <div>
                            <p className="font-numeric text-lg font-bold text-academic-blue">
                              {r.marks_obtained}/{r.exam.max_marks}
                            </p>
                            <p className="text-[10px] text-ink-secondary uppercase">Marks</p>
                          </div>
                          <div>
                            <p className="font-numeric text-lg font-bold text-academic-green">{r.percentage}%</p>
                            <p className="text-[10px] text-ink-secondary uppercase">Percentage</p>
                          </div>
                          <div>
                            <p className="font-numeric text-lg font-bold text-academic-orange">{r.grade_letter || "—"}</p>
                            <p className="text-[10px] text-ink-secondary uppercase">Grade</p>
                          </div>
                        </div>
                        {r.remarks && <p className="text-xs text-ink-secondary mt-3 italic">"{r.remarks}"</p>}
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Report Card PDF */}
          {tab === "report" && (
            <Card>
              <SectionTitle icon={FileText}>Select Exam Cycle Report Card</SectionTitle>
              <div className="flex flex-wrap gap-2 mb-4">
                {examNames.length === 0 ? <EmptyState label="No published exam cycles to load report cards." /> : (
                  examNames.map((name) => (
                    <button
                      key={name}
                      onClick={() => viewReportCard(name)}
                      className={`text-sm font-semibold border rounded-full px-4 py-1.5 transition-all ${
                        selectedReportCycle === name
                          ? "bg-academic-blue text-white border-academic-blue"
                          : "text-academic-blue border-academic-blue/30 hover:bg-academic-blue/5"
                      }`}
                    >
                      {name.replace(/_/g, " ")}
                    </button>
                  ))
                )}
              </div>

              {loadingCard && <Loader rows={3} />}
              {reportCard && reportCard.subjects?.length > 0 && (
                <div className="border border-slate-200 rounded-2xl p-6 mt-4 print:border-0 bg-white">
                  <div className="text-center mb-6">
                    <p className="font-heading text-xl font-bold text-academic-blue">EduNova Global Academy</p>
                    <p className="text-sm text-ink-secondary">Digital Academic Transcript — {reportCard.exam_name.replace(/_/g, " ")}</p>
                    <p className="font-bold text-ink-primary mt-2">{reportCard.student_name}</p>
                  </div>
                  {reportCard.is_complete === false && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl px-3 py-2 mb-4">
                      Only {reportCard.subjects.length} of {reportCard.expected_subject_count} subjects have marks entered so far — this report card isn't final yet.
                    </div>
                  )}
                  <table className="w-full text-sm mb-4">
                    <thead>
                      <tr className="text-left text-ink-secondary border-b border-slate-100">
                        <th className="py-2.5 pr-4">Subject Course</th>
                        <th className="py-2.5 pr-4">Marks Obtained</th>
                        <th className="py-2.5 pr-4">Maximum Marks</th>
                        <th className="py-2.5 pr-4">Letter Grade</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {reportCard.subjects.map((s, i) => (
                        <tr key={i}>
                          <td className="py-2.5 pr-4 font-semibold text-ink-primary">{s.subject_name}</td>
                          <td className="py-2.5 pr-4 font-numeric font-medium text-ink-primary">{s.marks_obtained}</td>
                          <td className="py-2.5 pr-4 font-numeric text-ink-secondary">{s.max_marks}</td>
                          <td className="py-2.5 pr-4 font-mono font-bold text-ink-primary">{s.grade_letter}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="flex items-center justify-between border-t border-slate-100 pt-4 bg-slate-50 p-4 rounded-xl">
                    <div>
                      <p className="text-[10px] text-ink-secondary uppercase">Aggregate Score</p>
                      <p className="font-bold text-lg text-ink-primary font-numeric">{reportCard.total_marks} / {reportCard.max_total}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-ink-secondary uppercase">Percentage</p>
                      <p className="font-bold text-lg text-academic-green font-numeric">{reportCard.percentage}%</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-ink-secondary uppercase">Overall CGPA Grade</p>
                      <p className="font-bold text-lg text-academic-orange font-mono">{reportCard.overall_grade}</p>
                    </div>
                  </div>
                  <button onClick={() => window.print()} className="mt-4 w-full bg-academic-green text-white rounded-xl py-2.5 font-bold flex items-center justify-center gap-2 print:hidden shadow-sm transition-all">
                    <Printer size={16} /> Print Academic Report Card
                  </button>
                </div>
              )}
            </Card>
          )}

          {/* TAB 3: Revaluation Desk */}
          {tab === "reval" && (
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Request Form */}
              <Card className="lg:col-span-1 h-fit">
                <SectionTitle icon={RefreshCw}>File Revaluation Request</SectionTitle>
                <form onSubmit={handleRevalSubmit} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold uppercase text-ink-secondary">Select Result to Review</label>
                    <select
                      required
                      value={revalForm.result_id}
                      onChange={e => setRevalForm({ ...revalForm, result_id: e.target.value })}
                      className="w-full mt-1 border rounded-xl px-3 py-2 text-sm bg-white outline-none"
                    >
                      <option value="">Select Published Grade</option>
                      {results.map(r => (
                        <option key={r.id} value={r.id}>
                          {r.exam.subject_name} — {r.exam.exam_name.replace(/_/g, " ")} ({r.marks_obtained}/{r.exam.max_marks})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-ink-secondary">Reason for Revaluation</label>
                    <textarea
                      rows={4}
                      required
                      placeholder="Type details why re-checking is requested (e.g. calculation mismatch in Section B)..."
                      value={revalForm.reason}
                      onChange={e => setRevalForm({ ...revalForm, reason: e.target.value })}
                      className="w-full mt-1 border rounded-xl px-3 py-2 text-sm outline-none resize-none"
                    />
                  </div>
                  <button disabled={submittingReval} className="w-full bg-academic-blue text-white rounded-xl py-2.5 font-bold hover:bg-academic-blue/90 shadow-sm">
                    {submittingReval ? "Submitting Request..." : "File Review Application"}
                  </button>
                </form>
              </Card>

              {/* Request History */}
              <Card className="lg:col-span-2">
                <SectionTitle icon={FileText}>Revaluation Requests History</SectionTitle>
                {revals.length === 0 ? <EmptyState label="No revaluation requests submitted." /> : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-ink-secondary border-b">
                          <th className="py-2.5">Exam Cycle</th>
                          <th className="py-2.5">Subject</th>
                          <th className="py-2.5">Reason</th>
                          <th className="py-2.5">Status</th>
                          <th className="py-2.5">Teacher Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {revals.map(r => (
                          <tr key={r.id}>
                            <td className="py-3 font-semibold text-ink-primary">{r.exam_name.replace(/_/g, " ")}</td>
                            <td className="py-3 font-medium text-ink-primary">{r.subject_name}</td>
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
            </div>
          )}

          {/* TAB 4: Supplementary Cycles */}
          {tab === "supplementary" && (
            <Card>
              <SectionTitle icon={ShieldAlert}>Supplementary Registrations &amp; Marks</SectionTitle>
              <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-800 mb-4">
                If your final result grade is recorded as F, you can instantly register for supplementary schedules by clicking the button on failed cards in Results view.
              </div>
              {supps.length === 0 ? <EmptyState label="No active supplementary registrations." /> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-ink-secondary border-b">
                        <th className="py-2.5">Subject</th>
                        <th className="py-2.5">Original Exam Cycle</th>
                        <th className="py-2.5">Registration Status</th>
                        <th className="py-2.5">Cleared Grade</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {supps.map(s => (
                        <tr key={s.id}>
                          <td className="py-3 font-semibold text-ink-primary">{s.subject_name}</td>
                          <td className="py-3 text-ink-secondary">{s.original_exam_name.replace(/_/g, " ")}</td>
                          <td className="py-3">
                            <Badge tone={s.status === "Completed" ? "green" : "orange"}>
                              {s.status}
                            </Badge>
                          </td>
                          <td className="py-3 font-bold font-mono text-ink-primary">{s.grade_letter || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}

          {/* TAB 5: Issued Academic Certificates */}
          {tab === "certificates" && (
            <Card>
              <SectionTitle icon={AwardIcon}>Digital Academic Certificates</SectionTitle>
              {certs.length === 0 ? <EmptyState label="No certificates issued to your account yet." /> : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {certs.map(c => (
                    <div key={c.id} className="border border-slate-200 rounded-2xl p-4 bg-white hover:shadow-md transition flex items-center justify-between">
                      <div>
                        <p className="font-bold text-sm text-ink-primary">{c.certificate_type}</p>
                        <p className="text-xs text-ink-secondary">Issued: {c.issued_date}</p>
                        <span className="inline-block mt-2 font-mono text-[10px] text-academic-blue bg-blue-50 px-2 py-0.5 rounded font-semibold border border-blue-100">
                          Code: {c.verification_code}
                        </span>
                      </div>
                      <button className="text-academic-blue hover:scale-115 transition-transform p-1" title="Download Official Certificate">
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

      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}
