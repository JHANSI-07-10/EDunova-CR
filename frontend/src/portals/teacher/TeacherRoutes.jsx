import { Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import PortalNotFound from "../../components/PortalNotFound";

import AdmissionsReview from "./pages/AdmissionsReview";
import Assignments from "./pages/Assignments";
import Attendance from "./pages/Attendance";
import Classes from "./pages/Classes";
import Dashboard from "./pages/Dashboard";
import Lms from "./pages/Lms";
import Exams from "./pages/Exams";
import Homework from "./pages/Homework";
import Leave from "./pages/Leave";
import Login from "./pages/Login";
import MarksEntry from "./pages/MarksEntry";
import Messages from "./pages/Messages";
import Notices from "./pages/Notices";
import Performance from "./pages/Performance";
import QuestionBank from "./pages/QuestionBank";
import Timetable from "./pages/Timetable";

export default function TeacherRoutes() {
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
          <Route path="classes" element={<Classes />} />
          <Route path="admissions-review" element={<AdmissionsReview />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="homework" element={<Homework />} />
          <Route path="assignments" element={<Assignments />} />
          <Route path="question-bank" element={<QuestionBank />} />
          <Route path="exams" element={<Exams />} />
          <Route path="marks-entry" element={<MarksEntry />} />
          <Route path="performance" element={<Performance />} />
          <Route path="messages" element={<Messages />} />
          <Route path="lms" element={<Lms />} />
          <Route path="timetable" element={<Timetable />} />
          <Route path="notices" element={<Notices />} />
          <Route path="leave" element={<Leave />} />
          <Route path="*" element={<PortalNotFound homePath="/teacher" />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
