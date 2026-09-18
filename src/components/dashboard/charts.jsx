import { useState } from 'react';
import { BarChart3, Table2 } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';

// Clean axis ticks: 0 → a round top value in 4 steps.
function niceTicks(max, integer) {
  if (max <= 0) return [0, 1];
  const rough = max / 4;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((factor) => factor * magnitude).find((candidate) => candidate >= rough && (!integer || Number.isInteger(candidate))) || Math.ceil(rough);
  const top = Math.ceil(max / step) * step;
  return Array.from({ length: Math.round(top / step) + 1 }, (_, index) => index * step);
}

function LegendKey({ color }) {
  return <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: color }} />;
}

/**
 * Monthly column chart; one series, or a stacked part-to-whole of several.
 * rows: [{ month: 'YYYY-MM', ...values }]; series: [{ key, label, color }]
 */
export function MonthlyColumns({ title, subtitle, rows, series, format, integer = false }) {
  const { t, formatMonth } = useI18n();
  const [view, setView] = useState('chart');
  const [active, setActive] = useState(null);

  const totals = rows.map((row) => series.reduce((sum, item) => sum + (Number(row[item.key]) || 0), 0));
  const max = Math.max(0, ...totals);
  const ticks = niceTicks(max, integer);
  const top = ticks[ticks.length - 1];
  const lastIndex = rows.length - 1;
  const stacked = series.length > 1;

  return (
    <figure className="card flex flex-col p-5 sm:p-6">
      <figcaption className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-black">{title}</h3>
          {subtitle && <p className="mt-1 text-xs font-semibold text-muted">{subtitle}</p>}
        </div>
        <button type="button" onClick={() => setView(view === 'chart' ? 'table' : 'chart')} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-bold text-muted hover:bg-subtle hover:text-ink">
          {view === 'chart' ? <Table2 className="h-4 w-4" /> : <BarChart3 className="h-4 w-4" />}
          {view === 'chart' ? t('dash.charts.tableView') : t('dash.charts.chartView')}
        </button>
      </figcaption>

      {stacked && (
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold text-muted">
          {series.map((item) => <li key={item.key} className="flex items-center gap-1.5"><LegendKey color={item.color} /> {item.label}</li>)}
        </ul>
      )}

      {view === 'table' ? (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-xs text-muted">
                <th scope="col" className="py-2 text-start font-black">{t('dash.charts.month')}</th>
                {series.map((item) => <th key={item.key} scope="col" className="py-2 text-end font-black">{item.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.month} className="border-b border-line last:border-0">
                  <th scope="row" className="py-2 text-start font-bold">{formatMonth(row.month)}</th>
                  {series.map((item) => <td key={item.key} className="py-2 text-end font-inter font-semibold tabular-nums">{format(row[item.key])}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-5">
          <div className="relative h-52">
            {ticks.map((tick) => (
              <div key={tick} className="absolute inset-x-0 border-t border-line" style={{ bottom: `${(tick / top) * 100}%` }}>
                <span className="absolute -top-2.5 start-0 bg-surface pe-1.5 font-inter text-[11px] font-semibold tabular-nums text-muted">{format(tick)}</span>
              </div>
            ))}

            <div className="absolute inset-y-0 end-0 start-16 flex items-end">
              {rows.map((row, index) => {
                const total = totals[index];
                const isActive = active === index;
                const visible = series.filter((item) => Number(row[item.key]) > 0);
                return (
                  <div
                    key={row.month}
                    tabIndex={0}
                    aria-label={`${formatMonth(row.month)}: ${series.map((item) => `${item.label} ${format(row[item.key])}`).join('، ')}`}
                    onPointerEnter={() => setActive(index)}
                    onPointerLeave={() => setActive(null)}
                    onFocus={() => setActive(index)}
                    onBlur={() => setActive(null)}
                    className="relative flex h-full flex-1 cursor-default flex-col items-center justify-end outline-none"
                  >
                    {total > 0 && (
                      <div className={`flex w-full max-w-6 flex-col-reverse gap-[2px] transition ${active !== null && !isActive ? 'opacity-60' : ''}`} style={{ height: `${(total / top) * 100}%` }}>
                        {visible.map((item, segmentIndex) => (
                          <div
                            key={item.key}
                            className={segmentIndex === visible.length - 1 ? 'rounded-t-[4px]' : ''}
                            style={{ flex: `${Number(row[item.key])} 1 0`, minHeight: 2, background: item.color }}
                          />
                        ))}
                      </div>
                    )}
                    {index === lastIndex && total > 0 && !isActive && (
                      <span className="absolute font-inter text-[11px] font-bold tabular-nums text-ink" style={{ bottom: `calc(${(total / top) * 100}% + 4px)` }}>{format(total)}</span>
                    )}
                    {isActive && (
                      <div className="pointer-events-none absolute left-1/2 z-10 w-max -translate-x-1/2 rounded-xl border border-line bg-surface px-3 py-2 text-start shadow-lg" style={{ bottom: `calc(${(total / top) * 100}% + 8px)` }}>
                        <p className="text-[11px] font-bold text-muted">{formatMonth(row.month)}</p>
                        {series.map((item) => (
                          <p key={item.key} className="mt-1 flex items-center gap-2 text-xs">
                            <span className="h-0.5 w-3 rounded-full" style={{ background: item.color }} />
                            <strong className="font-inter tabular-nums text-ink">{format(row[item.key])}</strong>
                            {stacked && <span className="font-semibold text-muted">{item.label}</span>}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="ms-16 mt-2 flex">
            {rows.map((row) => <span key={row.month} className="flex-1 text-center text-[11px] font-bold text-muted">{formatMonth(row.month)}</span>)}
          </div>
          {max === 0 && <p className="mt-3 text-center text-xs font-bold text-muted">{t('dash.charts.noData')}</p>}
        </div>
      )}
    </figure>
  );
}

// Part-to-whole bar for the revenue split, with a legend that carries values.
export function SplitMeter({ parts, format }) {
  const total = parts.reduce((sum, part) => sum + part.value, 0);

  return (
    <div>
      <div className="flex h-3 gap-[2px] overflow-hidden rounded-[4px]">
        {parts.map((part) => (
          <div key={part.key} style={{ flex: `${total ? part.value : part.share} 1 0`, background: part.color }} />
        ))}
      </div>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {parts.map((part) => (
          <li key={part.key} className="flex items-start gap-2.5">
            <LegendKey color={part.color} />
            <div className="-mt-1">
              <p className="text-xs font-bold text-muted">{part.label} · <span className="font-inter">{part.share}%</span></p>
              <p className="font-inter text-lg font-black tabular-nums text-ink">{format(part.value)}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
