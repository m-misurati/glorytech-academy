import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  BadgeCheck,
  BookOpen,
  ChevronDown,
  Cloud,
  Code2,
  GraduationCap,
  Laptop,
  Mail,
  Network,
  Search,
  ShieldCheck,
  Sparkles,
  Wifi,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Brand from '../components/Brand';
import CourseCard from '../components/CourseCard';
import Hero from '../components/Hero';
import Navbar from '../components/Navbar';
import { useCatalog } from '../context/CatalogContext';
import { instructor } from '../data/courses';

const categories = [
  { name: 'أساسيات الشبكات', icon: Network, available: true, count: 1 },
  { name: 'شبكات المؤسسات', icon: Wifi, available: true, count: 1 },
  { name: 'الأمن السيبراني', icon: ShieldCheck, available: false },
  { name: 'الحوسبة السحابية', icon: Cloud, available: false },
  { name: 'الأتمتة', icon: Code2, available: false },
  { name: 'المختبرات العملية', icon: Laptop, available: false },
];

const faqs = [
  { q: 'هل الكورسات مجانية فعلاً؟', a: 'نعم. الكورسان المتاحان حالياً مجانيان بالكامل، ويمكنك التسجيل بالبريد ومتابعة الدروس من داخل المنصة.' },
  { q: 'كيف نسجّل الدخول؟', a: 'تكتب بريدك الإلكتروني، ونرسل لك رمزاً من ستة أرقام. لا تحتاج إلى إنشاء أو حفظ كلمة مرور.' },
  { q: 'أين تُعرض فيديوهات الدروس؟', a: 'تظهر الدروس داخل صفحة المشاهدة في المنصة. تتم إدارة ملفات الفيديو عبر قناة Telegram مخصّصة للمحتوى.' },
  { q: 'هل ستُضاف كورسات أخرى؟', a: 'نعم. المنصة مبنية لتتوسع، وأي مسار جديد سيظهر تلقائياً في صفحة الكورسات ولوحة الطالب.' },
  { q: 'هل أستطيع متابعة تقدّمي؟', a: 'نعم. بعد تسجيل الدخول تحفظ المنصة الدروس المكتملة وموضع التقدّم لكل طالب.' },
];

function SectionTag({ children, color = 'orange' }) {
  return <span className={`${color === 'teal' ? 'bg-[#1bb89d]' : 'bg-[#ff7438]'} inline-block -rotate-2 rounded-full px-4 py-1.5 text-xs font-black text-white`}>{children}</span>;
}

