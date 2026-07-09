import { useEffect, useState } from "react";
import api from "../lib/api";
import { Card, EmptyState, Loader, SectionTitle, Toast, Badge } from "../components/Common";

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export default function Payroll() {
  const [month, setMonth] = useState(currentMonth());
  const [records, setRecords] = useState(null);
  const [toast, setToast] = useState("");

  function load() {
    setRecords(null);
    api.get(`/admin-portal/payroll/?month=${month}`).then(({ data }) => setRecords(data)).catch(() => setRecords([]));
  }
  useEffect(() => { load(); }, [month]);

  async function updateField(record, field, value) {
    setRecords((prev) => prev.map((r) => (r.id === record.id ? { ...r, [field]: value } : r)));
  }

  async function save(record) {
    try {
      await api.patch("/admin-portal/payroll/", {
        id: record.id,
        allowances: record.allowances,
        deductions: record.deductions,
      });
      setToast("Payslip updated.");
      load();
    } catch { setToast("Could not update payslip."); }
  }

  async function markPaid(record) {
    try {
      await api.patch("/admin-portal/payroll/", { id: record.id, status: "Paid" });
      setToast(`Marked ${record.employee_name}'s payslip as paid.`);
      load();
    } catch { setToast("Could not mark payslip as paid."); }
  }

  const totalNet = records?.reduce((sum, r) => sum + Number(r.net_pay || 0), 0) || 0;

  return (
    <div className="space-y-6">
      <Card>
        <SectionTitle
          action={
            <input
              type="month"
              value={month.slice(0, 7)}
              onChange={(e) => setMonth(`${e.target.value}-01`)}
              className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
            />
          }
        >
          Payroll
        </SectionTitle>
        <p className="text-sm text-ink-secondary">
          Payslips are generated automatically for every active employee for the selected month.
          Adjust allowances/deductions, then mark a payslip as Paid once processed.
        </p>
      </Card>

      <Card>
        <SectionTitle action={<span className="text-sm font-medium text-ink-secondary">Total net for month: <b>₹{totalNet.toLocaleString("en-IN")}</b></span>}>
          Payslips
        </SectionTitle>
        {records === null ? (
          <Loader />
        ) : records.length === 0 ? (
          <EmptyState label="No active employees found for this month." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-secondary border-b border-slate-100">
                  <th className="py-2 pr-4">Employee</th>
                  <th className="py-2 pr-4">Department</th>
                  <th className="py-2 pr-4">Basic</th>
                  <th className="py-2 pr-4">Allowances</th>
                  <th className="py-2 pr-4">Deductions</th>
                  <th className="py-2 pr-4">Net Pay</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id} className="border-b border-slate-50">
                    <td className="py-2 pr-4">
                      <p className="font-medium">{r.employee_name}</p>
                      <p className="text-xs text-ink-secondary">{r.designation} · {r.employee_code}</p>
                    </td>
                    <td className="py-2 pr-4">{r.department}</td>
                    <td className="py-2 pr-4">₹{Number(r.basic_salary).toLocaleString("en-IN")}</td>
                    <td className="py-2 pr-4">
                      <input
                        type="number"
                        disabled={r.status === "Paid"}
                        value={r.allowances}
                        onChange={(e) => updateField(r, "allowances", e.target.value)}
                        onBlur={() => save(r)}
                        className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-sm disabled:bg-slate-50"
                      />
                    </td>
                    <td className="py-2 pr-4">
                      <input
                        type="number"
                        disabled={r.status === "Paid"}
                        value={r.deductions}
                        onChange={(e) => updateField(r, "deductions", e.target.value)}
                        onBlur={() => save(r)}
                        className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-sm disabled:bg-slate-50"
                      />
                    </td>
                    <td className="py-2 pr-4 font-semibold">₹{Number(r.net_pay).toLocaleString("en-IN")}</td>
                    <td className="py-2 pr-4">
                      <Badge tone={r.status === "Paid" ? "green" : "gold"}>{r.status}</Badge>
                    </td>
                    <td className="py-2 pr-4">
                      {r.status !== "Paid" && (
                        <button
                          onClick={() => markPaid(r)}
                          className="px-3 py-1.5 rounded-lg bg-academic-blue text-white text-xs font-medium hover:opacity-90"
                        >
                          Mark Paid
                        </button>
                      )}
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
