import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, ChevronDown, ChevronUp, ExternalLink, Film, Paperclip, Plus, Save, Trash2 } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Modal, Panel, StatusPill, FormField, inputClass } from '../components/dashboard/ui';
import { DashboardStatus } from '../components/dashboard/sections';
import SiteHeader from '../components/SiteHeader';
import { useI18n } from '../i18n/I18nContext';
import { detectResourceKind, parseDriveId } from '../lib/drive';
import {
  deleteLesson,
  deleteLessonResource,
  getCourseContent,
  moveLesson,
  saveLesson,
  saveLessonResource,
  setLessonVideo,
  updateCourseDetails,
} from '../lib/supabase';

const RESOURCE_KINDS = ['slides', 'pdf', 'doc', 'sheet', 'file', 'link'];
const emptyLesson = { title: '', titleEn: '', minutes: '', seconds: '', isPreview: false };

function linesToArray(value) {
  return value.split('\n').map((line) => line.trim()).filter(Boolean);
}

function CourseDetailsForm({ course, onSaved, onError }) {
  const { t } = useI18n();
  const [form, setForm] = useState({
    code: course.code || '',
    title: course.title || '',
    titleEn: course.title_en || '',
    description: course.description || '',
    descriptionEn: course.description_en || '',
    level: course.level || '',
    levelEn: course.level_en || '',
    coverUrl: course.cover_url || '',
    outcomes: (course.outcomes || []).join('\n'),
    outcomesEn: (course.outcomes_en || []).join('\n'),
    durationMinutes: course.duration_minutes || 0,
    isPublished: course.is_published,
    isFree: course.is_free,
    price: Number(course.price) || 0,
  });
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    const { error } = await updateCourseDetails(course.id, {
      ...form,
      shortTitle: form.title,
      shortTitleEn: form.titleEn,
      outcomes: linesToArray(form.outcomes),
      outcomesEn: linesToArray(form.outcomesEn),
      durationMinutes: Number(form.durationMinutes) || 0,
      price: Number(form.price) || 0,
    });
    setBusy(false);
    if (error) onError(error.message);
    else onSaved();
  };

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t('portal.title')}><input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputClass} /></FormField>
        <FormField label={t('portal.titleEn')}><input dir="ltr" value={form.titleEn} onChange={(e) => setForm({ ...form, titleEn: e.target.value })} className={inputClass} /></FormField>
        <FormField label={t('portal.code')}><input dir="ltr" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className={inputClass} /></FormField>
        <FormField label={t('portal.level')}><input value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} className={inputClass} /></FormField>
        <FormField label={t('portal.levelEn')}><input dir="ltr" value={form.levelEn} onChange={(e) => setForm({ ...form, levelEn: e.target.value })} className={inputClass} /></FormField>
        <FormField label={t('portal.durationMinutes')}><input type="number" min="0" dir="ltr" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} className={inputClass} /></FormField>
      </div>
      <FormField label={t('portal.description')}><textarea rows={3} required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputClass} /></FormField>
      <FormField label={t('portal.descriptionEn')}><textarea dir="ltr" rows={3} value={form.descriptionEn} onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })} className={inputClass} /></FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t('portal.outcomes')}><textarea rows={4} value={form.outcomes} onChange={(e) => setForm({ ...form, outcomes: e.target.value })} className={inputClass} /></FormField>
        <FormField label={t('portal.outcomesEn')}><textarea dir="ltr" rows={4} value={form.outcomesEn} onChange={(e) => setForm({ ...form, outcomesEn: e.target.value })} className={inputClass} /></FormField>
      </div>
      <FormField label={t('portal.cover')}><input dir="ltr" value={form.coverUrl} onChange={(e) => setForm({ ...form, coverUrl: e.target.value })} className={inputClass} placeholder="/assets/courses/..." /></FormField>
      <div className="flex flex-wrap items-center gap-5">
        <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} className="h-4 w-4 accent-glory-600" /> {t('portal.publishLabel')}</label>
        <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={form.isFree} onChange={(e) => setForm({ ...form, isFree: e.target.checked, price: e.target.checked ? 0 : form.price })} className="h-4 w-4 accent-glory-600" /> {t('portal.freeLabel')}</label>
        <label className="flex items-center gap-2 text-sm font-bold">
          {t('portal.priceLabel')}
          <input type="number" min="0" step="0.01" dir="ltr" disabled={form.isFree} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className={`${inputClass} w-28`} />
        </label>
      </div>
      <div><button type="submit" disabled={busy} className="btn-primary px-5 py-2.5 text-sm"><Save className="h-4 w-4" /> {busy ? t('common.saving') : t('portal.saveCourse')}</button></div>
    </form>
  );
}

