import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/I18nContext';

export default function Brand({ compact = false }) {
  const { t } = useI18n();

  return (
    <Link to="/" className="inline-flex shrink-0 items-center gap-2.5" aria-label={t('nav.homeLabel')}>
      <img src="/assets/glorytech-mark.png" alt="" className={`${compact ? 'h-10 w-10' : 'h-12 w-12'} object-contain`} />
      <span dir="ltr" className="leading-none">
        <strong className={`block font-inter ${compact ? 'text-sm' : 'text-base'} font-black tracking-tight text-ink`}>GLORYTECH</strong>
        <small className={`block font-inter ${compact ? 'text-[11px]' : 'text-xs'} font-black tracking-[0.34em] text-brand-ink`}>ACADEMY</small>
      </span>
    </Link>
  );
}
