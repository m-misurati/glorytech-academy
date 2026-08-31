import { LogOut, LayoutDashboard } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Brand from './Brand';

export default function AppHeader({ dark = false }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className={`${dark ? 'border-white/10 bg-slate-950 text-white' : 'border-slate-200 bg-white/90 text-slate-900'} sticky top-0 z-40 border-b backdrop-blur-xl`}>
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 py-3 lg:px-8">
        <Brand compact light={dark} />
        <div className="flex items-center gap-2">
          <Link to="/dashboard" className={`${dark ? 'text-white/80 hover:bg-white/10' : 'text-slate-700 hover:bg-[#dff8f2]'} inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold`}>
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">لوحتي</span>
          </Link>
          {user && (
            <button type="button" onClick={handleSignOut} className={`${dark ? 'text-white/70 hover:bg-white/10' : 'text-slate-500 hover:bg-slate-100'} inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold`}>
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">خروج</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
