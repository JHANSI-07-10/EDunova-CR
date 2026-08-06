import { useState, useEffect, useRef } from "react";
import {
  Calendar,
  Clock,
  Download,
  FileText,
  Filter,
  HelpCircle,
  Lock,
  Play,
  AlertTriangle,
  CheckCircle2,
  Award,
  Monitor,
  MapPin,
  Ticket,
} from "lucide-react";
import { Badge, Card, EmptyState, Loader, SectionTitle, StatCard, Toast } from "../components/Common";
import api from "../lib/api";

const TABS = [
  { key: "schedule", label: "Exam Schedule", icon: Calendar },
  { key: "hall-tickets", label: "Hall Tickets", icon: Ticket },
  { key: "online", label: "Online Exams", icon: Monitor },
  { key: "practical", label: "Practical Exams", icon: MapPin },
];

const STATUS_BADGE = {
  Published: "green",
  Active: "green",
  Scheduled: "blue",
  Draft: "slate",
  Completed: "slate",
  Submitted: "blue",
};

const EXAM_TYPES = ["All", "Internal", "Mid-Term", "Final", "Online", "Practical"];

export default function Exams() {
  const [tab, setTab] = useState("schedule");
  const [exams, setExams] = useState(null);
  const [tickets, setTickets] = useState(null);
  const [activeAttemptExam, setActiveAttemptExam] = useState(null);
  const [toast, setToast] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");

  function load() {
    api
      .get("/student/exams/")
      .then(({ data }) => setExams(data))
      .catch(() => setExams([]));
    api
      .get("/student/hall-tickets/")
      .then(({ data }) => setTickets(data))
      .catch(() => setTickets([]));
  }

  useEffect(() => {
    load();
  }, []);

  const loading = exams === null || tickets === null;
  const allExams = exams || [];
  const allTickets = tickets || [];

  const filteredExams =
    typeFilter === "All"
      ? allExams
      : allExams.filter((e) => e.exam_type === typeFilter);

  const onlineExams = allExams.filter(
    (e) => e.exam_type === "Online" || e.is_online
  );
  const practicalExams = allExams.filter(
    (e) => e.exam_type === "Practical" || e.is_practical
  );

  const now = new Date();
  const upcomingExams = allExams.filter((e) => new Date(e.exam_date) >= now);
  const ticketsAvailable = allTickets.filter((t) => t.is_verified);

  const stats = [
    { icon: Calendar, label: "Total Scheduled", value: allExams.length, accent: "blue" },
    { icon: Ticket, label: "Hall Tickets", value: ticketsAvailable.length, accent: "green" },
    { icon: Clock, label: "Upcoming", value: upcomingExams.length, accent: "orange" },
  ];

  if (loading) return <Loader rows={4} />;

  return (
    <div className="space-y-6 animate-[fadeIn_.2s_ease]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl font-bold text-ink-primary">
            My Examinations
          </h2>
          <p className="text-sm text-ink-secondary">
            View exam schedules, download hall tickets, and attempt online exams.
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

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

      {tab === "schedule" && (
        <ExamScheduleTab
          exams={filteredExams}
          typeFilter={typeFilter}
          onTypeFilter={setTypeFilter}
        />
      )}

      {tab === "hall-tickets" && (
        <HallTicketsTab
          tickets={allTickets}
          onToast={(m) => setToast(m)}
        />
      )}

      {tab === "online" && (
        <OnlineExamTab
          exams={onlineExams}
          onStartExam={(e) => setActiveAttemptExam(e)}
        />
      )}

      {tab === "practical" && <PracticalExamTab exams={practicalExams} />}

      {activeAttemptExam && (
        <AttemptExamModal
          exam={activeAttemptExam}
          onClose={() => setActiveAttemptExam(null)}
          onSubmitted={() => {
            setToast("Online exam submitted successfully.");
            load();
          }}
        />
      )}

      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}

function ExamScheduleTab({ exams, typeFilter, onTypeFilter }) {
  const grouped = exams.reduce((acc, exam) => {
    const key = exam.exam_date || "Unknown";
    if (!acc[key]) acc[key] = [];
    acc[key].push(exam);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort(
    (a, b) => new Date(a) - new Date(b)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SectionTitle icon={Calendar}>Exam Schedule</SectionTitle>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-ink-secondary" />
          <select
            value={typeFilter}
            onChange={(e) => onTypeFilter(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold focus-ring outline-none bg-white"
          >
            {EXAM_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {exams.length === 0 ? (
        <EmptyState label="No examinations scheduled for your class yet." />
      ) : (
        <div className="space-y-6">
          {sortedDates.map((date) => (
            <div key={date}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-academic-blue/10 text-academic-blue flex items-center justify-center">
                  <Calendar size={18} />
                </div>
                <div>
                  <p className="font-heading font-bold text-ink-primary text-sm">
                    {new Date(date).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                  <p className="text-[11px] text-ink-secondary">
                    {grouped[date].length} exam{grouped[date].length !== 1 ? "s" : ""}{" "}
                    scheduled
                  </p>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-3 ml-[3.25rem]">
                {grouped[date].map((exam) => (
                  <div
                    key={exam.id}
                    className="border border-slate-200 rounded-xl p-4 hover:shadow-md transition bg-white"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-heading font-semibold text-sm text-ink-primary">
                          {exam.exam_name?.replace(/_/g, " ")}
                        </p>
                        <p className="text-xs text-academic-blue font-semibold mt-0.5">
                          {exam.subject_name}
                        </p>
                      </div>
                      <Badge tone={STATUS_BADGE[exam.status] || "slate"}>
                        {exam.status || "Scheduled"}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-ink-secondary mt-3">
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} />
                        <span>
                          {exam.start_time || "09:00"} · {exam.duration_minutes} min
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <FileText size={12} />
                        <span>Max: {exam.max_marks} marks</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <Badge tone="blue">{exam.exam_type}</Badge>
                      {exam.room_name && (
                        <span className="text-[11px] text-ink-secondary flex items-center gap-1">
                          <MapPin size={10} /> {exam.room_name}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function HallTicketsTab({ tickets, onToast }) {
  const [hasPendingFees, setHasPendingFees] = useState(false);
  const [feesLoading, setFeesLoading] = useState(true);

  useEffect(() => {
    setFeesLoading(true);
    api
      .get("/student/fees/")
      .then(({ data }) => {
        setHasPendingFees(data.pending && data.pending.length > 0);
      })
      .catch(() => {})
      .finally(() => setFeesLoading(false));
  }, []);

  if (feesLoading) return <Loader rows={2} />;

  return (
    <div className="space-y-4">
      <SectionTitle icon={Ticket}>Hall Tickets</SectionTitle>

      {hasPendingFees && (
        <div className="flex items-center gap-2.5 bg-rose-50 border border-rose-100 rounded-xl p-4 text-sm text-rose-800">
          <Lock size={18} className="text-rose-600 animate-pulse" />
          <p>
            <strong>Hall Tickets Locked:</strong> You have outstanding fee
            balances. Please complete your fee payments to unlock hall ticket
            downloads.
          </p>
        </div>
      )}

      {tickets.length === 0 ? (
        <EmptyState label="Hall tickets will appear here once issued by admin." />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {tickets.map((t) => (
            <div
              key={t.id}
              className="border border-slate-200 rounded-xl p-4 flex items-center justify-between hover:shadow-md transition bg-white"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-academic-blue/10 text-academic-blue flex items-center justify-center">
                  <Ticket size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink-primary">
                    {t.exam?.exam_name?.replace(/_/g, " ") || "Exam"}
                  </p>
                  <p className="text-xs text-ink-secondary">
                    {t.exam?.subject_name || ""}
                  </p>
                  <p className="text-xs text-ink-secondary font-numeric font-semibold">
                    {t.ticket_number}
                  </p>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Date: {t.exam?.exam_date || "TBA"} · Room:{" "}
                    {t.exam?.room_name || "TBA"}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge tone={t.is_verified ? "green" : "gold"}>
                  {t.is_verified ? "Verified" : "Pending"}
                </Badge>
                {t.fee_cleared !== undefined && (
                  <Badge tone={t.fee_cleared ? "green" : "red"}>
                    {t.fee_cleared ? "Fees Cleared" : "Fees Pending"}
                  </Badge>
                )}
                {t.attendance_ok !== undefined && (
                  <Badge tone={t.attendance_ok ? "green" : "orange"}>
                    {t.attendance_ok ? "Attendance OK" : "Attendance Issue"}
                  </Badge>
                )}
                {hasPendingFees ? (
                  <div className="flex items-center gap-1 text-danger text-[11px] font-bold bg-red-50 border border-red-100 rounded-lg px-2 py-1">
                    <Lock size={10} /> Locked
                  </div>
                ) : (
                  <button
                    onClick={() =>
                      onToast("Hall ticket download will be available soon.")
                    }
                    className="text-academic-blue hover:scale-110 transition-transform p-1 hover:bg-slate-50 rounded-lg"
                    title="Download Hall Ticket"
                  >
                    <Download size={18} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function OnlineExamTab({ exams, onStartExam }) {
  return (
    <div className="space-y-4">
      <SectionTitle icon={Monitor}>Online Examinations</SectionTitle>

      {exams.length === 0 ? (
        <EmptyState label="No online exams available for your class." />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {exams.map((exam) => (
            <div
              key={exam.id}
              className="border border-slate-200 rounded-xl p-5 hover:shadow-md transition bg-white"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-heading font-semibold text-ink-primary">
                    {exam.exam_name?.replace(/_/g, " ")}
                  </p>
                  <p className="text-xs text-academic-blue font-semibold mt-0.5">
                    {exam.subject_name}
                  </p>
                </div>
                <Badge tone={STATUS_BADGE[exam.status] || "blue"}>
                  {exam.status || "Available"}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-ink-secondary mb-4">
                <div className="flex items-center gap-1.5">
                  <Clock size={12} />
                  <span>{exam.duration_minutes} min</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <FileText size={12} />
                  <span>{exam.max_marks} marks</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar size={12} />
                  <span>{exam.exam_date}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <HelpCircle size={12} />
                  <span>{exam.question_count || "MCQ"} questions</span>
                </div>
              </div>
              <button
                onClick={() => onStartExam(exam)}
                className="w-full flex items-center justify-center gap-2 bg-academic-blue hover:bg-academic-blue/90 text-white text-sm px-4 py-2.5 rounded-xl font-bold transition-all shadow-sm"
              >
                <Play size={14} /> Start Exam
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PracticalExamTab({ exams }) {
  return (
    <div className="space-y-4">
      <SectionTitle icon={MapPin}>Practical Examinations</SectionTitle>

      {exams.length === 0 ? (
        <EmptyState label="No practical exams scheduled for your class." />
      ) : (
        <div className="space-y-3">
          {exams.map((exam) => (
            <div
              key={exam.id}
              className="border border-slate-200 rounded-xl p-4 flex items-center justify-between hover:shadow-md transition bg-white"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-academic-orange/10 text-academic-orange flex items-center justify-center">
                  <MapPin size={18} />
                </div>
                <div>
                  <p className="font-heading font-semibold text-sm text-ink-primary">
                    {exam.exam_name?.replace(/_/g, " ")}
                  </p>
                  <p className="text-xs text-academic-blue font-semibold">
                    {exam.subject_name}
                  </p>
                  <p className="text-xs text-ink-secondary mt-0.5">
                    {exam.exam_date} · {exam.start_time || "09:00"} ·{" "}
                    {exam.duration_minutes} min
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-xs text-ink-secondary">Lab / Room</p>
                  <p className="text-sm font-semibold text-ink-primary">
                    {exam.room_name || "TBA"}
                  </p>
                </div>
                <Badge tone={STATUS_BADGE[exam.status] || "blue"}>
                  {exam.status || "Scheduled"}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AttemptExamModal({ exam, onClose, onSubmitted }) {
  const durationSeconds = (exam.duration_minutes || 1) * 60;
  const [timeLeft, setTimeLeft] = useState(durationSeconds);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resultSummary, setResultSummary] = useState(null);
  const [answers, setAnswers] = useState({});
  const timerRef = useRef(null);

  const questions = [
    {
      id: 1,
      question: `Q1. Which evaluation workflow parameter is calculated automatically in this subject: ${exam.subject_name}?`,
      options: [
        "Weighted Percentages & Grades",
        "Dynamic Class Rankings",
        "GPA / CGPA Accumulation",
        "All of the Above",
      ],
    },
    {
      id: 2,
      question:
        "Q2. If a student receives an F grade, which workflow allows re-attempting of the subject?",
      options: [
        "Revaluation",
        "Supplementary Examination",
        "Marks Entry Audit",
        "Gate Pass Verification",
      ],
    },
    {
      id: 3,
      question:
        "Q3. What is the primary purpose of the examination scheduling system?",
      options: [
        "Automated grading",
        "Conflict-free exam timetabling",
        "Student attendance tracking",
        "Library book management",
      ],
    },
    {
      id: 4,
      question:
        "Q4. Which certificate is issued after passing all required examinations?",
      options: [
        "Transfer Certificate",
        "Academic Transcript",
        "Migration Certificate",
        "Bonafide Certificate",
      ],
    },
    {
      id: 5,
      question: "Q5. What does the GPA scale typically range from?",
      options: [
        "0 to 10",
        "1 to 100",
        "A to F only",
        "0 to 4 or 0 to 10",
      ],
    },
  ];

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          submitAttempt();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  async function submitAttempt(e) {
    if (e) e.preventDefault();
    clearInterval(timerRef.current);
    setSaving(true);
    try {
      const { data } = await api.post("/student/exams/attempt/", {
        exam_schedule_id: exam.id,
        answers,
      });
      setResultSummary(data);
      setSubmitted(true);
      if (onSubmitted) onSubmitted();
    } catch {
      setSubmitted(true);
      setResultSummary(null);
    } finally {
      setSaving(false);
    }
  }

  const answeredCount = Object.keys(answers).length;
  const progress = Math.round((answeredCount / questions.length) * 100);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center pb-3 border-b mb-4">
          <h3 className="font-heading font-bold text-ink-primary text-sm">
            {exam.exam_name?.replace(/_/g, " ")}
          </h3>
          {!submitted && (
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                timeLeft < 60
                  ? "bg-red-50 text-red-700 border-red-200 animate-pulse"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }`}
            >
              <Clock size={14} />
              {formatTime(timeLeft)} remaining
            </div>
          )}
        </div>

        {!submitted ? (
          <form onSubmit={submitAttempt} className="space-y-4">
            <div className="flex items-center justify-between text-xs text-ink-secondary">
              <span>
                Question {answeredCount}/{questions.length} answered
              </span>
              <span>{progress}% complete</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5">
              <div
                className="bg-academic-blue h-1.5 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>

            <p className="text-xs text-ink-secondary">
              This examination is timed and will auto-submit when the countdown
              hits zero.
            </p>

            {questions.map((q) => (
              <div
                key={q.id}
                className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3"
              >
                <p className="font-semibold text-sm text-ink-primary">
                  {q.question}
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {q.options.map((opt) => (
                    <label
                      key={opt}
                      className={`flex items-center gap-2.5 text-xs cursor-pointer p-3 rounded-xl border transition-all ${
                        answers[q.id] === opt
                          ? "bg-academic-blue/5 border-academic-blue shadow-xs"
                          : "bg-white border-slate-100 hover:border-academic-blue hover:shadow-xs"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        value={opt}
                        checked={answers[q.id] === opt}
                        onChange={() =>
                          setAnswers({ ...answers, [q.id]: opt })
                        }
                        className="text-academic-blue focus:ring-0 w-4 h-4"
                      />
                      <span className="font-medium text-ink-primary">
                        {opt}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}

            <button
              disabled={saving}
              className="w-full bg-academic-blue text-white rounded-xl py-2.5 font-bold hover:bg-academic-blue/90 transition-all shadow-sm disabled:opacity-60"
            >
              {saving ? "Submitting Attempt..." : "Submit Online Assessment"}
            </button>
          </form>
        ) : (
          <div className="text-center py-6 space-y-4">
            <div className="w-14 h-14 bg-emerald-50 text-academic-green rounded-full flex items-center justify-center mx-auto text-2xl font-bold border border-emerald-200 shadow-sm animate-bounce">
              ✓
            </div>
            <div>
              <h4 className="font-bold text-lg text-ink-primary">
                Assessment Submitted
              </h4>
              <p className="text-sm text-ink-secondary mt-1">
                Your online attempt has been recorded and evaluated.
              </p>
            </div>

            {resultSummary && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-left space-y-3">
                <span className="font-bold text-xs text-academic-blue block uppercase tracking-wide">
                  Result Summary
                </span>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-white p-2.5 rounded-xl border">
                    <p className="text-lg font-bold text-ink-primary font-numeric">
                      {resultSummary.marks_obtained ?? "—"}
                    </p>
                    <p className="text-[10px] text-ink-secondary uppercase">
                      Marks Scored
                    </p>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border">
                    <p className="text-lg font-bold text-academic-green font-mono">
                      {resultSummary.grade || "—"}
                    </p>
                    <p className="text-[10px] text-ink-secondary uppercase">
                      Grade
                    </p>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border">
                    <p
                      className={`text-lg font-bold font-numeric ${
                        resultSummary.passed
                          ? "text-academic-green"
                          : "text-danger"
                      }`}
                    >
                      {resultSummary.passed ? "Pass" : "Fail"}
                    </p>
                    <p className="text-[10px] text-ink-secondary uppercase">
                      Status
                    </p>
                  </div>
                </div>
                {resultSummary.percentage !== undefined && (
                  <div className="text-center">
                    <p className="text-xs text-ink-secondary">
                      Percentage:{" "}
                      <span className="font-bold text-ink-primary">
                        {resultSummary.percentage}%
                      </span>
                    </p>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={onClose}
              className="bg-slate-100 hover:bg-slate-200 text-ink-primary text-xs font-semibold py-2 px-5 rounded-xl mt-2 transition-colors"
            >
              Close Assessment
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
