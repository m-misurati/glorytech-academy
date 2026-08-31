import { motion } from 'framer-motion';
import { ArrowLeft, Play } from 'lucide-react';

export default function Hero() {
  return (
    <section id="home" className="relative overflow-hidden bg-[#fbefec] pt-20">
      <div className="absolute right-[42%] top-36 h-3 w-3 rounded-full bg-[#ff7438]" />
      <div className="absolute left-[45%] top-40 h-4 w-4 rounded-full bg-[#1bb89d]" />

      <div className="relative mx-auto grid min-h-[720px] max-w-7xl items-center gap-8 px-5 py-14 lg:grid-cols-[.94fr_1.06fr] lg:px-8 lg:py-20">
        <motion.div initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.65 }} className="relative z-10 order-1 lg:order-2">
          <span className="inline-block -rotate-2 rounded-full bg-[#ff7438] px-4 py-2 text-sm font-black text-white shadow-sm">
            منصة تعليم تقني عربية
          </span>

          <h1 className="mt-7 max-w-2xl text-[3rem] font-black leading-[1.08] tracking-[-0.05em] text-[#161b1d] sm:text-6xl lg:text-[4.65rem]">
            تعلّم أذكى.
            <br />
            افهم أعمق.
            <br />
            وابدأ <span className="text-[#ff7438]">بثقة.</span>
          </h1>

          <p className="mt-7 max-w-xl text-lg font-medium leading-9 text-[#51595b]">
            GloryTech Academy تنقلك من فهم الأساسيات إلى التطبيق الحقيقي، مع المهندس محمد بشير المصراتي ومسارات شبكات مرتبة وواضحة.
          </p>

          <div className="mt-9 flex flex-col gap-4 sm:flex-row sm:items-center">
            <a href="#courses" className="group inline-flex items-center justify-center gap-3 rounded-full bg-[#1bb89d] px-7 py-4 font-black text-white shadow-lg shadow-teal-700/15 transition hover:-translate-y-1 hover:bg-[#119b84]">
              ابدأ مجاناً
              <ArrowLeft className="h-5 w-5 transition group-hover:-translate-x-1" />
            </a>
            <a href="#instructor" className="inline-flex items-center justify-center gap-3 px-3 py-3 font-black text-[#181d1f]">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-[#ff7438] text-white shadow-lg shadow-orange-500/20"><Play className="mr-0.5 h-5 w-5 fill-current" /></span>
              كيف تتعلّم معنا؟
            </a>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: -28 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1, duration: 0.7 }} className="relative order-2 mx-auto w-full max-w-[560px] self-end lg:order-1">
          <img src="/assets/mohamed-bashir-cutout.png" alt="المهندس محمد بشير المصراتي" className="relative z-10 mx-auto h-[520px] w-full object-contain object-bottom sm:h-[650px]" />
        </motion.div>
      </div>

      <div className="border-t border-black/5 bg-[#f7f9fb]">
        <div className="mx-auto max-w-6xl px-5 py-20 text-center lg:px-8">
          <span className="inline-block -rotate-2 rounded-full bg-[#1bb89d] px-4 py-1.5 text-xs font-black text-white">من نحن</span>
          <h2 className="mx-auto mt-6 max-w-4xl text-2xl font-black leading-[1.7] text-[#171c1e] sm:text-3xl">
            شغفنا أن نجعل تعلّم الشبكات <span className="text-[#6d7476]">واضحاً، عملياً ومتاحاً للجميع</span> — ونبني مكتبة كورسات تكبر معكم خطوة بخطوة.
          </h2>
          <div className="mx-auto mt-12 grid max-w-3xl grid-cols-3 divide-x divide-x-reverse divide-slate-200">
            <div className="px-3"><strong className="block text-3xl font-black text-[#151a1c] sm:text-5xl">2</strong><span className="mt-2 block text-xs font-bold text-slate-500 sm:text-sm">كورسات حالياً</span></div>
            <div className="px-3"><strong className="block text-3xl font-black text-[#151a1c] sm:text-5xl">100%</strong><span className="mt-2 block text-xs font-bold text-slate-500 sm:text-sm">مجانية</span></div>
            <div className="px-3"><strong className="block text-3xl font-black text-[#151a1c] sm:text-5xl">1</strong><span className="mt-2 block text-xs font-bold text-slate-500 sm:text-sm">مدرّب خبير</span></div>
          </div>
        </div>
      </div>
    </section>
  );
}
