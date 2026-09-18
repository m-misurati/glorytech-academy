import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import SiteHeader from '../components/SiteHeader';
import { useI18n } from '../i18n/I18nContext';

export default function NotFoundPage() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <SiteHeader compact />
      <main className="grid min-h-[75vh] place-items-center p-6 text-center">
        <div>
          <p className="font-inter text-8xl font-black text-brand">404</p>
          <h1 className="mt-4 text-3xl font-black">{t('notFound.title')}</h1>
          <p className="mt-3 font-medium text-muted">{t('notFound.text')}</p>
          <Link to="/" className="btn-primary mt-7">{t('common.backHome')} <ArrowRight className="h-5 w-5 rtl:-scale-x-100" /></Link>
        </div>
      </main>
    </div>
  );
}
