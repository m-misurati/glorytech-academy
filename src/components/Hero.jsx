import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { site } from '../config/site';
import { useI18n } from '../i18n/I18nContext';
import CourseBadge from './CourseBadge';
import { TelegramIcon } from './icons';

export default function Hero() {
  const { t } = useI18n();

  return (
    <section id="home" className="relative overflow-hidden bg-canvas">
      <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(rgb(var(--line))_1px,transparent_1px)] [background-size:22px_22px] [mask-image:linear-gradient(to_bottom,black,transparent_75%)]" />
      <div className="pointer-events-none absolute -top-40 end-[-10rem] h-[32rem] w-[32rem] rounded-full bg-glory-500/10 blur-3xl" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 pb-16 pt-12 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:pb-20 lg:pt-16">
        <div className="animate-rise">
          <span className="section-tag">
            <span className="h-2 w-2 rounded-full bg-brand" />
            {t('hero.badge')}
          </span>

          <h1 className="mt-6 text-4xl font-black leading-[1.3] text-ink sm:text-5xl lg:text-[2.9rem]">
            {t('hero.titleLine1')}
            <span className="mt-1 block text-brand-ink">{t('hero.titleLine2')}</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg font-medium leading-9 text-muted">{t('hero.intro')}</p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link to={{ pathname: '/', hash: '#courses' }} className="btn-primary px-7 py-4 shadow-lg shadow-glory-900/10">
              {t('hero.ctaPrimary')} <ArrowRight className="h-5 w-5 rtl:-scale-x-100" />
            </Link>
            <a href={site.telegramUrl} target="_blank" rel="noreferrer" className="btn-secondary px-7 py-4">
              <TelegramIcon className="h-5 w-5 text-[#229ED9]" /> {t('hero.ctaTelegram')}
            </a>
          </div>
        </div>

        <div className="animate-rise relative mx-auto w-full max-w-xl [animation-delay:.1s] lg:max-w-none">
          <div className="absolute -bottom-4 -end-4 top-8 start-8 rounded-[2.25rem] bg-glory-500/15" />
          <img src="/assets/hero-instructor.jpg" alt={t('hero.imageAlt')} className="relative aspect-[5/4] w-full rounded-[2rem] object-cover shadow-2xl shadow-black/15" />

          <div className="absolute -bottom-6 start-4 flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 pe-5 shadow-xl sm:start-6">
            <div className="flex gap-1.5">
              <CourseBadge code="CCNA 1" className="h-12 w-12" />
              <CourseBadge code="CCNA 4" className="h-12 w-12" />
            </div>
            <div>
              <strong className="block text-sm font-black text-ink">{t('hero.cardFreeTitle')}</strong>
              <span className="text-xs font-black text-brand-ink">{t('hero.cardFreeText')}</span>
            </div>
          </div>
        </div>
      </div>

    </section>
  );
}
