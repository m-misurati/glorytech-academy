import { ShieldAlert } from 'lucide-react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import SiteHeader from './SiteHeader';

function FullScreenMessage({ children }) {
  return (
    <div className="min-h-screen bg-canvas">
      <SiteHeader compact />
      <div className="grid min-h-[70vh] place-items-center px-6 text-center">{children}</div>
    </div>
  );
}

// role: undefined (any signed-in user) | 'instructor' | 'admin'
export default function ProtectedRoute({ children, role }) {
  const { user, loading, roles, rolesLoading } = useAuth();
  const { t } = useI18n();
  const location = useLocation();

  if (loading || (role && rolesLoading)) {
    return (
      <FullScreenMessage>
        <div>
          <span className="mx-auto block h-10 w-10 animate-spin rounded-full border-4 border-glory-100 border-t-glory-600" />
          <p className="mt-4 font-bold text-muted">{t('protected.preparing')}</p>
        </div>
      </FullScreenMessage>
    );
  }

  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  const allowed = !role || (role === 'admin' && roles.isAdmin) || (role === 'instructor' && roles.instructor);
  if (!allowed) {
    return (
      <FullScreenMessage>
        <div className="max-w-md">
          <ShieldAlert className="mx-auto h-12 w-12 text-brand" />
          <h1 className="mt-5 text-2xl font-black">{t('protected.noAccessTitle')}</h1>
          <p className="mt-3 font-medium leading-7 text-muted">{t('protected.noAccessText')}</p>
          <Link to="/dashboard" className="btn-primary mt-7">{t('nav.myLearning')}</Link>
        </div>
      </FullScreenMessage>
    );
  }

  return children;
}
