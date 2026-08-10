import { useState } from "react";
import { Download, FileText, Calendar, ShieldCheck, ClipboardList, Info } from "lucide-react";
import { Card, Badge, Toast } from "../../shared/components/Common";

const STUDENT_DOWNLOADS = [
  {
    id: "syllabus",
    title: "Academic Syllabus",
    filename: "edunova-academic-syllabus.txt",
    desc: "Detailed syllabus for all subjects of the current academic year, class grading metrics, and learning path benchmarks.",
    type: "TXT",
    icon: FileText,
    tone: "blue",
    content: `EduNova Global Academy — Academic Syllabus
==========================================
Class Curriculum Overview:
- Mathematics: Algebra, Geometry, Statistics, and Calculus foundation
- Science: Physics (Mechanics), Chemistry (Organic), Biology (Cellular Systems)
- English: Literature, Creative Writing, Grammatical Analysis
- Social Studies: World History, Geography, Civics
- Electives: Introduction to Computer Science, STEM Lab, and Robotics

Grading Metrics:
- Homework: 20%
- Assignments: 25%
- Unit Tests: 15%
- Mid-Term Exams: 20%
- Final Examinations: 20%`
  },
  {
    id: "exam_rules",
    title: "Exam Guidelines & Guidelines",
    filename: "edunova-exam-guidelines.txt",
    desc: "Strict protocol for examination halls, digital exam portals, hall ticket rules, OMR evaluations, and reporting formats.",
    type: "TXT",
    icon: ClipboardList,
    tone: "orange",
    content: `EduNova Global Academy — Exam Hall Guidelines
==============================================
General Instructions:
1. Hall tickets must be kept visible on desks at all times.
2. Students must report to the exam hall 20 minutes before the scheduled time.
3. No mobile phones, smartwatches, or unauthorized calculators are allowed inside the examination hall.

Offline (OMR) Examinations:
- Only blue or black ballpoint pens can be used to bubble responses on the OMR sheet.
- Scratching, erasure, or multiple bubbled options will result in zero marks for that question.

Online Examinations:
- Secure browser lock mechanism will be active during LMS quizzes.
- Navigating away from the active tab will auto-submit the exam after 2 warning alerts.`
  },
  {
    id: "calendar",
    title: "Academic & Holiday Calendar",
    filename: "edunova-academic-calendar.txt",
    desc: "Complete schedule of academic terms, examination windows, sports day, national holidays, and PTM schedules.",
    type: "TXT",
    icon: Calendar,
    tone: "green",
    content: `EduNova Global Academy — Academic Calendar
=============================================
Term Dates:
- Term 1: July 1, 2026 to October 31, 2026
- Term 2: November 10, 2026 to March 30, 2027

Key Events:
- Sports & Athletics Meet: October 15-17, 2026
- Science & Innovation Fair: December 10, 2026
- Parent-Teacher Meetings (PTM): Last Saturday of every month

Holidays & Vacations:
- Summer Break: May 1 to June 30, 2026
- Winter Break: December 24 to January 2, 2027`
  },
  {
    id: "conduct",
    title: "Student Code of Conduct",
    filename: "edunova-code-of-conduct.txt",
    desc: "School ethics guidelines, uniform regulations, attendance requirements, and policies on campus behavior.",
    type: "TXT",
    icon: ShieldCheck,
    tone: "gold",
    content: `EduNova Global Academy — Code of Conduct
==========================================
Attendance Policy:
- Minimum of 75% attendance is required to qualify for terminal and final examinations.
- Leave requests must be submitted through the parent/student portal in advance.

Dress Code:
- Students must attend the campus in clean, prescribed school uniforms.
- Sports attire is mandatory on designated physical education days.

Behavioral Guidelines:
- Treat all faculty, peers, and campus staff with utmost respect.
- EduNova operates a zero-tolerance policy towards bullying, harassment, or vandalism of school property.`
  },
  {
    id: "lab_manuals",
    title: "Lab Safety & STEM Protocols",
    filename: "edunova-lab-safety.txt",
    desc: "Essential safety steps, material handling protocols, and rules for science labs, computer labs, and robotics hubs.",
    type: "TXT",
    icon: Info,
    tone: "slate",
    content: `EduNova Global Academy — Lab Safety & STEM Rules
==================================================
Laboratory Conduct:
1. Always wear safety goggles and lab coats during chemistry and biology experiment sessions.
2. Do not touch or mix chemical substances without the explicit instructions of the lab instructor.
3. Clean all equipment and desks before leaving the lab.

Robotics & Digital Labs:
- Handle microcontrollers, sensors, and structural items with appropriate ESD care.
- Do not install third-party software on school workstation systems.
- Report any hardware defect or electrical fault immediately to the lab assistant.`
  }
];

export default function Downloads() {
  const [toast, setToast] = useState("");

  const downloadFile = (item) => {
    try {
      const blob = new Blob([item.content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = item.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
      setToast(`Downloaded ${item.title} successfully!`);
    } catch {
      setToast("Failed to initiate download.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-ink-primary">Student Downloads</h1>
        <p className="text-sm text-ink-secondary mt-1">
          Access important academic materials, handbooks, guidelines, and resource files.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {STUDENT_DOWNLOADS.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.id} className="flex flex-col justify-between h-full">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-academic-blue/10 text-academic-blue`}>
                  <Icon size={22} />
                </div>
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading font-semibold text-base text-ink-primary truncate">
                      {item.title}
                    </h3>
                    <Badge tone={item.tone}>{item.type}</Badge>
                  </div>
                  <p className="text-sm text-ink-secondary leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-ink-secondary font-mono">{item.filename}</span>
                <button
                  type="button"
                  onClick={() => downloadFile(item)}
                  className="inline-flex items-center gap-1.5 bg-academic-blue hover:bg-academic-blue/90 text-white rounded-xl px-4 py-2 text-xs font-semibold shadow-sm transition-colors"
                >
                  <Download size={14} /> Download
                </button>
              </div>
            </Card>
          );
        })}
      </div>

      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}
