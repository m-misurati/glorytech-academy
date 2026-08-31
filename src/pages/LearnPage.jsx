import { useEffect, useMemo, useState } from 'react';
import { Check, CheckCircle2, ChevronLeft, Circle, ListVideo, Menu, X } from 'lucide-react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import LessonPlayer from '../components/LessonPlayer';
import { useAuth } from '../context/AuthContext';
import { useCatalog } from '../context/CatalogContext';
import { getLesson } from '../data/courses';
import { getUserProgress, saveLessonProgress } from '../lib/supabase';

export default function LearnPage() {
  const { slug, lessonId } = useParams();
  const { getCourseBySlug } = useCatalog();
  const course = getCourseBySlug(slug);
  const lesson = getLesson(course, lessonId);
  const { user, isDemo } = useAuth();
  const navigate = useNavigate();
  const [completed, setCompleted] = useState(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const allLessons = useMemo(() => course?.modules.flatMap((module) => module.lessons) || [], [course]);
  const lessonIndex = allLessons.findIndex((item) => item.id === lessonId);
  const nextLesson = allLessons[lessonIndex + 1];
  const progress = allLessons.length ? Math.round((completed.size / allLessons.length) * 100) : 0;

  useEffect(() => {
    let active = true;
    getUserProgress(user?.id).then(({ data }) => { if (active && data) setCompleted(new Set(data.filter((row) => row.completed_at).map((row) => row.lesson_id))); });
    return () => { active = false; };
  }, [user?.id]);

  if (!course || !lesson) return <Navigate to="/404" replace />;

  const markComplete = async () => {
    setSaving(true);
    await saveLessonProgress({ userId: user.id, lessonId: lesson.id, completed: true });
    setCompleted((current) => new Set([...current, lesson.id]));
    setSaving(false);
    if (nextLesson) navigate(`/learn/${course.slug}/${nextLesson.id}`);
  };

  return (
    <div className="min-h-screen bg-[#0f1416] text-white">
      <AppHeader dark />
      <div className="mx-auto flex max-w-[1600px]">
        <aside className={`${sidebarOpen ? 'translate-x-0' : 'translate-x-full'} fixed inset-y-0 right-0 z-50 w-[88%] max-w-sm overflow-y-auto border-l border-white/10 bg-[#141a1c] transition lg:sticky lg:top-[73px] lg:h-[calc(100vh-73px)] lg:w-[380px] lg:translate-x-0`}>
          <div className="sticky top-0 z-10 border-b border-white/10 bg-[#141a1c]/95 p-5 backdrop-blur">
            <div className="flex items-start justify-between gap-4"><div><small className="font-black text-[#ff7438]">{course.code}</small><h1 className="mt-2 font-black leading-6">{course.shortTitle}</h1></div><button type="button" onClick={() => setSidebarOpen(false)} className="lg:hidden"><X className="h-5 w-5" /></button></div>
            <div className="mt-4 flex items-center gap-3"><div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#1bb89d]" style={{ width: `${progress}%` }} /></div><span className="text-xs font-black text-white/60">{progress}%</span></div>
          </div>
          <div className="p-3">{course.modules.map((module, moduleIndex) => <div key={module.id} className="mb-5"><h2 className="px-3 py-2 text-xs font-black text-white/40">الوحدة {moduleIndex + 1} · {module.title}</h2>{module.lessons.map((item) => { const active = item.id === lesson.id; const done = completed.has(item.id); return <button key={item.id} type="button" onClick={() => { navigate(`/learn/${course.slug}/${item.id}`); setSidebarOpen(false); }} className={`${active ? 'bg-white text-[#171c1e]' : 'text-white/70 hover:bg-white/5'} mb-1 flex w-full items-center gap-3 rounded-xl p-3 text-right transition`}><span className={`${done ? 'bg-[#1bb89d] text-white' : active ? 'bg-[#fff0e9] text-[#ff7438]' : 'bg-white/10 text-white/50'} grid h-8 w-8 shrink-0 place-items-center rounded-lg`}>{done ? <Check className="h-4 w-4" /> : <Circle className="h-3 w-3" />}</span><span className="min-w-0 flex-1"><strong className="block truncate text-sm">{item.title}</strong><small className={`${active ? 'text-slate-400' : 'text-white/30'} mt-1 block`}>{item.duration}</small></span></button>; })}</div>)}</div>
        </aside>

        {sidebarOpen && <button type="button" aria-label="إغلاق قائمة الدروس" onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-40 bg-black/60 lg:hidden" />}

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-7 lg:px-10 lg:py-9">
          <button type="button" onClick={() => setSidebarOpen(true)} className="mb-5 inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-black lg:hidden"><Menu className="h-5 w-5" /> قائمة الدروس</button>
          <LessonPlayer lesson={lesson} />
          <div className="mx-auto max-w-5xl py-7">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start"><div><span className="text-xs font-black text-[#1bb89d]">الدرس {lessonIndex + 1} من {allLessons.length}</span><h2 className="mt-2 text-2xl font-black sm:text-3xl">{lesson.title}</h2><p className="mt-3 text-sm font-medium text-white/45">مدة الدرس: {lesson.duration}</p></div><button type="button" disabled={saving || completed.has(lesson.id)} onClick={markComplete} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#1bb89d] px-6 py-3.5 font-black text-white disabled:bg-white/10 disabled:text-white/50">{completed.has(lesson.id) ? <><CheckCircle2 className="h-5 w-5" /> مكتمل</> : saving ? 'جارٍ الحفظ…' : <>{nextLesson ? 'أكمل وانتقل للتالي' : 'أكمل الكورس'} <ChevronLeft className="h-5 w-5" /></>}</button></div>
            {isDemo && <p className="mt-7 rounded-xl border border-[#ff7438]/20 bg-[#ff7438]/10 px-4 py-3 text-xs font-bold text-orange-200">وضع المعاينة: الإنجاز يبقى في هذه الجلسة فقط إلى أن يتم ربط Supabase.</p>}
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/[.04] p-6"><div className="flex items-center gap-3"><ListVideo className="h-6 w-6 text-[#ff7438]" /><h3 className="font-black">عن هذا الدرس</h3></div><p className="mt-4 text-sm font-medium leading-8 text-white/55">تابع الشرح، طبّق الخطوات داخل مختبرك، ثم علّم الدرس كمكتمل. يمكنك الرجوع إليه في أي وقت من لوحة الطالب.</p></div>
          </div>
        </main>
      </div>
    </div>
  );
}
