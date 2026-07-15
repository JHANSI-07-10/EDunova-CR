import { Award, CheckCircle2, ChevronRight, Download, FileText, Info, Loader2, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { Card, EmptyState, Loader, Toast, Badge, SectionTitle } from "../components/Common";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function Scholarships() {
  const { kids, activeChildId } = useAuth();
  
  const [scholarships, setScholarships] = useState(null);
  const [myApplications, setMyApplications] = useState([]);
  const [toast, setToast] = useState("");
  
  const activeChild = kids.find(k => String(k.id) === String(activeChildId));

  useEffect(() => {
    // Fetch available scholarship programs from public CMS endpoint
    api.get("/cms/scholarships/")
      .then(({ data }) => setScholarships(data || []))
      .catch(() => setScholarships([]));
  }, []);

  // Sync applications when active child changes
  useEffect(() => {
    if (!activeChildId) return;
    
    api.get(`/parent/scholarships/?child_id=${activeChildId}`)
      .then(({ data }) => setMyApplications(data || []))
      .catch(() => setMyApplications([]));
  }, [activeChildId]);


  // Simulated PDF download of approval letter
  const handleDownloadLetter = (app) => {
    const textContent = `
=========================================
EDUNOVA INSTITUTIONAL SCHOLARSHIP LETTER
=========================================
Date: ${new Date(app.applied_at).toLocaleDateString()}
To the Parents of: ${activeChild?.name || "Student"}

We are pleased to inform you that your application for the "${app.scheme_name}" has been approved.

Under this scholarship scheme, a tuition fee waiver of ${app.coverage_percent}% will be applied directly to the outstanding fees module.

Thank you for your academic excellence and contribution to the EduNova community.

Sincerely,
Dean of Admissions & Registrar
EduNova Group of Institutions
    `;
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${activeChild?.name || "Child"}_Scholarship_Approval_Letter.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setToast("Scholarship approval letter downloaded successfully.");
  };

  if (!activeChildId) return <EmptyState label="Please select a child to manage scholarship programs." />;
  if (!scholarships) return <Loader rows={4} />;

  return (
    <div className="space-y-6">
      
      {/* Title Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div>
          <h2 className="font-heading text-lg font-bold text-ink-primary">Scholarships & Grants</h2>
          <p className="text-xs text-ink-secondary">View active academic & need-based sponsorships for <strong>{activeChild?.name}</strong>.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* Main Programs Column */}
        <div className="lg:col-span-2 space-y-4">
          <SectionTitle>Available Programs</SectionTitle>
          
          {!scholarships.length ? (
            <EmptyState label="No scholarship schemes active right now." />
          ) : (
            <div className="space-y-4">
              {scholarships.map((p) => (
                <Card 
                  key={p.id}
                  className="border border-slate-100 p-5"
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
                      <Info size={14} className="shrink-0 mt-0.5 text-academic-green" />
                      <span><strong>Eligibility:</strong> {p.eligibility || "Open to all enrolled candidates."}</span>
                    </div>
                    
                    <button
                      disabled
                      className="shrink-0 flex items-center justify-center gap-1.5 bg-slate-100 text-slate-400 font-semibold rounded-xl px-4 py-2 shadow-sm transition-colors text-xs self-end sm:self-auto cursor-not-allowed"
                    >
                      Applications must be submitted via Student Portal
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Tracking & Applications Sidebar */}
        <div className="space-y-6">
          
          {/* Active Applications log */}
          <Card>
            <h4 className="font-heading font-semibold text-ink-primary text-sm mb-3">Active Approved Scholarships</h4>
            
            {!myApplications.length ? (
              <p className="text-xs text-ink-secondary italic text-center py-2">No active scholarships found for {activeChild?.name}.</p>
            ) : (
              <div className="space-y-3.5">
                {myApplications.map((app) => (
                  <div key={app.id} className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 flex flex-col gap-3">
                    <div className="flex justify-between items-start gap-2">
                      <p className="text-sm font-bold text-ink-primary line-clamp-1">{app.scheme_name}</p>
                      <Badge tone="green">Active</Badge>
                    </div>
                    
                    <div className="text-xs space-y-1 text-slate-600">
                       <p><strong>Approved On:</strong> {new Date(app.applied_at).toLocaleDateString()}</p>
                       <p><strong>Waiver:</strong> {app.coverage_percent}% of applicable tuition</p>
                    </div>

                    <button
                      onClick={() => handleDownloadLetter(app)}
                      className="mt-1.5 flex items-center justify-center gap-1 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg py-1.5 px-2.5 text-xs font-bold shadow-sm transition-colors w-full"
                    >
                      <Download size={14} /> Download Approval Letter
                    </button>
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
