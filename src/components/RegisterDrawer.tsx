import { useEffect, useRef, useState, FormEvent, ReactNode } from 'react';
import type { AuthError } from '@supabase/supabase-js';
import { useLang } from '../context/LangContext';
import { useProfile } from '../context/ProfileContext';
import { CONTACTS } from '../lib/config';
import { MAX_NAME, sanitizeEmail, sanitizePhone } from '../lib/sanitize';
import { Field } from '../pages/ContactPage';
import { Captcha, captchaEnabled, type CaptchaHandle } from './Captcha';
import { Check } from './Footer';
import { Mark } from './Logo';

type View = 'signin' | 'signup' | 'verify' | 'forgot' | 'reset_code' | 'new_password' | 'account';

const RESEND_SECONDS = 60;

export function passwordChecks(pw: string) {
  return {
    len: pw.length >= 8 && pw.length <= 72,
    letter: /[A-Za-z]/.test(pw),
    digit: /\d/.test(pw),
  };
}
const passwordOk = (pw: string) => Object.values(passwordChecks(pw)).every(Boolean);

/** Переводит ошибку Supabase в понятное сообщение, не раскрывая лишнего. */
function useAuthError() {
  const { t } = useLang();
  return (err: AuthError | Error | null, ctx: 'signin' | 'code' | 'other' = 'other'): string => {
    if (!err) return '';
    if (err.message === 'auth_not_configured') return t('auth.err.disabled');
    const code = (err as AuthError).code ?? '';
    const status = (err as AuthError).status ?? 0;
    if (status === 429 || code.startsWith('over_')) return t('auth.err.rate');
    if (code === 'captcha_failed') return t('auth.err.captcha');
    if (code === 'weak_password') return t('auth.err.weak');
    if (code === 'same_password') return t('auth.err.same');
    if (code === 'otp_expired' || ctx === 'code') return t('auth.err.code');
    if (ctx === 'signin') return t('auth.err.invalid');
    if (code === 'validation_failed' || code === 'email_address_invalid') return t('auth.err.email');
    return t('auth.err.generic');
  };
}

function PasswordInput({
  value,
  onChange,
  autoComplete,
}: {
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
}) {
  const { t } = useLang();
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        className="field pr-20"
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={72}
        autoComplete={autoComplete}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-0 bottom-2.5 font-mono text-[11px] text-mute hover:text-ink"
      >
        {show ? t('auth.hide') : t('auth.show')}
      </button>
    </div>
  );
}

function PasswordRules({ pw }: { pw: string }) {
  const { t } = useLang();
  const c = passwordChecks(pw);
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-1 mt-2 font-mono text-[11px]">
      {(['len', 'letter', 'digit'] as const).map((k) => (
        <li key={k} className={`flex items-center gap-1.5 ${c[k] ? 'text-ink' : 'text-mute'}`}>
          <Check checked={c[k]} />
          {t(`auth.pw_${k}`)}
        </li>
      ))}
    </ul>
  );
}

function CodeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      className="field text-[22px] tracking-[0.4em] h-14"
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 10))}
      inputMode="numeric"
      autoComplete="one-time-code"
      placeholder="••••••"
      autoFocus
    />
  );
}

function Link({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="font-mono text-[12px] link-u text-left">
      {children}
    </button>
  );
}

