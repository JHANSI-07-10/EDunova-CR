import React, { useState, useEffect } from "react";
import api from "../lib/api";
import { Card, Loader, SectionTitle, Toast, EmptyState, Badge, Button } from "../components/Common";
import { Search, Calendar, Briefcase, FileText, CheckCircle, XCircle } from "lucide-react";

export default function Recruitment() {
  const [activeTab, setActiveTab] = useState("applications");
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [toast, setToast] = useState("");

  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  const [interviewForm, setInterviewForm] = useState({ interview_date: "", interviewer_name: "", location_or_link: "" });

  const load = async () => {
    setLoading(true);
    try {
      if (activeTab === "applications") {
        const { data } = await api.get("/admin-portal/recruitment/");
        setApplications(data);
      } else {
        const { data } = await api.get("/admin-portal/interviews/");
        setInterviews(data);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [activeTab]);

  const updateAppStatus = async (id, status) => {
    try {
      await api.patch("/admin-portal/recruitment/", { id, status });
      setToast(`Application marked as ${status}`);
      load();
    } catch (err) {
      setToast("Failed to update status");
    }
  };

  const scheduleInterview = async (e) => {
    e.preventDefault();
    try {
      await api.post("/admin-portal/interviews/", { ...interviewForm, application_id: selectedApp.id });
      setToast("Interview scheduled");
      setShowInterviewModal(false);
      load();
    } catch (err) {
      setToast("Failed to schedule");
    }
  };

  const updateInterview = async (id, status, feedback = "") => {
    try {
      await api.patch("/admin-portal/interviews/", { id, status, feedback });
      setToast(`Interview marked as ${status}`);
      load();
    } catch (err) {
      setToast("Failed to update interview");
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
      <div className="flex justify-between items-center">
        <SectionTitle title="Recruitment" icon={<Briefcase />} />
        <div className="flex gap-2 bg-white rounded-lg p-1 shadow-sm border border-gray-100">
          <button
            onClick={() => setActiveTab("applications")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === "applications" ? "bg-accent text-white" : "text-gray-500 hover:bg-gray-50"}`}
          >
            Applications
          </button>
          <button
            onClick={() => setActiveTab("interviews")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === "interviews" ? "bg-accent text-white" : "text-gray-500 hover:bg-gray-50"}`}
          >
            Interviews
          </button>
        </div>
      </div>

      {activeTab === "applications" && (
        <Card>
          {applications.length === 0 ? <EmptyState icon={<FileText />} message="No applications found." /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="p-4 font-semibold text-sm text-gray-600">Applicant</th>
                    <th className="p-4 font-semibold text-sm text-gray-600">Position</th>
                    <th className="p-4 font-semibold text-sm text-gray-600">Contact</th>
                    <th className="p-4 font-semibold text-sm text-gray-600">Applied</th>
                    <th className="p-4 font-semibold text-sm text-gray-600">Status</th>
                    <th className="p-4 font-semibold text-sm text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map(a => (
                    <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="p-4 font-medium text-text">{a.applicant_name}</td>
                      <td className="p-4 text-text-secondary">{a.job_title}</td>
                      <td className="p-4 text-text-secondary text-sm">
                        {a.email}<br/>{a.phone}
                      </td>
                      <td className="p-4 text-text-secondary text-sm">{new Date(a.applied_at).toLocaleDateString()}</td>
                      <td className="p-4">
                        <Badge 
                          color={a.status === 'Pending' ? 'gray' : a.status === 'Interview' ? 'blue' : a.status === 'Hired' ? 'green' : 'red'}
                        >
                          {a.status}
                        </Badge>
                      </td>
                      <td className="p-4 flex items-center gap-2">
                        {a.resume_file && (
                          <a href={a.resume_file} target="_blank" rel="noreferrer" className="text-accent hover:underline text-sm">Resume</a>
                        )}
                        {a.status === 'Pending' && (
                          <>
                            <Button size="sm" onClick={() => { setSelectedApp(a); setShowInterviewModal(true); }}>Schedule</Button>
                            <button onClick={() => updateAppStatus(a.id, "Rejected")} className="text-red-500 hover:text-red-700"><XCircle size={18}/></button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {activeTab === "interviews" && (
        <Card>
          {interviews.length === 0 ? <EmptyState icon={<Calendar />} message="No interviews scheduled." /> : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {interviews.map(i => (
                <div key={i.id} className="border border-gray-100 rounded-lg p-4 bg-gray-50/50 hover:border-accent/30 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold text-text">{i.applicant_name}</h4>
                      <p className="text-sm text-text-secondary">{i.job_title}</p>
                    </div>
                    <Badge color={i.status === 'Scheduled' ? 'blue' : i.status === 'Completed' ? 'green' : 'red'}>{i.status}</Badge>
                  </div>
                  <div className="text-sm text-gray-600 mb-4 space-y-1">
                    <p><strong>Date:</strong> {new Date(i.interview_date).toLocaleString()}</p>
                    <p><strong>Interviewer:</strong> {i.interviewer_name}</p>
                    {i.location_or_link && <p><strong>Location:</strong> {i.location_or_link}</p>}
                  </div>
                  {i.status === 'Scheduled' && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => updateInterview(i.id, "Completed", "Done")}>Mark Completed</Button>
                      <Button size="sm" variant="outline" onClick={() => updateInterview(i.id, "Cancelled")}>Cancel</Button>
                    </div>
                  )}
                  {i.status === 'Completed' && (
                    <p className="text-sm text-gray-500 italic">Feedback: {i.feedback || "None"}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {showInterviewModal && selectedApp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-4">Schedule Interview</h3>
            <form onSubmit={scheduleInterview} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Date & Time</label>
                <input type="datetime-local" required className="w-full border rounded-lg p-2" value={interviewForm.interview_date} onChange={e => setInterviewForm({...interviewForm, interview_date: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Interviewer</label>
                <input type="text" required className="w-full border rounded-lg p-2" value={interviewForm.interviewer_name} onChange={e => setInterviewForm({...interviewForm, interviewer_name: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Location / Link</label>
                <input type="text" className="w-full border rounded-lg p-2" value={interviewForm.location_or_link} onChange={e => setInterviewForm({...interviewForm, location_or_link: e.target.value})} />
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit">Schedule</Button>
                <Button type="button" variant="outline" onClick={() => setShowInterviewModal(false)}>Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
