import { Mail, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { site } from '../config/site';
import { useI18n } from '../i18n/I18nContext';
import Brand from './Brand';
import { TelegramIcon } from './icons';

const quickLinks = ['courses', 'upcoming', 'instructors'];

export default function SiteFooter() {
  const { t } = useI18n();

  return (
    <footer className="border-t border-line bg-subtle">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:grid-cols-2 lg:grid-cols-5 lg:px-8">
        <div className="sm:col-span-2">
          <Brand />
          <p className="mt-5 max-w-md text-sm font-medium leading-7 text-muted">{t('footer.tagline')}</p>
          <a href={site.telegramUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#229ED9] px-4 py-2 text-sm font-black text-white">
            <TelegramIcon className="h-4 w-4" /> <span dir="ltr">{site.telegramHandle}</span>
          </a>
        </div>
        <div>
          <h3 className="font-black">{t('footer.quickLinks')}</h3>
          <div className="mt-4 flex flex-col gap-3 text-sm font-bold text-muted">
            {quickLinks.map((key) => <Link key={key} to={{ pathname: '/', hash: `#${key}` }} className="hover:text-brand-ink">{t(`nav.${key}`)}</Link>)}
            <Link to="/login" className="hover:text-brand-ink">{t('nav.login')}</Link>
          </div>
        </div>
        <div>
          <h3 className="font-black">{t('footer.legal')}</h3>
          <div className="mt-4 flex flex-col gap-3 text-sm font-bold text-muted">
            <Link to="/legal/terms" className="hover:text-brand-ink">{t('footer.terms')}</Link>
            <Link to="/legal/privacy" className="hover:text-brand-ink">{t('footer.privacy')}</Link>
          </div>
        </div>
        <div>
          <h3 className="font-black">{t('footer.contact')}</h3>
          <div className="mt-4 flex flex-col gap-3 text-sm font-bold text-muted">
            <a href={`mailto:${site.email}`} className="inline-flex items-center gap-2 hover:text-brand-ink"><Mail className="h-4 w-4 shrink-0" /> <span dir="ltr" className="break-all">{site.email}</span></a>
            <a href={`tel:${site.phone}`} className="inline-flex items-center gap-2 hover:text-brand-ink"><Phone className="h-4 w-4 shrink-0" /> <span dir="ltr">{site.phoneDisplay}</span></a>
          </div>
        </div>
      </div>
      <div className="border-t border-line px-5 py-6 text-center text-xs font-bold text-muted">
        © {new Date().getFullYear()} GloryTech Academy — {t('footer.rights')}
      </div>
    </footer>
  );
}
