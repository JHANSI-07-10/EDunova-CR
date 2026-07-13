import { Download, Ticket, Lock, Clock, HelpCircle, Play } from "lucide-react";
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

  useEffect(() => {
    api.get("/student/exams/").then(({ data }) => setExams(data)).catch(() => setExams([]));
    api.get("/student/hall-tickets/").then(({ data }) => setTickets(data)).catch(() => setTickets([]));
    
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
        <SectionTitle>Exam schedule</SectionTitle>
        {exams.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-secondary text-xs uppercase tracking-wide">
                  <th className="py-2">Exam</th>
                  <th className="py-2">Subject</th>
                  <th className="py-2">Type</th>
                  <th className="py-2">Date</th>
                  <th className="py-2">Duration</th>
                  <th className="py-2">Max marks</th>
                  <th className="py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {exams.map((e) => (
                  <tr key={e.id}>
                    <td className="py-2.5 font-medium">{e.exam_name}</td>
                    <td className="py-2.5">{e.subject_name}</td>
                    <td className="py-2.5"><Badge tone="blue">{e.exam_type}</Badge></td>
                    <td className="py-2.5">{e.exam_date}</td>
                    <td className="py-2.5">{e.duration_minutes} min</td>
                    <td className="py-2.5">{e.max_marks}</td>
                    <td className="py-2.5 text-right">
                      <button
                        onClick={() => setActiveAttemptExam(e)}
                        className="inline-flex items-center gap-1 bg-academic-blue hover:bg-academic-blue/90 text-white text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
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
          <EmptyState label="No exams scheduled for your class yet." />
        )}
      </Card>

      {activeAttemptExam && (
        <AttemptExamModal
          exam={activeAttemptExam}
          onClose={() => setActiveAttemptExam(null)}
        />
      )}

      <Card>
        <SectionTitle>Hall tickets</SectionTitle>
        {tickets.length ? (
          <div className="grid sm:grid-cols-2 gap-3">
            {tickets.map((t) => (
              <div key={t.id} className="rounded-xl border border-slate-200 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-academic-blue/10 text-academic-blue flex items-center justify-center">
                    <Ticket size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t.exam.exam_name}</p>
                    <p className="text-xs text-ink-secondary font-numeric">{t.ticket_number}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={t.is_verified ? "green" : "gold"}>{t.is_verified ? "Verified" : "Pending"}</Badge>
                  {hasPendingFees ? (
                    <div className="flex items-center gap-1 text-danger text-[11px] font-semibold bg-red-50 border border-red-100 rounded-lg px-2 py-1">
                      <Lock size={10} /> Locked
                    </div>
                  ) : (
                    <button className="text-academic-blue" title="Download">
                      <Download size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState label="Hall tickets will appear here once issued." />
        )}
      </Card>
    </div>
  );
}

function AttemptExamModal({ exam, onClose }) {
  const [timeLeft, setTimeLeft] = useState(30);
  const [submitted, setSubmitted] = useState(false);
  const [simulationPublished, setSimulationPublished] = useState(false);
  const [answers, setAnswers] = useState({});
  const timerRef = useRef(null);

  const questions = [
    {
      id: 1,
      question: `Q1. Which of the following is evaluated in this exam module for ${exam.subject_name}?`,
      options: ["Core Syllabus Concept", "General Aptitude", "Practical Analytics", "All of the Above"]
    },
    {
      id: 2,
      question: "Q2. In school management workflows, what is the default status of an exam schedule?",
      options: ["Draft", "Submitted", "Published", "Returned"]
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

  function handleAutoSubmit() {
    setSubmitted(true);
  }

  function handleSubmit(e) {
    if (e) e.preventDefault();
    clearInterval(timerRef.current);
    setSubmitted(true);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-card w-full max-w-lg p-6 shadow-raised max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center pb-3 border-b mb-4">
          <h3 className="font-heading font-bold text-primary">{exam.exam_name} Online Exam</h3>
          {!submitted && (
            <div className="flex items-center gap-1.5 bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-xs font-bold border border-amber-200">
              <Clock size={14} className="animate-spin" /> {timeLeft}s remaining
            </div>
          )}
        </div>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-xs text-ink-secondary">This exam is timed and will auto-submit when the countdown hits zero.</p>
            {questions.map((q) => (
              <div key={q.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <p className="font-medium text-sm text-ink-primary">{q.question}</p>
                <div className="grid grid-cols-2 gap-2">
                  {q.options.map((opt) => (
                    <label key={opt} className="flex items-center gap-2 text-xs cursor-pointer p-2 bg-white rounded-lg border border-slate-100 hover:border-academic-blue transition-colors">
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        value={opt}
                        checked={answers[q.id] === opt}
                        onChange={() => setAnswers({ ...answers, [q.id]: opt })}
                        className="text-academic-blue focus:ring-0"
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <button className="w-full bg-academic-blue text-white rounded-xl py-2.5 font-medium hover:bg-academic-blue/90 transition-colors">
              Submit Exam
            </button>
          </form>
        ) : (
          <div className="text-center py-6 space-y-4">
            <div className="w-12 h-12 bg-emerald-50 text-academic-green rounded-full flex items-center justify-center mx-auto text-xl font-bold border border-emerald-200 shadow-sm animate-pulse">
              ✓
            </div>
            <div>
              <h4 className="font-bold text-lg text-ink-primary">Exam Successfully Submitted</h4>
              <p className="text-sm text-ink-secondary mt-1">Your online attempt has been recorded.</p>
            </div>

            {/* Decision Logic Branch Simulator */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-left space-y-3">
              <span className="font-bold text-xs text-academic-blue block uppercase tracking-wide">Flowchart Branch Simulator:</span>
              <div className="flex gap-2 p-1 bg-slate-200/50 rounded-xl">
                <button
                  onClick={() => setSimulationPublished(false)}
                  className={`flex-1 text-xs py-1.5 font-semibold rounded-lg transition-all ${!simulationPublished ? 'bg-white text-ink-primary shadow-sm' : 'text-slate-500'}`}
                >
                  Awaiting Evaluation
                </button>
                <button
                  onClick={() => setSimulationPublished(true)}
                  className={`flex-1 text-xs py-1.5 font-semibold rounded-lg transition-all ${simulationPublished ? 'bg-white text-ink-primary shadow-sm' : 'text-slate-500'}`}
                >
                  Result Published
                </button>
              </div>

              {!simulationPublished ? (
                <div className="space-y-3">
                  <p className="text-xs text-ink-secondary leading-relaxed">
                    <strong>Branch Node:</strong> Awaiting Evaluation (OMR / Manual). The exam is pending teacher grading.
                  </p>
                  <a
                    href="/student/lms"
                    className="w-full flex items-center justify-center gap-1.5 bg-academic-blue text-white text-xs font-semibold py-2 rounded-xl text-center"
                  >
                    Access LMS (Videos, Notes, Quiz, AI Tutor)
                  </a>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-ink-secondary leading-relaxed">
                    <strong>Branch Node:</strong> Result Published. The grades have been finalized and published.
                  </p>
                  <a
                    href="/student/results"
                    className="w-full flex items-center justify-center gap-1.5 bg-academic-green text-white text-xs font-semibold py-2 rounded-xl text-center"
                  >
                    View Result, Rank List &amp; Download Report Card
                  </a>
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="text-xs text-slate-500 hover:underline"
            >
              Close Simulator
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