export default function LandingPage() {
  const { courses } = useCatalog();
  const contactEmail = import.meta.env.VITE_CONTACT_EMAIL?.trim();
  const [query, setQuery] = useState('');
  const [openFaq, setOpenFaq] = useState(0);
  const filteredCourses = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return courses;
    return courses.filter((course) => `${course.title} ${course.description}`.toLowerCase().includes(normalized));
  }, [query, courses]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-[#171c1e]">
      <Navbar />
      <main>
        <Hero />

        <section id="courses" className="bg-[#f7f9fb] py-24 lg:py-32">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <SectionTag>كورساتنا</SectionTag>
                <h2 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">استكشف مسارات التعلّم</h2>
                <p className="mt-4 max-w-2xl font-medium leading-8 text-slate-500">كورسان متاحان مجاناً الآن، ومسارا DevOps Bootcamp وCCNP Enterprise قادمان قريباً.</p>
              </div>
              <label className="flex w-full max-w-md items-center gap-3 rounded-full border border-slate-200 bg-white px-5 py-3 shadow-sm focus-within:border-[#1bb89d] focus-within:ring-4 focus-within:ring-teal-100">
                <Search className="h-5 w-5 text-[#ff7438]" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} type="search" placeholder="ابحث عن كورس" className="w-full bg-transparent font-bold text-slate-800 outline-none placeholder:text-slate-400" aria-label="البحث في الكورسات" />
              </label>
            </div>

            <div className="mt-12 grid gap-7 lg:grid-cols-2">
              {filteredCourses.map((course) => <CourseCard key={course.id} course={course} />)}
            </div>
            {filteredCourses.length === 0 && <div className="mt-12 rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center font-bold text-slate-500">لا يوجد كورس مطابق للبحث حالياً.</div>}

            <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-7">
              <p className="flex items-center gap-2 text-sm font-bold text-slate-500"><Sparkles className="h-4 w-4 text-[#ff7438]" /> مساران جديدان قيد التجهيز، والمنصة جاهزة لإضافة المزيد.</p>
              <Link to="/login?mode=signup" className="inline-flex items-center gap-2 rounded-full bg-[#171c1e] px-5 py-3 text-sm font-black text-white">افتح حساباً مجانياً <ArrowLeft className="h-4 w-4" /></Link>
            </div>
          </div>
        </section>

        <section className="bg-[#fff1ec] py-24 lg:py-28">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="text-center">
              <SectionTag>التخصصات</SectionTag>
              <h2 className="mt-5 text-4xl font-black tracking-tight">اختر المجال الذي تريد تطويره</h2>
              <p className="mt-3 font-medium text-slate-500">مجالان متاحان الآن، والبقية ضمن خارطة المحتوى القادمة.</p>
            </div>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((category, index) => (
                <div key={category.name} className={`${category.available ? 'bg-white' : 'bg-white/55'} group relative min-h-[150px] rounded-2xl border border-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg`}>
                  <span className="absolute left-5 top-4 font-inter text-4xl font-black text-[#f2ded6]">0{index + 1}</span>
                  <category.icon className={`${category.available ? 'text-[#ff7438]' : 'text-slate-300'} h-9 w-9`} />
                  <h3 className="mt-5 text-lg font-black">{category.name}</h3>
                  <p className={`mt-2 text-xs font-black ${category.available ? 'text-[#1bb89d]' : 'text-slate-400'}`}>{category.available ? `${category.count} كورس متاح` : 'قريباً'}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="instructor" className="bg-[#f7f9fb] py-24 lg:py-32">
          <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 lg:grid-cols-2 lg:px-8">
            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="relative mx-auto min-h-[600px] w-full max-w-lg overflow-hidden rounded-[2.5rem] bg-[#fff1ec]">
              <div className="absolute -left-20 top-16 h-72 w-72 rounded-full bg-[#1bb89d]/16" />
              <div className="absolute -right-16 bottom-16 h-64 w-64 rotate-12 rounded-[4rem] bg-[#ff7438]/12" />
              <div className="absolute inset-x-12 bottom-0 h-[76%] rounded-t-[45%] bg-white/65" />
              <img src={instructor.image} alt={instructor.name} className="absolute inset-0 h-full w-full object-contain object-bottom" />
              <div className="absolute bottom-5 right-5 w-36 rounded-2xl bg-white p-3 shadow-xl">
                <img src={instructor.certifications[0].logo} alt={instructor.certifications[0].name} className="h-20 w-full object-contain" />
              </div>
            </motion.div>
            <div>
              <SectionTag>المدرّب</SectionTag>
              <h2 className="mt-6 text-4xl font-black leading-tight sm:text-5xl">تعلّم من خبرة<br />تعمل في الميدان.</h2>
              <p className="mt-6 text-lg font-medium leading-9 text-slate-600">{instructor.bio}</p>
              <h3 className="mt-6 text-xl font-black">{instructor.name}</h3>
              <p className="mt-1 font-bold text-[#1bb89d]">{instructor.role}</p>
              <div className="mt-7 grid grid-cols-3 gap-3 sm:grid-cols-5">
                {instructor.certifications.map((certification) => (
                  <div key={certification.name} className="grid min-h-24 place-items-center rounded-2xl border border-slate-200 bg-white p-2" title={`${certification.issuer} — ${certification.name}`}>
                    <img src={certification.logo} alt={`${certification.issuer} ${certification.name}`} className="h-16 w-full object-contain" />
                  </div>
                ))}
              </div>
              <a href="#certifications" className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#1bb89d] px-6 py-3.5 font-black text-white">عرض الشهادات <ArrowLeft className="h-4 w-4" /></a>
            </div>
          </div>
        </section>

        <section id="certifications" className="relative overflow-hidden bg-white py-24 lg:py-28">
          <div className="absolute -right-40 top-0 h-96 w-96 rounded-full border border-[#ff7438]/20" />
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="text-center">
              <SectionTag>الخبرة والاعتمادات</SectionTag>
              <h2 className="mt-5 text-4xl font-black">معرفة مدعومة بمسار مهني حقيقي</h2>
              <p className="mx-auto mt-4 max-w-2xl font-medium leading-8 text-slate-500">اعتمادات في شبكات Cisco، الأمن، الحوسبة السحابية والافتراضية.</p>
            </div>
            <div className="mt-12 grid gap-7 lg:grid-cols-[.8fr_1.2fr]">
              <article className="relative overflow-hidden rounded-[2rem] bg-[#171c1e] p-8 text-white sm:p-10">
                <div className="absolute -left-16 -top-16 h-48 w-48 rounded-full bg-[#1bb89d]/20" />
                <img src="/assets/glorytech-mark.png" alt="" className="relative h-16 w-16 object-contain" />
                <p className="relative mt-8 text-xs font-black text-[#69dbc8]">نبذة مهنية</p>
                <h3 className="relative mt-3 text-3xl font-black leading-tight">{instructor.name}</h3>
                <p className="relative mt-3 font-black text-[#ff9a6d]">{instructor.role}</p>
                <p className="relative mt-6 text-sm font-medium leading-8 text-white/70">{instructor.bio}</p>
                <div className="relative mt-7 flex flex-wrap gap-2 text-xs font-black">
                  {['شبكات المؤسسات', 'الأمن', 'الحوسبة السحابية', 'الافتراضية'].map((area) => <span key={area} className="rounded-full border border-white/15 px-3 py-2 text-white/75">{area}</span>)}
                </div>
              </article>

              <div className="grid gap-4 sm:grid-cols-2">
                {instructor.certifications.map((certification, index) => (
                  <article key={certification.name} className={`${index === 0 ? 'sm:col-span-2' : ''} flex min-h-44 items-center gap-5 rounded-[1.75rem] border border-slate-200 bg-[#f7f9fb] p-5 transition hover:-translate-y-1 hover:bg-white hover:shadow-xl`}>
                    <div className={`${index === 0 ? 'h-32 w-40' : 'h-24 w-28'} shrink-0 rounded-2xl bg-white p-2 shadow-sm`}>
                      <img src={certification.logo} alt="" className="h-full w-full object-contain" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-[#1bb89d]">{certification.issuer}</p>
                      <h3 dir="ltr" className="mt-2 text-left font-inter text-base font-black leading-6 text-slate-900">{certification.name}</h3>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="faq" className="bg-[#f7f9fb] py-24 lg:py-28">
          <div className="mx-auto grid max-w-6xl gap-12 px-5 lg:grid-cols-[.72fr_1.28fr] lg:px-8">
            <div>
              <SectionTag>الأسئلة الشائعة</SectionTag>
              <h2 className="mt-5 text-4xl font-black leading-tight">كل ما تحتاج معرفته قبل أن تبدأ.</h2>
              <p className="mt-5 font-medium leading-8 text-slate-500">لم تجد الإجابة؟ تستطيع التواصل معنا وسنساعدك.</p>
              {contactEmail && <a href={`mailto:${contactEmail}`} className="mt-6 inline-flex items-center gap-2 font-black text-[#1bb89d]"><Mail className="h-5 w-5" /> راسلنا</a>}
            </div>
            <div className="divide-y divide-slate-200 border-y border-slate-200">
              {faqs.map((item, index) => (
                <div key={item.q}>
                  <button type="button" onClick={() => setOpenFaq(openFaq === index ? -1 : index)} className="flex w-full items-center justify-between gap-5 py-5 text-right font-black" aria-expanded={openFaq === index}>
                    {item.q}
                    <ChevronDown className={`h-5 w-5 shrink-0 transition ${openFaq === index ? 'rotate-180 text-[#ff7438]' : 'text-slate-400'}`} />
                  </button>
                  <AnimatePresence initial={false}>
                    {openFaq === index && <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden pb-5 text-sm font-medium leading-7 text-slate-600">{item.a}</motion.p>}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#f7f9fb] pb-24">
          <div className="mx-auto max-w-5xl px-5 lg:px-8">
            <div className="text-center">
              <SectionTag color="teal">ابدأ الآن</SectionTag>
              <h2 className="mt-5 text-4xl font-black">ماذا تريد أن تفعل؟</h2>
            </div>
            <div className="mt-10 grid overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl sm:grid-cols-2">
              <div className="p-8 sm:p-10">
                <GraduationCap className="h-10 w-10 text-[#ff7438]" />
                <h3 className="mt-5 text-2xl font-black">استكشف الكورسات</h3>
                <p className="mt-3 text-sm font-medium leading-7 text-slate-500">شاهد تفاصيل المسارين واختر نقطة البداية المناسبة لك.</p>
                <a href="#courses" className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#171c1e] px-5 py-3 text-sm font-black text-white">عرض الكورسات <ArrowLeft className="h-4 w-4" /></a>
              </div>
              <div className="bg-[#1bb89d] p-8 text-white sm:p-10">
                <BookOpen className="h-10 w-10" />
                <h3 className="mt-5 text-2xl font-black">ابدأ التعلّم</h3>
                <p className="mt-3 text-sm font-medium leading-7 text-white/75">سجّل ببريدك، ادخل الكورس، واحفظ تقدّمك من أول درس.</p>
                <Link to="/login?mode=signup" className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#ff7438] px-5 py-3 text-sm font-black text-white">افتح حساباً مجانياً <ArrowLeft className="h-4 w-4" /></Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#f3dcd3] bg-[#fbefec]">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
          <div className="sm:col-span-2"><Brand /><p className="mt-5 max-w-md text-sm font-medium leading-7 text-slate-500">منصة عربية لتعلّم الشبكات والتقنية بخطوات واضحة ومحتوى ينمو مع احتياجات المتعلّمين.</p></div>
          <div><h3 className="font-black">روابط سريعة</h3><div className="mt-4 flex flex-col gap-3 text-sm font-bold text-slate-500"><a href="#courses">الكورسات</a><a href="#instructor">المدرّب</a><a href="#certifications">الشهادات</a><a href="#faq">الأسئلة الشائعة</a></div></div>
          <div><h3 className="font-black">المنصة</h3><div className="mt-4 flex flex-col gap-3 text-sm font-bold text-slate-500"><Link to="/login">تسجيل الدخول</Link><Link to="/dashboard">لوحة الطالب</Link>{contactEmail && <a href={`mailto:${contactEmail}`}>تواصل معنا</a>}</div></div>
        </div>
        <div className="border-t border-[#f3dcd3] px-5 py-6 text-center text-xs font-bold text-slate-500">© {new Date().getFullYear()} GloryTech Academy — جميع الحقوق محفوظة</div>
      </footer>
    </div>
  );
}
