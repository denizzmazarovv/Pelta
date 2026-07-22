import { useState, useRef, useEffect } from 'react';
import { X, Mail, Lock, User, Loader as Loader2, ArrowLeft, MailCheck, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { sanitizeText, sanitizeEmail, sanitizeDigits, MAX_NAME, MAX_EMAIL } from '../lib/sanitize';

type Mode = 'login' | 'register' | 'reset' | 'code';

export function AuthModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useLang();
  const { signIn, signUp, resetPassword, verifyOtp, resendOtp } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (mode === 'code') codeRefs.current[0]?.focus();
  }, [mode]);

  if (!open) return null;

  function reset() {
    setEmail('');
    setPassword('');
    setConfirm('');
    setName('');
    setCode(['', '', '', '', '', '']);
    setError(null);
    setInfo(null);
    setShowPw(false);
    setShowConfirm(false);
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setInfo(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);

    if (mode === 'reset') {
      const { error } = await resetPassword(email);
      setBusy(false);
      if (error) setError(error);
      else {
        setInfo(t('auth.reset.sent'));
        setEmail('');
      }
      return;
    }

    if (mode === 'register') {
      if (password !== confirm) {
        setBusy(false);
        setError(t('auth.password.mismatch'));
        return;
      }
      const { error, needsConfirmation } = await signUp(email, password, name);
      setBusy(false);
      if (error) setError(error);
      else if (needsConfirmation) {
        setMode('code');
      } else {
        reset();
        onClose();
      }
      return;
    }

    // login
    const { error, needsConfirmation } = await signIn(email, password);
    setBusy(false);
    if (error) setError(error);
    else if (needsConfirmation) {
      setMode('code');
    } else {
      reset();
      onClose();
    }
  }

  function setDigit(i: number, v: string) {
    const clean = v.replace(/\D/g, '').slice(0, 1);
    setCode((prev) => {
      const next = [...prev];
      next[i] = clean;
      return next;
    });
    if (clean && i < 5) codeRefs.current[i + 1]?.focus();
  }

  function onCodeKey(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !code[i] && i > 0) {
      codeRefs.current[i - 1]?.focus();
    }
  }

  function onCodePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const digits = sanitizeDigits(e.clipboardData.getData('text'), 6).split('');
    setCode((prev) => {
      const next = [...prev];
      for (let i = 0; i < 6; i++) next[i] = digits[i] ?? '';
      return next;
    });
    const last = Math.min(digits.length, 5);
    codeRefs.current[last]?.focus();
  }

  async function verifyCode() {
    setBusy(true);
    setError(null);
    const token = code.join('');
    if (token.length !== 6) {
      setBusy(false);
      setError(t('auth.code.error'));
      return;
    }
    const { error } = await verifyOtp(email, token);
    setBusy(false);
    if (error) {
      setError(error);
      setCode(['', '', '', '', '', '']);
      codeRefs.current[0]?.focus();
    } else {
      reset();
      onClose();
    }
  }

  async function resendCode() {
    setBusy(true);
    setError(null);
    setInfo(null);
    const { error } = await resendOtp(email);
    setBusy(false);
    if (error) setError(error);
    else setInfo(t('auth.code.resent'));
  }

  const title =
    mode === 'login' ? t('auth.login')
    : mode === 'register' ? t('auth.register')
    : mode === 'reset' ? t('auth.reset')
    : t('auth.code.title');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-wine-900/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-md bg-cream  shadow-2xl border border-brand-200 overflow-hidden animate-scale-in">
        <div className="bg-brand-500 px-6 py-5 flex items-center justify-between">
          <div>
            <p className="text-cream/70 text-xs uppercase tracking-[0.25em]">Pelta Nera</p>
            <h3 className="text-cream text-xl font-serif font-semibold">{title}</h3>
          </div>
          <button onClick={onClose} className="text-cream/70 hover:text-cream transition-colors" aria-label="Close">
            <X size={22} />
          </button>
        </div>

        {mode === 'code' ? (
          <div className="p-6 space-y-5">
            <div className="text-center">
              <div className="mx-auto w-14 h-14  -full bg-brand-50 flex items-center justify-center mb-3">
                <MailCheck size={28} className="text-brand-500" />
              </div>
              <p className="text-wine-700 text-sm leading-relaxed">
                {t('auth.code.text')}<br />
                <span className="font-medium text-wine-900">{email}</span>
              </p>
            </div>

            <div className="flex gap-2 justify-between" onPaste={onCodePaste}>
              {code.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => { codeRefs.current[i] = el; }}
                  value={d}
                  onChange={(e) => setDigit(i, sanitizeDigits(e.target.value, 1))}
                  onKeyDown={(e) => onCodeKey(i, e)}
                  inputMode="numeric"
                  maxLength={1}
                  className="w-11 h-14 text-center text-xl font-semibold border border-brand-200  -xl bg-white text-wine-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
                />
              ))}
            </div>

            {error && <p className="text-wine-500 text-sm bg-wine-50  -lg px-3 py-2 text-center animate-fade-in">{error}</p>}
            {info && <p className="text-brand-600 text-sm bg-brand-50  -lg px-3 py-2 text-center animate-fade-in">{info}</p>}

            <button
              onClick={verifyCode}
              disabled={busy}
              className="w-full bg-brand-500 hover:bg-brand-600 text-cream py-3.5  -xl font-medium tracking-wide transition-all hover:shadow-lg hover:shadow-brand-500/30 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {busy && <Loader2 size={18} className="animate-spin" />}
              {t('auth.code.verify')}
            </button>

            <button
              onClick={resendCode}
              disabled={busy}
              className="w-full text-center text-sm text-wine-400 hover:text-wine-600 transition-colors disabled:opacity-60"
            >
              {t('auth.code.resend')}
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="p-6 space-y-4">
            {mode === 'register' && (
              <Field icon={<User size={18} />} label={t('auth.name')}>
                <input
                  value={name}
                  onChange={(e) => setName(sanitizeText(e.target.value, MAX_NAME))}
                  required
                  maxLength={MAX_NAME}
                  className="w-full bg-transparent outline-none text-wine-900 placeholder-wine-300"
                  placeholder={t('auth.name')}
                />
              </Field>
            )}
            <Field icon={<Mail size={18} />} label={t('auth.email')}>
              <input
                value={email}
                onChange={(e) => setEmail(sanitizeEmail(e.target.value))}
                type="email"
                required
                maxLength={MAX_EMAIL}
                className="w-full bg-transparent outline-none text-wine-900 placeholder-wine-300"
                placeholder="you@example.com"
              />
            </Field>
            {mode !== 'reset' && (
              <>
                <Field icon={<Lock size={18} />} label={t('auth.password')} trailing={
                  <button type="button" onClick={() => setShowPw(!showPw)} className="text-wine-400 hover:text-wine-600 transition-colors">
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                }>
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value.slice(0, 128))}
                    type={showPw ? 'text' : 'password'}
                    required
                    maxLength={128}
                    className="w-full bg-transparent outline-none text-wine-900 placeholder-wine-300"
                    placeholder="••••••"
                  />
                </Field>
                {mode === 'register' && (
                  <Field icon={<Lock size={18} />} label={t('auth.password.confirm')} trailing={
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="text-wine-400 hover:text-wine-600 transition-colors">
                      {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  }>
                    <input
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value.slice(0, 128))}
                      type={showConfirm ? 'text' : 'password'}
                      required
                      maxLength={128}
                      className="w-full bg-transparent outline-none text-wine-900 placeholder-wine-300"
                      placeholder="••••••"
                    />
                  </Field>
                )}
              </>
            )}

            {mode === 'login' && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => switchMode('reset')}
                  className="text-sm text-brand-600 hover:text-brand-700 transition-colors"
                >
                  {t('auth.forgot')}
                </button>
              </div>
            )}

            {error && <p className="text-wine-500 text-sm bg-wine-50  -lg px-3 py-2 animate-fade-in">{error}</p>}
            {info && <p className="text-brand-600 text-sm bg-brand-50  -lg px-3 py-2 animate-fade-in">{info}</p>}

            <button
              type="submit"
              disabled={busy}
              className="w-full bg-brand-500 hover:bg-brand-600 text-cream py-3.5  -xl font-medium tracking-wide transition-all hover:shadow-lg hover:shadow-brand-500/30 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {busy && <Loader2 size={18} className="animate-spin" />}
              {mode === 'login' ? t('auth.signin')
                : mode === 'register' ? t('auth.signup')
                : t('auth.reset.send')}
            </button>

            {mode === 'reset' ? (
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="w-full flex items-center justify-center gap-1.5 text-sm text-wine-400 hover:text-wine-600 transition-colors"
              >
                <ArrowLeft size={14} />
                {t('auth.reset.back')}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
                className="w-full text-center text-sm text-wine-400 hover:text-wine-600 transition-colors"
              >
                {mode === 'login' ? t('auth.no') : t('auth.have')}
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

function Field({
  icon,
  label,
  trailing,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wider text-wine-400 mb-1.5 block">{label}</span>
      <div className="flex items-center gap-2.5 border border-brand-200  -xl px-3.5 py-3 focus-within:border-brand-500 transition-colors">
        <span className="text-brand-500">{icon}</span>
        {children}
        {trailing}
      </div>
    </label>
  );
}
