import { ArrowRight, Building2, GraduationCap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/I18nContext';

// Short teaser on the landing page; the detail lives on /b2b and /teach.
export default function B2BSection() {
  const { t } = useI18n();

  const cards = [
    {
      to: '/b2b',
      icon: Building2,
      tag: t('b2b.tag'),
      title: t('b2b.title'),
      text: t('b2b.teaser'),
      cta: t('b2b.cta'),
    },
    {
      to: '/teach',
      icon: GraduationCap,
      tag: t('teach.tag'),
      title: t('teach.title'),
      text: t('teach.teaser'),
      cta: t('teach.cta'),
    },
  ];

  return (
    <section id="b2b" className="border-y border-line bg-subtle py-20 lg:py-24">
      <div className="mx-auto grid max-w-7xl gap-5 px-5 md:grid-cols-2 lg:px-8">
        {cards.map((card) => (
          <Link
            key={card.to}
            to={card.to}
            className="group flex flex-col rounded-3xl border border-line bg-surface p-8 transition hover:-translate-y-1 hover:border-glory-500/60 hover:shadow-xl"
          >
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-soft text-brand-ink">
              <card.icon className="h-6 w-6" />
            </span>
            <span className="mt-6 text-xs font-black text-brand-ink">{card.tag}</span>
            <h2 className="mt-2 text-2xl font-black leading-tight">{card.title}</h2>
            <p className="mt-3 flex-1 font-medium leading-8 text-muted">{card.text}</p>
            <span className="mt-6 inline-flex items-center gap-2 font-black text-brand-ink">
              {card.cta}
              <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
