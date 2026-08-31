import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, KeyRound, Mail, ShieldCheck } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Brand from '../components/Brand';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { user, isConfigured, sendOtp, verifyOtp, enterDemo } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const destination = location.state?.from || '/dashboard';
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (user) navigate(destination, { replace: true });
  }, [user, destination, navigate]);

  useEffect(() => {
    if (!cooldown) return undefined;
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const requestOtp = async (event) => {
    event.preventDefault();
    setBusy(true);
    setStatus({ type: '', message: '' });
    try {
      await sendOtp(email.trim());
      setStep('otp');
      setCooldown(60);
      setStatus({ type: 'success', message: 'أرسلنا رمز الدخول. راجع بريدك الوارد.' });
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'تعذّر إرسال الرمز. حاول مرة أخرى.' });
    } finally {
      setBusy(false);
    }
  };

  const confirmOtp = async (event) => {
    event.preventDefault();
    setBusy(true);
    setStatus({ type: '', message: '' });
    try {
      await verifyOtp(email.trim(), token.trim());
      navigate(destination, { replace: true });
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'الرمز غير صحيح أو انتهت صلاحيته.' });
    } finally {
      setBusy(false);
    }
  };

  const openDemo = () => {
    enterDemo();
    navigate(destination, { replace: true });
  };

  return (
    <main className="min-h-screen bg-[#e8eef9] p-4 sm:p-7 lg:p-10">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl overflow-hidden rounded-[2rem] border-8 border-white bg-white shadow-[0_30px_90px_rgba(44,61,91,.15)] lg:grid-cols-[.9fr_1.1fr]">
        <section className="relative hidden overflow-hidden bg-[#fbefec] p-10 lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -bottom-32 -left-28 h-96 w-96 rounded-full bg-[#1bb89d]/15" />
          <div className="absolute -right-16 top-28 h-56 w-56 rotate-12 rounded-[3rem] bg-[#ff7438]/15" />
          <Brand />
          <div className="relative z-10">
            <span className="inline-block -rotate-2 rounded-full bg-[#ff7438] px-4 py-1.5 text-xs font-black text-white">دخول بلا كلمة مرور</span>
            <h1 className="mt-6 text-5xl font-black leading-[1.15] tracking-tight">رمز واحد،<br />ثم تبدأ رحلتك.</h1>
            <p className="mt-5 max-w-md font-medium leading-8 text-slate-600">نرسل إلى بريدك رمزاً مؤقتاً من ستة أرقام. آمن، بسيط، ولا توجد كلمة مرور تحتاج أن تتذكرها.</p>
          </div>
          <div className="relative z-10 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/80 p-4"><ShieldCheck className="h-6 w-6 text-[#1bb89d]" /><strong className="mt-3 block text-sm">دخول آمن</strong></div>
            <div className="rounded-2xl bg-white/80 p-4"><CheckCircle2 className="h-6 w-6 text-[#ff7438]" /><strong className="mt-3 block text-sm">تقدّم محفوظ</strong></div>
          </div>
        </section>

        <section className="flex items-center justify-center p-6 sm:p-12 lg:p-16">
          <div className="w-full max-w-md">
            <div className="mb-10 lg:hidden"><Brand /></div>
            <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm font-black text-slate-500 hover:text-[#1bb89d]">العودة للرئيسية <ArrowLeft className="h-4 w-4 rotate-180" /></Link>
            <h2 className="text-3xl font-black">{step === 'email' ? 'أهلاً بك في GloryTech' : 'أدخل رمز التحقق'}</h2>
            <p className="mt-3 font-medium leading-7 text-slate-500">{step === 'email' ? 'اكتب بريدك لنرسل لك رمز الدخول.' : <>أرسلنا رمزاً إلى <span dir="ltr" className="font-bold text-slate-800">{email}</span></>}</p>

            {step === 'email' ? (
              <form onSubmit={requestOtp} className="mt-8 space-y-5">
                <label className="block"><span className="mb-2 block text-sm font-black">البريد الإلكتروني</span><span className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3.5 focus-within:border-[#1bb89d] focus-within:ring-4 focus-within:ring-teal-100"><Mail className="h-5 w-5 text-slate-400" /><input dir="ltr" value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" required placeholder="you@example.com" className="w-full bg-transparent text-left font-inter outline-none" /></span></label>
                <button disabled={busy || !isConfigured} className="flex w-full items-center justify-center gap-2 rounded-full bg-[#1bb89d] px-6 py-4 font-black text-white transition hover:bg-[#119b84] disabled:cursor-not-allowed disabled:opacity-50">{busy ? 'جارٍ الإرسال…' : 'أرسل رمز الدخول'} <ArrowLeft className="h-5 w-5" /></button>
              </form>
            ) : (
              <form onSubmit={confirmOtp} className="mt-8 space-y-5">
                <label className="block"><span className="mb-2 block text-sm font-black">الرمز المكوّن من 6 أرقام</span><span className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3.5 focus-within:border-[#ff7438] focus-within:ring-4 focus-within:ring-orange-100"><KeyRound className="h-5 w-5 text-slate-400" /><input dir="ltr" value={token} onChange={(event) => setToken(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" required minLength={6} maxLength={6} placeholder="000000" className="w-full bg-transparent text-center font-inter text-2xl font-black tracking-[.45em] outline-none" /></span></label>
                <button disabled={busy || token.length !== 6} className="flex w-full items-center justify-center gap-2 rounded-full bg-[#171c1e] px-6 py-4 font-black text-white disabled:cursor-not-allowed disabled:opacity-50">{busy ? 'جارٍ التحقق…' : 'تحقق وادخل'} <ArrowLeft className="h-5 w-5" /></button>
                <button type="button" disabled={cooldown > 0 || busy} onClick={requestOtp} className="w-full text-center text-sm font-black text-[#1bb89d] disabled:text-slate-400">{cooldown ? `إعادة الإرسال بعد ${cooldown} ثانية` : 'إعادة إرسال الرمز'}</button>
                <button type="button" onClick={() => { setStep('email'); setToken(''); setStatus({ type: '', message: '' }); }} className="w-full text-center text-sm font-bold text-slate-500">تغيير البريد</button>
              </form>
            )}

            {status.message && <p className={`mt-5 rounded-xl px-4 py-3 text-sm font-bold ${status.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-teal-50 text-teal-700'}`}>{status.message}</p>}

            {!isConfigured && (
              <div className="mt-8 rounded-2xl border border-dashed border-[#ffb08d] bg-[#fff7f3] p-5">
                <p className="text-sm font-bold leading-7 text-slate-600">الواجهة جاهزة، وتحتاج بيانات مشروع Supabase لتفعيل البريد الحقيقي. تستطيع الآن فتح نسخة المعاينة.</p>
                <button type="button" onClick={openDemo} className="mt-4 w-full rounded-full bg-[#ff7438] px-5 py-3 font-black text-white">فتح معاينة لوحة الطالب</button>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
