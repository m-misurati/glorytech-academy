import { AlertTriangle, ArrowRight, BookOpen, CheckCircle2, GraduationCap, HandCoins, Landmark, Loader2, RefreshCw, TrendingUp, Users, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nContext';
import { MonthlyColumns, SplitMeter } from './charts';
import { DataTable, Panel, ProgressBar, StatTile, StatusPill } from './ui';

const SERIES_INSTRUCTOR = 'var(--series-1)';
const SERIES_PLATFORM = 'var(--series-2)';
const DEFAULT_SHARE = 70;

// Dashboard rows come straight from SQL, so English variants use the `_en` suffix.
export function useRowText() {
  const { lang } = useI18n();
  return (row, field) => (lang === 'en' && row?.[`${field}_en`]) || row?.[field] || '';
}

export function DashboardHeader({ title, subtitle, generatedAt, loading, onRefresh, children }) {
  const { t, formatDate } = useI18n();

  return (
    <div className="flex flex-col gap-5 border-b border-line pb-7 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {children}
        <h1 className="text-3xl font-black sm:text-4xl">{title}</h1>
        <p className="mt-2 font-medium text-muted">{subtitle}</p>
      </div>
      <div className="flex items-center gap-3">
        {generatedAt && <span className="text-xs font-bold text-muted">{t('dash.updated', { time: formatDate(generatedAt, { dateStyle: 'medium', timeStyle: 'short' }) })}</span>}
        <button type="button" onClick={onRefresh} disabled={loading} className="btn-secondary px-4 py-2.5 text-sm">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> {t('dash.refresh')}
        </button>
      </div>
    </div>
  );
}

export function DashboardStatus({ error, onRetry }) {
  const { t } = useI18n();

  if (!error) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <Loader2 className="h-10 w-10 animate-spin text-brand" aria-label={t('common.loading')} />
      </div>
    );
  }

  return (
    <div className="card mx-auto mt-10 max-w-xl p-8 text-center">
      <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" />
      <h2 className="mt-4 text-xl font-black">{t('dash.errors.load')}</h2>
      <p className="mt-2 text-sm font-medium leading-7 text-muted">{error.notMigrated ? t('dash.errors.notMigrated') : error.message}</p>
      <button type="button" onClick={onRetry} className="btn-primary mt-6">{t('common.retry')}</button>
    </div>
  );
}

export function KpiRow({ totals }) {
  const { t, formatNumber } = useI18n();
  const tiles = [
    { icon: Users, label: t('dash.kpi.students'), value: formatNumber(totals.students), hint: `${t('dash.kpi.active30')}: ${formatNumber(totals.active_learners_30d)}` },
    { icon: TrendingUp, label: t('dash.kpi.enrollments'), value: formatNumber(totals.enrollments), hint: `${t('dash.kpi.enrollments30')}: ${formatNumber(totals.enrollments_30d)}` },
    { icon: CheckCircle2, label: t('dash.kpi.completions'), value: formatNumber(totals.course_completions), hint: `${t('dash.kpi.lessonsCompleted')}: ${formatNumber(totals.lessons_completed)}` },
    { icon: BookOpen, label: t('dash.kpi.courses'), value: formatNumber(totals.courses), hint: `${t('dash.kpi.published', { count: formatNumber(totals.published_courses) })} · ${t('dash.kpi.contentHours')}: ${formatNumber(Math.floor(totals.content_minutes / 60))}` },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {tiles.map((tile) => <StatTile key={tile.label} {...tile} />)}
    </div>
  );
}

