import { useEffect, useState } from 'react';
import { ArrowRight, Building2, CheckCircle2, KeyRound, Mail, Phone, ShieldCheck, UserRound } from 'lucide-react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import SiteHeader from '../components/SiteHeader';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import { usePageMeta } from '../lib/meta';

// Supabase decides the code length (Authentication -> Email -> OTP length, 6 by
// default, up to 10). Accept any length in that range so the form keeps working
// whichever value the project is set to.
const OTP_MIN_LENGTH = 6;
const OTP_MAX_LENGTH = 10;

const emptyProfile = { displayName: '', phone: '', affiliation: '' };

class FormError extends Error {}

export default function LoginPage() {
  const { user, isConfigured, sendOtp, verifyOtp, enterDemo } = useAuth();
  const { t } = useI18n();
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
  const [consent, setConsent] = useState(false);
  usePageMeta({ title: t(mode === 'signup' ? 'login.signupTitle' : 'login.loginTitle') });

  useEffect(() => {
    if (user) navigate(destination, { replace: true });
  }, [user, destination, navigate]);

  useEffect(() => {
    if (!cooldown) return undefined;
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const errorText = (error, fallbackKey) => {
    if (error instanceof FormError) return error.message;
    if (error?.message === 'supabase_missing') return t('login.supabaseMissing');
    return error?.message || t(fallbackKey);
  };

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
        if (!consent) throw new FormError(t('login.errorConsent'));
        if (profile.displayName.trim().length < 2) throw new FormError(t('login.errorName'));
        const phoneDigits = cleanPhone.replace(/\D/g, '');
        if (!/^[+\d][\d\s()-]{6,19}$/.test(cleanPhone) || phoneDigits.length < 7 || phoneDigits.length > 15) throw new FormError(t('login.errorPhone'));
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
      setStatus({ type: 'success', message: t('login.sent') });
    } catch (error) {
      setStatus({ type: 'error', message: errorText(error, 'login.errorSend') });
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
      setStatus({ type: 'error', message: errorText(error, 'login.errorCode') });
    } finally {
      setBusy(false);
    }
  };

  const openDemo = () => {
    enterDemo(mode === 'signup' ? profile : undefined);
    navigate(destination, { replace: true });
  };

  const tabClass = (active) => `${active ? 'bg-surface text-brand-ink shadow-sm' : 'text-muted'} rounded-full px-4 py-3 text-sm font-black`;

  return (
    <div className="min-h-screen bg-subtle text-ink">
      <SiteHeader compact />
      <main className="p-4 sm:p-7 lg:p-10">
        <div className="mx-auto grid min-h-[calc(100vh-10rem)] max-w-6xl overflow-hidden rounded-[2rem] border border-line bg-surface shadow-[0_30px_90px_rgba(15,26,21,.10)] lg:grid-cols-[.88fr_1.12fr]">
          <section className="relative hidden overflow-hidden bg-brand-soft p-10 lg:flex lg:flex-col lg:justify-between">
            <div className="pointer-events-none absolute -bottom-32 -start-28 h-96 w-96 rounded-full bg-glory-500/15" />
            <img src="/assets/glorytech-logo.jpg" alt="" className="relative h-28 w-28 rounded-3xl object-cover shadow-sm" />
            <div className="relative z-10">
              <span className="inline-flex rounded-full bg-glory-600 px-4 py-1.5 text-xs font-black text-white">{t('login.sideBadge')}</span>
              <h1 className="mt-6 text-4xl font-black leading-[1.3]">{t('login.sideTitle')}</h1>
              <p className="mt-5 max-w-md font-medium leading-8 text-muted">{t('login.sideText')}</p>
            </div>
            <div className="relative z-10 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-surface/80 p-4"><ShieldCheck className="h-6 w-6 text-brand" /><strong className="mt-3 block text-sm">{t('login.sideProtected')}</strong></div>
              <div className="rounded-2xl bg-surface/80 p-4"><CheckCircle2 className="h-6 w-6 text-brand" /><strong className="mt-3 block text-sm">{t('login.sideProgress')}</strong></div>
            </div>
          </section>

          <section className="flex items-center justify-center p-6 sm:p-10 lg:p-14">
            <div className="w-full max-w-lg">
              <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm font-black text-muted hover:text-brand-ink">
                <ArrowRight className="h-4 w-4 ltr:rotate-180" /> {t('common.backHome')}
              </Link>

              {step === 'details' && (
                <div className="mb-8 grid grid-cols-2 rounded-full bg-subtle p-1">
                  <button type="button" onClick={() => changeMode('signup')} className={tabClass(mode === 'signup')}>{t('login.signupTab')}</button>
                  <button type="button" onClick={() => changeMode('login')} className={tabClass(mode === 'login')}>{t('login.loginTab')}</button>
                </div>
              )}

              <h2 className="text-3xl font-black">{step === 'otp' ? t('login.otpTitle') : mode === 'signup' ? t('login.signupTitle') : t('login.loginTitle')}</h2>
              <p className="mt-3 font-medium leading-7 text-muted">
                {step === 'otp'
                  ? <>{t('login.otpSentTo')} <span dir="ltr" className="font-bold text-ink">{email}</span></>
                  : mode === 'signup' ? t('login.signupText') : t('login.loginText')}
              </p>

              {step === 'details' ? (
                <form onSubmit={requestOtp} className="mt-7 space-y-4">
                  {mode === 'signup' && (
                    <>
                      <label className="block">
                        <span className="mb-2 block text-sm font-black">{t('login.name')}</span>
                        <span className="field"><UserRound className="h-5 w-5 text-muted" /><input value={profile.displayName} onChange={(event) => setProfile((value) => ({ ...value, displayName: event.target.value }))} autoComplete="name" required minLength={2} placeholder={t('login.namePlaceholder')} /></span>
                      </label>
                      <label className="block">
                        <span className="mb-2 block text-sm font-black">{t('login.phone')}</span>
                        <span className="field"><Phone className="h-5 w-5 text-muted" /><input dir="ltr" value={profile.phone} onChange={(event) => setProfile((value) => ({ ...value, phone: event.target.value }))} type="tel" inputMode="tel" autoComplete="tel" required minLength={7} maxLength={20} placeholder="+218 9X XXX XXXX" className="text-left font-inter" /></span>
                      </label>
                      <label className="block">
                        <span className="mb-2 block text-sm font-black">{t('login.affiliation')} <span className="font-bold text-muted">{t('login.optional')}</span></span>
                        <span className="field"><Building2 className="h-5 w-5 text-muted" /><input value={profile.affiliation} onChange={(event) => setProfile((value) => ({ ...value, affiliation: event.target.value }))} autoComplete="organization" maxLength={120} placeholder={t('login.affiliationPlaceholder')} /></span>
                      </label>
                    </>
                  )}

                  <label className="block">
                    <span className="mb-2 block text-sm font-black">{t('login.email')}</span>
                    <span className="field"><Mail className="h-5 w-5 text-muted" /><input dir="ltr" value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" required placeholder="you@example.com" className="text-left font-inter" /></span>
                  </label>

                  {mode === 'signup' && (
                    <label className="flex items-start gap-3 rounded-2xl border border-line p-4 text-sm font-bold">
                      <input type="checkbox" required checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-glory-600" />
                      <span className="font-medium leading-7 text-muted">
                        {t('login.consentBefore')}{' '}
                        <Link to="/legal/terms" target="_blank" className="font-black text-brand-ink hover:underline">{t('login.consentTerms')}</Link>{' '}
                        {t('login.consentAnd')}{' '}
                        <Link to="/legal/privacy" target="_blank" className="font-black text-brand-ink hover:underline">{t('login.consentPrivacy')}</Link>
                      </span>
                    </label>
                  )}
                  <button disabled={busy || !isConfigured || (mode === 'signup' && !consent)} className="btn-primary w-full py-4">
                    {busy ? t('login.sending') : mode === 'signup' ? t('login.sendSignup') : t('login.sendLogin')} <ArrowRight className="h-5 w-5 rtl:-scale-x-100" />
                  </button>
                </form>
              ) : (
                <form onSubmit={confirmOtp} className="mt-8 space-y-5">
                  <label className="block">
                    <span className="mb-2 block text-sm font-black">{t('login.code')}</span>
                    <span className="field py-3.5"><KeyRound className="h-5 w-5 text-muted" /><input dir="ltr" value={token} onChange={(event) => setToken(event.target.value.replace(/\D/g, '').slice(0, OTP_MAX_LENGTH))} inputMode="numeric" autoComplete="one-time-code" required minLength={OTP_MIN_LENGTH} maxLength={OTP_MAX_LENGTH} placeholder={'0'.repeat(OTP_MIN_LENGTH)} className="text-center font-inter text-xl tracking-[.35em] sm:text-2xl" /></span>
                  </label>
                  <button disabled={busy || token.length < OTP_MIN_LENGTH} className="btn-primary w-full py-4">
                    {busy ? t('login.verifying') : mode === 'signup' ? t('login.verifySignup') : t('login.verifyLogin')} <ArrowRight className="h-5 w-5 rtl:-scale-x-100" />
                  </button>
                  <button type="button" disabled={cooldown > 0 || busy} onClick={requestOtp} className="w-full text-center text-sm font-black text-brand-ink disabled:text-muted">
                    {cooldown ? t('login.resendIn', { seconds: cooldown }) : t('login.resend')}
                  </button>
                  <button type="button" onClick={() => { setStep('details'); setToken(''); setStatus({ type: '', message: '' }); }} className="w-full text-center text-sm font-bold text-muted">{t('login.editDetails')}</button>
                </form>
              )}

              {status.message && (
                <p role={status.type === 'error' ? 'alert' : 'status'} className={`mt-5 rounded-xl px-4 py-3 text-sm font-bold ${status.type === 'error' ? 'bg-red-500/10 text-red-700 dark:text-red-300' : 'bg-brand-soft text-brand-ink'}`}>
                  {status.message}
                </p>
              )}

              {!isConfigured && (
                <div className="mt-7 rounded-2xl border border-dashed border-glory-500/50 bg-brand-soft/50 p-5">
                  <p className="text-sm font-bold leading-7 text-muted">{t('login.notConfigured')}</p>
                  <button type="button" onClick={openDemo} className="btn-primary mt-4 w-full">{t('login.openDemo')}</button>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
