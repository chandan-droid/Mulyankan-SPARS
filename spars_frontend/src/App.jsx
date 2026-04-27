import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Login from './pages/Login';
import AdminDashboard from './pages/admin/Dashboard';
import StudentManagement from './pages/admin/StudentManagement';
import AcademicManagement from './pages/admin/AcademicManagement';
import TeacherManagement from './pages/admin/TeacherManagement';
import AssessmentManagement from './pages/admin/AssessmentManagement';
import AdminReports from './pages/admin/Reports';
import TeacherDashboard from './pages/teacher/Dashboard';
import MarkEntry from './pages/teacher/MarkEntry';
import TeacherReports from './pages/teacher/Reports';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';
import { adminNavItems } from './pages/admin/Dashboard';
import { teacherNavItems } from './pages/teacher/Dashboard';

const queryClient = new QueryClient();
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />

            {/* Admin Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute role="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/students"
              element={
                <ProtectedRoute role="admin">
                  <StudentManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/academic"
              element={
                <ProtectedRoute role="admin">
                  <AcademicManagement />
                </ProtectedRoute>
              }
            />
            <Route path="/admin/classes" element={<Navigate to="/admin/academic" replace />} />
            <Route path="/admin/subjects" element={<Navigate to="/admin/academic" replace />} />
            <Route
              path="/admin/teachers"
              element={
                <ProtectedRoute role="admin">
                  <TeacherManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/assessments"
              element={
                <ProtectedRoute role="admin">
                  <AssessmentManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/reports"
              element={
                <ProtectedRoute role="admin">
                  <AdminReports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <ProtectedRoute role="admin">
                  <Settings navItems={adminNavItems} />
                </ProtectedRoute>
              }
            />

            {/* Teacher Routes */}
            <Route
              path="/teacher"
              element={
                <ProtectedRoute role="teacher">
                  <TeacherDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/marks"
              element={
                <ProtectedRoute role="teacher">
                  <MarkEntry />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/reports"
              element={
                <ProtectedRoute role="teacher">
                  <TeacherReports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/settings"
              element={
                <ProtectedRoute role="teacher">
                  <Settings navItems={teacherNavItems} />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);
export default App;

