import { ArrowRight, BadgeCheck, BookOpen, Sparkles } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router-dom';
import CourseCard from '../components/CourseCard';
import SiteFooter from '../components/SiteFooter';
import SiteHeader from '../components/SiteHeader';
import { useCatalog } from '../context/CatalogContext';
import { useI18n } from '../i18n/I18nContext';
import { usePageMeta } from '../lib/meta';

export default function InstructorPage() {
  const { slug } = useParams();
  const { getInstructorBySlug, getCoursesByInstructor } = useCatalog();
  const { t, pick } = useI18n();
  const instructor = getInstructorBySlug(slug);
  usePageMeta({ title: instructor ? pick(instructor, 'name') : undefined, description: instructor ? pick(instructor, 'bio') : undefined });

  if (!instructor) return <Navigate to="/404" replace />;

  const instructorCourses = getCoursesByInstructor(instructor.id);
  const expertise = pick(instructor, 'expertise');
  const certifications = [...instructor.certifications].sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)));

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <SiteHeader />
      <main>
        <section className="border-b border-line bg-subtle">
          <div className="mx-auto grid max-w-7xl items-end gap-10 px-5 pt-10 lg:grid-cols-[.9fr_1.1fr] lg:px-8">
            <div className="relative mx-auto h-[26rem] w-full max-w-md overflow-hidden sm:h-[32rem]">
              <div className="absolute inset-x-6 bottom-0 top-20 rounded-t-full bg-glory-500/15" />
              <img src={instructor.photo} alt={pick(instructor, 'name')} className="absolute inset-0 h-full w-full object-contain object-bottom" />
            </div>
            <div className="pb-12 lg:pb-16">
              <Link to={{ pathname: '/', hash: '#instructors' }} className="inline-flex items-center gap-2 text-sm font-black text-muted hover:text-brand-ink">
                <ArrowRight className="h-4 w-4 ltr:rotate-180" /> {t('instructors.back')}
              </Link>
              <span className="section-tag mt-6 flex w-fit">{t('instructors.about')}</span>
              <h1 className="mt-4 text-4xl font-black leading-tight sm:text-5xl">{pick(instructor, 'name')}</h1>
              <p className="mt-3 text-lg font-bold text-brand-ink">{pick(instructor, 'title')}</p>
              <p className="mt-6 max-w-2xl text-lg font-medium leading-9 text-muted">{pick(instructor, 'bio')}</p>
              {expertise.length > 0 && (
                <div className="mt-6">
                  <h2 className="flex items-center gap-2 text-sm font-black"><Sparkles className="h-4 w-4 text-brand" /> {t('instructors.expertise')}</h2>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {expertise.map((area) => <span key={area} className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-black text-ink">{area}</span>)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {instructor.certifications.length > 0 && (
          <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
            <h2 className="flex items-center gap-2 text-2xl font-black"><BadgeCheck className="h-6 w-6 text-brand" /> {t('instructors.certifications')}</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {certifications.map((certification) => (
                <article key={certification.name} className={`card flex flex-col items-center p-5 text-center ${certification.featured ? 'border-glory-500/50 sm:col-span-2' : ''}`}>
                  <div className={`w-full overflow-hidden rounded-xl border border-line bg-white/95 p-2 transition dark:border-white/15 dark:bg-white/10 dark:backdrop-blur-sm ${certification.featured ? 'h-40' : 'h-28'}`}>
                    <img src={certification.logo} alt="" className="h-full w-full object-contain filter dark:drop-shadow-[0_2px_8px_rgba(255,255,255,0.15)]" loading="lazy" />
                  </div>
                  <p className="mt-4 text-xs font-black text-brand-ink">{certification.issuer}</p>
                  <h3 dir="ltr" className={`mt-1 font-inter font-black ${certification.featured ? 'text-base' : 'text-sm'}`}>{certification.name}</h3>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="border-t border-line bg-subtle py-16">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <h2 className="flex items-center gap-2 text-2xl font-black"><BookOpen className="h-6 w-6 text-brand" /> {t('instructors.coursesTitle')}</h2>
            {instructorCourses.length ? (
              <div className="mt-8 grid gap-7 lg:grid-cols-2">
                {instructorCourses.map((course) => <CourseCard key={course.id} course={course} />)}
              </div>
            ) : (
              <p className="mt-6 font-bold text-muted">{t('instructors.noCourses')}</p>
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
