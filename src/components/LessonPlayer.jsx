import { Radio, ShieldCheck, Video } from 'lucide-react';

export default function LessonPlayer({ lesson }) {
  const channel = import.meta.env.VITE_TELEGRAM_CHANNEL;
  const messageId = lesson?.telegramMessageId;

  if (channel && messageId) {
    return (
      <div className="aspect-video overflow-hidden rounded-[1.75rem] bg-black shadow-2xl">
        <iframe
          src={`https://t.me/${channel}/${messageId}?embed=1&mode=tme`}
          title={`درس: ${lesson.title}`}
          className="h-full w-full border-0"
          allow="autoplay; fullscreen; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    );
  }

  return (
    <div className="relative grid aspect-video place-items-center overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#041f19] via-[#063c2f] to-[#0b7653] p-8 text-center text-white shadow-2xl shadow-slate-950/20">
      <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(#8bf0bf_1px,transparent_1px)] [background-size:24px_24px]" />
      <div className="absolute -left-24 top-4 h-72 w-72 rounded-full border-[46px] border-white/5" />
      <div className="relative max-w-md">
        <span className="mx-auto grid h-20 w-20 place-items-center rounded-3xl border border-white/15 bg-white/10 shadow-xl backdrop-blur">
          <Video className="h-9 w-9" />
        </span>
        <h2 className="mt-6 text-2xl font-black">{lesson?.title}</h2>
        <p className="mt-3 text-sm font-medium leading-7 text-white/65">سيظهر فيديو هذا الدرس هنا بمجرد إضافة منشوره من قناة Telegram في إعدادات المنصة.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3 text-xs font-bold text-white/70">
          <span className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-2"><Radio className="h-4 w-4 text-glory-300" /> مشاهدة داخل المنصة</span>
          <span className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-2"><ShieldCheck className="h-4 w-4 text-glory-300" /> دخول محمي</span>
        </div>
      </div>
    </div>
  );
}
