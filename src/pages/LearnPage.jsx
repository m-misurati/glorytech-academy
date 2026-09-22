import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, Menu, X } from 'lucide-react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import CourseBadge from '../components/CourseBadge';
import LessonPlayer from '../components/LessonPlayer';
import LessonResources from '../components/LessonResources';
import SiteHeader from '../components/SiteHeader';
import { useAuth } from '../context/AuthContext';
import { useCatalog } from '../context/CatalogContext';
import { getAllLessons } from '../data/courses';
import { useI18n } from '../i18n/I18nContext';
import { usePageMeta } from '../lib/meta';
import { enrollInCourse, getLessonResources, getUserProgress, saveLessonPosition, saveLessonProgress } from '../lib/supabase';

export default function LearnPage() {
  const { slug, lessonId } = useParams();
  const { getCourseBySlug } = useCatalog();
  const { t, pick, formatClock } = useI18n();
  const { user, isDemo, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [completed, setCompleted] = useState(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [progressError, setProgressError] = useState('');
  const [positions, setPositions] = useState({});
  const [resources, setResources] = useState([]);
  const course = getCourseBySlug(slug);

  const lessons = useMemo(() => getAllLessons(course), [course]);
  const lessonIndex = lessons.findIndex((item) => item.id === lessonId);
  const lesson = lessons[lessonIndex];
  const nextLesson = lessons[lessonIndex + 1];
  usePageMeta({ title: lesson ? pick(lesson, 'title') : undefined });

  useEffect(() => {
    let active = true;
    getUserProgress(user?.id).then(({ data }) => {
      if (!active || !data) return;
      setCompleted(new Set(data.filter((row) => row.completed_at).map((row) => row.lesson_id)));
      setPositions(Object.fromEntries(data.map((row) => [row.lesson_id, row.progress_seconds || 0])));
    });
    return () => { active = false; };
  }, [user?.id]);

  useEffect(() => { setProgressError(''); }, [lessonId]);

  // Opening any lesson of a free course enrolls the learner first, so a lesson
  // reached straight from the course page (or right after sign-up) can play.
  const [enrolled, setEnrolled] = useState(false);
  useEffect(() => {
    let active = true;
    if (!course?.isFree || !user?.id) {
      setEnrolled(true);
      return undefined;
    }
    setEnrolled(false);
    enrollInCourse(user.id, course.id).finally(() => { if (active) setEnrolled(true); });
    return () => { active = false; };
  }, [course?.id, course?.isFree, user?.id]);

  useEffect(() => {
    let active = true;
    setResources([]);
    if (!lessonId) return undefined;
    getLessonResources([lessonId]).then(({ data }) => { if (active && data) setResources(data); });
    return () => { active = false; };
  }, [lessonId, user?.id]);

  if (!course || course.availability === 'coming_soon' || !lesson) return <Navigate to="/404" replace />;

  // Wait for the session to resolve, otherwise a signed-in learner is bounced on reload.
  if (authLoading) return <div className="min-h-screen bg-canvas" aria-busy="true" />;

  // The route is public so the free first lesson can be watched without an account.
  // Any other lesson sends the visitor to sign up and returns them here afterwards.
  if (!user && !isDemo && !lesson.isPreview) {
    return <Navigate to="/login?mode=signup" replace state={{ from: `/learn/${course.slug}/${lesson.id}` }} />;
  }

  const markComplete = async () => {
    setSaving(true);
    setProgressError('');
    const { error } = await saveLessonProgress({ userId: user.id, lessonId: lesson.id, completed: true });
    setSaving(false);
    if (error) {
      setProgressError(t('learn.progressError'));
      return;
    }
    setCompleted((current) => new Set([...current, lesson.id]));
    if (nextLesson) navigate(`/learn/${course.slug}/${nextLesson.id}`);
  };

  const isDone = completed.has(lesson.id);
  const clock = formatClock(lesson.durationSeconds);

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <SiteHeader compact />
      <div className="mx-auto flex max-w-[1600px]">
        <aside className={`${sidebarOpen ? 'translate-x-0' : 'ltr:-translate-x-full rtl:translate-x-full'} fixed inset-y-0 start-0 z-50 w-[88%] max-w-sm overflow-y-auto border-e border-line bg-surface transition lg:sticky lg:top-[4.5rem] lg:h-[calc(100vh-4.5rem)] lg:w-[380px] lg:max-w-none lg:!translate-x-0`}>
          <div className="sticky top-0 z-10 border-b border-line bg-surface/95 p-5 backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <Link to={`/courses/${course.slug}`} className="flex min-w-0 items-center gap-3">
                <CourseBadge code={course.code} className="h-12 w-12" />
                <span className="min-w-0">
                  <small className="font-black text-brand-ink">{t('learn.backToCourse')}</small>
                  <strong dir="ltr" className="mt-0.5 block truncate text-start font-inter text-sm font-black rtl:text-right">{pick(course, 'title')}</strong>
                </span>
              </Link>
              <button type="button" onClick={() => setSidebarOpen(false)} className="lg:hidden" aria-label={t('learn.closeList')}><X className="h-5 w-5" /></button>
            </div>
          </div>

          <ol className="p-3">
            {lessons.map((item, index) => {
              const active = item.id === lesson.id;
              const itemClock = formatClock(item.durationSeconds);
              return (
                <li key={item.id}>
                  <button type="button" onClick={() => { navigate(`/learn/${course.slug}/${item.id}`); setSidebarOpen(false); }} aria-current={active ? 'true' : undefined} className={`${active ? 'bg-brand-soft ring-1 ring-glory-500/40' : 'hover:bg-subtle'} mb-1 flex w-full items-center gap-3 rounded-xl p-3 text-start transition`}>
                    <span className={`${active ? 'bg-glory-600 text-white' : 'bg-subtle text-muted'} grid h-8 w-8 shrink-0 place-items-center rounded-lg font-inter text-xs font-black`}>
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <strong dir="ltr" className={`${active ? 'text-ink' : 'text-ink/80'} block truncate text-start font-inter text-sm rtl:text-right`}>{pick(item, 'title')}</strong>
                      {itemClock && <small className="mt-0.5 block font-inter text-xs text-muted">{itemClock}</small>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </aside>

        {sidebarOpen && <button type="button" aria-label={t('learn.closeList')} onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-40 bg-black/50 lg:hidden" />}

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-7 lg:px-10 lg:py-9">
          <button type="button" onClick={() => setSidebarOpen(true)} className="btn-secondary mb-5 px-4 py-2 text-sm lg:hidden"><Menu className="h-5 w-5" /> {t('learn.lessonsList')}</button>
          {enrolled ? (
            <LessonPlayer
              lesson={lesson}
              course={course}
              startAt={positions[lesson.id] || 0}
              onProgress={(seconds) => saveLessonPosition(user?.id, lesson.id, seconds)}
            />
          ) : (
            <div className="aspect-video animate-pulse rounded-[1.75rem] bg-slate-900" aria-busy="true" />
          )}

          <div className="mx-auto max-w-5xl py-7">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
              <div className="min-w-0">
                <span className="text-xs font-black text-brand-ink">{t('learn.lessonOf', { current: lessonIndex + 1, total: lessons.length })}</span>
                <h1 dir="ltr" className="mt-2 text-start font-inter text-2xl font-black sm:text-3xl rtl:text-right">{pick(lesson, 'title')}</h1>
                {clock && <p className="mt-3 text-sm font-medium text-muted">{t('learn.duration', { value: clock })}</p>}
              </div>
              {/* A visitor watching the free lesson has no progress to save; invite them in instead. */}
              {user || isDemo ? (
                <button type="button" disabled={saving || isDone} onClick={markComplete} className={`btn-primary shrink-0 ${isDone ? '!bg-brand-soft !text-brand-ink disabled:opacity-100' : ''}`}>
                  {isDone
                    ? <><CheckCircle2 className="h-5 w-5" /> {t('learn.completed')}</>
                    : saving
                      ? t('common.saving')
                      : <>{nextLesson ? t('learn.completeNext') : t('learn.completeCourse')} <ArrowRight className="h-5 w-5 rtl:-scale-x-100" /></>}
                </button>
              ) : (
                <Link to="/login?mode=signup" state={{ from: `/courses/${course.slug}` }} className="btn-primary shrink-0">
                  {t('learn.signUpToContinue')} <ArrowRight className="h-5 w-5 rtl:-scale-x-100" />
                </Link>
              )}
            </div>
            {isDemo && <p className="mt-7 rounded-xl border border-glory-500/30 bg-brand-soft px-4 py-3 text-xs font-bold text-brand-ink">{t('learn.demoNote')}</p>}
            {progressError && <p className="mt-7 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-xs font-bold text-red-700 dark:text-red-300" role="alert">{progressError}</p>}
            <div className="mt-8">
              <LessonResources resources={resources} title={t('learn.resources')} emptyText={t('learn.noResources')} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
