import { useState, useEffect } from "react";
import {
  Award,
  Printer,
  RefreshCw,
  FileText,
  CheckCircle2,
  ShieldAlert,
  Download,
  Search,
  GraduationCap,
  TrendingUp,
  Award as AwardIcon,
  BookOpen,
  AlertTriangle,
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

const TABS = [
  { key: "overview", label: "Results Overview", icon: AwardIcon },
  { key: "report", label: "Report Card", icon: FileText },
  { key: "reval", label: "Revaluation", icon: RefreshCw },
  { key: "supplementary", label: "Supplementary", icon: ShieldAlert },
  { key: "certificates", label: "Certificates", icon: Award },
];

export default function Results() {
  const [tab, setTab] = useState("overview");
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(false);

  const [results, setResults] = useState([]);
  const [revals, setRevals] = useState([]);
  const [supps, setSupps] = useState([]);
  const [certs, setCerts] = useState([]);

  const [reportCard, setReportCard] = useState(null);
  const [selectedReportCycle, setSelectedReportCycle] = useState("");
  const [loadingCard, setLoadingCard] = useState(false);

  const [revalForm, setRevalForm] = useState({ result_id: "", reason: "" });
  const [submittingReval, setSubmittingReval] = useState(false);

  const [certForm, setCertForm] = useState({ certificate_type: "", exam_name: "" });
  const [submittingCert, setSubmittingCert] = useState(false);

  const [suppForm, setSuppForm] = useState({ subject_id: "", original_exam_schedule_id: "" });
  const [submittingSupp, setSubmittingSupp] = useState(false);

  const [search, setSearch] = useState("");

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
      setToast("Error loading result data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [tab]);

  async function viewReportCard(examName) {
    setLoadingCard(true);
    setSelectedReportCycle(examName);
    try {
      const { data } = await api.get(
        `/student/report-card/?exam_name=${encodeURIComponent(examName)}`
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
      await api.post("/student/exams/revaluation/", revalForm);
      setToast("Revaluation request submitted successfully.");
      setRevalForm({ result_id: "", reason: "" });
      loadData();
    } catch (err) {
      setToast(err.response?.data?.detail || "Could not submit revaluation request.");
    } finally {
      setSubmittingReval(false);
    }
  }

  async function handleRegisterSupplementary(r) {
    setSuppForm({
      subject_id: r.exam?.subject_id || "",
      original_exam_schedule_id: r.exam?.id || "",
    });
    if (!window.confirm(`Register for supplementary exam in ${r.exam?.subject_name}?`))
      return;
    try {
      await api.post("/student/supplementary/", {
        subject_id: r.exam?.subject_id || 1,
        original_exam_schedule_id: r.exam?.id,
      });
      setToast("Registered for supplementary exam successfully.");
      loadData();
    } catch (err) {
      setToast(err.response?.data?.detail || "Supplementary registration failed.");
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
      await api.post("/student/academic-certificates/", certForm);
      setToast("Certificate request submitted successfully.");
      setCertForm({ certificate_type: "", exam_name: "" });
      loadData();
    } catch (err) {
      setToast(err.response?.data?.detail || "Certificate request failed.");
    } finally {
      setSubmittingCert(false);
    }
  }

  const examNames = [...new Set(results.map((r) => r.exam?.exam_name).filter(Boolean))];
  const failedResults = results.filter((r) => r.grade_letter === "F");

  const totalMarks = results.reduce((s, r) => s + (r.marks_obtained || 0), 0);
  const totalMaxMarks = results.reduce((s, r) => s + (r.exam?.max_marks || 0), 0);
  const avgPercentage = totalMaxMarks ? Math.round((totalMarks / totalMaxMarks) * 100) : 0;
  const bestRank = results.reduce(
    (best, r) => (r.rank_position && (!best || r.rank_position < best) ? r.rank_position : best),
    null
  );
  const passCount = results.filter((r) => r.grade_letter !== "F").length;
  const failCount = results.filter((r) => r.grade_letter === "F").length;

  const filteredResults = results.filter((r) => {
    if (search && !r.exam?.exam_name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stats = [
    { icon: FileText, label: "Total Exams", value: results.length, accent: "blue" },
    { icon: TrendingUp, label: "Total Marks", value: totalMarks, accent: "green" },
    { icon: Award, label: "Avg Percentage", value: `${avgPercentage}%`, accent: "orange" },
    { icon: AwardIcon, label: "Best Rank", value: bestRank ? `#${bestRank}` : "N/A", accent: "gold" },
    { icon: CheckCircle2, label: "Pass / Fail", value: `${passCount} / ${failCount}`, accent: "green" },
  ];

  return (
    <div className="space-y-6 animate-[fadeIn_.2s_ease]">
      <div>
        <h2 className="font-heading text-2xl font-bold text-ink-primary">My Results</h2>
        <p className="text-sm text-ink-secondary">
          View exam results, report cards, revaluation status, and certificates.
        </p>
      </div>

      {results.length > 0 && (
        <div className="grid sm:grid-cols-5 gap-4">
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

      {loading ? (
        <Loader rows={4} />
      ) : (
        <>
          {tab === "overview" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-secondary" />
                  <input
                    type="text"
                    placeholder="Search by exam name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus-ring outline-none"
                  />
                </div>
              </div>

              {filteredResults.length === 0 ? (
                <EmptyState label="No examination results published yet." />
              ) : (
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
                          <th className="py-2.5 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredResults.map((r) => {
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
                              <td className="py-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Badge tone={failed ? "red" : "green"}>
                                    {failed ? "Failed" : "Passed"}
                                  </Badge>
                                  {failed && (
                                    <button
                                      onClick={() => handleRegisterSupplementary(r)}
                                      className="bg-rose-600 hover:bg-rose-700 text-white text-[10px] px-2 py-1 rounded font-bold transition-colors"
                                    >
                                      Supplementary
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </div>
          )}

          {tab === "report" && (
            <Card>
              <SectionTitle icon={FileText}>Report Card</SectionTitle>
              <div className="flex flex-wrap gap-2 mb-4">
                {examNames.length === 0 ? (
                  <EmptyState label="No published exam cycles to load report cards." />
                ) : (
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
                    <p className="font-heading text-xl font-bold text-academic-blue">
                      EduNova Global Academy
                    </p>
                    <p className="text-sm text-ink-secondary">
                      Digital Academic Transcript —{" "}
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
                      entered — this report card isn't final yet.
                    </div>
                  )}

                  <table className="w-full text-sm mb-4">
                    <thead>
                      <tr className="text-left text-ink-secondary border-b border-slate-100">
                        <th className="py-2.5 pr-4">Subject</th>
                        <th className="py-2.5 pr-4">Marks Obtained</th>
                        <th className="py-2.5 pr-4">Max Marks</th>
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
                        Total Marks
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
                        Overall Grade
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
                      className="w-full mt-1 border rounded-xl px-3 py-2 text-sm bg-white outline-none border-slate-200 focus-ring"
                    >
                      <option value="">Select a result</option>
                      {results.map((r) => (
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
                  <EmptyState label="No revaluation requests submitted." />
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

          {tab === "supplementary" && (
            <div className="grid lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-1 h-fit">
                <SectionTitle icon={ShieldAlert}>Register Supplementary</SectionTitle>
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-800 mb-4">
                  Register for supplementary exams for any subject where you
                  received an F grade.
                </div>
                {failedResults.length === 0 ? (
                  <p className="text-xs text-ink-secondary py-4 text-center">
                    No failed subjects. All results passed!
                  </p>
                ) : (
                  <div className="space-y-2">
                    {failedResults.map((r) => (
                      <div
                        key={r.id}
                        className="p-3 border border-slate-200 rounded-xl flex items-center justify-between"
                      >
                        <div>
                          <p className="text-sm font-semibold text-ink-primary">
                            {r.exam?.subject_name}
                          </p>
                          <p className="text-[11px] text-ink-secondary">
                            {r.exam?.exam_name?.replace(/_/g, " ")} · Grade: F
                          </p>
                        </div>
                        <button
                          onClick={() => handleRegisterSupplementary(r)}
                          className="bg-rose-600 hover:bg-rose-700 text-white text-[10px] px-2.5 py-1 rounded-lg font-bold transition-colors"
                        >
                          Register
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card className="lg:col-span-2">
                <SectionTitle icon={ShieldAlert}>Supplementary Registrations</SectionTitle>
                {supps.length === 0 ? (
                  <EmptyState label="No active supplementary registrations." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-ink-secondary border-b">
                          <th className="py-2.5">Subject</th>
                          <th className="py-2.5">Original Exam</th>
                          <th className="py-2.5">Status</th>
                          <th className="py-2.5">Grade</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {supps.map((s) => (
                          <tr key={s.id}>
                            <td className="py-3 font-semibold text-ink-primary">
                              {s.subject_name}
                            </td>
                            <td className="py-3 text-ink-secondary">
                              {s.original_exam_name?.replace(/_/g, " ")}
                            </td>
                            <td className="py-3">
                              <Badge tone={s.status === "Completed" ? "green" : "orange"}>
                                {s.status}
                              </Badge>
                            </td>
                            <td className="py-3 font-bold font-mono text-ink-primary">
                              {s.grade_letter || "—"}
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
                        setCertForm({ ...certForm, certificate_type: e.target.value })
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
                      {examNames.map((name) => (
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
                  <EmptyState label="No certificates issued yet." />
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

      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}
