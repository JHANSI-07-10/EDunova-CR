import { useEffect, useState } from "react";
import api from "../lib/api";
import { Badge, Card, EmptyState, Loader, SectionTitle, Toast } from "../components/Common";
import { isNonEmptyString, isPositiveNumber } from "../../../utils/validation";

export default function Fees() {
  const [structures, setStructures] = useState(null);
  const [payments, setPayments] = useState(null);
  const [form, setForm] = useState({ class_id: "", term_name: "", tuition_fee: 0, transport_fee: 0, hostel_fee: 0, total_amount: 0 });
  const [toast, setToast] = useState("");
  const [validationErrors, setValidationErrors] = useState({});

  function load() {
    api.get("/admin-portal/fee-structures/").then(({ data }) => setStructures(data)).catch(() => setStructures([]));
    api.get("/admin-portal/payments/").then(({ data }) => setPayments(data)).catch(() => setPayments([]));
  }
  useEffect(() => { load(); }, []);

  async function addStructure(e) {
    e.preventDefault();
    const errs = {};
    if (!isNonEmptyString(form.class_id)) errs.class_id = "Class ID is required.";
    if (!isNonEmptyString(form.term_name)) errs.term_name = "Term name is required.";
    if (!isPositiveNumber(form.total_amount)) errs.total_amount = "Total amount must be greater than 0.";
    if (Object.keys(errs).length > 0) { setValidationErrors(errs); return; }
    setValidationErrors({});
    try {
      await api.post("/admin-portal/fee-structures/", form);
      setForm({ class_id: "", term_name: "", tuition_fee: 0, transport_fee: 0, hostel_fee: 0, total_amount: 0 });
      load();
    } catch { setToast("Could not create fee structure."); }
  }

  return (
    <div className="space-y-6">
      <Card>
        <SectionTitle>Create fee structure</SectionTitle>
        <form onSubmit={addStructure} className="grid sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="flex flex-col gap-1">
            <input required placeholder="Class ID (*)" value={form.class_id} onChange={(e) => setForm({ ...form, class_id: e.target.value })} className={`rounded-xl border px-3 py-2 text-sm ${validationErrors.class_id ? "border-danger" : "border-slate-200"}`} />
            {validationErrors.class_id && <p className="text-xs text-danger">{validationErrors.class_id}</p>}
          </div>
          <div className="flex flex-col gap-1">
            <input required placeholder="Term name (*)" value={form.term_name} onChange={(e) => setForm({ ...form, term_name: e.target.value })} className={`rounded-xl border px-3 py-2 text-sm ${validationErrors.term_name ? "border-danger" : "border-slate-200"}`} />
            {validationErrors.term_name && <p className="text-xs text-danger">{validationErrors.term_name}</p>}
          </div>
          <input type="number" min="0" placeholder="Tuition ₹" value={form.tuition_fee} onChange={(e) => setForm({ ...form, tuition_fee: e.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <input type="number" min="0" placeholder="Transport ₹" value={form.transport_fee} onChange={(e) => setForm({ ...form, transport_fee: e.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <input type="number" min="0" placeholder="Hostel ₹" value={form.hostel_fee} onChange={(e) => setForm({ ...form, hostel_fee: e.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <div className="flex flex-col gap-1">
            <input type="number" min="1" placeholder="Total ₹" value={form.total_amount} onChange={(e) => setForm({ ...form, total_amount: e.target.value })} className={`rounded-xl border px-3 py-2 text-sm ${validationErrors.total_amount ? "border-danger" : "border-slate-200"}`} />
            {validationErrors.total_amount && <p className="text-xs text-danger">{validationErrors.total_amount}</p>}
          </div>
          <button className="sm:col-span-3 lg:col-span-6 bg-academic-blue text-white rounded-xl py-2 font-medium">Create</button>
        </form>
        <p className="text-xs text-ink-secondary mt-2">Tip: use the Classes page to find a class's numeric ID.</p>
      </Card>


      <Card>
        <SectionTitle>Fee structures</SectionTitle>
        {!structures ? <Loader rows={3} /> : structures.length === 0 ? <EmptyState label="No fee structures yet." /> : (
          <div className="divide-y divide-slate-100">
            {structures.map((f) => (
              <div key={f.id} className="py-2 text-sm flex justify-between">
                <span>{f.term_name} (Class #{f.class_id})</span>
                <span className="font-numeric font-semibold">₹{f.total_amount}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <SectionTitle>Recent payments</SectionTitle>
        {!payments ? <Loader rows={3} /> : payments.length === 0 ? <EmptyState label="No payments recorded yet." /> : (
          <div className="divide-y divide-slate-100">
            {payments.map((p) => (
              <div key={p.id} className="py-2 flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">{p.student_name}</p>
                  <p className="text-xs text-ink-secondary">{p.term_name} · {p.transaction_id}</p>
                </div>
                <div className="text-right">
                  <p className="font-numeric font-semibold">₹{p.amount_paid}</p>
                  <Badge tone="green">{p.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}
