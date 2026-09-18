import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BookOpen, CheckCircle2, Clock3, LayoutDashboard, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import CourseCard from '../components/CourseCard';
import SiteHeader from '../components/SiteHeader';
import { useAuth } from '../context/AuthContext';
import { useCatalog } from '../context/CatalogContext';
import { getAllLessons } from '../data/courses';
import { useI18n } from '../i18n/I18nContext';
import { getUserProgress } from '../lib/supabase';

export default function DashboardPage() {
  const { user, isDemo, roles } = useAuth();
  const { availableCourses } = useCatalog();
  const { t, formatNumber } = useI18n();
  const [progressRows, setProgressRows] = useState([]);

  useEffect(() => {
    let active = true;
    getUserProgress(user?.id).then(({ data }) => { if (active && data) setProgressRows(data); });
    return () => { active = false; };
  }, [user?.id]);

  const completedIds = useMemo(() => new Set(progressRows.filter((row) => row.completed_at).map((row) => row.lesson_id)), [progressRows]);
  const courseProgress = useMemo(() => Object.fromEntries(availableCourses.map((course) => {
    const lessons = getAllLessons(course);
    const done = lessons.filter((lesson) => completedIds.has(lesson.id)).length;
    return [course.id, lessons.length ? Math.round((done / lessons.length) * 100) : 0];
  })), [availableCourses, completedIds]);

  const contentHours = Math.floor(availableCourses.reduce((total, course) => total + (course.durationMinutes || 0), 0) / 60);
  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || t('student.fallbackName');
  const stats = [
    { icon: BookOpen, value: formatNumber(availableCourses.length), label: t('student.courses') },
    { icon: CheckCircle2, value: formatNumber(completedIds.size), label: t('student.completed') },
    { icon: Clock3, value: formatNumber(contentHours), label: t('student.content') },
  ];
  const roleLinks = [
    roles.instructor && { to: '/instructor', label: t('nav.teaching'), icon: LayoutDashboard },
    roles.isAdmin && { to: '/admin', label: t('nav.admin'), icon: ShieldCheck },
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-5 py-10 lg:px-8 lg:py-14">
        <div className="relative overflow-hidden rounded-[2rem] border border-line bg-subtle p-7 sm:p-10">
          <div className="pointer-events-none absolute -end-16 -top-24 h-64 w-64 rounded-full bg-glory-500/10 blur-2xl" />
          <span className="section-tag relative">{t('student.tag')}</span>
          <h1 className="relative mt-5 text-3xl font-black sm:text-4xl">{t('student.welcome', { name: displayName })}</h1>
          <p className="relative mt-3 font-medium text-muted">{t('student.subtitle')}</p>
          {isDemo && <p className="relative mt-5 inline-block rounded-xl bg-brand-soft px-4 py-2 text-xs font-black text-brand-ink">{t('student.demo')}</p>}
          {roleLinks.length > 0 && (
            <div className="relative mt-6 flex flex-wrap gap-3">
              {roleLinks.map((link) => (
                <Link key={link.to} to={link.to} className="btn-secondary px-5 py-2.5 text-sm">
                  <link.icon className="h-4 w-4 text-brand-ink" /> {link.label} <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="mt-7 grid gap-4 sm:grid-cols-3">
          {stats.map((stat) => (
            <div key={stat.label} className="card flex items-center gap-4 p-5">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-soft text-brand-ink"><stat.icon className="h-6 w-6" /></span>
              <div>
                <strong className="block text-2xl font-black">{stat.value}</strong>
                <span className="text-xs font-bold text-muted">{stat.label}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 flex items-end justify-between gap-5">
          <div>
            <span className="section-tag">{t('student.myCoursesTag')}</span>
            <h2 className="mt-3 text-3xl font-black">{t('student.myCoursesTitle')}</h2>
          </div>
          <span className="text-sm font-bold text-muted">{t('student.countNow', { count: availableCourses.length })}</span>
        </div>
        <div className="mt-7 grid gap-7 lg:grid-cols-2">
          {availableCourses.map((course) => <CourseCard key={course.id} course={course} dashboard progress={courseProgress[course.id] || 0} />)}
        </div>
      </main>
    </div>
  );
}
