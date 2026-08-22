import { useState } from 'react';
import { Routes, Route, Navigate, useLocation, matchPath } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useTheme } from './context/useTheme';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import AuthModal from './components/AuthModal';
import ExplorePage from './pages/ExplorePage';
import CoursesPage from './pages/CoursesPage';
import ClassroomPage from './pages/ClassroomPage';
import InterviewPage from './pages/InterviewPage';
import TeacherQueuePage from './pages/TeacherQueuePage';
import AdminPage from './pages/AdminPage';
import PortfolioPage from './pages/PortfolioPage';

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-vs-bg text-vs-text flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

const FOOTER_PATHS = ['/', '/courses', '/portfolio', '/portfolio/:userId'];

export default function App() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const location = useLocation();
  // Initialize theme on app mount (applies class to <html>)
  useTheme();

  const showFooter = FOOTER_PATHS.some((pattern) =>
    matchPath({ path: pattern, end: true }, location.pathname)
  );

  return (
    <div className="min-h-screen bg-vs-bg text-vs-text font-sans antialiased flex flex-col justify-between">
      <div>
        <Navbar onOpenAuth={() => setAuthModalOpen(true)} />
        
        <main>
          <Routes>
            <Route path="/" element={<ExplorePage />} />
            <Route path="/courses" element={<CoursesPage onOpenAuth={() => setAuthModalOpen(true)} />} />
            <Route
              path="/course/:id"
              element={
                <ProtectedRoute>
                  <ClassroomPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/interview/:submissionId"
              element={
                <ProtectedRoute>
                  <InterviewPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher"
              element={
                <ProtectedRoute roles={['TEACHER', 'ADMIN']}>
                  <TeacherQueuePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute roles={['ADMIN']}>
                  <AdminPage />
                </ProtectedRoute>
              }
            />
            <Route path="/portfolio" element={<PortfolioPage />} />
            <Route path="/portfolio/:userId" element={<PortfolioPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      {showFooter && <Footer />}

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  );
}