export function RegisterDrawer() {
  const { t, lang } = useLang();
  const auth = useProfile();
  const { registerOpen, closeRegister, session, profile } = auth;
  const toMsg = useAuthError();
  const captcha = useRef<CaptchaHandle>(null);

  const [view, setView] = useState<View>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [currentPw, setCurrentPw] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [prefs, setPrefs] = useState<string[]>([]);
  const [marketing, setMarketing] = useState(false);
  const [agree, setAgree] = useState(false);
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [msgAt, setMsgAt] = useState<'main' | 'password'>('main');

  // Открытие панели
  useEffect(() => {
    if (!registerOpen) return;
    setView(session ? 'account' : 'signin');
    setError('');
    setNotice('');
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeRegister();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
      setPassword('');
      setPassword2('');
      setCurrentPw('');
      setCode('');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registerOpen]);

  // Данные профиля в форму аккаунта
  useEffect(() => {
    if (view === 'account' && profile) {
      setName(profile.name);
      setPhone(profile.phone);
      setPrefs(profile.prefs);
      setMarketing(profile.marketing);
    }
  }, [view, profile]);

  // Таймер повторной отправки кода
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  if (!registerOpen) return null;

  function go(v: View) {
    setMsgAt('main');
    setView(v);
    setError('');
    setNotice('');
    setCode('');
    captcha.current?.reset();
  }

  function needCaptcha(): boolean {
    if (captchaEnabled && !token) {
      setError(t('auth.err.captcha'));
      return true;
    }
    return false;
  }

  async function run(fn: () => Promise<void>, at: 'main' | 'password' = 'main') {
    setMsgAt(at);
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await fn();
    } finally {
      setBusy(false);
      captcha.current?.reset();
    }
  }

  // --- обработчики ---
  const cleanEmail = () => sanitizeEmail(email);

  function onSignIn(e: FormEvent) {
    e.preventDefault();
    const em = cleanEmail();
    if (!em) return setError(t('auth.err.email'));
    if (!password) return setError(t('auth.err.invalid'));
    if (needCaptcha()) return;
    run(async () => {
      const { error } = await auth.signIn(em, password, token);
      if (!error) {
        setPassword('');
        return go('account');
      }
      if ((error as AuthError).code === 'email_not_confirmed') {
        await auth.resendSignup(em);
        setCooldown(RESEND_SECONDS);
        return go('verify');
      }
      setError(toMsg(error, 'signin'));
    });
  }

  function onSignUp(e: FormEvent) {
    e.preventDefault();
    const em = cleanEmail();
    if (name.trim().length < 2) return setError(t('reg.error_name'));
    if (!em) return setError(t('auth.err.email'));
    const ph = sanitizePhone(phone);
    if (ph && (ph.replace(/\D/g, '').length < 9 || ph.replace(/\D/g, '').length > 15))
      return setError(t('contact.errors.phone'));
    if (!passwordOk(password)) return setError(t('auth.err.pw_rules'));
    if (password !== password2) return setError(t('auth.err.mismatch'));
    if (!agree) return setError(t('contact.errors.policy'));
    if (needCaptcha()) return;
    run(async () => {
      const { error } = await auth.signUp({
        email: em,
        password,
        name: name.trim().slice(0, MAX_NAME),
        phone: ph,
        prefs,
        marketing,
        captchaToken: token,
      });
      if (error) return setError(toMsg(error));
      setPassword('');
      setPassword2('');
      setCooldown(RESEND_SECONDS);
      go('verify');
    });
  }

  function onVerify(e: FormEvent) {
    e.preventDefault();
    if (code.length < 6) return setError(t('auth.err.code'));
    run(async () => {
      const { error } = await auth.verifyEmail(cleanEmail(), code);
      if (error) return setError(toMsg(error, 'code'));
      go('account');
    });
  }

  function onResend() {
    if (cooldown > 0) return;
    if (needCaptcha()) return;
    run(async () => {
      const em = cleanEmail();
      const { error } =
        view === 'reset_code' ? await auth.requestReset(em, token) : await auth.resendSignup(em, token);
      if (error) return setError(toMsg(error));
      setCooldown(RESEND_SECONDS);
      setNotice(t('auth.resent'));
    });
  }

  function onForgot(e: FormEvent) {
    e.preventDefault();
    const em = cleanEmail();
    if (!em) return setError(t('auth.err.email'));
    if (needCaptcha()) return;
    run(async () => {
      const { error } = await auth.requestReset(em, token);
      // Чтобы нельзя было узнать, зарегистрирован ли email, показываем один и тот же ответ
      if (error && ((error as AuthError).status === 429 || (error as AuthError).code === 'captcha_failed'))
        return setError(toMsg(error));
      setCooldown(RESEND_SECONDS);
      go('reset_code');
    });
  }

  function onResetCode(e: FormEvent) {
    e.preventDefault();
    if (code.length < 6) return setError(t('auth.err.code'));
    run(async () => {
      const { error } = await auth.verifyReset(cleanEmail(), code);
      if (error) return setError(toMsg(error, 'code'));
      go('new_password');
    });
  }

  function onNewPassword(e: FormEvent) {
    e.preventDefault();
    if (!passwordOk(password)) return setError(t('auth.err.pw_rules'));
    if (password !== password2) return setError(t('auth.err.mismatch'));
    run(async () => {
      const { error } = await auth.setNewPassword(password);
      if (error) return setError(toMsg(error));
      setPassword('');
      setPassword2('');
      go('account');
      setNotice(t('auth.password_saved'));
    });
  }

  function onSaveProfile(e: FormEvent) {
    e.preventDefault();
    setMsgAt('main');
    if (name.trim().length < 2) return setError(t('reg.error_name'));
    const ph = sanitizePhone(phone);
    if (ph && (ph.replace(/\D/g, '').length < 9 || ph.replace(/\D/g, '').length > 15))
      return setError(t('contact.errors.phone'));
    run(async () => {
      const { error } = await auth.updateProfile({ name: name.trim().slice(0, MAX_NAME), phone: ph, prefs, marketing });
      if (error) return setError(t('auth.err.generic'));
      setNotice(t('reg.saved'));
    });
  }

  function onChangePassword(e: FormEvent) {
    e.preventDefault();
    setMsgAt('password');
    if (!currentPw) return setError(t('auth.err.current'));
    if (!passwordOk(password)) return setError(t('auth.err.pw_rules'));
    if (password !== password2) return setError(t('auth.err.mismatch'));
    run(async () => {
      const { error } = await auth.changePassword(currentPw, password);
      if (error) {
        const c = (error as AuthError).code;
        return setError(c === 'invalid_credentials' ? t('auth.err.current') : toMsg(error));
      }
      setCurrentPw('');
      setPassword('');
      setPassword2('');
      setNotice(t('auth.password_saved'));
    }, 'password');
  }

  const prefsPicker = (
    <div>
      <span className="field-label">{t('reg.pref')}</span>
      <div className="flex gap-10 mt-2 font-mono text-[13px] font-medium">
        {(['women', 'men'] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPrefs((c) => (c.includes(p) ? c.filter((x) => x !== p) : [...c, p]))}
            className="flex items-center gap-2"
            aria-pressed={prefs.includes(p)}
          >
            <Check checked={prefs.includes(p)} />
            {t(`news.${p}`)}
          </button>
        ))}
      </div>
    </div>
  );

  const checkbox = (checked: boolean, set: (v: boolean) => void, label: ReactNode) => (
    <label className="flex gap-2 font-mono text-[11px] leading-[1.5] cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => set(e.target.checked)} className="sr-only" />
      <span className="mt-[2px]">
        <Check checked={checked} />
      </span>
      <span>{label}</span>
    </label>
  );

  const messages = (
    <>
      {error && (
        <p role="alert" className="font-mono text-[12px] text-red-700">
          {error}
        </p>
      )}
      {notice && <p className="font-mono text-[12px]">{notice}</p>}
    </>
  );

  const captchaBox = view !== 'account' && view !== 'new_password' && (
    <Captcha ref={captcha} onToken={setToken} lang={lang} />
  );

  const title: Record<View, string> = {
    signin: t('auth.signin_title'),
    signup: t('auth.signup_title'),
    verify: t('auth.code_title'),
    forgot: t('auth.forgot_title'),
    reset_code: t('auth.forgot_title'),
    new_password: t('auth.new_password_title'),
    account: t('nav.account'),
  };

  return (
    <div className="fixed inset-0 z-[110] flex justify-end" role="dialog" aria-modal="true" aria-label={title[view]}>
      <div className="absolute inset-0 bg-white/30 backdrop-blur-[10px] animate-fade-in" onClick={closeRegister} />
      <aside className="relative w-full sm:w-[440px] h-full bg-white flex flex-col animate-slide-right border-l border-ink/10 pt-safe">
        <div className="h-header shrink-0 flex items-center justify-between px-5 border-b border-ink/10">
          <span className="nav-caps">{title[view]}</span>
          <button
            onClick={closeRegister}
            className="w-9 h-9 flex items-center justify-center hover:rotate-45 transition-transform duration-300"
            aria-label={t('common.close')}
          >
            <Mark size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-8 pb-safe">
          {!auth.enabled && <p className="font-mono text-[12px] mb-6">{t('auth.err.disabled')}</p>}

          {/* ВХОД */}
          {view === 'signin' && (
            <form onSubmit={onSignIn} noValidate className="space-y-7">
              <Field label={t('auth.email')}>
                <input className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={120} autoComplete="email" />
              </Field>
              <Field label={t('auth.password')}>
                <PasswordInput value={password} onChange={setPassword} autoComplete="current-password" />
              </Field>
              {captchaBox}
              {messages}
              <button type="submit" disabled={busy} className="btn-ink">
                {busy ? '…' : t('auth.signin')}
              </button>
              <div className="flex flex-col gap-3">
                <Link onClick={() => go('forgot')}>{t('auth.forgot')}</Link>
                <Link onClick={() => go('signup')}>{t('auth.to_signup')}</Link>
              </div>
            </form>
          )}

          {/* РЕГИСТРАЦИЯ */}
          {view === 'signup' && (
            <form onSubmit={onSignUp} noValidate className="space-y-7">
              <p className="font-mono text-[12px] leading-[1.7] text-ink/70">{t('reg.subtitle')}</p>
              <Field label={t('reg.name')}>
                <input className="field" value={name} onChange={(e) => setName(e.target.value)} maxLength={MAX_NAME} autoComplete="name" />
              </Field>
              <Field label={t('auth.email')}>
                <input className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={120} autoComplete="email" />
              </Field>
              <Field label={t('reg.phone')}>
                <input className="field" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998 90 123 45 67" maxLength={20} autoComplete="tel" />
              </Field>
              <Field label={t('auth.password')}>
                <PasswordInput value={password} onChange={setPassword} autoComplete="new-password" />
                <PasswordRules pw={password} />
              </Field>
              <Field label={t('auth.password_repeat')}>
                <PasswordInput value={password2} onChange={setPassword2} autoComplete="new-password" />
              </Field>
              {prefsPicker}
              {checkbox(marketing, setMarketing, t('reg.marketing'))}
              {checkbox(
                agree,
                setAgree,
                <>
                  {t('consent.pre')}{' '}
                  <a href="/privacy.html" target="_blank" className="underline underline-offset-2">
                    {t('consent.link')}
                  </a>{' '}
                  {t('consent.post')}
                </>
              )}
              {captchaBox}
              {messages}
              <button type="submit" disabled={busy} className="btn-ink">
                {busy ? '…' : t('auth.signup')}
              </button>
              <Link onClick={() => go('signin')}>{t('auth.to_signin')}</Link>
            </form>
          )}

          {/* КОД ПОДТВЕРЖДЕНИЯ / КОД СБРОСА */}
          {(view === 'verify' || view === 'reset_code') && (
            <form onSubmit={view === 'verify' ? onVerify : onResetCode} noValidate className="space-y-7">
              <p className="font-mono text-[13px] leading-[1.7]">
                {view === 'verify' ? t('auth.code_text') : t('auth.reset_code_text')}{' '}
                <span className="font-medium break-all">{cleanEmail()}</span>
              </p>
              {view === 'verify' && <p className="font-mono text-[11px] leading-[1.6] text-ink/60">{t('auth.code_hint')}</p>}
              <Field label={t('auth.code')}>
                <CodeInput value={code} onChange={setCode} />
              </Field>
              {messages}
              <button type="submit" disabled={busy} className="btn-ink">
                {busy ? '…' : t('auth.confirm')}
              </button>
              {captchaBox}
              <div className="flex flex-col gap-3">
                {cooldown > 0 ? (
                  <span className="font-mono text-[12px] text-mute">
                    {t('auth.resend_in')} {cooldown}s
                  </span>
                ) : (
                  <Link onClick={onResend}>{t('auth.resend')}</Link>
                )}
                <Link onClick={() => go(view === 'verify' ? 'signin' : 'forgot')}>← {t('auth.back')}</Link>
              </div>
            </form>
          )}

          {/* ЗАБЫЛИ ПАРОЛЬ */}
          {view === 'forgot' && (
            <form onSubmit={onForgot} noValidate className="space-y-7">
              <p className="font-mono text-[12px] leading-[1.7] text-ink/70">{t('auth.forgot_text')}</p>
              <Field label={t('auth.email')}>
                <input className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={120} autoComplete="email" />
              </Field>
              {captchaBox}
              {messages}
              <button type="submit" disabled={busy} className="btn-ink">
                {busy ? '…' : t('auth.send_code')}
              </button>
              <Link onClick={() => go('signin')}>← {t('auth.back')}</Link>
            </form>
          )}

          {/* НОВЫЙ ПАРОЛЬ */}
          {view === 'new_password' && (
            <form onSubmit={onNewPassword} noValidate className="space-y-7">
              <Field label={t('auth.password_new')}>
                <PasswordInput value={password} onChange={setPassword} autoComplete="new-password" />
                <PasswordRules pw={password} />
              </Field>
              <Field label={t('auth.password_repeat')}>
                <PasswordInput value={password2} onChange={setPassword2} autoComplete="new-password" />
              </Field>
              {messages}
              <button type="submit" disabled={busy} className="btn-ink">
                {busy ? '…' : t('auth.save_password')}
              </button>
            </form>
          )}

          {/* АККАУНТ */}
          {view === 'account' && session && (
            <div className="space-y-12">
              <form onSubmit={onSaveProfile} noValidate className="space-y-7">
                <div>
                  <h2 className="font-mono text-[20px]">
                    {t('reg.hello')}
                    {profile?.name ? `, ${profile.name.split(' ')[0]}` : ''}
                  </h2>
                  <p className="font-mono text-[12px] text-ink/60 mt-2 break-all">{session.user.email}</p>
                </div>
                <Field label={t('reg.name')}>
                  <input className="field" value={name} onChange={(e) => setName(e.target.value)} maxLength={MAX_NAME} autoComplete="name" />
                </Field>
                <Field label={t('reg.phone')}>
                  <input className="field" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998 90 123 45 67" maxLength={20} autoComplete="tel" />
                </Field>
                {prefsPicker}
                {checkbox(marketing, setMarketing, t('reg.marketing'))}
                {msgAt === 'main' && messages}
                <button type="submit" disabled={busy} className="btn-ink">
                  {t('reg.update')}
                </button>
              </form>

              <form onSubmit={onChangePassword} noValidate className="space-y-7 border-t border-ink/10 pt-8">
                <h3 className="nav-caps">{t('auth.change_password')}</h3>
                <Field label={t('auth.password_current')}>
                  <PasswordInput value={currentPw} onChange={setCurrentPw} autoComplete="current-password" />
                </Field>
                <Field label={t('auth.password_new')}>
                  <PasswordInput value={password} onChange={setPassword} autoComplete="new-password" />
                  <PasswordRules pw={password} />
                </Field>
                <Field label={t('auth.password_repeat')}>
                  <PasswordInput value={password2} onChange={setPassword2} autoComplete="new-password" />
                </Field>
                {msgAt === 'password' && messages}
                <button type="submit" disabled={busy} className="btn-line">
                  {t('auth.change_password')}
                </button>
              </form>

              <div className="space-y-3 border-t border-ink/10 pt-8">
                <button
                  type="button"
                  onClick={async () => {
                    await auth.signOut();
                    closeRegister();
                  }}
                  className="btn-ink"
                >
                  {t('reg.logout')}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await auth.signOut(true);
                    closeRegister();
                  }}
                  className="btn-line"
                >
                  {t('auth.logout_all')}
                </button>
                <p className="font-mono text-[11px] text-ink/60 pt-3">
                  {t('auth.delete_hint')}{' '}
                  <a href={`mailto:${CONTACTS.email}`} className="underline underline-offset-2">
                    {CONTACTS.email}
                  </a>
                </p>
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
