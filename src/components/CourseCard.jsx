import { ArrowLeft, BookOpen, Clock3, Layers3, Network, Play } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function CourseCard({ course, dashboard = false, progress = 0 }) {
  const isOrange = course.accent === 'orange';
  const CourseIcon = isOrange ? Layers3 : Network;

  return (
    <article className="group overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_12px_45px_rgba(23,28,30,.07)] transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_22px_65px_rgba(23,28,30,.12)]">
      <div className={`relative h-64 overflow-hidden bg-gradient-to-br ${course.coverClass} p-6`}>
        <div className="absolute -left-10 -top-14 h-48 w-48 rounded-full border-[28px] border-white/40" />
        <div className="absolute -bottom-20 -right-12 h-60 w-60 rounded-full bg-white/35" />
        <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px]" />

        <span className="relative z-10 inline-block -rotate-2 rounded-full bg-[#ff7438] px-3 py-1.5 text-xs font-black text-white">{course.code}</span>
        <div className="relative z-10 mx-auto mt-5 grid h-32 w-40 place-items-center rounded-[2rem] border border-white/70 bg-white/75 shadow-xl shadow-slate-900/10 backdrop-blur-sm transition duration-300 group-hover:-rotate-2 group-hover:scale-105">
          <span className={`${isOrange ? 'bg-[#fff0e9] text-[#ff7438]' : 'bg-[#dff8f2] text-[#149d87]'} grid h-20 w-20 place-items-center rounded-3xl`}>
            <CourseIcon className="h-10 w-10" />
          </span>
          <span className="absolute -left-6 bottom-5 rounded-xl bg-white px-3 py-2 text-[10px] font-black text-slate-600 shadow-lg">LAB 01</span>
          <span className="absolute -right-7 top-4 rounded-xl bg-[#171c1e] px-3 py-2 text-[10px] font-black text-white shadow-lg">ONLINE</span>
        </div>
      </div>

      <div className="p-6 sm:p-7">
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs font-black text-[#1bb89d]">{course.level}</span>
          <span className="font-inter text-lg font-black text-[#ff7438]">FREE</span>
        </div>
        <h3 className="mt-3 text-2xl font-black leading-snug text-[#171c1e]">{course.title}</h3>
        <p className="mt-3 min-h-[84px] text-sm font-medium leading-7 text-slate-500">{course.description}</p>

        <div className="mt-5 flex flex-wrap gap-4 border-y border-slate-100 py-4 text-xs font-bold text-slate-500">
          <span className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-[#1bb89d]" /> {course.lessonsCount} دروس</span>
          <span className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-[#1bb89d]" /> {course.duration}</span>
        </div>

        {dashboard && (
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-xs font-black"><span className="text-slate-600">نسبة الإنجاز</span><span className="text-[#1bb89d]">{progress}%</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#1bb89d]" style={{ width: `${progress}%` }} /></div>
          </div>
        )}

        <Link to={dashboard ? `/learn/${course.slug}/${course.modules[0].lessons[0].id}` : `/courses/${course.slug}`} className="mt-6 flex items-center justify-between rounded-full bg-[#f7f9fb] px-5 py-3.5 font-black text-[#171c1e] transition group-hover:bg-[#171c1e] group-hover:text-white">
          <span className="flex items-center gap-2"><Play className="h-4 w-4 fill-current text-[#ff7438]" /> {dashboard ? 'واصل التعلّم' : 'تفاصيل الكورس'}</span>
          <ArrowLeft className="h-5 w-5 transition group-hover:-translate-x-1" />
        </Link>
      </div>
    </article>
  );
}
