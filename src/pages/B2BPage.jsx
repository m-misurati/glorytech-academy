import { ArrowRight, Briefcase, Building2, CalendarClock, CheckCircle2, ClipboardCheck, Globe2, Mail, Phone, ServerCog, UserCheck } from 'lucide-react';
import SiteFooter from '../components/SiteFooter';
import SiteHeader from '../components/SiteHeader';
import { site } from '../config/site';
import { b2bCatalog } from '../data/b2b';
import { useI18n } from '../i18n/I18nContext';
import { usePageMeta } from '../lib/meta';

const HIGHLIGHT_ICONS = [Globe2, UserCheck, ClipboardCheck, ServerCog, ClipboardCheck, CalendarClock];

// Dedicated corporate-training page: the pitch, formats, full catalogue and the request form.
export default function B2BPage() {
  const { t, pick } = useI18n();
  usePageMeta({ title: t('b2b.title'), description: t('b2b.subtitle') });

  const mailto = `mailto:${site.email}?subject=${encodeURIComponent(t('b2b.mailSubject'))}&body=${encodeURIComponent(t('b2b.mailBody'))}`;

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <SiteHeader />
      <main>
        <section className="border-b border-line bg-subtle">
          <div className="mx-auto max-w-4xl px-5 py-16 text-center lg:px-8 lg:py-24">
            <span className="section-tag"><Building2 className="h-3.5 w-3.5" /> {t('b2b.tag')}</span>
            <h1 className="mt-6 text-4xl font-black leading-tight sm:text-5xl">{t('b2b.title')}</h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg font-medium leading-9 text-muted">{t('b2b.subtitle')}</p>
            <a href={mailto} className="btn-primary mt-8 px-7 py-4">
              {t('b2b.cta')} <ArrowRight className="h-5 w-5 rtl:-scale-x-100" />
            </a>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
          <h2 className="text-2xl font-black">{t('b2b.highlightsTitle')}</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {t('b2b.highlights').map((highlight, index) => {
              const Icon = HIGHLIGHT_ICONS[index] || Globe2;
              return (
                <article key={highlight.title} className="card p-6">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-soft text-brand-ink"><Icon className="h-5 w-5" /></span>
                  <h3 className="mt-4 font-black">{highlight.title}</h3>
                  <p className="mt-2 text-sm font-medium leading-7 text-muted">{highlight.text}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="border-y border-line bg-subtle py-16">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <h2 className="text-2xl font-black">{t('b2b.formatsTitle')}</h2>
            <p className="mt-2 max-w-2xl font-medium text-muted">{t('b2b.formatsSubtitle')}</p>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {t('b2b.formats').map((format) => (
                <article key={format.title} className="flex flex-col rounded-2xl border border-line bg-surface p-6">
                  <h3 className="font-black">{format.title}</h3>
                  <p className="mt-2 flex-1 text-sm font-medium leading-7 text-muted">{format.text}</p>
                  <ul className="mt-5 space-y-2 border-t border-line pt-4">
                    {format.points.map((point) => (
                      <li key={point} className="flex items-start gap-2 text-[13px] font-bold text-muted">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
          <h2 className="text-2xl font-black">{t('b2b.catalogTitle')}</h2>
          <p className="mt-2 font-medium text-muted">{t('b2b.catalogSubtitle')}</p>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {b2bCatalog.map((group) => (
              <article key={group.id} className="flex flex-col rounded-2xl border border-line bg-surface p-6">
                <div className="flex items-center gap-3">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-line bg-white">
                    {group.logo
                      ? <img src={`/assets/tech/${group.logo}.svg`} alt="" className="h-6 w-7 object-contain" loading="lazy" />
                      : <Briefcase className="h-6 w-6 text-brand" />}
                  </span>
                  <h3 className="font-black leading-tight">{pick(group, 'title')}</h3>
                </div>
                <ul className="mt-5 space-y-2">
                  {group.items.map((item) => (
                    <li key={item} dir="ltr" className="flex items-center gap-2 text-start text-[13px] font-bold text-muted rtl:flex-row-reverse rtl:text-right">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                      {item}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
          <p className="mt-6 text-sm font-bold text-brand-ink">{t('b2b.more')}</p>
        </section>

        <section className="border-y border-line bg-subtle py-16">
          <div className="mx-auto grid max-w-7xl gap-12 px-5 lg:grid-cols-2 lg:px-8">
            <div>
              <h2 className="text-2xl font-black">{t('b2b.audienceTitle')}</h2>
              <div className="mt-6 flex flex-wrap gap-3">
                {t('b2b.audience').map((item) => (
                  <span key={item} className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-black text-ink">{item}</span>
                ))}
              </div>
              <h2 className="mt-12 text-2xl font-black">{t('b2b.pricingTitle')}</h2>
              <p className="mt-3 font-medium leading-8 text-muted">{t('b2b.pricingText')}</p>
              <ul className="mt-5 space-y-3">
                {t('b2b.pricingPoints').map((point) => (
                  <li key={point} className="flex items-start gap-2 text-sm font-bold text-muted">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-2xl font-black">{t('b2b.stepsTitle')}</h2>
              <ol className="mt-6 space-y-3">
                {t('b2b.steps').map((step, index) => (
                  <li key={step} className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-4 text-sm font-medium leading-7 text-muted">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-soft font-inter text-xs font-black text-brand-ink">{index + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section className="px-5 py-16 lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-col items-start gap-6 rounded-[2rem] bg-[#0f1a15] p-8 text-white sm:p-12 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-black sm:text-3xl">{t('b2b.ctaTitle')}</h2>
              <p className="mt-2 max-w-xl font-medium leading-8 text-white/70">{t('b2b.ctaText')}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a href={mailto} className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 font-black text-[#0f1a15]"><Mail className="h-5 w-5" /> <span dir="ltr">{site.email}</span></a>
              <a href={`tel:${site.phone}`} className="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3.5 font-black text-white"><Phone className="h-5 w-5" /> <span dir="ltr">{site.phoneDisplay}</span></a>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
