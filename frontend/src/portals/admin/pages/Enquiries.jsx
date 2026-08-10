import { useEffect, useState } from "react";
import api from "../lib/api";
import { Card, EmptyState, Loader, SectionTitle, Toast } from "../components/Common";

export default function Enquiries() {
  const [messages, setMessages] = useState(null);
  const [toast, setToast] = useState("");

  function load() {
    api.get("/admin-portal/contact-messages/")
      .then(({ data }) => setMessages(data))
      .catch(() => setMessages([]));
  }
  useEffect(() => { load(); }, []);

  async function toggleResolved(m) {
    try {
      await api.patch(`/admin-portal/contact-messages/${m.id}/`, { is_resolved: !m.is_resolved });
      setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, is_resolved: !x.is_resolved } : x)));
      setToast(m.is_resolved ? "Marked as unresolved." : "Marked as resolved.");
    } catch { setToast("Could not update message."); }
  }

  return (
    <div className="space-y-6">
      <Card>
        <SectionTitle>Contact form enquiries</SectionTitle>
        <p className="text-xs text-ink-secondary mb-3">Submissions from the public Contact page, newest first.</p>
        {messages === null ? <Loader /> : messages.length === 0 ? <EmptyState label="No contact enquiries yet." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-ink-secondary border-b border-slate-100">
                <th className="py-2 pr-4">Name</th><th className="py-2 pr-4">Email</th><th className="py-2 pr-4">Phone</th><th className="py-2 pr-4">Message</th><th className="py-2 pr-4">Received</th><th className="py-2 pr-4">Status</th><th className="py-2 pr-4"></th>
              </tr></thead>
              <tbody>
                {messages.map((m) => (
                  <tr key={m.id} className="border-b border-slate-50">
                    <td className="py-2 pr-4">{m.name}</td>
                    <td className="py-2 pr-4">{m.email}</td>
                    <td className="py-2 pr-4">{m.phone || "—"}</td>
                    <td className="py-2 pr-4 max-w-xs">{m.message}</td>
                    <td className="py-2 pr-4">{new Date(m.submitted_at).toLocaleString()}</td>
                    <td className="py-2 pr-4">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${m.is_resolved ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                        {m.is_resolved ? "Resolved" : "Open"}
                      </span>
                    </td>
                    <td className="py-2 pr-4">
                      <button onClick={() => toggleResolved(m)} className="text-xs font-medium text-academic-blue hover:underline">
                        {m.is_resolved ? "Reopen" : "Mark resolved"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}
