import { useState, useEffect } from "react";
import { Download, FileCheck2, Calendar, FileText, CheckCircle2, Clock } from "lucide-react";
import api from "../lib/api";

export default function HallTickets() {
  const [hallTickets, setHallTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHallTickets();
  }, []);

  const loadHallTickets = async () => {
    try {
      const { data } = await api.get("/student/hall-tickets/");
      setHallTickets(data);
    } catch (err) {
      console.error("Failed to load hall tickets", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    window.print();
  };

  if (loading) return <div className="p-6 text-gray-500 font-sub">Loading hall tickets...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 font-heading">Exam Hall Tickets</h1>
        <p className="text-sm text-gray-500 font-sub">View and download your official hall tickets for upcoming exams.</p>
      </div>

      {hallTickets.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 font-heading">No Hall Tickets Available</h3>
          <p className="text-gray-500 mt-2 font-sub">You currently have no hall tickets generated. They will appear here once approved by the administration.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {hallTickets.map((ticket) => (
            <div key={ticket.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden print-area">
              <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg font-heading text-academic-blue">{ticket.exam?.exam_name}</h3>
                  <p className="text-gray-500 text-sm font-sub mt-1">Hall Ticket No: {ticket.ticket_number}</p>
                </div>
                {ticket.is_verified && (
                  <span className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-md text-xs font-semibold border border-green-200">
                    <CheckCircle2 size={14} /> Verified
                  </span>
                )}
              </div>
              
              <div className="p-6 space-y-4 font-sub text-sm">
                <div className="flex items-center justify-between border-b border-gray-50 pb-3">
                  <span className="text-gray-500 flex items-center gap-2"><FileCheck2 size={16} /> Subject</span>
                  <span className="font-semibold text-gray-900">{ticket.exam?.subject_name}</span>
                </div>
                
                <div className="flex items-center justify-between border-b border-gray-50 pb-3">
                  <span className="text-gray-500 flex items-center gap-2"><Calendar size={16} /> Exam Date</span>
                  <span className="font-semibold text-gray-900">{new Date(ticket.exam?.exam_date).toLocaleDateString()}</span>
                </div>

                <div className="pt-4 flex justify-end">
                  <button 
                    onClick={handleDownload}
                    className="flex items-center gap-2 bg-academic-blue text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    <Download size={16} />
                    Download / Print
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; border: none; box-shadow: none; }
          button { display: none !important; }
        }
      `}</style>
    </div>
  );
}
