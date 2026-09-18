import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BookOpen, Check, Clock3, LockKeyhole, Mail, PlayCircle, Signal } from 'lucide-react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import CourseBadge from '../components/CourseBadge';
import LessonResources from '../components/LessonResources';
import SiteFooter from '../components/SiteFooter';
import SiteHeader from '../components/SiteHeader';
import { site } from '../config/site';
import { useAuth } from '../context/AuthContext';
import { useCatalog } from '../context/CatalogContext';
import { getAllLessons, getFirstLesson } from '../data/courses';
import { useI18n } from '../i18n/I18nContext';
import { usePageMeta } from '../lib/meta';
import { enrollInCourse, getLessonResources, getUserProgress } from '../lib/supabase';

export default function CoursePage() {
  const { slug } = useParams();
  const { getCourseBySlug, getInstructor } = useCatalog();
  const { t, pick, formatMinutes, formatClock, formatMoney } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [enrollError, setEnrollError] = useState('');
  const [completedIds, setCompletedIds] = useState(new Set());
  const [resources, setResources] = useState([]);
  const course = getCourseBySlug(slug);
  const lessonList = useMemo(() => getAllLessons(course), [course]);
  usePageMeta({ title: course ? pick(course, 'title') : undefined, description: course ? pick(course, 'description') : undefined });

  useEffect(() => {
    let active = true;
    getUserProgress(user?.id).then(({ data }) => {
      if (active && data) setCompletedIds(new Set(data.filter((row) => row.completed_at).map((row) => row.lesson_id)));
    });
    return () => { active = false; };
  }, [user?.id]);

  useEffect(() => {
    let active = true;
    const ids = lessonList.map((item) => item.id);
    setResources([]);
    if (!ids.length) return undefined;
    getLessonResources(ids).then(({ data }) => { if (active && data) setResources(data); });
    return () => { active = false; };
  }, [lessonList, user?.id]);

  if (!course) return <Navigate to="/404" replace />;
  if (course.availability === 'coming_soon') return <Navigate to={{ pathname: '/', hash: '#upcoming' }} replace />;

  const instructor = getInstructor(course.instructorId);
  const lessons = lessonList;
  const doneHere = lessons.filter((item) => completedIds.has(item.id)).length;
  const coursePercent = lessons.length ? Math.round((doneHere / lessons.length) * 100) : 0;
  const nextLesson = lessons.find((item) => !completedIds.has(item.id)) || lessons[0];
  const lessonTitles = Object.fromEntries(lessons.map((item) => [item.id, pick(item, 'title')]));
  const title = pick(course, 'title');
  const duration = formatMinutes(course.durationMinutes);

  const startCourse = async () => {
    if (!user) {
      navigate('/login?mode=signup', { state: { from: `/courses/${course.slug}` } });
      return;
    }
    const firstLesson = getFirstLesson(course);
    if (!firstLesson) {
      setEnrollError(t('course.notReady'));
      return;
    }
    setBusy(true);
    setEnrollError('');
    const { error } = await enrollInCourse(user.id, course.id);
    setBusy(false);
    if (error) {
      setEnrollError(t('course.enrollError'));
      return;
    }
    navigate(`/learn/${course.slug}/${firstLesson.id}`);
  };

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <SiteHeader />
      <main>
        <section className="border-b border-line bg-subtle">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-14 lg:grid-cols-[1.1fr_.9fr] lg:px-8 lg:py-20">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <CourseBadge code={course.code} className="h-20 w-20" />
                <span className={`rounded-full px-4 py-1.5 text-xs font-black ${course.isFree ? 'bg-glory-600 text-white' : 'border border-line bg-surface text-ink'}`}>
                  {course.isFree ? t('course.freeBadge') : formatMoney(course.price)}
                </span>
              </div>
              <h1 dir="ltr" className="mt-6 max-w-3xl text-start font-inter text-4xl font-black leading-tight sm:text-5xl rtl:text-right">{title}</h1>
              <p className="mt-6 max-w-2xl text-lg font-medium leading-9 text-muted">{pick(course, 'description')}</p>

              <dl className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm font-bold text-muted">
                <div className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-brand" /><dt className="sr-only">{t('course.lessonsLabel')}</dt><dd>{t('common.lessons', { count: course.lessonsCount })}</dd></div>
                {duration && <div className="flex items-center gap-2"><Clock3 className="h-5 w-5 text-brand" /><dt className="sr-only">{t('course.durationLabel')}</dt><dd>{duration}</dd></div>}
                <div className="flex items-center gap-2"><Signal className="h-5 w-5 text-brand" /><dt className="sr-only">{t('course.levelLabel')}</dt><dd>{pick(course, 'level')}</dd></div>
              </dl>

              {course.isFree ? (
                <button type="button" onClick={startCourse} disabled={busy} className="btn-primary mt-9 px-7 py-4 shadow-lg shadow-glory-900/10">
                  {busy ? t('course.preparing') : user ? t('course.start') : t('course.signupStart')} <ArrowRight className="h-5 w-5 rtl:-scale-x-100" />
                </button>
              ) : (
                <div className="mt-9 max-w-xl rounded-2xl border border-line bg-surface p-5">
                  <strong className="font-black">{t('course.paidTitle')}</strong>
                  <p className="mt-2 text-sm font-medium leading-7 text-muted">{t('course.paidText')}</p>
                  <a href={`mailto:${site.email}?subject=${encodeURIComponent(title)}`} className="btn-primary mt-4 text-sm"><Mail className="h-4 w-4" /> {t('course.contactToEnroll')}</a>
                </div>
              )}
              {enrollError && <p className="mt-4 text-sm font-bold text-red-600 dark:text-red-400" role="alert">{enrollError}</p>}

              {user && doneHere > 0 && (
                <div className="mt-8 max-w-xl rounded-2xl border border-line bg-surface p-5">
                  <div className="flex items-center justify-between gap-4">
                    <strong className="text-sm font-black">{t('course.progressTitle')}</strong>
                    <span className="font-inter text-sm font-black text-brand-ink">{coursePercent}%</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-subtle">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${coursePercent}%` }} />
                  </div>
                  <p className="mt-3 text-xs font-bold text-muted">{t('course.progressDone', { done: doneHere, total: lessons.length })}</p>
                  {nextLesson && (
                    <Link to={`/learn/${course.slug}/${nextLesson.id}`} className="btn-secondary mt-4 px-5 py-2.5 text-sm">
                      {t('course.continueLesson')} <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
                    </Link>
                  )}
                </div>
              )}
            </div>

            <div className="relative overflow-hidden rounded-[2rem] bg-slate-900 shadow-2xl">
              <img src={course.coverImage} alt={t('courses.coverAlt', { title })} className="aspect-[16/11] w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
              <div className="absolute bottom-5 end-5 start-5 flex items-center justify-between gap-4 rounded-2xl border border-white/15 bg-black/60 p-4 text-white backdrop-blur">
                <div className="min-w-0">
                  <small className="text-white/60">{t('course.track')}</small>
                  <strong dir="ltr" className="mt-1 block truncate text-start font-inter rtl:text-right">{pick(course, 'shortTitle') || course.code}</strong>
                </div>
                <PlayCircle className="h-11 w-11 shrink-0 text-glory-400" />
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-10 px-5 py-16 lg:grid-cols-[1.2fr_.8fr] lg:px-8 lg:py-20">
          <div>
            <span className="section-tag">{t('course.contentTag')}</span>
            <h2 className="mt-4 text-3xl font-black">{t('course.contentTitle', { count: lessons.length })}</h2>
            <ol className="mt-7 overflow-hidden rounded-2xl border border-line bg-surface">
              {lessons.map((lesson, index) => {
                const clock = formatClock(lesson.durationSeconds);
                return (
                  <li key={lesson.id} className="flex items-center gap-4 border-b border-line px-4 py-3.5 last:border-0 sm:px-5">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-subtle font-inter text-xs font-black text-muted">{index + 1}</span>
                    <span dir="ltr" className="min-w-0 flex-1 text-start font-inter text-sm font-bold text-ink rtl:text-right">{pick(lesson, 'title')}</span>
                    <span className="flex shrink-0 items-center gap-2 text-xs font-bold text-muted">
                      {clock && <span className="font-inter tabular-nums">{clock}</span>}
                      {lesson.isPreview
                        ? <PlayCircle className="h-4 w-4 text-brand" aria-label={t('course.previewLesson')} />
                        : <LockKeyhole className="h-4 w-4" aria-label={t('course.lockedLesson')} />}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>

          <aside className="space-y-6">
            {resources.length > 0 && (
              <LessonResources resources={resources} title={t('course.resourcesTitle')} emptyText={t('course.resourcesText')} lessonTitles={lessonTitles} />
            )}
            <div className="rounded-[2rem] border border-line bg-[#0f1a15] p-7 text-white">
              <h2 className="text-2xl font-black">{t('course.outcomesTitle')}</h2>
              <ul className="mt-6 space-y-4">
                {pick(course, 'outcomes').map((outcome) => (
                  <li key={outcome} className="flex gap-3 text-sm font-medium leading-7 text-white/75">
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-glory-500"><Check className="h-3.5 w-3.5" /></span>
                    {outcome}
                  </li>
                ))}
              </ul>
            </div>

            {instructor && (
              <Link to={`/instructors/${instructor.slug}`} className="card group flex items-center gap-4 p-5 transition hover:border-glory-500">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-brand-soft">
                  <img src={instructor.photo} alt="" className="h-full w-full object-contain object-bottom" />
                </div>
                <div className="min-w-0 flex-1">
                  <small className="font-black text-brand-ink">{t('course.instructorTag')}</small>
                  <strong className="mt-1 block">{pick(instructor, 'name')}</strong>
                  <span className="mt-1 block truncate text-xs font-bold text-muted">{pick(instructor, 'title')}</span>
                </div>
                <ArrowRight className="h-5 w-5 shrink-0 text-muted transition group-hover:text-brand-ink rtl:-scale-x-100" />
              </Link>
            )}
          </aside>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
