import { useEffect, useMemo, useState } from 'react';
import { BookOpen, CheckCircle2, Clock3, Sparkles } from 'lucide-react';
import AppHeader from '../components/AppHeader';
import CourseCard from '../components/CourseCard';
import { useAuth } from '../context/AuthContext';
import { useCatalog } from '../context/CatalogContext';
import { getUserProgress } from '../lib/supabase';

export default function DashboardPage() {
  const { user, isDemo } = useAuth();
  const { availableCourses } = useCatalog();
  const [progressRows, setProgressRows] = useState([]);

  useEffect(() => {
    let active = true;
    getUserProgress(user?.id).then(({ data }) => { if (active && data) setProgressRows(data); });
    return () => { active = false; };
  }, [user?.id]);

  const completedLessons = progressRows.filter((row) => row.completed_at).length;
  const courseProgress = useMemo(() => Object.fromEntries(availableCourses.map((course) => {
    const ids = new Set(course.modules.flatMap((module) => module.lessons.map((lesson) => lesson.id)));
    const completed = progressRows.filter((row) => row.completed_at && ids.has(row.lesson_id)).length;
    return [course.id, course.lessonsCount ? Math.round((completed / course.lessonsCount) * 100) : 0];
  })), [availableCourses, progressRows]);
  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'طالب GloryTech';

  return (
    <div className="min-h-screen bg-[#f7f9fb]">
      <AppHeader />
      <main className="mx-auto max-w-7xl px-5 py-10 lg:px-8 lg:py-14">
        <div className="relative overflow-hidden rounded-[2rem] bg-[#fbefec] p-7 sm:p-10">
          <div className="absolute -left-10 -top-20 h-56 w-56 rounded-full bg-[#ff7438]/10" />
          <span className="relative inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-black text-[#ff7438]"><Sparkles className="h-4 w-4" /> مساحة التعلّم</span>
          <h1 className="relative mt-5 text-3xl font-black sm:text-4xl">مرحباً، {displayName}</h1>
          <p className="relative mt-3 font-medium text-slate-500">اختر الكورس الذي تريد متابعته اليوم.</p>
          {isDemo && <p className="relative mt-5 inline-block rounded-xl bg-[#fff7f3] px-4 py-2 text-xs font-black text-[#b84a19]">أنت داخل وضع المعاينة — التقدّم غير محفوظ في قاعدة البيانات.</p>}
        </div>

        <div className="mt-7 grid gap-4 sm:grid-cols-3">
          {[{ icon: BookOpen, value: availableCourses.length, label: 'كورسات متاحة', color: 'teal' }, { icon: CheckCircle2, value: completedLessons, label: 'دروس مكتملة', color: 'orange' }, { icon: Clock3, value: '14h', label: 'محتوى تعليمي', color: 'dark' }].map((stat) => (
            <div key={stat.label} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5"><span className={`${stat.color === 'orange' ? 'bg-[#fff0e9] text-[#ff7438]' : stat.color === 'dark' ? 'bg-slate-100 text-slate-800' : 'bg-[#dff8f2] text-[#1bb89d]'} grid h-12 w-12 place-items-center rounded-xl`}><stat.icon className="h-6 w-6" /></span><div><strong className="block text-2xl font-black">{stat.value}</strong><span className="text-xs font-bold text-slate-500">{stat.label}</span></div></div>
          ))}
        </div>

        <div className="mt-12 flex items-end justify-between gap-5"><div><span className="text-xs font-black text-[#ff7438]">كورساتك</span><h2 className="mt-2 text-3xl font-black">واصل من حيث توقفت</h2></div><span className="text-sm font-bold text-slate-400">{availableCourses.length} حالياً</span></div>
        <div className="mt-7 grid gap-7 lg:grid-cols-2">{availableCourses.map((course) => <CourseCard key={course.id} course={course} dashboard progress={courseProgress[course.id] || 0} />)}</div>
      </main>
    </div>
  );
}
