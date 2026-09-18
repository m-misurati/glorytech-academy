import { ArrowRight, BadgeCheck, Cpu, GraduationCap, Mail, Phone } from 'lucide-react';
import SiteFooter from '../components/SiteFooter';
import SiteHeader from '../components/SiteHeader';
import { site } from '../config/site';
import { useI18n } from '../i18n/I18nContext';
import { usePageMeta } from '../lib/meta';

const STEP_ICONS = [Mail, GraduationCap, Cpu, BadgeCheck];

// Recruiting page for new instructors, linked from the main navigation.
export default function TeachPage() {
  const { t } = useI18n();
  usePageMeta({ title: t('teach.title'), description: t('teach.intro') });

  const mailto = `mailto:${site.email}?subject=${encodeURIComponent(t('teach.mailSubject'))}&body=${encodeURIComponent(t('teach.mailBody'))}`;

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <SiteHeader />
      <main>
        <section className="border-b border-line bg-subtle">
          <div className="mx-auto max-w-4xl px-5 py-16 text-center lg:px-8 lg:py-24">
            <span className="section-tag">{t('teach.tag')}</span>
            <h1 className="mt-6 text-4xl font-black leading-tight sm:text-5xl">{t('teach.title')}</h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg font-medium leading-9 text-muted">{t('teach.intro')}</p>
            <a href={mailto} className="btn-primary mt-8 px-7 py-4">
              {t('teach.cta')} <ArrowRight className="h-5 w-5 rtl:-scale-x-100" />
            </a>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
          <h2 className="text-2xl font-black">{t('teach.fieldsTitle')}</h2>
          <p className="mt-3 max-w-2xl font-medium leading-8 text-muted">{t('teach.fieldsText')}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            {t('teach.fields').map((field) => (
              <span key={field} className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-black text-ink">{field}</span>
            ))}
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-12 border-t border-line px-5 py-16 lg:grid-cols-2 lg:px-8">
          <div>
            <h2 className="text-2xl font-black">{t('teach.requirementsTitle')}</h2>
            <ul className="mt-6 space-y-4">
              {t('teach.requirements').map((item) => (
                <li key={item} className="flex gap-3 text-sm font-medium leading-8 text-muted">
                  <BadgeCheck className="mt-1 h-5 w-5 shrink-0 text-brand" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-2xl font-black">{t('teach.stepsTitle')}</h2>
            <ol className="mt-6 space-y-4">
              {t('teach.steps').map((step, index) => {
                const Icon = STEP_ICONS[index] || Mail;
                return (
                  <li key={step} className="flex items-start gap-4 rounded-2xl border border-line p-4">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-ink"><Icon className="h-5 w-5" /></span>
                    <span className="text-sm font-medium leading-8 text-muted"><strong className="font-inter text-brand-ink">{index + 1}.</strong> {step}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        <section className="px-5 pb-20 lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-col items-start gap-6 rounded-[2rem] bg-[#0f1a15] p-8 text-white sm:p-12 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-black sm:text-3xl">{t('teach.contactTitle')}</h2>
              <p className="mt-2 max-w-xl font-medium leading-8 text-white/70">{t('teach.contactText')}</p>
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
