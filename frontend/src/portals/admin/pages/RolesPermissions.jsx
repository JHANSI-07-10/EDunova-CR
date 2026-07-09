import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import { Card, EmptyState, Loader, SectionTitle } from "../components/Common";

// Access is enforced server-side per request (see portal/roles.py) — this
// matrix documents, for the Admin's benefit, what each role can reach in the
// system. It intentionally mirrors the routes actually wired in each
// portal's Routes.jsx rather than an aspirational list.
const ROLE_ACCESS = {
  Student: ["Attendance & Timetable", "Homework & Assignments", "LMS / Courses", "Exams & Hall Tickets", "Results", "Fee Payments", "Library", "Hostel & Medical Records", "Certificates", "Announcements & Events", "Profile & Support"],
  Teacher: ["Class & Attendance Management", "Homework & Assignments", "Question Bank & Exams", "Marks Entry", "Student Performance", "Messages", "Documents", "Timetable", "Notices", "Leave Requests"],
  Parent: ["Child Attendance & Homework", "Results", "Fee Payments", "Transport Tracking", "Teacher Messages", "Notifications", "Documents", "Leave Approval", "PTM Booking", "Feedback"],
  Admin: ["Admissions Review", "User & Role Management", "Classes & Subjects", "Fees & Payroll", "Transport, Library, Hostel", "Inventory & Visitors", "Notices & Leave Approvals", "Reports & Analytics", "Audit Log", "Settings & Backup"],
  Employee: ["Profile & Payslips", "Department Records"],
};

const ROLE_COLORS = {
  Student: "bg-academic-green/10 text-academic-green",
  Teacher: "bg-academic-blue/10 text-academic-blue",
  Parent: "bg-academic-gold/20 text-amber-700",
  Admin: "bg-bg-dark/10 text-bg-dark",
  Employee: "bg-academic-orange/10 text-academic-orange",
};

export default function RolesPermissions() {
  const [counts, setCounts] = useState(null);

  useEffect(() => {
    api.get("/admin-portal/roles/").then(({ data }) => setCounts(data)).catch(() => setCounts({}));
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <SectionTitle>Roles & Permissions</SectionTitle>
        <p className="text-sm text-ink-secondary">
          Every request is authorized server-side from the caller's role — never trusted from the client.
          Roles are assigned when an account is created or updated from{" "}
          <Link to="/admin/users" className="text-academic-blue underline">Users &amp; Roles</Link>.
          The matrix below shows what each role can currently access.
        </p>
      </Card>

      {counts === null ? (
        <Loader rows={5} />
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {Object.entries(ROLE_ACCESS).map(([role, modules]) => (
            <Card key={role}>
              <div className="flex items-center justify-between mb-3">
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${ROLE_COLORS[role]}`}>{role}</span>
                <span className="text-sm text-ink-secondary">{counts[role] ?? 0} user{(counts[role] ?? 0) === 1 ? "" : "s"}</span>
              </div>
              {modules.length === 0 ? (
                <EmptyState label="No modules configured." />
              ) : (
                <ul className="space-y-1.5">
                  {modules.map((m) => (
                    <li key={m} className="text-sm text-ink-primary flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-40 mt-2 shrink-0" />
                      {m}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
