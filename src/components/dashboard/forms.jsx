import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';
import { recordPayment, recordPayout, searchLearners, updateCourseSettings } from '../../lib/supabase';
import { useRowText } from './sections';
import { FormField, inputClass } from './ui';

const METHODS = ['bank_transfer', 'cash', 'card', 'mobile_wallet', 'other'];

const today = () => new Date().toISOString().slice(0, 10);
// Noon avoids the date shifting across midnight when converted to UTC.
const toTimestamp = (date) => new Date(`${date}T12:00:00`).toISOString();

function FormActions({ busy, onCancel, error }) {
  const { t } = useI18n();
  return (
    <>
      {error && <p role="alert" className="mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm font-bold text-red-700 dark:text-red-300">{error}</p>}
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="btn-secondary px-5 py-2.5 text-sm">{t('common.cancel')}</button>
        <button type="submit" disabled={busy} className="btn-primary px-5 py-2.5 text-sm">{busy ? t('common.saving') : t('common.save')}</button>
      </div>
    </>
  );
}

function MethodSelect({ value, onChange }) {
  const { t } = useI18n();
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className={inputClass}>
      {METHODS.map((method) => <option key={method} value={method}>{t(`dash.methods.${method}`)}</option>)}
    </select>
  );
}

export function CourseSettingsForm({ course, onSaved, onCancel }) {
  const { t } = useI18n();
  const [form, setForm] = useState({
    isPublished: course.is_published,
    isFree: course.is_free,
    price: Number(course.price) || 0,
    sharePercent: Number(course.instructor_share_percent) || 70,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    if (!form.isFree && !(form.price > 0)) {
      setError(t('dash.forms.priceRequired'));
      return;
    }
    setBusy(true);
    setError('');
    const { error: saveError } = await updateCourseSettings(course.id, form);
    setBusy(false);
    if (saveError) setError(t('dash.forms.saveError', { message: saveError.message }));
    else onSaved();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <p dir="ltr" className="text-start font-inter font-black rtl:text-right">{course.title}</p>
      <label className="flex items-center gap-3 text-sm font-bold">
        <input type="checkbox" checked={form.isPublished} onChange={(event) => setForm({ ...form, isPublished: event.target.checked })} className="h-4 w-4 accent-glory-600" />
        {t('dash.forms.published')}
      </label>
      <label className="flex items-center gap-3 text-sm font-bold">
        <input type="checkbox" checked={form.isFree} onChange={(event) => setForm({ ...form, isFree: event.target.checked, price: event.target.checked ? 0 : form.price })} className="h-4 w-4 accent-glory-600" />
        {t('dash.forms.free')}
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t('dash.forms.price')}>
          <input type="number" min="0" step="0.01" dir="ltr" disabled={form.isFree} value={form.price} onChange={(event) => setForm({ ...form, price: Number(event.target.value) })} className={inputClass} />
        </FormField>
        <FormField label={t('dash.forms.share')}>
          <input type="number" min="0" max="100" step="0.5" dir="ltr" required value={form.sharePercent} onChange={(event) => setForm({ ...form, sharePercent: Number(event.target.value) })} className={inputClass} />
        </FormField>
      </div>
      <FormActions busy={busy} onCancel={onCancel} error={error} />
    </form>
  );
}