export function EarningsPanel({ totals, scope }) {
  const { t, formatMoney } = useI18n();
  const forInstructor = scope === 'instructor';
  const gross = Number(totals.gross_revenue) || 0;
  const instructorEarnings = Number(totals.instructor_earnings) || 0;
  const platformEarnings = Number(totals.platform_earnings) || 0;
  const paidOut = Number(totals.paid_out) || 0;
  const instructorShare = gross ? Math.round((instructorEarnings / gross) * 100) : DEFAULT_SHARE;

  return (
    <Panel title={t('dash.earnings.title')} subtitle={t('dash.earnings.splitNote')}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile icon={Landmark} label={t('dash.earnings.gross')} value={formatMoney(gross)} />
        <StatTile icon={Wallet} label={forInstructor ? t('dash.earnings.yourShare') : t('dash.earnings.instructorShare')} value={formatMoney(instructorEarnings)} emphasis={forInstructor} />
        <StatTile icon={HandCoins} label={forInstructor ? t('dash.earnings.paidOutToYou') : t('dash.earnings.paidOut')} value={formatMoney(paidOut)} />
        <StatTile icon={GraduationCap} label={t('dash.earnings.balance')} value={formatMoney(instructorEarnings - paidOut)} emphasis={!forInstructor} />
      </div>

      <div className="mt-6 rounded-2xl border border-line p-5">
        <p className="mb-4 text-sm font-black">{t('dash.earnings.splitTitle')}</p>
        <SplitMeter
          format={formatMoney}
          parts={[
            { key: 'instructor', label: forInstructor ? t('dash.earnings.yourShare') : t('dash.earnings.instructorShare'), value: instructorEarnings, share: instructorShare, color: SERIES_INSTRUCTOR },
            { key: 'platform', label: t('dash.earnings.platformShare'), value: platformEarnings, share: 100 - instructorShare, color: SERIES_PLATFORM },
          ]}
        />
        {gross === 0 && <p className="mt-4 rounded-xl bg-subtle px-4 py-3 text-xs font-bold text-muted">{t('dash.earnings.freeNote')}</p>}
      </div>
    </Panel>
  );
}

export function TrendCharts({ monthly, scope }) {
  const { t, formatNumber, formatMoney } = useI18n();
  const rows = (monthly || []).map((row) => ({
    month: row.month,
    enrollments: Number(row.enrollments) || 0,
    instructor: Number(row.instructor_earnings) || 0,
    platform: (Number(row.gross_revenue) || 0) - (Number(row.instructor_earnings) || 0),
  }));

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <MonthlyColumns
        title={t('dash.charts.enrollmentsTitle')}
        subtitle={t('dash.charts.lastMonths')}
        rows={rows}
        series={[{ key: 'enrollments', label: t('dash.kpi.enrollments'), color: SERIES_INSTRUCTOR }]}
        format={formatNumber}
        integer
      />
      <MonthlyColumns
        title={t('dash.charts.revenueTitle')}
        subtitle={t('dash.charts.lastMonths')}
        rows={rows}
        series={[
          { key: 'instructor', label: scope === 'instructor' ? t('dash.earnings.yourShare') : t('dash.earnings.instructorShare'), color: SERIES_INSTRUCTOR },
          { key: 'platform', label: t('dash.earnings.platformShare'), color: SERIES_PLATFORM },
        ]}
        format={formatMoney}
      />
    </div>
  );
}

function CourseCell({ row, showInstructor }) {
  const text = useRowText();
  return (
    <div className="min-w-48">
      <span className="font-inter text-[11px] font-black text-brand-ink">{row.code || row.course_code}</span>
      <p dir="ltr" className="text-start font-inter font-bold rtl:text-right">{text(row, row.title !== undefined ? 'title' : 'course_title')}</p>
      {showInstructor && row.instructor_name && <p className="text-xs font-semibold text-muted">{text(row, 'instructor_name')}</p>}
    </div>
  );
}

export function CoursesTable({ courses, admin = false, onEdit }) {
  const { t, formatNumber, formatMoney } = useI18n();
  const columns = [
    { key: 'course', header: t('dash.col.course'), render: (row) => <CourseCell row={row} showInstructor={admin} /> },
    {
      key: 'status',
      header: t('dash.col.status'),
      render: (row) => (
        <div className="flex flex-wrap gap-1.5">
          <StatusPill tone={row.is_published ? 'good' : 'neutral'}>{row.is_published ? t('dash.status.published') : t('dash.status.hidden')}</StatusPill>
          <StatusPill tone="neutral">{row.is_free ? t('dash.status.free') : formatMoney(row.price)}</StatusPill>
        </div>
      ),
    },
    { key: 'lessons', header: t('dash.col.lessons'), numeric: true, render: (row) => formatNumber(row.lessons) },
    { key: 'enrollments', header: t('dash.col.learners'), numeric: true, render: (row) => formatNumber(row.enrollments) },
    { key: 'avg_progress', header: t('dash.col.avgProgress'), render: (row) => <ProgressBar value={Number(row.avg_progress) || 0} /> },
    { key: 'completions', header: t('dash.col.completions'), numeric: true, render: (row) => formatNumber(row.completions) },
    { key: 'share', header: t('dash.col.share'), numeric: true, render: (row) => `${Number(row.instructor_share_percent)}%` },
    { key: 'gross', header: t('dash.col.gross'), numeric: true, render: (row) => formatMoney(row.gross_revenue) },
    { key: 'instructor', header: t('dash.col.instructorEarnings'), numeric: true, render: (row) => formatMoney(row.instructor_earnings) },
    { key: 'platform', header: t('dash.col.platformEarnings'), numeric: true, render: (row) => formatMoney(row.platform_earnings) },
  ];
  if (admin && onEdit) {
    columns.push({ key: 'actions', header: t('dash.col.actions'), render: (row) => <button type="button" onClick={() => onEdit(row)} className="rounded-lg px-2.5 py-1.5 text-xs font-black text-brand-ink hover:bg-brand-soft">{t('dash.actions.edit')}</button> });
  }

  return <DataTable columns={columns} rows={courses} empty={t('dash.empty.courses')} />;
}

