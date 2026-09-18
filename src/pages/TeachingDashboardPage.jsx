import { useState } from 'react';
import { ArrowRight, BookOpen, LayoutGrid, Plus, Receipt, Settings2, Users } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  CoursesTable,
  DashboardHeader,
  DashboardStatus,
  EarningsPanel,
  KpiRow,
  LearnersTable,
  PaymentsTable,
  PayoutsTable,
  TrendCharts,
  useRowText,
  withLearnerKeys,
} from '../components/dashboard/sections';
import { FormField, Modal, Panel, StatusPill, inputClass } from '../components/dashboard/ui';
import { useDashboard } from '../components/dashboard/useDashboard';
import SiteHeader from '../components/SiteHeader';
import { useI18n } from '../i18n/I18nContext';
import { createCourse } from '../lib/supabase';

const TABS = [
  { key: 'overview', icon: LayoutGrid },
  { key: 'courses', icon: BookOpen },
  { key: 'learners', icon: Users },
  { key: 'billing', icon: Receipt },
];

function NewCourseForm({ instructorId, onCreated, onCancel }) {
  const { t } = useI18n();
  const [form, setForm] = useState({ title: '', titleEn: '', code: '', description: '', level: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    const { data, error: createError } = await createCourse({ ...form, instructorId });
    setBusy(false);
    if (createError) setError(t('portal.saveError', { message: createError.message }));
    else onCreated(data);
  };

  return (
    <form onSubmit={submit} className="grid gap-4">
      <p className="rounded-xl bg-brand-soft px-4 py-3 text-xs font-bold leading-6 text-brand-ink">{t('portal.createHint')}</p>
      <FormField label={t('portal.title')}><input required autoFocus minLength={3} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputClass} /></FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t('portal.titleEn')}><input dir="ltr" value={form.titleEn} onChange={(e) => setForm({ ...form, titleEn: e.target.value })} className={inputClass} /></FormField>
        <FormField label={t('portal.code')}><input dir="ltr" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className={inputClass} placeholder="CCNP" /></FormField>
      </div>
      <FormField label={t('portal.level')}><input value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} className={inputClass} placeholder="مبتدئ" /></FormField>
      <FormField label={t('portal.description')}><textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputClass} /></FormField>
      {error && <p role="alert" className="rounded-xl bg-red-500/10 px-4 py-3 text-sm font-bold text-red-700 dark:text-red-300">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="btn-secondary px-5 py-2.5 text-sm">{t('common.cancel')}</button>
        <button type="submit" disabled={busy} className="btn-primary px-5 py-2.5 text-sm">{busy ? t('common.saving') : t('portal.newCourse')}</button>
      </div>
    </form>
  );
}

