import { Download, Ticket, Lock, Clock, HelpCircle, Play, AlertTriangle } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { Badge, Card, EmptyState, Loader, SectionTitle } from "../components/Common";
import api from "../lib/api";

export default function Exams() {
  const [exams, setExams] = useState(null);
  const [tickets, setTickets] = useState(null);
  const [hasPendingFees, setHasPendingFees] = useState(false);
  const [feesLoading, setFeesLoading] = useState(true);

  // Timed exam attempt simulation
  const [activeAttemptExam, setActiveAttemptExam] = useState(null);

  function load() {
    api.get("/student/exams/").then(({ data }) => setExams(data)).catch(() => setExams([]));
    api.get("/student/hall-tickets/").then(({ data }) => setTickets(data)).catch(() => setTickets([]));
  }

  useEffect(() => {
    load();
    setFeesLoading(true);
    api.get("/student/fees/")
      .then(({ data }) => {
        setHasPendingFees(data.pending && data.pending.length > 0);
      })
      .catch(() => {})
      .finally(() => setFeesLoading(false));
  }, []);

  if (!exams || !tickets || feesLoading) return <Loader rows={4} />;

  return (
    <div className="space-y-6">
      <Card>
        <SectionTitle icon={Calendar}>Exam Schedule Calendar</SectionTitle>
        {exams.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-secondary text-xs uppercase tracking-wide">
                  <th className="py-2">Exam Cycle</th>
                  <th className="py-2">Subject</th>
                  <th className="py-2">Type</th>
                  <th className="py-2">Date / Time</th>
                  <th className="py-2">Duration</th>
                  <th className="py-2">Max Marks</th>
                  <th className="py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {exams.map((e) => (
                  <tr key={e.id}>
                    <td className="py-2.5 font-medium">{e.exam_name.replace(/_/g, " ")}</td>
                    <td className="py-2.5 font-semibold text-ink-primary">{e.subject_name}</td>
                    <td className="py-2.5"><Badge tone="blue">{e.exam_type}</Badge></td>
                    <td className="py-2.5 font-numeric text-xs">
                      {e.exam_date}
                      <span className="block text-[11px] text-ink-secondary">{e.start_time || "09:00"}</span>
                    </td>
                    <td className="py-2.5 text-xs text-ink-secondary">{e.duration_minutes} min</td>
                    <td className="py-2.5 font-semibold text-ink-primary">{e.max_marks}</td>
                    <td className="py-2.5 text-right">
                      <button
                        onClick={() => setActiveAttemptExam(e)}
                        className="inline-flex items-center gap-1 bg-academic-blue hover:bg-academic-blue/90 text-white text-xs px-3 py-1.5 rounded-lg font-bold transition-all shadow-sm"
                      >
                        <Play size={12} /> Attempt Exam
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState label="No examinations scheduled for your class yet." />
        )}
      </Card>

      {activeAttemptExam && (
        <AttemptExamModal
          exam={activeAttemptExam}
          onClose={() => setActiveAttemptExam(null)}
          onSubmitted={load}
        />
      )}

      <Card>
        <SectionTitle icon={Ticket}>Hall Tickets Seating Arrangement</SectionTitle>
        {hasPendingFees && (
          <div className="flex items-center gap-2.5 bg-rose-50 border border-rose-100 rounded-2xl p-4 text-sm text-rose-800 mb-4">
            <Lock size={18} className="text-rose-600 animate-pulse" />
            <p><strong>Hall Tickets Locked:</strong> You have outstanding fee balances. Please complete your fee payments to unlock hall ticket downloads.</p>
          </div>
        )}
        {tickets.length ? (
          <div className="grid sm:grid-cols-2 gap-4">
            {tickets.map((t) => (
              <div key={t.id} className="rounded-2xl border border-slate-200 p-4 flex items-center justify-between hover:shadow-md transition bg-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-academic-blue/10 text-academic-blue flex items-center justify-center">
                    <Ticket size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ink-primary">{t.exam.exam_name.replace(/_/g, " ")}</p>
                    <p className="text-xs text-ink-secondary font-numeric font-semibold">{t.ticket_number}</p>
                    <p className="text-[11px] text-slate-400 font-medium">Room: {t.exam.room_name || "Blocked/TBA"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={t.is_verified ? "green" : "gold"}>{t.is_verified ? "Verified" : "Pending"}</Badge>
                  {hasPendingFees ? (
                    <div className="flex items-center gap-1 text-danger text-[11px] font-bold bg-red-50 border border-red-100 rounded-lg px-2 py-1 shadow-sm">
                      <Lock size={10} /> Locked
                    </div>
                  ) : (
                    <button className="text-academic-blue hover:scale-110 transition-transform p-1 hover:bg-slate-50 rounded-lg" title="Download Memo / Hall Ticket">
                      <Download size={18} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState label="Hall tickets will appear here once issued by admin." />
        )}
      </Card>
    </div>
  );
}

function AttemptExamModal({ exam, onClose, onSubmitted }) {
  const [timeLeft, setTimeLeft] = useState(60);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resultSummary, setResultSummary] = useState(null);
  const [answers, setAnswers] = useState({});
  const timerRef = useRef(null);

  const questions = [
    {
      id: 1,
      question: `Q1. Which evaluation workflow parameter is calculated automatically in this subject: ${exam.subject_name}?`,
      options: ["Weighted Percentages & Grades", "Dynamic Class Rankings", "GPA / CGPA Accumulation", "All of the Above"]
    },
    {
      id: 2,
      question: "Q2. If a student receives an F grade, which workflow allows re-attempting of the subject?",
      options: ["Revaluation", "Supplementary Examination", "Marks Entry Audit", "Gate Pass Verification"]
    }
  ];

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, []);

  async function handleAutoSubmit() {
    await submitAttempt();
  }

  async function submitAttempt(e) {
    if (e) e.preventDefault();
    clearInterval(timerRef.current);
    setSaving(true);
    try {
      const { data } = await api.post("/student/exams/attempt/", {
        exam_schedule_id: exam.id,
        answers: answers
      });
      setResultSummary(data);
      setSubmitted(true);
      if (onSubmitted) onSubmitted();
    } catch {
      setSubmitted(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center pb-3 border-b mb-4">
          <h3 className="font-heading font-bold text-ink-primary">{exam.exam_name.replace(/_/g, " ")} Player</h3>
          {!submitted && (
            <div className="flex items-center gap-1.5 bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-xs font-bold border border-amber-200">
              <Clock size={14} className="animate-spin" /> {timeLeft}s remaining
            </div>
          )}
        </div>

        {!submitted ? (
          <form onSubmit={submitAttempt} className="space-y-4">
            <p className="text-xs text-ink-secondary">This examination is timed and will auto-submit when the countdown hits zero. Complete your inputs.</p>
            {questions.map((q) => (
              <div key={q.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <p className="font-semibold text-sm text-ink-primary">{q.question}</p>
                <div className="grid grid-cols-1 gap-2">
                  {q.options.map((opt) => (
                    <label key={opt} className="flex items-center gap-2.5 text-xs cursor-pointer p-3 bg-white rounded-xl border border-slate-100 hover:border-academic-blue hover:shadow-xs transition-all">
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        value={opt}
                        checked={answers[q.id] === opt}
                        onChange={() => setAnswers({ ...answers, [q.id]: opt })}
                        className="text-academic-blue focus:ring-0 w-4 h-4"
                      />
                      <span className="font-medium text-ink-primary">{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <button disabled={saving} className="w-full bg-academic-blue text-white rounded-xl py-2.5 font-bold hover:bg-academic-blue/90 transition-all shadow-sm">
              {saving ? "Submitting Attempt..." : "Submit Online Assessment"}
            </button>
          </form>
        ) : (
          <div className="text-center py-6 space-y-4">
            <div className="w-14 h-14 bg-emerald-50 text-academic-green rounded-full flex items-center justify-center mx-auto text-2xl font-bold border border-emerald-200 shadow-sm animate-bounce">
              ✓
            </div>
            <div>
              <h4 className="font-bold text-lg text-ink-primary">Assessment Submitted</h4>
              <p className="text-sm text-ink-secondary mt-1">Your online attempt has been recorded and evaluated.</p>
            </div>

            {resultSummary && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-left space-y-3">
                <span className="font-bold text-xs text-academic-blue block uppercase tracking-wide">OMR Instant Result Summary:</span>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="bg-white p-2.5 rounded-xl border">
                    <p className="text-lg font-bold text-ink-primary font-numeric">{resultSummary.marks_obtained}</p>
                    <p className="text-[10px] text-ink-secondary uppercase">Marks Scored</p>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border">
                    <p className="text-lg font-bold text-academic-green font-mono">{resultSummary.grade}</p>
                    <p className="text-[10px] text-ink-secondary uppercase">Grade Received</p>
                  </div>
                </div>
                <p className="text-xs text-ink-secondary leading-relaxed text-center">
                  Your grades have been recorded. Refresh results portal or contact subject teacher for feedback.
                </p>
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
