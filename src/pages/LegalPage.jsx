import { Navigate, useParams } from 'react-router-dom';
import SiteFooter from '../components/SiteFooter';
import SiteHeader from '../components/SiteHeader';
import { site } from '../config/site';
import { useI18n } from '../i18n/I18nContext';
import { usePageMeta } from '../lib/meta';

const PAGES = { terms: 'terms', privacy: 'privacy' };

// Terms of use and privacy policy. The text lives in src/i18n/messages.js so both languages stay together.
export default function LegalPage() {
  const { page } = useParams();
  const { t, lang, formatDate } = useI18n();
  const key = PAGES[page];
  usePageMeta({ title: key ? t(`legal.${key}.title`) : undefined, description: key ? t(`legal.${key}.intro`) : undefined });

  if (!key) return <Navigate to="/404" replace />;

  const sections = t(`legal.${key}.sections`);
  const updated = formatDate('2026-09-18', { dateStyle: 'long' });

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-5 py-14 lg:px-8 lg:py-20">
        <span className="section-tag">{t('legal.tag')}</span>
        <h1 className="mt-5 text-3xl font-black sm:text-4xl">{t(`legal.${key}.title`)}</h1>
        <p className="mt-3 text-sm font-bold text-muted">{t('legal.updated', { date: updated })}</p>
        <p className="mt-6 text-lg font-medium leading-9 text-muted">{t(`legal.${key}.intro`)}</p>

        <div className="mt-10 space-y-8">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-xl font-black">{section.title}</h2>
              <ul className="mt-3 space-y-3">
                {section.items.map((item) => (
                  <li key={item} className="flex gap-3 text-sm font-medium leading-8 text-muted">
                    <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="card mt-12 p-6">
          <h2 className="font-black">{t('legal.contactTitle')}</h2>
          <p className="mt-2 text-sm font-medium leading-8 text-muted">{t('legal.contactText')}</p>
          <div className="mt-4 flex flex-wrap gap-4 text-sm font-black">
            <a href={`mailto:${site.email}`} dir="ltr" className="text-brand-ink hover:underline">{site.email}</a>
            <a href={`tel:${site.phone}`} dir="ltr" className="text-brand-ink hover:underline">{site.phoneDisplay}</a>
          </div>
        </div>

        <p className="mt-8 text-xs font-bold text-muted">{lang === 'ar' ? t('legal.draftNoteAr') : t('legal.draftNoteEn')}</p>
      </main>
      <SiteFooter />
    </div>
  );
}
