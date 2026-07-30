import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import "@/App.css";
import { AuthProvider, useAuth } from "@/lib/auth";
import Layout from "@/components/Layout";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import StudentDashboard from "@/pages/StudentDashboard";
import TeacherDashboard from "@/pages/TeacherDashboard";
import ParentDashboard from "@/pages/ParentDashboard";
import AdaptiveQuiz from "@/pages/AdaptiveQuiz";
import UploadChapter from "@/pages/UploadChapter";
import MyCourses from "@/pages/MyCourses";
import StudyPlan from "@/pages/StudyPlan";
import PracticeZone from "@/pages/PracticeZone";
import AdminReview from "@/pages/AdminReview";
import Results from "@/pages/Results";
import TeacherAssignments from "@/pages/TeacherAssignments";
import AssignmentCreate from "@/pages/AssignmentCreate";
import AssignmentDetail from "@/pages/AssignmentDetail";
import StudentAssignments from "@/pages/StudentAssignments";
import TakeAssignment from "@/pages/TakeAssignment";

function Home() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "STUDENT") return <StudentDashboard />;
  if (user.role === "TEACHER") return <TeacherDashboard />;
  if (user.role === "PARENT") return <ParentDashboard />;
  if (user.role === "ADMIN") return <AdminReview />;
  return null;
}

function Protected({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" richColors />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/" element={<Protected><Home /></Protected>} />
          <Route path="/courses" element={<Protected><MyCourses /></Protected>} />
          <Route path="/practice" element={<Protected><PracticeZone /></Protected>} />
          <Route path="/plan" element={<Protected><StudyPlan /></Protected>} />
          <Route path="/results" element={<Protected><Results /></Protected>} />
          <Route path="/upload" element={<Protected><UploadChapter /></Protected>} />
          <Route path="/quiz/:sessionId" element={<Protected><AdaptiveQuiz /></Protected>} />
          <Route path="/admin/flagged" element={<Protected><AdminReview /></Protected>} />
          <Route path="/assignments" element={<Protected><TeacherAssignments /></Protected>} />
          <Route path="/assignments/new" element={<Protected><AssignmentCreate /></Protected>} />
          <Route path="/assignments/:id" element={<Protected><AssignmentDetail /></Protected>} />
          <Route path="/assignments/:id/take" element={<Protected><TakeAssignment /></Protected>} />
          <Route path="/my-assignments" element={<Protected><StudentAssignments /></Protected>} />
          <Route path="/students" element={<Protected><TeacherDashboard /></Protected>} />
          <Route path="/question-bank" element={<Protected><TeacherDashboard /></Protected>} />
          <Route path="/activity" element={<Protected><ParentDashboard /></Protected>} />
          <Route path="/insights" element={<Protected><ParentDashboard /></Protected>} />
          <Route path="/predicted" element={<Protected><ParentDashboard /></Protected>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
