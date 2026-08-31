import { useState } from 'react';
import { ArrowLeft, BookOpen, Check, ChevronDown, Clock3, LockKeyhole, PlayCircle, Signal } from 'lucide-react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import { useAuth } from '../context/AuthContext';
import { useCatalog } from '../context/CatalogContext';
import { getFirstLesson, instructor } from '../data/courses';
import { enrollInCourse } from '../lib/supabase';

export default function CoursePage() {
  const { slug } = useParams();
  const { getCourseBySlug } = useCatalog();
  const course = getCourseBySlug(slug);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [openModule, setOpenModule] = useState(0);
  const [busy, setBusy] = useState(false);
  const [enrollError, setEnrollError] = useState('');

  if (!course) return <Navigate to="/404" replace />;
  if (course.availability === 'coming_soon') return <Navigate to="/#courses" replace />;

  const startCourse = async () => {
    if (!user) {
      navigate('/login?mode=signup', { state: { from: `/courses/${course.slug}` } });
      return;
    }
    setBusy(true);
    setEnrollError('');
    const { error } = await enrollInCourse(user.id, course.id);
    if (error) {
      setEnrollError('تعذّر تسجيلك في الكورس الآن. جرّب مرة أخرى.');
      setBusy(false);
      return;
    }
    const lesson = getFirstLesson(course);
    if (!lesson) {
      setEnrollError('محتوى هذا الكورس غير جاهز بعد.');
      setBusy(false);
      return;
    }
    navigate(`/learn/${course.slug}/${lesson.id}`);
  };

  return (
    <div className="min-h-screen bg-[#f7f9fb]">
      <AppHeader />
      <main>
        <section className="relative overflow-hidden bg-[#fbefec]">
          <div className="absolute -left-24 top-8 h-72 w-72 rounded-full bg-[#1bb89d]/10" />
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 lg:grid-cols-[1.08fr_.92fr] lg:px-8 lg:py-24">
            <div>
              <span className="inline-block -rotate-2 rounded-full bg-[#ff7438] px-4 py-1.5 text-xs font-black text-white">{course.code} · مجاني</span>
              <h1 className="mt-6 max-w-3xl text-4xl font-black leading-[1.2] tracking-tight sm:text-6xl">{course.title}</h1>
              <p className="mt-6 max-w-2xl text-lg font-medium leading-9 text-slate-600">{course.description}</p>
              <div className="mt-7 flex flex-wrap gap-5 text-sm font-bold text-slate-600"><span className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-[#1bb89d]" /> {course.lessonsCount} دروس</span><span className="flex items-center gap-2"><Clock3 className="h-5 w-5 text-[#1bb89d]" /> {course.duration}</span><span className="flex items-center gap-2"><Signal className="h-5 w-5 text-[#1bb89d]" /> {course.level}</span></div>
              <button type="button" onClick={startCourse} disabled={busy} className="mt-9 inline-flex items-center gap-3 rounded-full bg-[#1bb89d] px-7 py-4 font-black text-white shadow-lg shadow-teal-800/15 transition hover:-translate-y-1 disabled:opacity-60">{busy ? 'نجهّز الكورس…' : user ? 'ابدأ التعلّم الآن' : 'سجّل وابدأ مجاناً'} <ArrowLeft className="h-5 w-5" /></button>
              {enrollError && <p className="mt-4 text-sm font-bold text-red-600" role="alert">{enrollError}</p>}
            </div>

            <div className="relative aspect-[16/10] min-h-[390px] overflow-hidden rounded-[2rem] bg-slate-900 shadow-2xl">
              <img src={course.coverImage} alt={course.coverAlt || ''} className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/10 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between gap-4 rounded-2xl border border-white/15 bg-slate-950/75 p-4 text-white backdrop-blur"><div><small className="text-white/55">GloryTech Track</small><strong className="mt-1 block">{course.shortTitle}</strong></div><PlayCircle className="h-12 w-12 shrink-0 text-[#ff7438]" /></div>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-10 px-5 py-20 lg:grid-cols-[1.15fr_.85fr] lg:px-8">
          <div>
            <span className="text-xs font-black text-[#ff7438]">محتوى الكورس</span>
            <h2 className="mt-2 text-3xl font-black">خطة واضحة من البداية للنهاية</h2>
            <div className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {course.modules.map((module, index) => (
                <div key={module.id} className="border-b border-slate-100 last:border-0">
                  <button type="button" onClick={() => setOpenModule(openModule === index ? -1 : index)} className="flex w-full items-center justify-between gap-5 p-5 text-right"><span><small className="block text-xs font-black text-[#1bb89d]">الوحدة {index + 1}</small><strong className="mt-1 block text-lg">{module.title}</strong></span><ChevronDown className={`h-5 w-5 transition ${openModule === index ? 'rotate-180 text-[#ff7438]' : 'text-slate-400'}`} /></button>
                  {openModule === index && <div className="border-t border-slate-100 bg-[#fafbfc] p-4">{module.lessons.map((lesson, lessonIndex) => <div key={lesson.id} className="flex items-center justify-between gap-4 rounded-xl px-3 py-3 text-sm"><span className="flex items-center gap-3 font-bold"><span className="grid h-8 w-8 place-items-center rounded-lg bg-white text-xs text-slate-400">{lessonIndex + 1}</span>{lesson.title}</span><span className="flex items-center gap-2 text-xs font-bold text-slate-400">{lesson.isPreview ? <PlayCircle className="h-4 w-4 text-[#1bb89d]" /> : <LockKeyhole className="h-4 w-4" />}{lesson.duration}</span></div>)}</div>}
                </div>
              ))}
            </div>
          </div>

          <aside className="space-y-7">
            <div className="rounded-[2rem] bg-[#171c1e] p-7 text-white"><h2 className="text-2xl font-black">ماذا ستتعلّم؟</h2><ul className="mt-6 space-y-4">{course.outcomes.map((outcome) => <li key={outcome} className="flex gap-3 text-sm font-medium leading-7 text-white/75"><span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#1bb89d]"><Check className="h-3.5 w-3.5" /></span>{outcome}</li>)}</ul></div>
            <div className="flex items-center gap-4 rounded-[2rem] border border-slate-200 bg-white p-5"><div className="h-20 w-20 overflow-hidden rounded-2xl bg-[#fff1ec]"><img src={instructor.image} alt="" className="h-full w-full object-contain object-bottom" /></div><div className="min-w-0 flex-1"><small className="font-black text-[#ff7438]">مدرّب الكورس</small><strong className="mt-1 block">{instructor.name}</strong><img src={instructor.certifications[0].logo} alt={instructor.certifications[0].name} className="mt-2 h-10 w-20 object-contain object-left" /></div></div>
          </aside>
        </section>
      </main>
    </div>
  );
}
