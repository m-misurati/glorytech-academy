import { useEffect, useState } from 'react';
import { ArrowLeft, Building2, CheckCircle2, KeyRound, Mail, Phone, ShieldCheck, UserRound } from 'lucide-react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Brand from '../components/Brand';
import { useAuth } from '../context/AuthContext';

const emptyProfile = { displayName: '', phone: '', affiliation: '' };

export default function LoginPage() {
  const { user, isConfigured, sendOtp, verifyOtp, enterDemo } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const destination = location.state?.from || '/dashboard';
  const [mode, setMode] = useState(searchParams.get('mode') === 'signup' ? 'signup' : 'login');
  const [step, setStep] = useState('details');
  const [email, setEmail] = useState('');
  const [profile, setProfile] = useState(emptyProfile);
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

  const changeMode = (nextMode) => {
    setMode(nextMode);
    setSearchParams(nextMode === 'signup' ? { mode: 'signup' } : {}, { replace: true });
    setStep('details');
    setToken('');
    setStatus({ type: '', message: '' });
  };

  const requestOtp = async (event) => {
    event.preventDefault();
    setBusy(true);
    setStatus({ type: '', message: '' });

    try {
      const cleanEmail = email.trim().toLowerCase();
      let nextProfile = null;

      if (mode === 'signup') {
        const cleanPhone = profile.phone.trim();
        if (profile.displayName.trim().length < 2) throw new Error('اكتب اسمك الكامل.');
        const phoneDigits = cleanPhone.replace(/\D/g, '');
        if (!/^[+\d][\d\s()-]{6,19}$/.test(cleanPhone) || phoneDigits.length < 7 || phoneDigits.length > 15) throw new Error('اكتب رقم هاتف صحيحاً.');
        nextProfile = {
          displayName: profile.displayName.trim(),
          phone: cleanPhone,
          affiliation: profile.affiliation.trim() || null,
        };
      }

      await sendOtp(cleanEmail, { shouldCreateUser: mode === 'signup', profile: nextProfile });
      setEmail(cleanEmail);
      setStep('otp');
      setCooldown(60);
      setStatus({ type: 'success', message: 'أرسلنا رمزاً من 6 أرقام إلى بريدك.' });
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
      await verifyOtp(email, token.trim());
      navigate(destination, { replace: true });
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'الرمز غير صحيح أو انتهت صلاحيته.' });
    } finally {
      setBusy(false);
    }
  };

  const openDemo = () => {
    enterDemo(mode === 'signup' ? profile : undefined);
    navigate(destination, { replace: true });
  };

  return (
    <main className="min-h-screen bg-[#e8eef9] p-4 sm:p-7 lg:p-10">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl overflow-hidden rounded-[2rem] border-8 border-white bg-white shadow-[0_30px_90px_rgba(44,61,91,.15)] lg:grid-cols-[.88fr_1.12fr]">
        <section className="relative hidden overflow-hidden bg-[#fbefec] p-10 lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -bottom-32 -left-28 h-96 w-96 rounded-full bg-[#1bb89d]/15" />
          <div className="absolute -right-16 top-28 h-56 w-56 rotate-12 rounded-[3rem] bg-[#ff7438]/15" />
          <Brand />
          <div className="relative z-10">
            <span className="inline-block -rotate-2 rounded-full bg-[#ff7438] px-4 py-1.5 text-xs font-black text-white">حساب مجاني بلا كلمة مرور</span>
            <h1 className="mt-6 text-5xl font-black leading-[1.15] tracking-tight">بيانات بسيطة،<br />ثم تبدأ رحلتك.</h1>
            <p className="mt-5 max-w-md font-medium leading-8 text-slate-600">افتح حسابك مجاناً وتابع دروسك وتقدّمك من أي جهاز. نستخدم رمز بريد مؤقتاً بدل كلمة المرور.</p>
          </div>
          <div className="relative z-10 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/80 p-4"><ShieldCheck className="h-6 w-6 text-[#1bb89d]" /><strong className="mt-3 block text-sm">بيانات محمية</strong></div>
            <div className="rounded-2xl bg-white/80 p-4"><CheckCircle2 className="h-6 w-6 text-[#ff7438]" /><strong className="mt-3 block text-sm">تقدّم محفوظ</strong></div>
          </div>
        </section>

        <section className="flex items-center justify-center p-6 sm:p-10 lg:p-14">
          <div className="w-full max-w-lg">
            <div className="mb-8 lg:hidden"><Brand /></div>
            <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm font-black text-slate-500 hover:text-[#1bb89d]">العودة للرئيسية <ArrowLeft className="h-4 w-4 rotate-180" /></Link>

            {step === 'details' && (
              <div className="mb-8 grid grid-cols-2 rounded-full bg-slate-100 p-1">
                <button type="button" onClick={() => changeMode('signup')} className={`${mode === 'signup' ? 'bg-white text-[#1bb89d] shadow-sm' : 'text-slate-500'} rounded-full px-4 py-3 text-sm font-black`}>فتح حساب مجاني</button>
                <button type="button" onClick={() => changeMode('login')} className={`${mode === 'login' ? 'bg-white text-[#1bb89d] shadow-sm' : 'text-slate-500'} rounded-full px-4 py-3 text-sm font-black`}>تسجيل الدخول</button>
              </div>
            )}

            <h2 className="text-3xl font-black">{step === 'otp' ? 'أدخل رمز التحقق' : mode === 'signup' ? 'افتح حسابك المجاني' : 'مرحباً بعودتك'}</h2>
            <p className="mt-3 font-medium leading-7 text-slate-500">{step === 'otp' ? <>أرسلنا الرمز إلى <span dir="ltr" className="font-bold text-slate-800">{email}</span></> : mode === 'signup' ? 'أدخل بياناتك الأساسية. جهة الدراسة أو العمل اختيارية.' : 'اكتب بريد حسابك لنرسل رمز الدخول.'}</p>

            {step === 'details' ? (
              <form onSubmit={requestOtp} className="mt-7 space-y-4">
                {mode === 'signup' && (
                  <>
                    <label className="block"><span className="mb-2 block text-sm font-black">الاسم الكامل</span><span className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 focus-within:border-[#1bb89d] focus-within:ring-4 focus-within:ring-teal-100"><UserRound className="h-5 w-5 text-slate-400" /><input value={profile.displayName} onChange={(event) => setProfile((value) => ({ ...value, displayName: event.target.value }))} autoComplete="name" required minLength={2} placeholder="اكتب اسمك" className="w-full bg-transparent font-bold outline-none" /></span></label>
                    <label className="block"><span className="mb-2 block text-sm font-black">رقم الهاتف</span><span className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 focus-within:border-[#1bb89d] focus-within:ring-4 focus-within:ring-teal-100"><Phone className="h-5 w-5 text-slate-400" /><input dir="ltr" value={profile.phone} onChange={(event) => setProfile((value) => ({ ...value, phone: event.target.value }))} type="tel" inputMode="tel" autoComplete="tel" required minLength={7} maxLength={20} placeholder="+218 9X XXX XXXX" className="w-full bg-transparent text-left font-inter outline-none" /></span></label>
                    <label className="block"><span className="mb-2 block text-sm font-black">مكان الدراسة أو جهة العمل <span className="font-bold text-slate-400">(اختياري)</span></span><span className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 focus-within:border-[#1bb89d] focus-within:ring-4 focus-within:ring-teal-100"><Building2 className="h-5 w-5 text-slate-400" /><input value={profile.affiliation} onChange={(event) => setProfile((value) => ({ ...value, affiliation: event.target.value }))} autoComplete="organization" maxLength={120} placeholder="الجامعة، المعهد أو الشركة" className="w-full bg-transparent font-bold outline-none" /></span></label>
                  </>
                )}

                <label className="block"><span className="mb-2 block text-sm font-black">البريد الإلكتروني</span><span className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 focus-within:border-[#1bb89d] focus-within:ring-4 focus-within:ring-teal-100"><Mail className="h-5 w-5 text-slate-400" /><input dir="ltr" value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" required placeholder="you@example.com" className="w-full bg-transparent text-left font-inter outline-none" /></span></label>
                <button disabled={busy || !isConfigured} className="flex w-full items-center justify-center gap-2 rounded-full bg-[#1bb89d] px-6 py-4 font-black text-white transition hover:bg-[#119b84] disabled:cursor-not-allowed disabled:opacity-50">{busy ? 'جارٍ الإرسال…' : mode === 'signup' ? 'أرسل رمز فتح الحساب' : 'أرسل رمز الدخول'} <ArrowLeft className="h-5 w-5" /></button>
              </form>
            ) : (
              <form onSubmit={confirmOtp} className="mt-8 space-y-5">
                <label className="block"><span className="mb-2 block text-sm font-black">الرمز المكوّن من 6 أرقام</span><span className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3.5 focus-within:border-[#ff7438] focus-within:ring-4 focus-within:ring-orange-100"><KeyRound className="h-5 w-5 text-slate-400" /><input dir="ltr" value={token} onChange={(event) => setToken(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" required minLength={6} maxLength={6} placeholder="000000" className="w-full bg-transparent text-center font-inter text-2xl font-black tracking-[.45em] outline-none" /></span></label>
                <button disabled={busy || token.length !== 6} className="flex w-full items-center justify-center gap-2 rounded-full bg-[#171c1e] px-6 py-4 font-black text-white disabled:cursor-not-allowed disabled:opacity-50">{busy ? 'جارٍ التحقق…' : mode === 'signup' ? 'تحقق وافتح الحساب' : 'تحقق وادخل'} <ArrowLeft className="h-5 w-5" /></button>
                <button type="button" disabled={cooldown > 0 || busy} onClick={requestOtp} className="w-full text-center text-sm font-black text-[#1bb89d] disabled:text-slate-400">{cooldown ? `إعادة الإرسال بعد ${cooldown} ثانية` : 'إعادة إرسال الرمز'}</button>
                <button type="button" onClick={() => { setStep('details'); setToken(''); setStatus({ type: '', message: '' }); }} className="w-full text-center text-sm font-bold text-slate-500">تعديل البيانات</button>
              </form>
            )}

            {status.message && <p className={`mt-5 rounded-xl px-4 py-3 text-sm font-bold ${status.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-teal-50 text-teal-700'}`}>{status.message}</p>}

            {!isConfigured && (
              <div className="mt-7 rounded-2xl border border-dashed border-[#ffb08d] bg-[#fff7f3] p-5">
                <p className="text-sm font-bold leading-7 text-slate-600">النموذج جاهز. بعد ربط مشروع Supabase وSMTP سيصل رمز التحقق الحقيقي إلى البريد.</p>
                <button type="button" onClick={openDemo} className="mt-4 w-full rounded-full bg-[#ff7438] px-5 py-3 font-black text-white">فتح معاينة لوحة الطالب</button>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