function LearnerPicker({ value, onChange }) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(async () => {
      const { data } = await searchLearners(query.trim());
      if (active) setResults(data || []);
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query]);

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('dash.forms.learnerSearch')} className={`${inputClass} ps-9`} />
      </div>
      <div className="mt-2 max-h-44 overflow-y-auto rounded-xl border border-line">
        {results.length === 0 && <p className="px-3 py-3 text-xs font-bold text-muted">{t('dash.forms.noResults')}</p>}
        {results.map((learner) => (
          <button type="button" key={learner.id} onClick={() => onChange(learner)} className={`flex w-full items-center justify-between gap-3 border-b border-line px-3 py-2 text-start text-sm last:border-0 ${value?.id === learner.id ? 'bg-brand-soft' : 'hover:bg-subtle'}`}>
            <span className="font-bold">{learner.display_name || '—'}</span>
            <span dir="ltr" className="truncate font-inter text-xs text-muted">{learner.email}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function PaymentForm({ courses, onSaved, onCancel }) {
  const { t } = useI18n();
  const text = useRowText();
  const [form, setForm] = useState({ courseId: '', learner: null, amount: '', method: 'bank_transfer', status: 'paid', reference: '', note: '', date: today() });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const selectCourse = (courseId) => {
    const course = courses.find((item) => item.id === courseId);
    setForm((current) => ({ ...current, courseId, amount: course && Number(course.price) > 0 ? String(course.price) : current.amount }));
  };

  const submit = async (event) => {
    event.preventDefault();
    const amount = Number(form.amount);
    if (!form.courseId || !form.learner || !(amount > 0)) {
      setError(t('dash.forms.required'));
      return;
    }
    setBusy(true);
    setError('');
    const { error: saveError } = await recordPayment({
      courseId: form.courseId,
      userId: form.learner.id,
      amount,
      method: form.method,
      status: form.status,
      reference: form.reference.trim(),
      note: form.note.trim(),
      paidAt: toTimestamp(form.date),
    });
    setBusy(false);
    if (saveError) setError(t('dash.forms.saveError', { message: saveError.message }));
    else onSaved();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="rounded-xl bg-brand-soft px-4 py-3 text-xs font-bold leading-6 text-brand-ink">{t('dash.forms.paymentHint')}</p>
      <FormField label={t('dash.forms.course')}>
        <select required value={form.courseId} onChange={(event) => selectCourse(event.target.value)} className={inputClass}>
          <option value="">{t('dash.forms.choose')}</option>
          {courses.map((course) => <option key={course.id} value={course.id}>{course.code ? `${course.code} — ` : ''}{text(course, 'title')}</option>)}
        </select>
      </FormField>
      <FormField label={t('dash.forms.learner')}>
        <LearnerPicker value={form.learner} onChange={(learner) => setForm({ ...form, learner })} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t('dash.forms.amount')}>
          <input type="number" min="0.01" step="0.01" dir="ltr" required value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} className={inputClass} />
        </FormField>
        <FormField label={t('dash.forms.date')}>
          <input type="date" dir="ltr" required value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} className={inputClass} />
        </FormField>
        <FormField label={t('dash.forms.method')}>
          <MethodSelect value={form.method} onChange={(method) => setForm({ ...form, method })} />
        </FormField>
        <FormField label={t('dash.forms.status')}>
          <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className={inputClass}>
            <option value="paid">{t('dash.status.paid')}</option>
            <option value="pending">{t('dash.status.pending')}</option>
          </select>
        </FormField>
      </div>
      <FormField label={t('dash.forms.reference')}>
        <input dir="ltr" maxLength={120} value={form.reference} onChange={(event) => setForm({ ...form, reference: event.target.value })} className={inputClass} />
      </FormField>
      <FormField label={t('dash.forms.note')}>
        <textarea rows={2} maxLength={500} value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} className={inputClass} />
      </FormField>
      <FormActions busy={busy} onCancel={onCancel} error={error} />
    </form>
  );
}

export function PayoutForm({ instructors, initialInstructorId, onSaved, onCancel }) {
  const { t, formatMoney } = useI18n();
  const text = useRowText();
  const balanceOf = (id) => {
    const instructor = instructors.find((item) => item.id === id);
    return instructor ? Number(instructor.instructor_earnings) - Number(instructor.paid_out) : 0;
  };
  const initialBalance = balanceOf(initialInstructorId);
  const [form, setForm] = useState({
    instructorId: initialInstructorId || '',
    amount: initialBalance > 0 ? String(initialBalance) : '',
    method: 'bank_transfer',
    reference: '',
    note: '',
    date: today(),
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const balance = balanceOf(form.instructorId);

  const submit = async (event) => {
    event.preventDefault();
    const amount = Number(form.amount);
    if (!form.instructorId || !(amount > 0)) {
      setError(t('dash.forms.required'));
      return;
    }
    setBusy(true);
    setError('');
    const { error: saveError } = await recordPayout({
      instructorId: form.instructorId,
      amount,
      method: form.method,
      reference: form.reference.trim(),
      note: form.note.trim(),
      paidAt: toTimestamp(form.date),
    });
    setBusy(false);
    if (saveError) setError(t('dash.forms.saveError', { message: saveError.message }));
    else onSaved();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <FormField label={t('dash.forms.instructor')} hint={form.instructorId ? t('dash.forms.payoutHint', { amount: formatMoney(balance) }) : null}>
        <select required value={form.instructorId} onChange={(event) => setForm({ ...form, instructorId: event.target.value })} className={inputClass}>
          <option value="">{t('dash.forms.choose')}</option>
          {instructors.map((instructor) => <option key={instructor.id} value={instructor.id}>{text(instructor, 'name')}</option>)}
        </select>
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t('dash.forms.amount')}>
          <input type="number" min="0.01" step="0.01" dir="ltr" required value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} className={inputClass} />
        </FormField>
        <FormField label={t('dash.forms.date')}>
          <input type="date" dir="ltr" required value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} className={inputClass} />
        </FormField>
      </div>
      <FormField label={t('dash.forms.method')}>
        <MethodSelect value={form.method} onChange={(method) => setForm({ ...form, method })} />
      </FormField>
      <FormField label={t('dash.forms.reference')}>
        <input dir="ltr" maxLength={120} value={form.reference} onChange={(event) => setForm({ ...form, reference: event.target.value })} className={inputClass} />
      </FormField>
      <FormField label={t('dash.forms.note')}>
        <textarea rows={2} maxLength={500} value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} className={inputClass} />
      </FormField>
      <FormActions busy={busy} onCancel={onCancel} error={error} />
    </form>
  );
}
