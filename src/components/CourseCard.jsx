import { ArrowRight, BookOpen, Clock3, Play, Tag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCatalog } from '../context/CatalogContext';
import { getFirstLesson } from '../data/courses';
import { useI18n } from '../i18n/I18nContext';
import CourseBadge from './CourseBadge';

export default function CourseCard({ course, dashboard = false, progress = 0 }) {
  const { t, pick, formatMinutes, formatMoney } = useI18n();
  const { getInstructor } = useCatalog();
  const instructor = getInstructor(course.instructorId);
  const firstLesson = getFirstLesson(course);
  const href = dashboard && firstLesson ? `/learn/${course.slug}/${firstLesson.id}` : `/courses/${course.slug}`;
  const title = pick(course, 'title');
  const duration = formatMinutes(course.durationMinutes);

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-[0_12px_40px_rgba(15,26,21,.06)] transition duration-300 focus-within:-translate-y-1 hover:-translate-y-1 hover:shadow-[0_22px_60px_rgba(15,26,21,.12)]">
      <div className="relative aspect-[16/9] overflow-hidden bg-slate-900">
        <img src={course.coverImage} alt={t('courses.coverAlt', { title })} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-black/10" />
        <div className="absolute start-4 top-4">
          <CourseBadge code={course.code} className="h-11 w-11 sm:h-12 sm:w-12" />
        </div>
        <span className={`absolute end-4 top-4 rounded-full px-3 py-1 text-[11px] font-black shadow-lg ${course.isFree ? 'bg-glory-600 text-white' : 'bg-white text-slate-900'}`}>
          {course.isFree ? t('courses.freeBadge') : formatMoney(course.price)}
        </span>
        {/* The play affordance makes the whole cover read as clickable. */}
        <span className="absolute inset-0 grid place-items-center opacity-0 transition duration-300 group-hover:opacity-100">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-white/95 text-glory-700 shadow-2xl">
            <Play className="h-7 w-7 fill-current ps-0.5" />
          </span>
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center justify-between gap-3 text-[11px] font-black">
          <span className="text-brand-ink">{pick(course, 'level')}</span>
          {instructor && <span className="truncate text-muted">{t('courses.by', { name: pick(instructor, 'name') })}</span>}
        </div>
        <h3 dir="ltr" className="mt-2 text-start font-inter text-xl font-black leading-snug text-ink rtl:text-right">{title}</h3>
        <p className="mt-2 line-clamp-3 text-[13px] font-medium leading-6 text-muted">{pick(course, 'description')}</p>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-y border-line py-3 text-[11px] font-bold text-muted">
          <span className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-brand" /> {t('common.lessons', { count: course.lessonsCount })}</span>
          {duration && <span className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-brand" /> {duration}</span>}
          <span className="flex items-center gap-2 ms-auto">
            <Tag className="h-4 w-4 text-brand" />
            <span>{t('courses.priceLabel')}:</span>
            <strong className="font-black text-brand-ink">{course.isFree ? t('courses.freePrice') : formatMoney(course.price)}</strong>
          </span>
        </div>

        {dashboard && (
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between text-[11px] font-black">
              <span className="text-muted">{t('courses.progress')}</span>
              <span className="text-brand-ink">{progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-subtle">
              <div className="h-full rounded-full bg-brand" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        <div className="mt-auto pt-5">
          {/* Stretched link: one target covering the card, so a click anywhere opens the course. */}
          <Link
            to={href}
            className="flex items-center justify-between rounded-full bg-glory-600 px-5 py-3.5 text-base font-black text-white shadow-[0_10px_24px_rgba(16,122,70,.28)] transition before:absolute before:inset-0 before:rounded-3xl before:content-[''] hover:bg-glory-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-glory-600"
          >
            <span className="flex items-center gap-2"><Play className="h-4 w-4 fill-current" /> {dashboard ? t('courses.continue') : t('courses.start')}</span>
            <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1" />
          </Link>
        </div>
      </div>
    </article>
  );
}