export function LearnersTable({ learners, admin = false }) {
  const { t, formatDate } = useI18n();
  const columns = [
    {
      key: 'learner',
      header: t('dash.col.learner'),
      render: (row) => (
        <div className="min-w-40">
          <p className="font-bold">{row.name || '—'}</p>
          {row.affiliation && <p className="text-xs font-semibold text-muted">{row.affiliation}</p>}
        </div>
      ),
    },
    admin && {
      key: 'contact',
      header: t('dash.col.contact'),
      render: (row) => (
        <div dir="ltr" className="text-start font-inter text-xs font-semibold text-muted rtl:text-right">
          {row.email && <a href={`mailto:${row.email}`} className="block hover:text-brand-ink">{row.email}</a>}
          {row.phone && <a href={`tel:${row.phone}`} className="block hover:text-brand-ink">{row.phone}</a>}
        </div>
      ),
    },
    { key: 'course', header: t('dash.col.course'), render: (row) => <span className="font-inter text-xs font-black text-brand-ink">{row.course_code}</span> },
    { key: 'progress', header: t('dash.col.progress'), render: (row) => <ProgressBar value={Number(row.progress) || 0} /> },
    { key: 'enrolled', header: t('dash.col.enrolled'), numeric: true, render: (row) => formatDate(row.enrolled_at) },
    { key: 'last', header: t('dash.col.lastActivity'), numeric: true, render: (row) => formatDate(row.last_activity) },
  ].filter(Boolean);

  return <DataTable columns={columns} rows={learners} rowKey="__key" empty={t('dash.empty.learners')} />;
}

const STATUS_TONE = { paid: 'good', pending: 'warning', refunded: 'critical' };

export function PaymentsTable({ payments, admin = false, onStatusChange }) {
  const { t, formatDate, formatMoney } = useI18n();
  const text = useRowText();
  const columns = [
    { key: 'date', header: t('dash.col.date'), render: (row) => <span className="whitespace-nowrap">{formatDate(row.paid_at)}</span> },
    {
      key: 'learner',
      header: t('dash.col.learner'),
      render: (row) => (
        <div className="min-w-36">
          <p className="font-bold">{row.learner_name || '—'}</p>
          {admin && row.learner_email && <p dir="ltr" className="text-start font-inter text-xs text-muted rtl:text-right">{row.learner_email}</p>}
        </div>
      ),
    },
    { key: 'course', header: t('dash.col.course'), render: (row) => <span className="font-inter text-xs font-black text-brand-ink">{row.course_code || text(row, 'course_title')}</span> },
    admin && { key: 'instructor', header: t('dash.col.instructor'), render: (row) => text(row, 'instructor_name') || '—' },
    { key: 'amount', header: t('dash.col.amount'), numeric: true, render: (row) => formatMoney(row.amount) },
    { key: 'instructor_amount', header: t('dash.col.instructorEarnings'), numeric: true, render: (row) => formatMoney(row.instructor_amount) },
    { key: 'platform_amount', header: t('dash.col.platformEarnings'), numeric: true, render: (row) => formatMoney(row.status === 'paid' ? row.amount - row.instructor_amount : 0) },
    { key: 'method', header: t('dash.col.method'), render: (row) => <span className="whitespace-nowrap text-xs">{t(`dash.methods.${row.method}`)}{row.reference && <span dir="ltr" className="block font-inter text-muted">{row.reference}</span>}</span> },
    { key: 'status', header: t('dash.col.status'), render: (row) => <StatusPill tone={STATUS_TONE[row.status]}>{t(`dash.status.${row.status}`)}</StatusPill> },
    admin && onStatusChange && {
      key: 'actions',
      header: t('dash.col.actions'),
      render: (row) => (
        <div className="flex gap-1">
          {row.status === 'pending' && <button type="button" onClick={() => onStatusChange(row, 'paid')} className="rounded-lg px-2.5 py-1.5 text-xs font-black text-brand-ink hover:bg-brand-soft">{t('dash.actions.markPaid')}</button>}
          {row.status === 'paid' && <button type="button" onClick={() => onStatusChange(row, 'refunded')} className="rounded-lg px-2.5 py-1.5 text-xs font-black text-red-700 hover:bg-red-500/10 dark:text-red-300">{t('dash.actions.markRefunded')}</button>}
        </div>
      ),
    },
  ].filter(Boolean);

  return <DataTable columns={columns} rows={payments} empty={t('dash.empty.payments')} />;
}

