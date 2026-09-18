import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';

export function StatTile({ label, value, hint, icon: Icon, emphasis = false }) {
  return (
    <div className={`card flex items-start gap-4 p-5 ${emphasis ? 'border-glory-500/40 bg-brand-soft/40' : ''}`}>
      {Icon && <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-ink"><Icon className="h-5 w-5" /></span>}
      <div className="min-w-0">
        <p className="text-xs font-bold text-muted">{label}</p>
        <p className="mt-1 truncate text-2xl font-black text-ink">{value}</p>
        {hint && <p className="mt-1 text-xs font-semibold text-muted">{hint}</p>}
      </div>
    </div>
  );
}

export function Panel({ title, subtitle, actions, children, className = '' }) {
  return (
    <section className={`card p-5 sm:p-6 ${className}`}>
      {(title || actions) && (
        <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-lg font-black">{title}</h2>}
            {subtitle && <p className="mt-1 text-xs font-semibold text-muted">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function StatusPill({ tone = 'neutral', children }) {
  const tones = {
    good: 'bg-brand-soft text-brand-ink',
    warning: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
    critical: 'bg-red-500/10 text-red-700 dark:text-red-300',
    neutral: 'bg-subtle text-muted',
  };
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-black ${tones[tone]}`}>{children}</span>;
}

export function ProgressBar({ value }) {
  return (
    <div className="flex min-w-28 items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-subtle">
        <div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </div>
      <span className="w-9 text-end font-inter text-xs font-bold tabular-nums text-muted">{value}%</span>
    </div>
  );
}

// columns: [{ key, header, render?, numeric? }]
export function DataTable({ columns, rows, rowKey = 'id', empty }) {
  if (!rows.length) {
    return <p className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm font-bold text-muted">{empty}</p>;
  }

  return (
    <div className="-mx-5 overflow-x-auto sm:-mx-6">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-y border-line bg-subtle text-xs text-muted">
            {columns.map((column) => (
              <th key={column.key} scope="col" className={`whitespace-nowrap px-4 py-3 font-black first:ps-5 last:pe-5 sm:first:ps-6 sm:last:pe-6 ${column.numeric ? 'text-end' : 'text-start'}`}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row[rowKey] ?? index} className="border-b border-line last:border-0 hover:bg-subtle/60">
              {columns.map((column) => (
                <td key={column.key} className={`px-4 py-3 align-middle font-semibold text-ink first:ps-5 last:pe-5 sm:first:ps-6 sm:last:pe-6 ${column.numeric ? 'whitespace-nowrap text-end font-inter tabular-nums' : 'text-start'}`}>
                  {column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Modal({ title, onClose, children }) {
  const { t } = useI18n();
  const dialogRef = useRef(null);

  useEffect(() => {
    const previous = document.activeElement;
    dialogRef.current?.querySelector('input, select, textarea, button')?.focus();
    const onKey = (event) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      previous?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-black/50">
      <div className="flex min-h-full items-center justify-center p-4" onPointerDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
        <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-lg rounded-3xl border border-line bg-surface p-6 shadow-2xl">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-xl font-black">{title}</h2>
            <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl text-muted hover:bg-subtle hover:text-ink" aria-label={t('common.close')}>
              <X className="h-5 w-5" />
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

export function FormField({ label, children, hint }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-black text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs font-semibold text-muted">{hint}</span>}
    </label>
  );
}

export const inputClass = 'w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm font-bold text-ink outline-none focus:border-glory-500 focus:ring-4 focus:ring-glory-500/15 disabled:opacity-50';
