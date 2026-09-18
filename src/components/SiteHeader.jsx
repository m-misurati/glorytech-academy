import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, ChevronDown, GraduationCap, Languages, LayoutDashboard, LogOut, Menu, Moon, ShieldCheck, Sun, UserRound, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useI18n } from '../i18n/I18nContext';
import Brand from './Brand';

const sections = [
  { key: 'home', hash: '#home' },
  { key: 'courses', hash: '#courses' },
  { key: 'upcoming', hash: '#upcoming' },
  { key: 'b2b', hash: '#b2b' },
  { key: 'instructors', hash: '#instructors' },
  { key: 'contact', hash: '#contact' },
];

const pageLinks = [{ key: 'teach', to: '/teach' }];

const iconButton = 'grid h-10 w-10 place-items-center rounded-xl text-muted transition hover:bg-subtle hover:text-ink';

function useDashboardLinks() {
  const { user, roles } = useAuth();
  if (!user) return [];
  return [
    { to: '/dashboard', key: 'nav.myLearning', icon: GraduationCap },
    roles.instructor && { to: '/instructor', key: 'nav.teaching', icon: LayoutDashboard },
    roles.isAdmin && { to: '/admin', key: 'nav.admin', icon: ShieldCheck },
  ].filter(Boolean);
}

function AccountMenu() {
  const { user, signOut } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const links = useDashboardLinks();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const name = user?.user_metadata?.display_name || user?.email || '';

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (event.type === 'keydown' ? event.key === 'Escape' : !menuRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
    navigate('/');
  };

  return (
    <div ref={menuRef} className="relative">
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-haspopup="menu" className="flex items-center gap-2 rounded-full border border-line bg-surface py-1.5 pe-3 ps-1.5 text-sm font-black text-ink transition hover:border-glory-500">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-glory-600 text-white">
          {name ? name.trim().charAt(0).toUpperCase() : <UserRound className="h-4 w-4" />}
        </span>
        <span className="hidden max-w-32 truncate xl:inline">{name || t('nav.account')}</span>
        <ChevronDown className={`h-4 w-4 text-muted transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div role="menu" className="absolute end-0 top-12 z-50 w-60 overflow-hidden rounded-2xl border border-line bg-surface p-1.5 shadow-xl shadow-black/10">
          {links.map((link) => (
            <Link key={link.to} to={link.to} role="menuitem" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-ink hover:bg-subtle">
              <link.icon className="h-4 w-4 text-brand-ink" /> {t(link.key)}
            </Link>
          ))}
          <button type="button" role="menuitem" onClick={handleSignOut} className="mt-1 flex w-full items-center gap-3 rounded-xl border-t border-line px-3 py-2.5 text-sm font-bold text-muted hover:bg-subtle hover:text-ink">
            <LogOut className="h-4 w-4" /> {t('nav.signOut')}
          </button>
        </div>
      )}
    </div>
  );
}

export default function SiteHeader({ compact = false }) {
  const { user, signOut } = useAuth();
  const { t, toggleLang } = useI18n();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const dashboardLinks = useDashboardLinks();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const menuBreakpoint = compact ? 'lg:hidden' : 'xl:hidden';
  const themeLabel = isDark ? t('nav.themeLight') : t('nav.themeDark');

  const toggles = (
    <>
      <button type="button" onClick={toggleTheme} className={iconButton} aria-label={themeLabel} title={themeLabel}>
        {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>
      <button type="button" onClick={toggleLang} className="flex h-10 items-center gap-1.5 rounded-xl px-2.5 text-sm font-black text-muted transition hover:bg-subtle hover:text-ink" aria-label={t('nav.switchLanguageLabel')}>
        <Languages className="h-5 w-5" />
        <span>{t('nav.switchLanguage')}</span>
      </button>
    </>
  );

  return (
    <header className={`sticky top-0 z-40 border-b transition-colors ${scrolled ? 'border-line bg-canvas/90 shadow-sm backdrop-blur-xl' : 'border-transparent bg-canvas/80 backdrop-blur-md'}`}>
      <nav aria-label={t('nav.mainNav')} className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between gap-4 px-4 sm:px-5 lg:px-8">
        <Brand compact />

        {!compact && (
          <div className="hidden items-center gap-0.5 xl:flex">
            {sections.map((section) => (
              <Link key={section.key} to={{ pathname: '/', hash: section.hash }} className="rounded-xl px-3 py-2 text-sm font-bold text-muted transition hover:bg-subtle hover:text-brand-ink">
                {t(`nav.${section.key}`)}
              </Link>
            ))}
            {pageLinks.map((link) => (
              <Link key={link.key} to={link.to} className="rounded-xl px-3 py-2 text-sm font-bold text-brand-ink transition hover:bg-brand-soft">
                {t(`nav.${link.key}`)}
              </Link>
            ))}
          </div>
        )}

        <div className="hidden items-center gap-1 lg:flex">
          {toggles}
          <span className="mx-1.5 h-6 w-px bg-line" />
          {user ? (
            <AccountMenu />
          ) : (
            <>
              <Link to="/login" className="rounded-xl px-3 py-2 text-sm font-bold text-ink hover:text-brand-ink">{t('nav.login')}</Link>
              <Link to="/login?mode=signup" className="btn-primary px-5 py-2.5 text-sm">
                {t('nav.startFree')} <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
              </Link>
            </>
          )}
        </div>

        <button type="button" onClick={() => setMobileOpen((value) => !value)} className={`grid h-11 w-11 place-items-center rounded-xl border border-line bg-surface text-ink ${menuBreakpoint}`} aria-expanded={mobileOpen} aria-label={mobileOpen ? t('nav.menuClose') : t('nav.menuOpen')}>
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className={`overflow-hidden border-t border-line bg-canvas ${menuBreakpoint}`}>
            <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4 sm:px-5">
              {sections.map((section) => (
                <Link key={section.key} to={{ pathname: '/', hash: section.hash }} onClick={() => setMobileOpen(false)} className="rounded-xl px-4 py-3 font-bold text-ink hover:bg-subtle">
                  {t(`nav.${section.key}`)}
                </Link>
              ))}
              {pageLinks.map((link) => (
                <Link key={link.key} to={link.to} onClick={() => setMobileOpen(false)} className="rounded-xl px-4 py-3 font-bold text-brand-ink hover:bg-subtle">
                  {t(`nav.${link.key}`)}
                </Link>
              ))}
              {dashboardLinks.length > 0 && <span className="my-2 h-px bg-line" />}
              {dashboardLinks.map((link) => (
                <Link key={link.to} to={link.to} onClick={() => setMobileOpen(false)} className="flex items-center gap-3 rounded-xl px-4 py-3 font-bold text-ink hover:bg-subtle">
                  <link.icon className="h-5 w-5 text-brand-ink" /> {t(link.key)}
                </Link>
              ))}
              <div className="mt-2 flex items-center gap-1 border-t border-line pt-3">{toggles}</div>
              {user ? (
                <button type="button" onClick={async () => { setMobileOpen(false); await signOut(); navigate('/'); }} className="btn-secondary mt-3">
                  <LogOut className="h-4 w-4" /> {t('nav.signOut')}
                </button>
              ) : (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Link to="/login" onClick={() => setMobileOpen(false)} className="btn-secondary">{t('nav.login')}</Link>
                  <Link to="/login?mode=signup" onClick={() => setMobileOpen(false)} className="btn-primary">{t('nav.startFree')}</Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
