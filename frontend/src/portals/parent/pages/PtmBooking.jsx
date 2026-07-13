import { useEffect, useState } from "react";
import api from "../lib/api";
import { Badge, Card, EmptyState, Loader, SectionTitle, Toast } from "../components/Common";
import { useAuth } from "../context/AuthContext";
import { Lock, Clock, Calendar, Check, AlertTriangle, CalendarDays } from "lucide-react";

const TONE = { Scheduled: "blue", Completed: "green", Cancelled: "red", Waitlisted: "gold" };

export default function PtmBooking() {
  const { activeChildId } = useAuth();
  const [teachers, setTeachers] = useState([]);
  const [bookings, setBookings] = useState(null);
  const [form, setForm] = useState({ teacher_id: "", meeting_date: "", time_slot: "", parent_notes: "" });
  const [toast, setToast] = useState("");

  const [hasPendingFees, setHasPendingFees] = useState(false);
  const [feesLoading, setFeesLoading] = useState(true);

  // Slot availability verification simulator states
  const [verifyingSlot, setVerifyingSlot] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null); // 'available' | 'unavailable'

  function load() {
    api.get("/parent/ptm/").then(({ data }) => setBookings(data)).catch(() => setBookings([]));
  }

  useEffect(() => {
    if (!activeChildId) return;
    setFeesLoading(true);
    api.get(`/parent/fees/?child_id=${activeChildId}`)
      .then(({ data }) => {
        setHasPendingFees(data.pending && data.pending.length > 0);
      })
      .catch(() => {})
      .finally(() => setFeesLoading(false));

    api.get("/parent/teachers/").then(({ data }) => setTeachers(data)).catch(() => setTeachers([]));
    load();
  }, [activeChildId]);

  function startVerification(e) {
    e.preventDefault();
    if (!form.teacher_id || !form.meeting_date || !form.time_slot) return;
    setVerifyingSlot(true);
    setVerificationResult(null);
    
    // Simulate checking slot availability after 800ms
    setTimeout(() => {
      // Demo logic: slots at even minutes are available, odd minutes are unavailable
      const minute = parseInt(form.time_slot.split(":")[1] || "0", 10);
      if (minute % 2 === 0) {
        setVerificationResult("available");
      } else {
        setVerificationResult("unavailable");
      }
    }, 800);
  }

  async function confirmBooking(waitlist = false) {
    setVerifyingSlot(false);
    try {
      const finalNotes = waitlist 
        ? `[Waitlisted] ${form.parent_notes}` 
        : form.parent_notes;
      
      await api.post("/parent/ptm/", { 
        ...form, 
        student_id: activeChildId, 
        parent_notes: finalNotes 
      });

      if (waitlist) {
        setToast("Joined PTM Waitlist for this slot.");
      } else {
        setToast("PTM Confirmed! Calendar Invite Sent to your email.");
      }
      setForm({ teacher_id: "", meeting_date: "", time_slot: "", parent_notes: "" });
      load();
    } catch {
      setToast("Could not book meeting.");
    } finally {
      setVerificationResult(null);
    }
  }

  if (!activeChildId) return <EmptyState label="Select a child from the top bar to view bookings." />;
  if (feesLoading || !bookings) return <Loader rows={4} />;

  if (hasPendingFees) {
    return (
      <Card className="max-w-md mx-auto mt-12 p-8 text-center border-t-4 border-danger">
        <Lock size={48} className="text-danger mx-auto mb-4" />
        <h3 className="font-heading text-lg font-bold text-ink-primary mb-2">PTM Booking Locked</h3>
        <p className="text-sm text-ink-secondary mb-6 leading-relaxed">
          Access to scheduling Parent-Teacher Meetings is locked due to pending fees for your child. Please clear the outstanding term balance to book a slot.
        </p>
        <a href="/parent/fees" className="inline-flex items-center justify-center bg-academic-green text-white rounded-xl py-2.5 px-6 text-sm font-semibold hover:bg-academic-green/90 transition-colors shadow-md">
          Pay Pending Fees
        </a>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <SectionTitle>Book a parent-teacher meeting</SectionTitle>
        <form onSubmit={startVerification} className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-ink-secondary">Select Teacher</label>
            <select required value={form.teacher_id} onChange={(e) => setForm({ ...form, teacher_id: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus-ring outline-none">
              <option value="">Select teacher</option>
              {teachers.map((t) => <option key={t.id} value={t.id}>{t.name} — {t.subject_name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-ink-secondary">Time Slot (Even minutes = Available, Odd = Booked)</label>
            <input required type="time" value={form.time_slot} onChange={(e) => setForm({ ...form, time_slot: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus-ring outline-none" />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs font-semibold text-ink-secondary">Meeting Date</label>
            <input required type="date" value={form.meeting_date} onChange={(e) => setForm({ ...form, meeting_date: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus-ring outline-none" />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs font-semibold text-ink-secondary">Notes (Optional)</label>
            <textarea placeholder="Notes for the teacher..." value={form.parent_notes} onChange={(e) => setForm({ ...form, parent_notes: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus-ring outline-none" rows={2} />
          </div>
          <button className="sm:col-span-2 bg-academic-green text-white rounded-xl py-2.5 font-medium hover:bg-academic-green/90 transition-colors">
            Request meeting
          </button>
        </form>
      </Card>

      {/* Verification Dialog Modal */}
      {verifyingSlot && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-card w-full max-w-sm p-6 shadow-raised text-center">
            {verificationResult === null ? (
              <div className="py-6 space-y-4">
                <Clock className="w-12 h-12 text-academic-blue mx-auto animate-spin" />
                <div>
                  <h4 className="font-bold text-ink-primary">Checking Slot Availability</h4>
                  <p className="text-xs text-ink-secondary mt-1">Verifying calendar conflicts for this teacher...</p>
                </div>
              </div>
            ) : verificationResult === "available" ? (
              <div className="py-6 space-y-4">
                <div className="w-12 h-12 bg-emerald-50 text-academic-green border border-emerald-100 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
                  ✓
                </div>
                <div>
                  <h4 className="font-bold text-ink-primary">Slot is Available!</h4>
                  <p className="text-xs text-ink-secondary mt-1">
                    The teacher has no conflicts on {form.meeting_date} at {form.time_slot}.
                  </p>
                </div>
                <button
                  onClick={() => confirmBooking(false)}
                  className="w-full bg-academic-green text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-academic-green/90 transition-colors"
                >
                  Confirm &amp; Send Invite
                </button>
              </div>
            ) : (
              <div className="py-6 space-y-4">
                <div className="w-12 h-12 bg-red-50 text-danger border border-red-100 rounded-full flex items-center justify-center mx-auto">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-ink-primary">Slot Unavailable</h4>
                  <p className="text-xs text-ink-secondary mt-1">
                    The requested slot is already booked. Please choose another slot or join the waitlist.
                  </p>
                </div>
                <div className="space-y-2">
                  <button
                    onClick={() => confirmBooking(true)}
                    className="w-full bg-academic-gold text-academic-blue rounded-xl py-2.5 text-sm font-semibold hover:bg-academic-gold/90 transition-colors"
                  >
                    Join Waitlist
                  </button>
                  <button
                    onClick={() => {
                      setVerifyingSlot(false);
                      setVerificationResult(null);
                    }}
                    className="w-full border border-slate-200 text-slate-700 rounded-xl py-2 text-sm font-medium hover:bg-slate-50 transition-colors"
                  >
                    Choose Alternate Slot
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <Card>
        <SectionTitle>Your bookings</SectionTitle>
        {bookings.length === 0 ? (
          <EmptyState label="No meetings booked yet." />
        ) : (
          <div className="divide-y divide-slate-100">
            {bookings.map((b) => (
              <div key={b.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-ink-primary">{b.teacher_name}</p>
                  <p className="text-xs text-ink-secondary flex items-center gap-1.5 mt-0.5">
                    <CalendarDays size={12} /> {b.meeting_date} at {b.time_slot}
                  </p>
                  {b.parent_notes?.startsWith("[Waitlisted]") && (
                    <span className="inline-block bg-amber-50 text-amber-700 text-[10px] px-1.5 py-0.5 rounded border border-amber-200 mt-1 font-semibold">
                      Waitlisted Slot
                    </span>
                  )}
                </div>
                <Badge tone={b.parent_notes?.startsWith("[Waitlisted]") ? "gold" : TONE[b.status] || "slate"}>
                  {b.parent_notes?.startsWith("[Waitlisted]") ? "Waitlisted" : b.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}