// Instructor portal. Admins reach the same page for any instructor through /admin/instructors/:instructorId,
// where it stays read-only.
export default function TeachingDashboardPage() {
  const { instructorId } = useParams();
  const navigate = useNavigate();
  const { t, pick, formatNumber } = useI18n();
  const text = useRowText();
  const { data, error, loading, reload } = useDashboard(instructorId || null);
  const [tab, setTab] = useState('overview');
  const [creating, setCreating] = useState(false);
  const viewedByAdmin = Boolean(instructorId);
  const canAuthor = !viewedByAdmin;

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <SiteHeader compact />
      <main className="mx-auto max-w-7xl px-5 py-8 lg:px-8 lg:py-10">
        {!data ? (
          <DashboardStatus error={error} onRetry={reload} />
        ) : (
          <div className={`transition-opacity ${loading ? 'opacity-60' : ''}`}>
            <DashboardHeader
              title={viewedByAdmin ? text(data.instructor, 'name') : t('dash.instructorTitle')}
              subtitle={viewedByAdmin ? t('dash.viewingAs', { name: text(data.instructor, 'name') }) : t('dash.instructorSubtitle')}
              generatedAt={data.generated_at}
              loading={loading}
              onRefresh={reload}
            >
              {viewedByAdmin ? (
                <Link to="/admin" className="mb-3 inline-flex items-center gap-2 text-sm font-black text-muted hover:text-brand-ink">
                  <ArrowRight className="h-4 w-4 ltr:rotate-180" /> {t('dash.backToAdmin')}
                </Link>
              ) : (
                <p className="mb-2 text-sm font-black text-brand-ink">{text(data.instructor, 'name')}</p>
              )}
            </DashboardHeader>

            <div role="tablist" className="-mx-5 mt-6 flex gap-1 overflow-x-auto px-5 pb-1 lg:mx-0 lg:px-0">
              {TABS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  role="tab"
                  aria-selected={tab === item.key}
                  onClick={() => setTab(item.key)}
                  className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black transition ${tab === item.key ? 'bg-glory-600 text-white' : 'text-muted hover:bg-subtle hover:text-ink'}`}
                >
                  <item.icon className="h-4 w-4" /> {t(`dash.tabs.${item.key}`)}
                </button>
              ))}
            </div>

            <div role="tabpanel" className="mt-6 space-y-6">
              {tab === 'overview' && (
                <>
                  <KpiRow totals={data.totals} />
                  <EarningsPanel totals={data.totals} scope="instructor" />
                  <TrendCharts monthly={data.monthly} scope="instructor" />
                </>
              )}

              {tab === 'courses' && (
                <>
                  <Panel
                    title={t('portal.myCourses')}
                    actions={canAuthor && (
                      <button type="button" onClick={() => setCreating(true)} className="btn-primary px-4 py-2 text-sm"><Plus className="h-4 w-4" /> {t('portal.newCourse')}</button>
                    )}
                  >
                    {data.courses.length === 0 && <p className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm font-bold text-muted">{t('portal.empty')}</p>}
                    <ul className="grid gap-3">
                      {data.courses.map((course) => (
                        <li key={course.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line p-4">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-inter text-[11px] font-black text-brand-ink">{course.code}</span>
                              <strong dir="ltr" className="text-start font-inter rtl:text-right">{pick({ title: course.title, titleEn: course.title_en }, 'title')}</strong>
                              <StatusPill tone={course.is_published ? 'good' : 'warning'}>{course.is_published ? t('portal.published') : t('portal.draft')}</StatusPill>
                            </div>
                            <p className="mt-1 text-xs font-semibold text-muted">
                              {t('common.lessons', { count: course.lessons })} · {t('dash.col.learners')}: {formatNumber(course.enrollments)} · {t('dash.col.avgProgress')}: {formatNumber(course.avg_progress)}%
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {course.is_published && <Link to={`/courses/${course.slug}`} className="btn-secondary px-4 py-2 text-sm">{t('portal.viewPage')}</Link>}
                            {canAuthor && (
                              <Link to={`/instructor/courses/${course.id}`} className="btn-primary px-4 py-2 text-sm">
                                <Settings2 className="h-4 w-4" /> {t('portal.manage')}
                              </Link>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </Panel>
                  <Panel title={t('dash.sections.courses')}>
                    <CoursesTable courses={data.courses} />
                  </Panel>
                </>
              )}

              {tab === 'learners' && (
                <Panel title={t('dash.sections.learners')}>
                  <LearnersTable learners={withLearnerKeys(data.learners)} admin={data.is_admin} />
                </Panel>
              )}

              {tab === 'billing' && (
                <>
                  <EarningsPanel totals={data.totals} scope="instructor" />
                  <Panel title={t('dash.sections.myPayouts')}>
                    <PayoutsTable payouts={data.payouts} />
                  </Panel>
                  <Panel title={t('dash.sections.payments')}>
                    <PaymentsTable payments={data.payments} admin={data.is_admin} />
                  </Panel>
                </>
              )}
            </div>
          </div>
        )}
      </main>

      {creating && (
        <Modal title={t('portal.createTitle')} onClose={() => setCreating(false)}>
          <NewCourseForm
            instructorId={data?.instructor?.id}
            onCancel={() => setCreating(false)}
            onCreated={(created) => {
              setCreating(false);
              if (created?.id) navigate(`/instructor/courses/${created.id}`);
              else reload();
            }}
          />
        </Modal>
      )}
    </div>
  );
}
