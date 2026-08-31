import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Menu, X } from 'lucide-react';

const links = [
  { label: 'الرئيسية', href: '#home' },
  { label: 'الكورسات', href: '#courses' },
  { label: 'عن المدرّب', href: '#instructor' },
  { label: 'الشهادات', href: '#certifications' },
  { label: 'الأسئلة الشائعة', href: '#faq' },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 18);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? 'border-b border-[#f3dcd3] bg-[#fbefec]/95 shadow-sm backdrop-blur-xl' : 'bg-[#fbefec]/85 backdrop-blur-md'
      }`}
      aria-label="التنقل الرئيسي"
    >
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 lg:px-8">
        <a href="#home" className="flex items-center gap-3" aria-label="GloryTech Academy — الرئيسية">
          <img src="/assets/glorytech-logo.jpg" alt="GloryTech Academy" className="h-12 w-12 rounded-xl object-cover" />
          <span className="hidden leading-none sm:block">
            <strong className="block font-inter text-base font-black tracking-tight text-slate-950">GLORYTECH</strong>
            <small className="font-inter text-[10px] font-bold tracking-[0.25em] text-[#1bb89d]">ACADEMY</small>
          </span>
        </a>

        <div className="hidden items-center gap-1 lg:flex">
          {links.map((link) => (
            <a key={link.href} href={link.href} className="rounded-xl px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-white/70 hover:text-[#ff7438]">
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <a href="/login" className="px-4 py-2.5 text-sm font-bold text-slate-700 hover:text-[#ff7438]">تسجيل الدخول</a>
          <a href="/login" className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-[#1bb89d]">
            ابدأ مجاناً
            <ArrowLeft className="h-4 w-4" />
          </a>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen((value) => !value)}
          className="grid h-11 w-11 place-items-center rounded-xl border border-[#f3dcd3] bg-white text-slate-900 lg:hidden"
          aria-expanded={isOpen}
          aria-label={isOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="border-t border-[#f3dcd3] bg-[#fbefec] lg:hidden">
            <div className="mx-auto flex max-w-7xl flex-col gap-1 px-5 py-4">
              {links.map((link) => (
                <a key={link.href} href={link.href} onClick={() => setIsOpen(false)} className="rounded-xl px-4 py-3 font-bold text-slate-700 hover:bg-glory-50">
                  {link.label}
                </a>
              ))}
              <a href="/login" className="mt-2 rounded-xl bg-[#1bb89d] px-5 py-3 text-center font-black text-white">ابدأ مجاناً</a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