function LessonForm({ lesson, onSubmit, onCancel }) {
  const { t } = useI18n();
  const [form, setForm] = useState(lesson);
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    await onSubmit({
      ...form,
      durationSeconds: (Number(form.minutes) || 0) * 60 + (Number(form.seconds) || 0),
    });
    setBusy(false);
  };

  return (
    <form onSubmit={submit} className="grid gap-4">
      <FormField label={t('portal.lessonTitle')}><input required autoFocus value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputClass} /></FormField>
      <FormField label={t('portal.lessonTitleEn')}><input dir="ltr" value={form.titleEn} onChange={(e) => setForm({ ...form, titleEn: e.target.value })} className={inputClass} /></FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField label={t('portal.minutes')}><input type="number" min="0" dir="ltr" value={form.minutes} onChange={(e) => setForm({ ...form, minutes: e.target.value })} className={inputClass} /></FormField>
        <FormField label={t('portal.seconds')}><input type="number" min="0" max="59" dir="ltr" value={form.seconds} onChange={(e) => setForm({ ...form, seconds: e.target.value })} className={inputClass} /></FormField>
      </div>
      <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={form.isPreview} onChange={(e) => setForm({ ...form, isPreview: e.target.checked })} className="h-4 w-4 accent-glory-600" /> {t('portal.previewLabel')}</label>
      <div className="mt-2 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="btn-secondary px-5 py-2.5 text-sm">{t('common.cancel')}</button>
        <button type="submit" disabled={busy} className="btn-primary px-5 py-2.5 text-sm">{busy ? t('common.saving') : t('common.save')}</button>
      </div>
    </form>
  );
}

function ResourceForm({ resource, onSubmit, onCancel }) {
  const { t } = useI18n();
  const [form, setForm] = useState(resource);
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    await onSubmit(form);
    setBusy(false);
  };

  return (
    <form onSubmit={submit} className="grid gap-4">
      <FormField label={t('portal.resourceTitle')}><input required autoFocus value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputClass} /></FormField>
      <FormField label={t('portal.titleEn')}><input dir="ltr" value={form.titleEn} onChange={(e) => setForm({ ...form, titleEn: e.target.value })} className={inputClass} /></FormField>
      <FormField label={t('portal.resourceUrl')} hint={t('portal.videoHint')}>
        <input dir="ltr" required type="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value, kind: detectResourceKind(e.target.value) })} className={inputClass} placeholder="https://docs.google.com/..." />
      </FormField>
      <FormField label={t('portal.resourceKind')}>
        <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} className={inputClass}>
          {RESOURCE_KINDS.map((kind) => <option key={kind} value={kind}>{t(`portal.kinds.${kind}`)}</option>)}
        </select>
      </FormField>
      <div className="mt-2 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="btn-secondary px-5 py-2.5 text-sm">{t('common.cancel')}</button>
        <button type="submit" disabled={busy} className="btn-primary px-5 py-2.5 text-sm">{busy ? t('common.saving') : t('common.save')}</button>
      </div>
    </form>
  );
}

function VideoField({ lesson, onSaved, onError }) {
  const { t } = useI18n();
  const [value, setValue] = useState(lesson.drive_file_id || '');
  const [busy, setBusy] = useState(false);
  const [invalid, setInvalid] = useState(false);

  const save = async (raw) => {
    const fileId = raw ? parseDriveId(raw) : null;
    if (raw && !fileId) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    setBusy(true);
    const { error } = await setLessonVideo(lesson.id, fileId);
    setBusy(false);
    if (error) onError(error.message);
    else onSaved();
  };

  return (
    <div className="rounded-xl border border-line p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-xs font-black"><Film className="h-4 w-4 text-brand" /> {t('portal.videoTitle')}</span>
        <StatusPill tone={lesson.drive_file_id ? 'good' : 'neutral'}>{lesson.drive_file_id ? t('portal.videoLinked') : t('portal.videoMissing')}</StatusPill>
      </div>
      <div className="flex flex-wrap gap-2">
        <input dir="ltr" value={value} onChange={(event) => setValue(event.target.value)} placeholder="https://drive.google.com/file/d/..." className={`${inputClass} min-w-48 flex-1`} />
        <button type="button" disabled={busy} onClick={() => save(value)} className="btn-primary px-4 py-2 text-sm">{busy ? t('common.saving') : t('common.save')}</button>
        {lesson.drive_file_id && (
          <button type="button" disabled={busy} onClick={() => { setValue(''); save(''); }} className="btn-secondary px-4 py-2 text-sm">{t('portal.removeVideo')}</button>
        )}
      </div>
      <p className={`mt-2 text-xs font-semibold ${invalid ? 'text-red-600 dark:text-red-400' : 'text-muted'}`}>{invalid ? t('portal.videoInvalid') : t('portal.videoHint')}</p>
    </div>
  );
}

