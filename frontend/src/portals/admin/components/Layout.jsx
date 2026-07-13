import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

const TITLES = {
  "/": "Dashboard",
  "/admissions": "Admissions",
  "/users": "Users & Roles",
  "/roles-permissions": "Roles & Permissions",
  "/classes": "Classes & Subjects",
  "/fees": "Fees",
  "/scholarships": "Scholarships",
  "/payroll": "Payroll",
  "/exam-results": "Rank Lists & Report Cards",
  "/transport": "Transport",
  "/library": "Library",
  "/hostel": "Hostel",
  "/inventory": "Inventory",
  "/visitors": "Visitor Management",
  "/alumni": "Alumni Registry",
  "/medical-records": "Medical Records",
  "/notices": "Notices",
  "/leaves": "Leave Approvals",
  "/reports": "Reports & Analytics",
  "/audit-log": "Audit Log",
  "/campuses": "Campus Locations",
  "/settings": "Settings & Backup",
};

export default function Layout() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const sub = pathname.replace(/^\/admin/, "") || "/";

  return (
    <div className="min-h-screen flex bg-surface-light">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="flex-1 min-w-0">
        <Topbar title={TITLES[sub] || "Admin Portal"} onMenuClick={() => setOpen(true)} />
        <main className="p-4 lg:p-8 max-w-7xl mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
