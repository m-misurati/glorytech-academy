import { ArrowRight, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCatalog } from '../context/CatalogContext';
import { useI18n } from '../i18n/I18nContext';
import CourseBadge from './CourseBadge';

export default function InstructorCard({ instructor }) {
  const { t, pick } = useI18n();
  const { getCoursesByInstructor } = useCatalog();
  const instructorCourses = getCoursesByInstructor(instructor.id);
  // CCIE leads, then the next few badges, then a counter for the rest.
  const featured = instructor.certifications.find((item) => item.featured);
  const others = instructor.certifications.filter((item) => !item.featured);
  const shown = others.slice(0, 5);
  const extra = others.length - shown.length;

  return (
    <article className="grid overflow-hidden rounded-[2rem] border border-line bg-surface shadow-[0_12px_40px_rgba(15,26,21,.06)] md:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]">
      <Link to={`/instructors/${instructor.slug}`} className="relative block min-h-[22rem] overflow-hidden bg-gradient-to-b from-brand-soft to-subtle">
        <div className="absolute inset-x-10 bottom-0 top-16 rounded-t-full bg-glory-500/15" />
        <img src={instructor.photo} alt={pick(instructor, 'name')} className="absolute inset-0 h-full w-full object-contain object-bottom" />
      </Link>

      <div className="flex flex-col p-7 sm:p-9">
        <h3 className="text-2xl font-black leading-snug">{pick(instructor, 'name')}</h3>
        <p className="mt-1 font-bold text-brand-ink">{pick(instructor, 'title')}</p>
        <p className="mt-4 line-clamp-4 text-sm font-medium leading-7 text-muted">{pick(instructor, 'bio')}</p>

        {instructor.certifications.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {featured && (
              <span className="grid h-20 w-28 place-items-center rounded-2xl border-2 border-glory-500/50 bg-white/95 p-2 shadow-sm transition hover:scale-105 dark:border-glory-500/60 dark:bg-white/10 dark:backdrop-blur-sm" title={`${featured.issuer} — ${featured.name}`}>
                <img src={featured.logo} alt={`${featured.issuer} ${featured.name}`} className="max-h-full max-w-full object-contain filter dark:drop-shadow-[0_2px_8px_rgba(255,255,255,0.15)]" />
              </span>
            )}
            {shown.map((certification) => (
              <span key={certification.name} className="grid h-14 w-20 place-items-center rounded-xl border border-line bg-white/95 p-1.5 transition hover:scale-105 dark:border-white/15 dark:bg-white/10 dark:backdrop-blur-sm" title={`${certification.issuer} — ${certification.name}`}>
                <img src={certification.logo} alt={`${certification.issuer} ${certification.name}`} className="max-h-full max-w-full object-contain filter dark:drop-shadow-[0_2px_6px_rgba(255,255,255,0.12)]" loading="lazy" />
              </span>
            ))}
            {extra > 0 && <span className="grid h-14 min-w-14 place-items-center rounded-xl border border-line bg-subtle px-3 font-inter text-sm font-black text-brand-ink">+{extra}</span>}
          </div>
        )}

        <h4 className="mt-6 flex items-center gap-2 text-sm font-black"><BookOpen className="h-4 w-4 text-brand" /> {t('instructors.coursesTitle')}</h4>
        {instructorCourses.length ? (
          <ul className="mt-3 space-y-2">
            {instructorCourses.map((course) => (
              <li key={course.id}>
                <Link to={`/courses/${course.slug}`} className="group flex items-center gap-3 rounded-2xl border border-line p-2.5 pe-4 transition hover:border-glory-500 hover:bg-brand-soft/40">
                  <CourseBadge code={course.code} className="h-12 w-12" />
                  <span className="min-w-0 flex-1">
                    <strong dir="ltr" className="block truncate text-start font-inter text-sm font-black rtl:text-right">{pick(course, 'title')}</strong>
                    <small className="font-bold text-brand-ink">{course.isFree ? t('courses.freeBadge') : pick(course, 'level')}</small>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted transition group-hover:text-brand-ink rtl:-scale-x-100" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm font-bold text-muted">{t('instructors.noCourses')}</p>
        )}

        <Link to={`/instructors/${instructor.slug}`} className="btn-secondary mt-6 self-start px-5 py-3 text-sm">
          {t('instructors.viewProfile')} <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
        </Link>
      </div>
    </article>
  );
}
