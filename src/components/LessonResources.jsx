import { Download, ExternalLink, FileSpreadsheet, FileText, Link2, Paperclip, Presentation } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import { resourceDownloadUrl } from '../lib/drive';

const ICONS = { slides: Presentation, pdf: FileText, doc: FileText, sheet: FileSpreadsheet, file: Paperclip, link: Link2 };

export default function LessonResources({ resources, title, emptyText, lessonTitles }) {
  const { t, pick } = useI18n();

  return (
    <section className="card p-6">
      <h2 className="flex items-center gap-3 font-black"><Paperclip className="h-5 w-5 text-brand" /> {title}</h2>
      {resources.length === 0 ? (
        <p className="mt-4 text-sm font-medium text-muted">{emptyText}</p>
      ) : (
        <ul className="mt-4 grid gap-3">
          {resources.map((resource) => {
            const Icon = ICONS[resource.kind] || Paperclip;
            const download = resourceDownloadUrl(resource.url, resource.kind);
            return (
              <li key={resource.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line p-3 ps-4">
                <span className="flex min-w-0 items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-ink"><Icon className="h-5 w-5" /></span>
                  <span className="min-w-0">
                    <strong className="block truncate text-sm">{pick({ title: resource.title, titleEn: resource.title_en }, 'title')}</strong>
                    <small className="text-xs font-bold text-muted">
                      {t(`portal.kinds.${resource.kind}`)}
                      {lessonTitles?.[resource.lesson_id] && <> · {lessonTitles[resource.lesson_id]}</>}
                    </small>
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <a href={resource.url} target="_blank" rel="noreferrer" className="btn-secondary px-4 py-2 text-xs">
                    <ExternalLink className="h-4 w-4" /> {t('common.open')}
                  </a>
                  <a href={download} target="_blank" rel="noreferrer" className="btn-primary px-4 py-2 text-xs">
                    <Download className="h-4 w-4" /> {t('common.download')}
                  </a>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