export function PayoutsTable({ payouts, showInstructor = false }) {
  const { t, formatDate, formatMoney } = useI18n();
  const text = useRowText();
  const columns = [
    { key: 'date', header: t('dash.col.date'), render: (row) => <span className="whitespace-nowrap">{formatDate(row.paid_at)}</span> },
    showInstructor && { key: 'instructor', header: t('dash.col.instructor'), render: (row) => text(row, 'instructor_name') },
    { key: 'amount', header: t('dash.col.amount'), numeric: true, render: (row) => formatMoney(row.amount) },
    { key: 'method', header: t('dash.col.method'), render: (row) => t(`dash.methods.${row.method}`) },
    { key: 'reference', header: t('dash.col.reference'), render: (row) => <span dir="ltr" className="font-inter text-xs">{row.reference || '—'}</span> },
    { key: 'note', header: t('dash.forms.note'), render: (row) => <span className="text-xs text-muted">{row.note || '—'}</span> },
  ].filter(Boolean);

  return <DataTable columns={columns} rows={payouts} empty={t('dash.empty.payouts')} />;
}

export function InstructorsTable({ instructors, onPayout }) {
  const { t, formatNumber, formatMoney } = useI18n();
  const text = useRowText();
  const columns = [
    {
      key: 'instructor',
      header: t('dash.col.instructor'),
      render: (row) => (
        <div className="min-w-44">
          <p className="font-bold">{text(row, 'name')}</p>
          <p dir={row.email ? 'ltr' : undefined} className="text-start font-inter text-xs text-muted rtl:text-right">{row.email || t('dash.notLinked')}</p>
        </div>
      ),
    },
    { key: 'courses', header: t('dash.col.courses'), numeric: true, render: (row) => formatNumber(row.courses) },
    { key: 'students', header: t('dash.col.learners'), numeric: true, render: (row) => formatNumber(row.students) },
    { key: 'gross', header: t('dash.col.gross'), numeric: true, render: (row) => formatMoney(row.gross_revenue) },
    { key: 'instructor_earnings', header: t('dash.col.instructorEarnings'), numeric: true, render: (row) => formatMoney(row.instructor_earnings) },
    { key: 'platform_earnings', header: t('dash.col.platformEarnings'), numeric: true, render: (row) => formatMoney(row.platform_earnings) },
    { key: 'paid_out', header: t('dash.col.paidOut'), numeric: true, render: (row) => formatMoney(row.paid_out) },
    { key: 'balance', header: t('dash.col.balance'), numeric: true, render: (row) => <strong className="text-brand-ink">{formatMoney(row.instructor_earnings - row.paid_out)}</strong> },
    {
      key: 'actions',
      header: t('dash.col.actions'),
      render: (row) => (
        <div className="flex gap-1">
          <Link to={`/admin/instructors/${row.id}`} className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-black text-brand-ink hover:bg-brand-soft">
            {t('dash.actions.viewDashboard')} <ArrowRight className="h-3.5 w-3.5 rtl:-scale-x-100" />
          </Link>
          {onPayout && <button type="button" onClick={() => onPayout(row)} className="whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-black text-ink hover:bg-subtle">{t('dash.actions.recordPayout')}</button>}
        </div>
      ),
    },
  ];

  return <DataTable columns={columns} rows={instructors} empty="—" />;
}

export function withLearnerKeys(learners) {
  return (learners || []).map((row) => ({ ...row, __key: `${row.user_id}-${row.course_id}` }));
}

