import { Award, CheckCircle2, ChevronRight, FileText, Info, Loader2, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { Card, EmptyState, Loader, Toast, Badge } from "../components/Common";
import api from "../lib/api";
import { isNonEmptyString } from "../../../utils/validation";

export default function Scholarships() {
  const [scholarships, setScholarships] = useState(null);
  const [myApplications, setMyApplications] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [toast, setToast] = useState("");
  
  // Form states
  const [statement, setStatement] = useState("");
  const [academicDetails, setAcademicDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    // Fetch available scholarship programs from public CMS endpoint
    api.get("/cms/scholarships/")
      .then(({ data }) => setScholarships(data || []))
      .catch(() => {
        // Fallback default list if database is empty or offline
        setScholarships([
          {
            id: 1,
            name: "Academic Excellence Merit Scholarship",
            description: "Awarded to top 5% academic performers of each grade to incentivize higher learning standards.",
            eligibility: "GPA 9.2 or above / overall percentage above 90% in the last academic year.",
            coverage_percent: 50
          },
          {
            id: 2,
            name: "EduNova Financial Assistance Grant",
            description: "Need-based scholarship program aimed at supporting students from economically weaker sections.",
            eligibility: "Family annual income below specified threshold, verified by financial documentation.",
            coverage_percent: 100
          },
          {
            id: 3,
            name: "Sports & Athletics Champion Scholarship",
            description: "Encouraging young sportspersons representing the school or state in athletic events.",
            eligibility: "State or National level representation in sports in the past 2 years.",
            coverage_percent: 40
          }
        ]);
      });

    // Load user's applications from localStorage
    const saved = localStorage.getItem("edunova_scholarship_applications");
    if (saved) {
      try {
        setMyApplications(JSON.parse(saved));
      } catch (e) {
        setMyApplications([]);
      }
    } else {
      // Default seeded application state for demonstration
      const defaults = [
        {
          id: "app-1",
          programName: "Sports & Athletics Champion Scholarship",
          submittedAt: new Date(Date.now() - 86400000 * 5).toLocaleDateString(),
          status: "Under Review",
          coveragePercent: 40
        }
      ];
      setMyApplications(defaults);
      localStorage.setItem("edunova_scholarship_applications", JSON.stringify(defaults));
    }
  }, []);

  async function handleApply(e) {
    e.preventDefault();
    
    // Validations
    const errors = {};
    if (!isNonEmptyString(statement)) {
      errors.statement = "Statement of purpose cannot be empty.";
    }
    if (!isNonEmptyString(academicDetails)) {
      errors.academicDetails = "Academic qualifications/performance details are required.";
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors({});
    setSubmitting(true);

    try {
      // Send notification message to Admin (User ID 1)
      const msgText = `[Scholarship Application] Program: ${selectedProgram.name} | Coverage: ${selectedProgram.coverage_percent}% | Statement: ${statement} | Academics: ${academicDetails}`;
      await api.post("/teacher/messages/", {
        receiver: 1,
        message_text: msgText
      });

      // Update local storage tracking
      const newApp = {
        id: `app-${Date.now()}`,
        programName: selectedProgram.name,
        submittedAt: new Date().toLocaleDateString(),
        status: "Submitted - Awaiting Review",
        coveragePercent: selectedProgram.coverage_percent
      };
      
      const updatedList = [newApp, ...myApplications];
      setMyApplications(updatedList);
      localStorage.setItem("edunova_scholarship_applications", JSON.stringify(updatedList));

      setToast("Scholarship application submitted successfully!");
      setStatement("");
      setAcademicDetails("");
      setSelectedProgram(null);
    } catch (err) {
      setToast("Couldn't submit application. Please check your connection.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!scholarships) return <Loader rows={4} />;

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* Main Programs Column */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-heading font-semibold text-ink-primary text-base">Available Scholarship Programs</h3>
          
          {!scholarships.length ? (
            <EmptyState label="No scholarship schemes active right now." />
          ) : (
            <div className="space-y-4">
              {scholarships.map((p) => (
                <Card 
                  key={p.id}
                  className={`border border-slate-100 hover:border-academic-blue/40 hover:shadow-raised transition-all p-5 ${
                    selectedProgram?.id === p.id ? "ring-2 ring-academic-blue/30 bg-blue-50/5" : ""
                  }`}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1.5">
                      <h4 className="font-heading font-bold text-base text-ink-primary">{p.name}</h4>
                      <p className="text-xs text-ink-secondary leading-relaxed">{p.description}</p>
                    </div>
                    <span className="shrink-0 inline-flex items-center text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-3 py-1">
                      {p.coverage_percent}% Waiver
                    </span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-start gap-1.5 text-slate-500 max-w-md">
                      <Info size={14} className="shrink-0 mt-0.5 text-academic-blue" />
                      <span><strong>Eligibility:</strong> {p.eligibility || "Open to all candidates."}</span>
                    </div>
                    
                    <button
                      onClick={() => {
                        setSelectedProgram(p);
                        setValidationErrors({});
                      }}
                      className="shrink-0 flex items-center justify-center gap-1.5 bg-academic-blue text-white font-semibold rounded-xl px-4 py-2 hover:bg-academic-blue/90 shadow-sm transition-colors text-xs self-end sm:self-auto"
                    >
                      Apply Now <ChevronRight size={14} />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Tracking & Applications Sidebar */}
        <div className="space-y-6">
          
          {/* Active Application Modal/Box */}
          {selectedProgram ? (
            <Card className="border border-academic-blue animate-[fadeIn_.2s_ease]">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 mb-4">
                <p className="font-heading font-bold text-sm text-ink-primary">Apply: {selectedProgram.name}</p>
                <button 
                  onClick={() => setSelectedProgram(null)}
                  className="text-xs text-ink-secondary hover:text-ink-primary font-semibold"
                >
                  Cancel
                </button>
              </div>

              <form onSubmit={handleApply} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 block">Statement of Purpose:</label>
                  <textarea
                    rows={4}
                    required
                    value={statement}
                    onChange={(e) => setStatement(e.target.value)}
                    placeholder="Describe why you qualify and how this scholarship will assist you..."
                    className={`w-full rounded-xl border px-3 py-2 text-xs focus-ring outline-none resize-none ${
                      validationErrors.statement ? "border-danger" : "border-slate-200"
                    }`}
                  />
                  {validationErrors.statement && (
                    <p className="text-[10px] text-danger font-semibold">{validationErrors.statement}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 block">Academic Details / GPA / Score:</label>
                  <input
                    type="text"
                    required
                    value={academicDetails}
                    onChange={(e) => setAcademicDetails(e.target.value)}
                    placeholder="E.g., 9.4 GPA last semester, Rank #3"
                    className={`w-full rounded-xl border px-3 py-2 text-xs focus-ring outline-none ${
                      validationErrors.academicDetails ? "border-danger" : "border-slate-200"
                    }`}
                  />
                  {validationErrors.academicDetails && (
                    <p className="text-[10px] text-danger font-semibold">{validationErrors.academicDetails}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-1.5 bg-academic-blue hover:bg-academic-blue/90 disabled:opacity-60 text-white rounded-xl py-2.5 text-xs font-bold shadow-sm transition-all"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Submitting Application...
                    </>
                  ) : (
                    <>
                      <Send size={14} /> Submit Application
                    </>
                  )}
                </button>
              </form>
            </Card>
          ) : (
            <Card className="bg-slate-50 border border-dashed border-slate-200 p-6 text-center text-slate-400">
              <Award size={28} className="mx-auto mb-2 opacity-55 text-academic-blue" />
              <p className="text-xs leading-relaxed">Select a scholarship program from the list to begin your application form submission.</p>
            </Card>
          )}

          {/* Submitted Applications log */}
          <Card>
            <h4 className="font-heading font-semibold text-ink-primary text-sm mb-3">My Applications</h4>
            
            {!myApplications.length ? (
              <p className="text-xs text-ink-secondary italic text-center py-2">No applications submitted yet.</p>
            ) : (
              <div className="space-y-3.5">
                {myApplications.map((app) => (
                  <div key={app.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col gap-2">
                    <div className="flex justify-between items-start gap-2">
                      <p className="text-xs font-bold text-ink-primary line-clamp-1">{app.programName}</p>
                      <span className="shrink-0 text-[10px] text-slate-400 font-medium">{app.submittedAt}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">{app.coveragePercent}% Waiver</span>
                      <Badge tone={app.status.includes("Approved") ? "green" : app.status.includes("Rejected") ? "red" : "gold"}>
                        {app.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
          
        </div>
      </div>

      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}
