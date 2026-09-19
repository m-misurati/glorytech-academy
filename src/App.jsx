import { lazy, Suspense, useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { CatalogProvider } from './context/CatalogContext';
import { ThemeProvider } from './context/ThemeContext';
import { I18nProvider } from './i18n/I18nContext';
import CoursePage from './pages/CoursePage';
import DashboardPage from './pages/DashboardPage';
import InstructorPage from './pages/InstructorPage';
import LandingPage from './pages/LandingPage';
import LearnPage from './pages/LearnPage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';

// Dashboards, the course editor and the legal pages load on demand, so the landing bundle stays small.
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'));
const CourseEditorPage = lazy(() => import('./pages/CourseEditorPage'));
const TeachingDashboardPage = lazy(() => import('./pages/TeachingDashboardPage'));
const LegalPage = lazy(() => import('./pages/LegalPage'));
const TeachPage = lazy(() => import('./pages/TeachPage'));
const B2BPage = lazy(() => import('./pages/B2BPage'));

function RouteFallback() {
  return (
    <div className="grid min-h-screen place-items-center bg-canvas">
      <span className="h-10 w-10 animate-spin rounded-full border-4 border-glory-100 border-t-glory-600" />
    </div>
  );
}

// Scrolls to the #section in the URL (landing links from any page), otherwise to the top.
function ScrollManager() {
  const { pathname, hash, key } = useLocation();

  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      return undefined;
    }
    const timer = window.setTimeout(() => {
      document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
    return () => window.clearTimeout(timer);
  }, [pathname, hash, key]);

  return null;
}

export default function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <AuthProvider>
          <CatalogProvider>
            <ScrollManager />
            <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/courses/:slug" element={<CoursePage />} />
              <Route path="/instructors/:slug" element={<InstructorPage />} />
              <Route path="/legal/:page" element={<LegalPage />} />
              <Route path="/teach" element={<TeachPage />} />
              <Route path="/b2b" element={<B2BPage />} />
              <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
              <Route path="/learn/:slug/:lessonId" element={<ProtectedRoute><LearnPage /></ProtectedRoute>} />
              <Route path="/instructor" element={<ProtectedRoute role="instructor"><TeachingDashboardPage /></ProtectedRoute>} />
              <Route path="/instructor/courses/:courseId" element={<ProtectedRoute role="instructor"><CourseEditorPage /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute role="admin"><AdminDashboardPage /></ProtectedRoute>} />
              <Route path="/admin/instructors/:instructorId" element={<ProtectedRoute role="admin"><TeachingDashboardPage /></ProtectedRoute>} />
              <Route path="/404" element={<NotFoundPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
            </Suspense>
          </CatalogProvider>
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
