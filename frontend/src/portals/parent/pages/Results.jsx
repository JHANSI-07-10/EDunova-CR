import { useState, useEffect } from "react";
import {
  GraduationCap,
  Award,
  Download,
  RefreshCw,
  FileText,
  CheckCircle2,
  Printer,
  TrendingUp,
  Users,
  Search,
  Send,
} from "lucide-react";
import {
  Badge,
  Card,
  EmptyState,
  Loader,
  SectionTitle,
  StatCard,
  Toast,
} from "../components/Common";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

const TABS = [
  { key: "results", label: "Results", icon: GraduationCap },
  { key: "report", label: "Report Card", icon: FileText },
  { key: "reval", label: "Revaluation", icon: RefreshCw },
  { key: "certificates", label: "Certificates", icon: Award },
];

export default function Results() {
  const { activeChildId, kids } = useAuth();
  const [tab, setTab] = useState("results");
  const [toast, setToast] = useState("");

  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(activeChildId || "");
  const [results, setResults] = useState(null);
  const [revals, setRevals] = useState([]);
  const [certs, setCerts] = useState([]);
  const [reportCard, setReportCard] = useState(null);
  const [selectedReportCycle, setSelectedReportCycle] = useState("");
  const [loadingCard, setLoadingCard] = useState(false);

  const [revalForm, setRevalForm] = useState({ result_id: "", reason: "" });
  const [submittingReval, setSubmittingReval] = useState(false);

  const [certForm, setCertForm] = useState({ certificate_type: "", exam_name: "" });
  const [submittingCert, setSubmittingCert] = useState(false);

  const [cycleFilter, setCycleFilter] = useState("All");

  useEffect(() => {
    api
      .get("/parent/children/")
      .then(({ data }) => setChildren(data))
      .catch(() => setChildren([]));
  }, []);

  useEffect(() => {
    setSelectedChild(activeChildId || "");
  }, [activeChildId]);

  function loadData() {
    if (!selectedChild) return;
    setResults(null);
    api
      .get(`/parent/results/?child_id=${selectedChild}`)
      .then(({ data }) => setResults(data))
      .catch(() => setResults([]));

    if (tab === "reval") {
      api
        .get(`/parent/exams/revaluation/?child_id=${selectedChild}`)
        .then(({ data }) => setRevals(data))
        .catch(() => setRevals([]));
    }

    if (tab === "certificates") {
      api
        .get(`/parent/exams/certificates/?child_id=${selectedChild}`)
        .then(({ data }) => setCerts(data))
        .catch(() => setCerts([]));
    }
  }

  useEffect(() => {
    loadData();
  }, [selectedChild, tab]);

  const allResults = results || [];
  const selectedKid = children.find((c) => String(c.id) === String(selectedChild));

  const examCycles = [...new Set(allResults.map((r) => r.exam?.exam_name).filter(Boolean))];
  const filteredByCycle =
    cycleFilter === "All"
      ? allResults
      : allResults.filter((r) => r.exam?.exam_name === cycleFilter);

  const totalMarks = filteredByCycle.reduce((s, r) => s + (r.marks_obtained || 0), 0);
  const totalMaxMarks = filteredByCycle.reduce(
    (s, r) => s + (r.exam?.max_marks || 0),
    0
  );
  const avgPercentage = totalMaxMarks
    ? Math.round((totalMarks / totalMaxMarks) * 100)
    : 0;
  const bestRank = filteredByCycle.reduce(
    (best, r) =>
      r.rank_position && (!best || r.rank_position < best)
        ? r.rank_position
        : best,
    null
  );
  const passCount = filteredByCycle.filter((r) => r.grade_letter !== "F").length;
  const failCount = filteredByCycle.filter((r) => r.grade_letter === "F").length;

  const stats = [
    { icon: FileText, label: "Total Exams", value: filteredByCycle.length, accent: "blue" },
    { icon: TrendingUp, label: "Avg Percentage", value: `${avgPercentage}%`, accent: "green" },
    { icon: Award, label: "Best Rank", value: bestRank ? `#${bestRank}` : "N/A", accent: "gold" },
    { icon: CheckCircle2, label: "Pass / Fail", value: `${passCount} / ${failCount}`, accent: "green" },
  ];

  async function viewReportCard(examName) {
    setLoadingCard(true);
    setSelectedReportCycle(examName);
    try {
      const { data } = await api.get(
        `/parent/report-card/?child_id=${selectedChild}&exam_name=${encodeURIComponent(examName)}`
      );
      setReportCard(data);
    } catch {
      setToast("Could not load report card.");
    } finally {
      setLoadingCard(false);
    }
  }

  async function handleRevalSubmit(e) {
    e.preventDefault();
    if (!revalForm.result_id || !revalForm.reason.trim()) {
      setToast("Please select a result and provide a reason.");
      return;
    }
    setSubmittingReval(true);
    try {
      await api.post("/parent/exams/revaluation/", {
        ...revalForm,
        child_id: selectedChild,
      });
      setToast("Revaluation request submitted.");
      setRevalForm({ result_id: "", reason: "" });
      loadData();
    } catch (err) {
      setToast(err.response?.data?.detail || "Revaluation request failed.");
    } finally {
      setSubmittingReval(false);
    }
  }

  async function handleCertRequest(e) {
    e.preventDefault();
    if (!certForm.certificate_type) {
      setToast("Please select a certificate type.");
      return;
    }
    setSubmittingCert(true);
    try {
      await api.post("/parent/exams/certificates/", {
        ...certForm,
        child_id: selectedChild,
      });
      setToast("Certificate request submitted.");
      setCertForm({ certificate_type: "", exam_name: "" });
      loadData();
    } catch (err) {
      setToast(err.response?.data?.detail || "Certificate request failed.");
    } finally {
      setSubmittingCert(false);
    }
  }

  if (!activeChildId) {
    return (
      <EmptyState label="Select a child from the top bar to view results." />
    );
  }

  return (
    <div className="space-y-6 animate-[fadeIn_.2s_ease]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl font-bold text-ink-primary">
            Child's Academic Results
          </h2>
          <p className="text-sm text-ink-secondary">
            Review marks, rank positions, report cards, and academic progress.
          </p>
        </div>
        {children.length > 1 && (
          <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-100 shadow-sm">
            <Users size={14} className="text-ink-secondary" />
            <select
              value={selectedChild}
              onChange={(e) => setSelectedChild(e.target.value)}
              className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold focus-ring outline-none bg-slate-50 text-ink-primary"
            >
              {children.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name || c.name || `Child ${c.id}`}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {selectedKid && (
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-2 flex items-center gap-2 text-xs text-ink-secondary">
          <GraduationCap size={14} className="text-academic-blue" />
          <span>
            Viewing results for{" "}
            <strong className="text-ink-primary">
              {selectedKid.full_name || selectedKid.name || `Child ${selectedKid.id}`}
            </strong>
          </span>
        </div>
      )}

      {results === null ? (
        <Loader rows={4} />
      ) : (
        <>
          {allResults.length > 0 && (
            <div className="grid sm:grid-cols-4 gap-4">
              {stats.map((s) => (
                <StatCard key={s.label} {...s} />
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {TABS.map(({ key, label, icon: Icon }) => (
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

          {allResults.length === 0 ? (
            <EmptyState label="No academic results published yet for this child." />
          ) : (
            <>
              {tab === "results" && (
                <div className="space-y-4">
                  {examCycles.length > 1 && (
                    <div className="flex items-center gap-2">
                      <Search size={14} className="text-ink-secondary" />
                      <select
                        value={cycleFilter}
                        onChange={(e) => setCycleFilter(e.target.value)}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold focus-ring outline-none bg-white"
                      >
                        <option value="All">All Exam Cycles</option>
                        {examCycles.map((name) => (
                          <option key={name} value={name}>
                            {name.replace(/_/g, " ")}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <Card>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-ink-secondary text-xs uppercase tracking-wide border-b border-slate-100">
                            <th className="py-2.5">Exam</th>
                            <th className="py-2.5">Subject</th>
                            <th className="py-2.5 text-center">Marks</th>
                            <th className="py-2.5 text-center">Max</th>
                            <th className="py-2.5 text-center">Percentage</th>
                            <th className="py-2.5 text-center">Grade</th>
                            <th className="py-2.5 text-center">Rank</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredByCycle.map((r) => {
                            const failed = r.grade_letter === "F";
                            return (
                              <tr
                                key={r.id}
                                className={failed ? "bg-red-50/50" : ""}
                              >
                                <td className="py-3 font-semibold text-ink-primary">
                                  {r.exam?.exam_name?.replace(/_/g, " ")}
                                </td>
                                <td className="py-3 font-medium text-ink-primary">
                                  {r.exam?.subject_name}
                                </td>
                                <td className="py-3 text-center font-numeric font-semibold text-ink-primary">
                                  {r.marks_obtained}
                                </td>
                                <td className="py-3 text-center font-numeric text-ink-secondary">
                                  {r.exam?.max_marks}
                                </td>
                                <td className="py-3 text-center font-numeric font-semibold text-academic-blue">
                                  {r.percentage}%
                                </td>
                                <td className="py-3 text-center font-mono font-bold text-ink-primary">
                                  {r.grade_letter || "—"}
                                </td>
                                <td className="py-3 text-center font-numeric">
                                  {r.rank_position ? (
                                    <Badge tone="gold">#{r.rank_position}</Badge>
                                  ) : (
                                    <span className="text-ink-secondary">—</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </Card>

                  {filteredByCycle.length > 0 && (
                    <Card>
                      <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                        <span className="font-heading font-semibold text-sm text-ink-primary">
                          Subject Performance Breakdown
                        </span>
                        <button
                          onClick={() => window.print()}
                          className="flex items-center gap-1 text-[11px] font-bold text-academic-blue bg-academic-blue/5 hover:bg-academic-blue/10 px-3 py-1.5 rounded-lg transition-colors print:hidden"
                        >
                          <Download size={12} /> Print Report
                        </button>
                      </div>
                      <div className="grid sm:grid-cols-3 gap-3 text-center bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                        <div>
                          <p className="font-numeric text-2xl font-bold text-academic-blue">
                            {totalMarks}
                          </p>
                          <p className="text-[10px] text-ink-secondary uppercase">
                            Total Marks
                          </p>
                        </div>
                        <div>
                          <p className="font-numeric text-2xl font-bold text-academic-green">
                            {avgPercentage}%
                          </p>
                          <p className="text-[10px] text-ink-secondary uppercase">
                            Average
                          </p>
                        </div>
                        <div>
                          <p className="font-numeric text-2xl font-bold text-academic-orange">
                            #{bestRank || "N/A"}
                          </p>
                          <p className="text-[10px] text-ink-secondary uppercase">
                            Best Rank
                          </p>
                        </div>
                      </div>
                    </Card>
                  )}
                </div>
              )}

              {tab === "report" && (
                <Card>
                  <SectionTitle icon={FileText}>Report Card</SectionTitle>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {examCycles.length === 0 ? (
                      <EmptyState label="No published exam cycles." />
                    ) : (
                      examCycles.map((name) => (
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
                        <p className="font-heading text-xl font-bold text-academic-blue">
                          EduNova Global Academy
                        </p>
                        <p className="text-sm text-ink-secondary">
                          Academic Transcript —{" "}
                          {reportCard.exam_name?.replace(/_/g, " ")}
                        </p>
                        <p className="font-bold text-ink-primary mt-2">
                          {reportCard.student_name}
                        </p>
                      </div>

                      {reportCard.is_complete === false && (
                        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl px-3 py-2 mb-4">
                          Only {reportCard.subjects.length} of{" "}
                          {reportCard.expected_subject_count} subjects have marks
                          entered — not final.
                        </div>
                      )}

                      <table className="w-full text-sm mb-4">
                        <thead>
                          <tr className="text-left text-ink-secondary border-b border-slate-100">
                            <th className="py-2.5 pr-4">Subject</th>
                            <th className="py-2.5 pr-4">Marks</th>
                            <th className="py-2.5 pr-4">Max</th>
                            <th className="py-2.5 pr-4">Grade</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {reportCard.subjects.map((s, i) => (
                            <tr key={i}>
                              <td className="py-2.5 pr-4 font-semibold text-ink-primary">
                                {s.subject_name}
                              </td>
                              <td className="py-2.5 pr-4 font-numeric font-medium text-ink-primary">
                                {s.marks_obtained}
                              </td>
                              <td className="py-2.5 pr-4 font-numeric text-ink-secondary">
                                {s.max_marks}
                              </td>
                              <td className="py-2.5 pr-4 font-mono font-bold text-ink-primary">
                                {s.grade_letter}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      <div className="flex items-center justify-between border-t border-slate-100 pt-4 bg-slate-50 p-4 rounded-xl">
                        <div>
                          <p className="text-[10px] text-ink-secondary uppercase">
                            Total
                          </p>
                          <p className="font-bold text-lg text-ink-primary font-numeric">
                            {reportCard.total_marks} / {reportCard.max_total}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-ink-secondary uppercase">
                            Percentage
                          </p>
                          <p className="font-bold text-lg text-academic-green font-numeric">
                            {reportCard.percentage}%
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-ink-secondary uppercase">
                            Grade
                          </p>
                          <p className="font-bold text-lg text-academic-orange font-mono">
                            {reportCard.overall_grade}
                          </p>
                        </div>
                        {reportCard.gpa && (
                          <div>
                            <p className="text-[10px] text-ink-secondary uppercase">
                              GPA
                            </p>
                            <p className="font-bold text-lg text-academic-blue font-numeric">
                              {reportCard.gpa}
                            </p>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => window.print()}
                        className="mt-4 w-full bg-academic-green text-white rounded-xl py-2.5 font-bold flex items-center justify-center gap-2 print:hidden shadow-sm transition-all hover:bg-academic-green/90"
                      >
                        <Printer size={16} /> Print Report Card
                      </button>
                    </div>
                  )}
                </Card>
              )}

              {tab === "reval" && (
                <div className="grid lg:grid-cols-3 gap-6">
                  <Card className="lg:col-span-1 h-fit">
                    <SectionTitle icon={RefreshCw}>Request Revaluation</SectionTitle>
                    <form onSubmit={handleRevalSubmit} className="space-y-4">
                      <div>
                        <label className="text-xs font-semibold uppercase text-ink-secondary">
                          Select Result (*)
                        </label>
                        <select
                          required
                          value={revalForm.result_id}
                          onChange={(e) =>
                            setRevalForm({ ...revalForm, result_id: e.target.value })
                          }
                          className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white outline-none focus-ring"
                        >
                          <option value="">Select a result</option>
                          {allResults.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.exam?.subject_name} —{" "}
                              {r.exam?.exam_name?.replace(/_/g, " ")} (
                              {r.marks_obtained}/{r.exam?.max_marks})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold uppercase text-ink-secondary">
                          Reason (*)
                        </label>
                        <textarea
                          rows={4}
                          required
                          placeholder="Explain why revaluation is requested..."
                          value={revalForm.reason}
                          onChange={(e) =>
                            setRevalForm({ ...revalForm, reason: e.target.value })
                          }
                          className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none resize-none focus-ring"
                        />
                      </div>
                      <button
                        disabled={submittingReval}
                        className="w-full bg-academic-blue text-white rounded-xl py-2.5 font-bold hover:bg-academic-blue/90 shadow-sm disabled:opacity-60"
                      >
                        {submittingReval ? "Submitting..." : "Submit Request"}
                      </button>
                    </form>
                  </Card>

                  <Card className="lg:col-span-2">
                    <SectionTitle icon={FileText}>Revaluation History</SectionTitle>
                    {revals.length === 0 ? (
                      <EmptyState label="No revaluation requests filed for this child." />
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-ink-secondary border-b">
                              <th className="py-2.5">Exam</th>
                              <th className="py-2.5">Subject</th>
                              <th className="py-2.5">Reason</th>
                              <th className="py-2.5">Status</th>
                              <th className="py-2.5">Remarks</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {revals.map((r) => (
                              <tr key={r.id}>
                                <td className="py-3 font-semibold text-ink-primary">
                                  {r.exam_name?.replace(/_/g, " ")}
                                </td>
                                <td className="py-3 font-medium text-ink-primary">
                                  {r.subject_name}
                                </td>
                                <td className="py-3 text-xs text-ink-secondary truncate max-w-xs">
                                  {r.reason}
                                </td>
                                <td className="py-3">
                                  <Badge
                                    tone={
                                      r.status === "Completed"
                                        ? "green"
                                        : r.status === "Approved"
                                        ? "blue"
                                        : r.status === "Rejected"
                                        ? "red"
                                        : "orange"
                                    }
                                  >
                                    {r.status}
                                  </Badge>
                                </td>
                                <td className="py-3 text-xs italic text-ink-secondary">
                                  {r.teacher_remarks || "Awaiting review"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </Card>
                </div>
              )}

              {tab === "certificates" && (
                <div className="grid lg:grid-cols-3 gap-6">
                  <Card className="lg:col-span-1 h-fit">
                    <SectionTitle icon={Award}>Request Certificate</SectionTitle>
                    <form onSubmit={handleCertRequest} className="space-y-4">
                      <div>
                        <label className="text-xs font-semibold uppercase text-ink-secondary">
                          Certificate Type (*)
                        </label>
                        <select
                          required
                          value={certForm.certificate_type}
                          onChange={(e) =>
                            setCertForm({
                              ...certForm,
                              certificate_type: e.target.value,
                            })
                          }
                          className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white outline-none focus-ring"
                        >
                          <option value="">Select type</option>
                          <option value="Transcript">Academic Transcript</option>
                          <option value="Bonafide">Bonafide Certificate</option>
                          <option value="Transfer">Transfer Certificate</option>
                          <option value="Migration">Migration Certificate</option>
                          <option value="Character">Character Certificate</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold uppercase text-ink-secondary">
                          Exam Name
                        </label>
                        <select
                          value={certForm.exam_name}
                          onChange={(e) =>
                            setCertForm({ ...certForm, exam_name: e.target.value })
                          }
                          className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white outline-none focus-ring"
                        >
                          <option value="">Select exam (optional)</option>
                          {examCycles.map((name) => (
                            <option key={name} value={name}>
                              {name.replace(/_/g, " ")}
                            </option>
                          ))}
                        </select>
                      </div>
                      <button
                        disabled={submittingCert}
                        className="w-full bg-academic-blue text-white rounded-xl py-2.5 font-bold hover:bg-academic-blue/90 shadow-sm disabled:opacity-60"
                      >
                        {submittingCert ? "Requesting..." : "Request Certificate"}
                      </button>
                    </form>
                  </Card>

                  <Card className="lg:col-span-2">
                    <SectionTitle icon={Award}>Issued Certificates</SectionTitle>
                    {certs.length === 0 ? (
                      <EmptyState label="No certificates generated for this child." />
                    ) : (
                      <div className="grid sm:grid-cols-2 gap-4">
                        {certs.map((c) => (
                          <div
                            key={c.id}
                            className="border border-slate-200 rounded-2xl p-4 bg-white hover:shadow-md transition flex items-center justify-between"
                          >
                            <div>
                              <p className="font-bold text-sm text-ink-primary">
                                {c.certificate_type}
                              </p>
                              <p className="text-xs text-ink-secondary">
                                Issued: {c.issued_date}
                              </p>
                              {c.exam_name && (
                                <p className="text-[11px] text-ink-secondary mt-0.5">
                                  Exam: {c.exam_name.replace(/_/g, " ")}
                                </p>
                              )}
                              <span className="inline-block mt-2 font-mono text-[10px] text-academic-blue bg-blue-50 px-2 py-0.5 rounded font-semibold border border-blue-100">
                                Code: {c.verification_code}
                              </span>
                            </div>
                            <button
                              onClick={() =>
                                setToast(
                                  "Certificate download will be available soon."
                                )
                              }
                              className="text-academic-blue hover:scale-115 transition-transform p-1"
                              title="Download Certificate"
                            >
                              <Download size={20} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                </div>
              )}
            </>
          )}
        </>
      )}

      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}