export default function CourseEditorPage() {
  const { courseId } = useParams();
  const { t, pick, formatClock, formatNumber } = useI18n();
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const [dialog, setDialog] = useState(null);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true }));
    const { data, error } = await getCourseContent(courseId);
    setState({ data: error ? null : data, error: error ? { message: error.message } : null, loading: false });
  }, [courseId]);

  useEffect(() => { load(); }, [load]);

  const onError = (text) => setMessage(t('portal.saveError', { message: text }));
  const afterSave = async () => {
    setDialog(null);
    setMessage(t('portal.saved'));
    await load();
  };

  const submitLesson = async (form) => {
    const lessons = state.data?.lessons || [];
    const { error } = await saveLesson({
      id: form.id,
      courseId,
      moduleId: state.data.course.module_id,
      title: form.title,
      titleEn: form.titleEn,
      durationSeconds: form.durationSeconds,
      isPreview: form.isPreview,
      position: form.position ?? (lessons.length ? Math.max(...lessons.map((item) => item.position)) + 1 : 1),
    });
    if (error) onError(error.message);
    else await afterSave();
  };

  const submitResource = async (form) => {
    const { error } = await saveLessonResource({ ...form, position: form.position ?? 1 });
    if (error) onError(error.message);
    else await afterSave();
  };

  const removeLesson = async (lesson) => {
    if (!window.confirm(t('portal.confirmDeleteLesson'))) return;
    const { error } = await deleteLesson(lesson.id);
    if (error) onError(error.message);
    else await afterSave();
  };

  const swapLessons = async (index, direction) => {
    const lessons = state.data.lessons;
    const target = lessons[index + direction];
    const current = lessons[index];
    if (!target) return;
    await moveLesson(current.id, target.position);
    await moveLesson(target.id, current.position);
    await load();
  };

  const course = state.data?.course;
  const lessons = state.data?.lessons || [];

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <SiteHeader compact />
      <main className="mx-auto max-w-5xl px-5 py-8 lg:px-8 lg:py-10">
        {!course ? (
          <DashboardStatus error={state.error} onRetry={load} />
        ) : (
          <div className={`space-y-6 transition-opacity ${state.loading ? 'opacity-60' : ''}`}>
            <div className="border-b border-line pb-6">
              <Link to="/instructor" className="inline-flex items-center gap-2 text-sm font-black text-muted hover:text-brand-ink">
                <ArrowRight className="h-4 w-4 ltr:rotate-180" /> {t('portal.backToPortal')}
              </Link>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-black">{pick({ title: course.title, titleEn: course.title_en }, 'title')}</h1>
                <StatusPill tone={course.is_published ? 'good' : 'warning'}>{course.is_published ? t('portal.published') : t('portal.draft')}</StatusPill>
              </div>
              <p className="mt-2 text-sm font-bold text-muted">
                {t('common.lessons', { count: lessons.length })} · {t('dash.col.learners')}: {formatNumber(course.enrollments)}
                {course.is_published && <> · <Link to={`/courses/${course.slug}`} className="text-brand-ink hover:underline">{t('portal.viewPage')}</Link></>}
              </p>
            </div>

            {message && <p role="status" className="rounded-xl bg-brand-soft px-4 py-3 text-sm font-bold text-brand-ink">{message}</p>}

            <Panel title={t('portal.saveCourse')}>
              <CourseDetailsForm course={course} onSaved={afterSave} onError={onError} />
            </Panel>

            <Panel
              title={t('portal.lessonsTitle')}
              actions={<button type="button" onClick={() => setDialog({ type: 'lesson', lesson: { ...emptyLesson } })} className="btn-primary px-4 py-2 text-sm"><Plus className="h-4 w-4" /> {t('portal.addLesson')}</button>}
            >
              {lessons.length === 0 && <p className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm font-bold text-muted">{t('portal.noLessons')}</p>}
              <ol className="grid gap-3">
                {lessons.map((lesson, index) => (
                  <li key={lesson.id} className="rounded-2xl border border-line p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="grid h-7 w-7 place-items-center rounded-lg bg-subtle font-inter text-xs font-black text-muted">{index + 1}</span>
                          <strong dir="ltr" className="text-start font-inter rtl:text-right">{pick({ title: lesson.title, titleEn: lesson.title_en }, 'title')}</strong>
                          {lesson.is_preview && <StatusPill tone="good">{t('common.preview')}</StatusPill>}
                          {formatClock(lesson.duration_seconds) && <span className="font-inter text-xs text-muted">{formatClock(lesson.duration_seconds)}</span>}
                        </div>
                        <p className="mt-1 text-xs font-semibold text-muted">{t('portal.lessonStats', { watchers: formatNumber(lesson.watchers), completions: formatNumber(lesson.completions) })}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button type="button" onClick={() => swapLessons(index, -1)} disabled={index === 0} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-subtle disabled:opacity-30" aria-label={t('portal.moveUp')}><ChevronUp className="h-4 w-4" /></button>
                        <button type="button" onClick={() => swapLessons(index, 1)} disabled={index === lessons.length - 1} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-subtle disabled:opacity-30" aria-label={t('portal.moveDown')}><ChevronDown className="h-4 w-4" /></button>
                        <button
                          type="button"
                          onClick={() => setDialog({ type: 'lesson', lesson: { id: lesson.id, title: lesson.title, titleEn: lesson.title_en || '', minutes: Math.floor(lesson.duration_seconds / 60), seconds: lesson.duration_seconds % 60, isPreview: lesson.is_preview, position: lesson.position } })}
                          className="rounded-lg px-2.5 py-1.5 text-xs font-black text-brand-ink hover:bg-brand-soft"
                        >
                          {t('common.edit')}
                        </button>
                        <button type="button" onClick={() => removeLesson(lesson)} className="grid h-8 w-8 place-items-center rounded-lg text-red-600 hover:bg-red-500/10 dark:text-red-400" aria-label={t('portal.deleteLesson')}><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-3">
                      <VideoField lesson={lesson} onSaved={afterSave} onError={onError} />

                      <div className="rounded-xl border border-line p-3">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <span className="flex items-center gap-2 text-xs font-black"><Paperclip className="h-4 w-4 text-brand" /> {t('portal.resourcesTitle')}</span>
                          <button type="button" onClick={() => setDialog({ type: 'resource', resource: { lessonId: lesson.id, title: '', titleEn: '', url: '', kind: 'slides', position: (lesson.resources?.length || 0) + 1 } })} className="rounded-lg px-2.5 py-1.5 text-xs font-black text-brand-ink hover:bg-brand-soft">
                            <Plus className="inline h-3.5 w-3.5" /> {t('portal.addResource')}
                          </button>
                        </div>
                        {lesson.resources?.length ? (
                          <ul className="grid gap-2">
                            {lesson.resources.map((resource) => (
                              <li key={resource.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-subtle px-3 py-2">
                                <span className="flex min-w-0 items-center gap-2 text-sm font-bold">
                                  <StatusPill tone="neutral">{t(`portal.kinds.${resource.kind}`)}</StatusPill>
                                  <span className="truncate">{pick({ title: resource.title, titleEn: resource.title_en }, 'title')}</span>
                                </span>
                                <span className="flex items-center gap-1">
                                  <a href={resource.url} target="_blank" rel="noreferrer" className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-surface" aria-label={t('common.open')}><ExternalLink className="h-4 w-4" /></a>
                                  <button type="button" onClick={() => setDialog({ type: 'resource', resource: { id: resource.id, lessonId: lesson.id, title: resource.title, titleEn: resource.title_en || '', url: resource.url, kind: resource.kind, position: resource.position } })} className="rounded-lg px-2 py-1 text-xs font-black text-brand-ink hover:bg-surface">{t('common.edit')}</button>
                                  <button type="button" onClick={async () => { const { error } = await deleteLessonResource(resource.id); if (error) onError(error.message); else await afterSave(); }} className="grid h-8 w-8 place-items-center rounded-lg text-red-600 hover:bg-red-500/10 dark:text-red-400" aria-label={t('common.delete')}><Trash2 className="h-4 w-4" /></button>
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs font-semibold text-muted">{t('portal.noResources')}</p>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </Panel>
          </div>
        )}
      </main>

      {dialog?.type === 'lesson' && (
        <Modal title={dialog.lesson.id ? t('portal.editLesson') : t('portal.addLesson')} onClose={() => setDialog(null)}>
          <LessonForm lesson={dialog.lesson} onSubmit={submitLesson} onCancel={() => setDialog(null)} />
        </Modal>
      )}
      {dialog?.type === 'resource' && (
        <Modal title={t('portal.addResource')} onClose={() => setDialog(null)}>
          <ResourceForm resource={dialog.resource} onSubmit={submitResource} onCancel={() => setDialog(null)} />
        </Modal>
      )}
    </div>
  );
}
