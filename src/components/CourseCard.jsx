import { ArrowLeft, Bell, BookOpen, Clock3, Play } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function CourseCard({ course, dashboard = false, progress = 0 }) {
  const comingSoon = course.availability === 'coming_soon';
  const courseHref = dashboard ? `/learn/${course.slug}/${course.modules[0]?.lessons[0]?.id}` : `/courses/${course.slug}`;

  return (
    <article className={`${comingSoon ? '' : 'group'} overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_12px_45px_rgba(23,28,30,.07)] transition duration-300 ${comingSoon ? '' : 'hover:-translate-y-1.5 hover:shadow-[0_22px_65px_rgba(23,28,30,.12)]'}`}>
      <div className="relative aspect-video overflow-hidden bg-slate-900">
        <img src={course.coverImage} alt={course.coverAlt || ''} className={`h-full w-full object-cover transition duration-500 ${comingSoon ? 'saturate-[.8]' : 'group-hover:scale-[1.03]'}`} />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-slate-950/5 to-slate-950/20" />
        <span className="absolute right-5 top-5 inline-block -rotate-2 rounded-full bg-[#ff7438] px-3 py-1.5 text-xs font-black text-white shadow-lg">{course.code}</span>
        {comingSoon && <span className="absolute bottom-5 left-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black text-[#171c1e] shadow-xl"><Bell className="h-4 w-4 text-[#1bb89d]" /> قريباً</span>}
      </div>

      <div className="p-6 sm:p-7">
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs font-black text-[#1bb89d]">{course.level}</span>
          <span className="font-inter text-lg font-black text-[#ff7438]">{comingSoon ? 'COMING SOON' : 'FREE'}</span>
        </div>
        <h3 className="mt-3 text-2xl font-black leading-snug text-[#171c1e]">{course.title}</h3>
        <p className="mt-3 min-h-[84px] text-sm font-medium leading-7 text-slate-500">{course.description}</p>

        {comingSoon ? (
          <div className="mt-5 rounded-2xl bg-[#fff7f3] px-4 py-4 text-sm font-bold text-slate-600">نعمل على تجهيز المحتوى العملي. سنعلن موعد الإطلاق عند اكتماله.</div>
        ) : (
          <div className="mt-5 flex flex-wrap gap-4 border-y border-slate-100 py-4 text-xs font-bold text-slate-500">
            <span className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-[#1bb89d]" /> {course.lessonsCount} دروس</span>
            <span className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-[#1bb89d]" /> {course.duration}</span>
          </div>
        )}

        {dashboard && (
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-xs font-black"><span className="text-slate-600">نسبة الإنجاز</span><span className="text-[#1bb89d]">{progress}%</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#1bb89d]" style={{ width: `${progress}%` }} /></div>
          </div>
        )}

        {comingSoon ? (
          <div aria-disabled="true" className="mt-6 flex cursor-not-allowed items-center justify-between rounded-full bg-slate-100 px-5 py-3.5 font-black text-slate-400">
            <span className="flex items-center gap-2"><Bell className="h-4 w-4" /> سيفتح قريباً</span>
          </div>
        ) : (
          <Link to={courseHref} className="mt-6 flex items-center justify-between rounded-full bg-[#f7f9fb] px-5 py-3.5 font-black text-[#171c1e] transition group-hover:bg-[#171c1e] group-hover:text-white">
            <span className="flex items-center gap-2"><Play className="h-4 w-4 fill-current text-[#ff7438]" /> {dashboard ? 'واصل التعلّم' : 'تفاصيل الكورس'}</span>
            <ArrowLeft className="h-5 w-5 transition group-hover:-translate-x-1" />
          </Link>
        )}
      </div>
    </article>
  );
}
