import { Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import PortalNotFound from "../../components/PortalNotFound";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Admissions from "./pages/Admissions";
import Users from "./pages/Users";
import Classes from "./pages/Classes";
import Fees from "./pages/Fees";
import Transport from "./pages/Transport";
import Library from "./pages/Library";
import Notices from "./pages/Notices";
import Leaves from "./pages/Leaves";
import Reports from "./pages/Reports";
import AuditLog from "./pages/AuditLog";
import Settings from "./pages/Settings";
import Hostel from "./pages/Hostel";
import Inventory from "./pages/Inventory";
import Visitors from "./pages/Visitors";
import Alumni from "./pages/Alumni";
import MedicalRecords from "./pages/MedicalRecords";
import Examinations from "./pages/Examinations";
import ExamResults from "./pages/ExamResults";
import Payroll from "./pages/Payroll";
import RolesPermissions from "./pages/RolesPermissions";
import LmsMonitor from "./pages/LmsMonitor";
import Campuses from "./pages/Campuses";
import Scholarships from "./pages/Scholarships";

import Timetable from "./pages/Timetable";

export default function AdminRoutes() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="login" element={<Login />} />
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="admissions" element={<Admissions />} />
          <Route path="users" element={<Users />} />
          <Route path="roles-permissions" element={<RolesPermissions />} />
          <Route path="classes" element={<Classes />} />
          <Route path="timetable" element={<Timetable />} />
          <Route path="lms" element={<LmsMonitor />} />
          <Route path="fees" element={<Fees />} />
          <Route path="scholarships" element={<Scholarships />} />
          <Route path="notices" element={<Notices />} />
          <Route path="leaves" element={<Leaves />} />
          <Route path="reports" element={<Reports />} />
          <Route path="audit-log" element={<AuditLog />} />
          <Route path="settings" element={<Settings />} />
          <Route path="transport" element={<Transport />} />
          <Route path="library" element={<Library />} />
          <Route path="hostel" element={<Hostel />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="visitors" element={<Visitors />} />
          <Route path="alumni" element={<Alumni />} />
          <Route path="medical-records" element={<MedicalRecords />} />
          <Route path="examinations" element={<Examinations />} />
          <Route path="exam-results" element={<ExamResults />} />
          <Route path="payroll" element={<Payroll />} />
          <Route path="campuses" element={<Campuses />} />
          <Route path="*" element={<PortalNotFound homePath="/admin" />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

