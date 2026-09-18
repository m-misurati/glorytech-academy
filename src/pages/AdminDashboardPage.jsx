import { useCallback, useState } from 'react';
import { BookOpen, LayoutGrid, Plus, Receipt, UserCog, Users } from 'lucide-react';
import { CourseSettingsForm, PaymentForm, PayoutForm } from '../components/dashboard/forms';
import {
  CoursesTable,
  DashboardHeader,
  DashboardStatus,
  EarningsPanel,
  InstructorsTable,
  KpiRow,
  LearnersTable,
  PaymentsTable,
  PayoutsTable,
  TrendCharts,
  withLearnerKeys,
} from '../components/dashboard/sections';
import { Modal, Panel } from '../components/dashboard/ui';
import { useDashboard } from '../components/dashboard/useDashboard';
import SiteHeader from '../components/SiteHeader';
import { useI18n } from '../i18n/I18nContext';
import { updatePaymentStatus } from '../lib/supabase';

const TABS = [
  { key: 'overview', icon: LayoutGrid },
  { key: 'courses', icon: BookOpen },
  { key: 'learners', icon: Users },
  { key: 'instructors', icon: UserCog },
  { key: 'billing', icon: Receipt },
];

export default function AdminDashboardPage() {
  const { t } = useI18n();
  const { data, error, loading, reload } = useDashboard(null);
  const [tab, setTab] = useState('overview');
  const [dialog, setDialog] = useState(null);
  const [actionError, setActionError] = useState('');

  const closeDialog = useCallback(() => setDialog(null), []);
  const afterSave = () => {
    setDialog(null);
    reload();
  };

  const changePaymentStatus = async (payment, status) => {
    if (status === 'refunded' && !window.confirm(`${t('dash.actions.markRefunded')}?`)) return;
    setActionError('');
    const { error: updateError } = await updatePaymentStatus(payment.id, status);
    if (updateError) setActionError(t('dash.forms.saveError', { message: updateError.message }));
    else reload();
  };

  const recordPaymentButton = (
    <button type="button" onClick={() => setDialog({ type: 'payment' })} className="btn-primary px-4 py-2 text-sm"><Plus className="h-4 w-4" /> {t('dash.actions.recordPayment')}</button>
  );
  const recordPayoutButton = (
    <button type="button" onClick={() => setDialog({ type: 'payout' })} className="btn-secondary px-4 py-2 text-sm"><Plus className="h-4 w-4" /> {t('dash.actions.recordPayout')}</button>
  );

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <SiteHeader compact />
      <main className="mx-auto max-w-7xl px-5 py-8 lg:px-8 lg:py-10">
        {!data ? (
          <DashboardStatus error={error} onRetry={reload} />
        ) : (
          <div className={`transition-opacity ${loading ? 'opacity-60' : ''}`}>
            <DashboardHeader title={t('dash.adminTitle')} subtitle={t('dash.adminSubtitle')} generatedAt={data.generated_at} loading={loading} onRefresh={reload} />

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

            {actionError && <p role="alert" className="mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm font-bold text-red-700 dark:text-red-300">{actionError}</p>}

            <div role="tabpanel" className="mt-6 space-y-6">
              {tab === 'overview' && (
                <>
                  <KpiRow totals={data.totals} />
                  <EarningsPanel totals={data.totals} scope="platform" />
                  <TrendCharts monthly={data.monthly} scope="platform" />
                  <Panel title={t('dash.sections.courses')}>
                    <CoursesTable courses={data.courses} admin />
                  </Panel>
                </>
              )}

              {tab === 'courses' && (
                <Panel title={t('dash.sections.courses')}>
                  <CoursesTable courses={data.courses} admin onEdit={(course) => setDialog({ type: 'course', course })} />
                </Panel>
              )}

              {tab === 'learners' && (
                <Panel title={t('dash.sections.learners')}>
                  <LearnersTable learners={withLearnerKeys(data.learners)} admin />
                </Panel>
              )}

              {tab === 'instructors' && (
                <Panel title={t('dash.sections.instructors')}>
                  <InstructorsTable instructors={data.instructors || []} onPayout={(instructor) => setDialog({ type: 'payout', instructorId: instructor.id })} />
                </Panel>
              )}

              {tab === 'billing' && (
                <>
                  <EarningsPanel totals={data.totals} scope="platform" />
                  <Panel title={t('dash.sections.settlement')} actions={recordPayoutButton}>
                    <InstructorsTable instructors={data.instructors || []} onPayout={(instructor) => setDialog({ type: 'payout', instructorId: instructor.id })} />
                  </Panel>
                  <Panel title={t('dash.sections.payments')} actions={recordPaymentButton}>
                    <PaymentsTable payments={data.payments} admin onStatusChange={changePaymentStatus} />
                  </Panel>
                  <Panel title={t('dash.sections.payouts')}>
                    <PayoutsTable payouts={data.payouts} showInstructor />
                  </Panel>
                </>
              )}
            </div>
          </div>
        )}
      </main>

      {dialog?.type === 'course' && (
        <Modal title={t('dash.forms.courseSettings')} onClose={closeDialog}>
          <CourseSettingsForm course={dialog.course} onSaved={afterSave} onCancel={closeDialog} />
        </Modal>
      )}
      {dialog?.type === 'payment' && (
        <Modal title={t('dash.actions.recordPayment')} onClose={closeDialog}>
          <PaymentForm courses={data?.courses || []} onSaved={afterSave} onCancel={closeDialog} />
        </Modal>
      )}
      {dialog?.type === 'payout' && (
        <Modal title={t('dash.actions.recordPayout')} onClose={closeDialog}>
          <PayoutForm instructors={data?.instructors || []} initialInstructorId={dialog.instructorId} onSaved={afterSave} onCancel={closeDialog} />
        </Modal>
      )}
    </div>
  );
}
