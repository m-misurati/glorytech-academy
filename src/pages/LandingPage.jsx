import { useMemo, useState } from 'react';
import { ArrowRight, Mail, Phone, Search, Sparkles } from 'lucide-react';
import B2BSection from '../components/B2BSection';
import CourseCard from '../components/CourseCard';
import Hero from '../components/Hero';
import { TelegramIcon } from '../components/icons';
import InstructorCard from '../components/InstructorCard';
import SiteFooter from '../components/SiteFooter';
import SiteHeader from '../components/SiteHeader';
import { site } from '../config/site';
import { useCatalog } from '../context/CatalogContext';
import { upcomingTracks } from '../data/upcoming';
import { useI18n } from '../i18n/I18nContext';
import { usePageMeta } from '../lib/meta';

function SectionHeading({ tag, title, subtitle, center = false }) {
  return (
    <div className={center ? 'mx-auto max-w-3xl text-center' : 'max-w-3xl'}>
      <span className="section-tag">{tag}</span>
      <h2 className="mt-5 text-3xl font-black leading-tight sm:text-4xl">{title}</h2>
      {subtitle && <p className="mt-4 font-medium leading-8 text-muted">{subtitle}</p>}
    </div>
  );
}

function UpcomingTrack({ track }) {
  const { t, lang, pick } = useI18n();
  const name = lang === 'ar' && track.nameAr ? track.nameAr : track.name;

  return (
    <article className="flex flex-col rounded-2xl border border-line bg-surface p-5 transition hover:-translate-y-1 hover:border-glory-500/60 hover:shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-20 items-center gap-3 rounded-2xl border border-line bg-white px-4">
          {track.logos.map((logo) => (
            <img key={logo} src={`/assets/tech/${logo}.svg`} alt="" className={`${track.logos.length > 2 ? 'h-9 w-10' : track.logos.length === 2 ? 'h-10 w-14' : 'h-12 w-20'} object-contain`} loading="lazy" />
          ))}
        </div>
        <span className="rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-black text-brand-ink">{t('upcoming.soon')}</span>
      </div>
      <h3 dir={track.nameAr && lang === 'ar' ? undefined : 'ltr'} className="mt-5 text-start text-lg font-black text-ink rtl:text-right">{name}</h3>
      <p className="mt-1 text-sm font-medium text-muted">{pick(track, 'category')}</p>
    </article>
  );
}

export default function LandingPage() {
  const { t } = useI18n();
  const { availableCourses, instructors } = useCatalog();
  const [query, setQuery] = useState('');
  usePageMeta();

  const filteredCourses = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return availableCourses;
    return availableCourses.filter((course) => [course.title, course.titleEn, course.code, course.description, course.descriptionEn]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(normalized));
  }, [query, availableCourses]);

  const contactCards = [
    { icon: Mail, label: t('contact.email'), value: site.email, href: `mailto:${site.email}` },
    { icon: Phone, label: t('contact.phone'), value: site.phoneDisplay, href: `tel:${site.phone}` },
    { icon: TelegramIcon, label: t('contact.telegram'), value: site.telegramHandle, href: site.telegramUrl, external: true },
  ];

  return (
    <div className="min-h-screen overflow-x-clip bg-canvas text-ink">
      <SiteHeader />
      <main>
        <Hero />

        <section id="courses" className="py-20 lg:py-28">
          {/* Heading, search and cards share one width so their edges line up. */}
          <div className="mx-auto max-w-5xl px-5 lg:px-0">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <SectionHeading tag={t('courses.tag')} title={t('courses.title')} subtitle={t('courses.subtitle')} />
              <label className="field w-full rounded-full px-5 lg:max-w-sm">
                <Search className="h-5 w-5 text-brand" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} type="search" placeholder={t('courses.searchPlaceholder')} aria-label={t('courses.searchLabel')} />
              </label>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2">
              {filteredCourses.map((course) => <CourseCard key={course.id} course={course} />)}
            </div>
            {filteredCourses.length === 0 && <div className="mt-12 rounded-3xl border border-dashed border-line p-12 text-center font-bold text-muted">{t('courses.empty')}</div>}
          </div>
        </section>

        <section id="upcoming" className="border-y border-line bg-subtle py-20 lg:py-28">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <SectionHeading center tag={<><Sparkles className="h-3.5 w-3.5" /> {t('upcoming.tag')}</>} title={t('upcoming.title')} subtitle={t('upcoming.subtitle')} />
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {upcomingTracks.map((track) => <UpcomingTrack key={track.id} track={track} />)}
            </div>
            <div className="mt-10 text-center">
              <a href={site.telegramUrl} target="_blank" rel="noreferrer" className="btn-secondary">
                <TelegramIcon className="h-5 w-5 text-[#229ED9]" /> {t('upcoming.notify')}
              </a>
            </div>
          </div>
        </section>

        <B2BSection />

        <section id="instructors" className="py-20 lg:py-28">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <SectionHeading tag={t('instructors.tag')} title={t('instructors.title')} subtitle={t('instructors.subtitle')} />
            <div className="mt-12 grid gap-7">
              {instructors.map((instructor) => <InstructorCard key={instructor.id} instructor={instructor} />)}
            </div>
          </div>
        </section>

        <section className="px-5 lg:px-8">
          <div className="relative mx-auto flex max-w-7xl flex-col items-start gap-6 overflow-hidden rounded-[2rem] bg-[#0f1a15] p-8 text-white sm:p-12 lg:flex-row lg:items-center lg:justify-between">
            <div className="pointer-events-none absolute -top-24 end-[-6rem] h-72 w-72 rounded-full bg-[#229ED9]/25 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-28 start-[-4rem] h-72 w-72 rounded-full bg-glory-500/25 blur-2xl" />
            <div className="relative flex items-start gap-5">
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-[#229ED9] shadow-lg"><TelegramIcon className="h-9 w-9 text-white" /></span>
              <div>
                <h2 className="text-2xl font-black sm:text-3xl">{t('telegram.title')}</h2>
                <p className="mt-2 max-w-xl font-medium leading-8 text-white/70">{t('telegram.text')}</p>
                <p dir="ltr" className="mt-1 text-start font-inter font-bold text-[#7cc8ee] rtl:text-right">{site.telegramHandle}</p>
              </div>
            </div>
            <a href={site.telegramUrl} target="_blank" rel="noreferrer" className="relative inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-7 py-4 font-black text-[#0f1a15] transition hover:bg-[#e7f5fc]">
              {t('telegram.cta')} <ArrowRight className="h-5 w-5 rtl:-scale-x-100" />
            </a>
          </div>
        </section>

        <section id="contact" className="border-t border-line bg-subtle py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <SectionHeading center tag={t('contact.tag')} title={t('contact.title')} subtitle={t('contact.subtitle')} />
            <div className="mx-auto mt-12 grid max-w-5xl gap-4 md:grid-cols-3">
              {contactCards.map((card) => (
                <a key={card.label} href={card.href} target={card.external ? '_blank' : undefined} rel={card.external ? 'noreferrer' : undefined} className="card group flex items-center gap-4 p-5 transition hover:border-glory-500">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-ink"><card.icon className="h-6 w-6" /></span>
                  <span className="min-w-0">
                    <small className="block text-xs font-black text-muted">{card.label}</small>
                    <strong dir="ltr" className="mt-1 block truncate text-start text-sm font-black text-ink group-hover:text-brand-ink rtl:text-right">{card.value}</strong>
                  </span>
                </a>
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
