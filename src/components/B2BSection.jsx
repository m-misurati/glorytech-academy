import { ArrowRight, Briefcase, Building2, CalendarClock, ClipboardCheck, Globe2, Mail, Phone, ServerCog, UserCheck } from 'lucide-react';
import { site } from '../config/site';
import { b2bCatalog } from '../data/b2b';
import { useI18n } from '../i18n/I18nContext';

const HIGHLIGHT_ICONS = [Globe2, UserCheck, ClipboardCheck, ServerCog, ClipboardCheck, CalendarClock];

// On-demand corporate training: the pitch, the full catalogue and the request CTA.
export default function B2BSection() {
  const { t, pick } = useI18n();
  const mailto = `mailto:${site.email}?subject=${encodeURIComponent(t('b2b.mailSubject'))}&body=${encodeURIComponent(t('b2b.mailBody'))}`;

  return (
    <section id="b2b" className="border-y border-line bg-subtle py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <span className="section-tag"><Building2 className="h-3.5 w-3.5" /> {t('b2b.tag')}</span>
            <h2 className="mt-5 text-3xl font-black leading-tight sm:text-4xl">{t('b2b.title')}</h2>
            <p className="mt-4 font-medium leading-8 text-muted">{t('b2b.subtitle')}</p>
          </div>
          <a href={mailto} className="btn-primary shrink-0 px-7 py-4">
            {t('b2b.cta')} <ArrowRight className="h-5 w-5 rtl:-scale-x-100" />
          </a>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

        <div className="mt-16">
          <h3 className="text-2xl font-black">{t('b2b.catalogTitle')}</h3>
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
                  <h4 className="font-black leading-tight">{pick(group, 'title')}</h4>
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
        </div>

        <div className="mt-16 grid gap-12 lg:grid-cols-2">
          <div>
            <h3 className="text-2xl font-black">{t('b2b.audienceTitle')}</h3>
            <div className="mt-6 flex flex-wrap gap-3">
              {t('b2b.audience').map((item) => (
                <span key={item} className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-black text-ink">{item}</span>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black">{t('b2b.stepsTitle')}</h3>
            <ol className="mt-6 space-y-3">
              {t('b2b.steps').map((step, index) => (
                <li key={step} className="flex items-start gap-3 text-sm font-medium leading-7 text-muted">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-soft font-inter text-xs font-black text-brand-ink">{index + 1}</span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-start gap-6 rounded-[2rem] bg-[#0f1a15] p-8 text-white sm:p-12 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-2xl font-black sm:text-3xl">{t('b2b.ctaTitle')}</h3>
            <p className="mt-2 max-w-xl font-medium leading-8 text-white/70">{t('b2b.ctaText')}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a href={mailto} className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 font-black text-[#0f1a15]"><Mail className="h-5 w-5" /> <span dir="ltr">{site.email}</span></a>
            <a href={`tel:${site.phone}`} className="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3.5 font-black text-white"><Phone className="h-5 w-5" /> <span dir="ltr">{site.phoneDisplay}</span></a>
          </div>
        </div>
      </div>
    </section>
  );
}
