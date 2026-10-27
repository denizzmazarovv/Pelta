import { href } from '../lib/router';
import { useEffect, useRef, useState, FormEvent, ReactNode } from 'react';
import type { AuthError } from '@supabase/supabase-js';
import { useLang } from '../context/LangContext';
import { useProfile } from '../context/ProfileContext';
import { useCart } from '../context/CartContext';
import { CONTACTS, TELEGRAM_BOT_USERNAME } from '../lib/config';
import {
  botLink,
  claimTelegramLogin,
  clearNonce,
  loadNonce,
  startTelegramLogin,
  telegramEnabled,
} from '../lib/telegramLogin';
import { DEFAULT_COUNTRY, isComplete, toE164, type Country } from '../lib/phone';
import { LIMITS, filterName, validName } from '../lib/validate';
import { Field } from '../pages/ContactPage';
import { Captcha, captchaEnabled, type CaptchaHandle } from './Captcha';
import { Check, PrefsPicker } from './Footer';
import { MemberCard } from './MemberCard';
import { Mark } from './Logo';
import { PhoneInput } from './PhoneInput';

type View = 'phone' | 'telegram' | 'code' | 'account';

const RESEND_SECONDS = 60;
const MAX_CODE_ATTEMPTS = 5;
const POLL_MS = 2000;

/** Понятное сообщение об ошибке без лишних подробностей. */
function useAuthError() {
  const { t } = useLang();
  return (err: AuthError | Error | null, ctx: 'send' | 'code' = 'send'): string => {
    if (!err) return '';
    if (err.message === 'auth_not_configured') return t('auth.err.disabled');
    const msg = err.message ?? '';
    const code = (err as AuthError).code ?? '';
    const status = (err as AuthError).status ?? 0;
    if (msg.includes('NEED_BOT')) return t('auth.err.need_bot');
    if (msg.includes('TOO_MANY_CODES')) return t('auth.err.too_many_codes');
    if (msg.includes('DAILY_LIMIT') || msg.includes('SEND_FAILED') || msg.includes('SERVER_NOT_CONFIGURED')) return t('auth.err.unavailable');
    if (msg.includes('PHONE_INVALID') || code === 'validation_failed') return t('auth.err.phone');
    if (code === 'captcha_failed') return t('auth.err.captcha');
    if (status === 429 || code.startsWith('over_')) return t('auth.err.rate');
    if (ctx === 'code') return t('auth.err.code');
    return t('auth.err.generic');
  };
}

function CodeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      className="field text-[22px] tracking-[0.4em] h-14"
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
      inputMode="numeric"
      autoComplete="one-time-code"
      placeholder="••••••"
      maxLength={6}
      autoFocus
    />
  );
}

function TextButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
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
  const cart = useCart();
  const captcha = useRef<CaptchaHandle>(null);
  const needNameRef = useRef(false);

  const [view, setView] = useState<View>('phone');
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [national, setNational] = useState('');
  const [code, setCode] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [agree, setAgree] = useState(false);
  const [token, setToken] = useState('');
  const [name, setName] = useState('');
  const [prefs, setPrefs] = useState<string[]>([]);
  const [marketing, setMarketing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [nonce, setNonce] = useState<string | null>(null);
  const [consentError, setConsentError] = useState('');

  const phoneE164 = toE164(national, country);

  // Открытие панели
  useEffect(() => {
    if (!registerOpen) return;
    setView(session ? 'account' : 'phone');
    setError('');
    setNotice('');
    // Вход через бота уже начат (в этой вкладке или по кнопке «Вернуться на сайт»)
    const n = !session ? loadNonce() : null;
    if (n) {
      setNonce(n);
      setAgree(true); // согласие дано при начале входа
      setView('telegram');
    }
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !needNameRef.current && closeRegister();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
      setCode('');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registerOpen]);

  // Данные профиля в форму аккаунта
  useEffect(() => {
    if (view === 'account' && profile) {
      setName(profile.name);
      setPrefs(profile.prefs);
      setMarketing(profile.marketing);
    }
  }, [view, profile]);

  // Ожидание подтверждения в боте: спрашиваем сервер каждые 2 секунды, пока вкладка видна
  useEffect(() => {
    if (!registerOpen || view !== 'telegram' || !nonce || session) return;
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      if (stop) return;
      if (document.visibilityState === 'visible') {
        const r = await claimTelegramLogin(nonce);
        if (stop) return;
        if (r.status === 'ok') {
          stop = true;
          clearNonce();
          const { error } = await auth.applySession(r);
          if (error) return setError(t('auth.err.generic'));
          if (cart.isOpen) return closeRegister();
          return setView('account');
        }
        if (r.status === 'expired' || r.status === 'used') {
          stop = true;
          clearNonce();
          setNonce(null);
          return setError(t(r.status === 'used' ? 'auth.tg.used' : 'auth.tg.expired'));
        }
        if (!loadNonce()) {
          stop = true;
          setNonce(null);
          return setError(t('auth.tg.expired'));
        }
      }
      timer = setTimeout(tick, POLL_MS);
    };
    tick();
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        clearTimeout(timer);
        tick();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      stop = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registerOpen, view, nonce, session]);

  // Вошли (в том числе в другой вкладке) — показываем аккаунт
  useEffect(() => {
    if (registerOpen && session && view === 'telegram') setView('account');
  }, [registerOpen, session, view]);

  // Таймер повторной отправки
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  // Новый клиент обязательно указывает имя: пока имени нет, панель не закрывается
  const needName = view === 'account' && !!session && !!profile && !profile.name;
  needNameRef.current = needName;
  const tryClose = () => {
    if (needNameRef.current) return setError(t('reg.name_required'));
    closeRegister();
  };

  if (!registerOpen) return null;

  function go(v: View) {
    setView(v);
    setError('');
    setNotice('');
    setCode('');
    setAttempts(0);
    captcha.current?.reset();
  }

  async function run(fn: () => Promise<void>) {
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

  // Шаг 1: номер → код в Telegram
  function onSend(e?: FormEvent) {
    e?.preventDefault();
    if (busy || cooldown > 0) return;
    if (!isComplete(national, country)) return setError(t('cart.error_phone'));
    if (!agree) return setConsentError(t('contact.errors.policy'));
    if (captchaEnabled && !token) return setError(t('auth.err.captcha'));
    run(async () => {
      const { error } = await auth.sendCode(phoneE164, token);
      if (error) {
        // Новый номер: сразу ведём в бота — там номер подтверждается в одно касание
        if ((error.message ?? '').includes('NEED_BOT') && telegramEnabled) {
          setNonce(startTelegramLogin());
          setView('telegram');
          return setNotice(t('auth.tg.new_number'));
        }
        return setError(toMsg(error, 'send'));
      }
      setCooldown(RESEND_SECONDS);
      setAttempts(0);
      setCode('');
      setView('code');
    });
  }

  // Вход через Telegram в одно касание
  function onTelegram() {
    if (!agree) return setConsentError(t('contact.errors.policy'));
    setError('');
    setNotice('');
    setNonce(startTelegramLogin());
    setView('telegram');
  }

  // Шаг 2: код → вход
  function onVerify(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (code.length !== 6) return setError(t('auth.err.code'));
    if (attempts >= MAX_CODE_ATTEMPTS) return setError(t('auth.err.attempts'));
    run(async () => {
      const { error } = await auth.verifyCode(phoneE164, code);
      if (error) {
        setAttempts((a) => a + 1);
        setCode('');
        return setError(attempts + 1 >= MAX_CODE_ATTEMPTS ? t('auth.err.attempts') : toMsg(error, 'code'));
      }
      // Вход ради заказа — возвращаем к оформлению
      if (cart.isOpen) return closeRegister();
      setView('account');
    });
  }

  function onSaveProfile(e: FormEvent) {
    e.preventDefault();
    if (!validName(name)) return setError(t('reg.name_required'));
    run(async () => {
      const { error } = await auth.updateProfile({ name: name.trim(), prefs, marketing });
      if (error) return setError(t('auth.err.generic'));
      // Сохранили — возвращаемся туда, откуда открыли панель, и показываем «Сохранено»
      auth.flash(t('reg.saved'));
      closeRegister();
    });
  }

  const checkbox = (checked: boolean, set: (v: boolean) => void, label: ReactNode) => (
    <label className="flex items-start gap-2 font-mono text-[11px] leading-[1.5] cursor-pointer select-none">
      <input type="checkbox" checked={checked} onChange={(e) => set(e.target.checked)} className="sr-only peer" />
      <span className="peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-offset-2 rounded-full mt-[2px]">
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

  const title: Record<View, string> = {
    phone: t('auth.phone_title'),
    telegram: t('auth.tg.title'),
    code: t('auth.code_title'),
    account: t('nav.account'),
  };

  const newcomer = view === 'account' && profile && !profile.name;

  return (
    <div className="fixed inset-0 z-[110] flex justify-end" role="dialog" aria-modal="true" aria-label={title[view]}>
      <div className="absolute inset-0 bg-navy/30 backdrop-blur-[10px] animate-fade-in" onClick={tryClose} />
      <aside className="relative w-full sm:w-[440px] h-full bg-paper flex flex-col animate-slide-right border-l border-ink/10 pt-safe">
        <div className="h-header shrink-0 flex items-center justify-between px-5 border-b border-ink/10">
          <span className="nav-caps">{title[view]}</span>
          <button
            onClick={tryClose}
            className="w-9 h-9 flex items-center justify-center hover:rotate-45 transition-transform duration-300"
            aria-label={t('common.close')}
          >
            <Mark size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-8 pb-safe flex flex-col">
          {!auth.enabled && <p className="font-mono text-[12px] mb-6">{t('auth.err.disabled')}</p>}

          {/* ШАГ 1: ВХОД */}
          {view === 'phone' && (
            <div className="space-y-7">
              <p className="font-mono text-[12px] leading-[1.7] text-ink/70">{t('auth.intro')}</p>
              <div>
                {checkbox(
                  agree,
                  (v) => {
                    setAgree(v);
                    if (v) setConsentError('');
                  },
                  <>
                    {t('consent.pre')}{' '}
                    <a href={href.privacy} className="underline underline-offset-2">
                      {t('consent.link')}
                    </a>{' '}
                    {t('consent.post')}
                  </>
                )}
                {consentError && (
                  <p role="alert" className="font-mono text-[11px] text-red-700 mt-1.5 pl-[22px]">
                    {consentError}
                  </p>
                )}
              </div>

              {telegramEnabled && (
                <div className="space-y-4">
                  <button type="button" onClick={onTelegram} className="btn-ink">
                    {t('auth.tg.button')}
                  </button>
                  <ol className="font-mono text-[11px] leading-[1.7] text-ink/70 list-decimal pl-4 space-y-1">
                    <li>{t('auth.tg.step1')}</li>
                    <li>{t('auth.tg.step2')}</li>
                    <li>{t('auth.tg.step3')}</li>
                  </ol>
                </div>
              )}

              {telegramEnabled && (
                <div className="flex items-center gap-3 font-mono text-[11px] text-mute">
                  <span className="h-px flex-1 bg-ink/15" />
                  {t('auth.or_phone')}
                  <span className="h-px flex-1 bg-ink/15" />
                </div>
              )}

              <form onSubmit={onSend} noValidate className="space-y-7">
                <Field label={t('cart.phone')}>
                  <PhoneInput
                    country={country}
                    national={national}
                    onChange={(c, n) => {
                      setCountry(c);
                      setNational(n);
                    }}
                  />
                </Field>
                <Captcha ref={captcha} onToken={setToken} lang={lang} />
                {messages}
                <button type="submit" disabled={busy || cooldown > 0} className={telegramEnabled ? 'btn-line' : 'btn-ink'}>
                  {busy ? '…' : cooldown > 0 ? `${t('auth.resend_in')} ${cooldown}s` : t('auth.get_code')}
                </button>
                <p className="font-mono text-[11px] leading-[1.6] text-mute">{t('auth.telegram_note')}</p>
              </form>
            </div>
          )}

          {/* ВХОД ЧЕРЕЗ БОТА: ожидание */}
          {view === 'telegram' && (
            <div className="space-y-7">
              {messages}
              <p className="font-mono text-[13px] leading-[1.7]">{t('auth.tg.waiting_title')}</p>
              <ol className="font-mono text-[12px] leading-[1.8] text-ink/80 list-decimal pl-4 space-y-1">
                <li>
                  {t('auth.tg.wait1')} <span className="font-medium">@{TELEGRAM_BOT_USERNAME}</span>
                </li>
                <li>{t('auth.tg.wait2')}</li>
                <li>{t('auth.tg.wait3')}</li>
              </ol>
              {nonce ? (
                <>
                  <p className="font-mono text-[11px] text-mute flex items-center gap-2" aria-live="polite">
                    <span className="inline-block w-2 h-2 rounded-full bg-burgundy animate-pulse" />
                    {t('auth.tg.waiting')}
                  </p>
                  <a href={botLink(nonce)} target="_blank" rel="noopener noreferrer" className="btn-ink inline-flex items-center justify-center w-full">
                    {t('auth.tg.open_again')}
                  </a>
                </>
              ) : (
                <button type="button" onClick={onTelegram} className="btn-ink">
                  {t('auth.tg.button')}
                </button>
              )}
              <TextButton
                onClick={() => {
                  clearNonce();
                  setNonce(null);
                  go('phone');
                }}
              >
                ← {t('auth.tg.use_code')}
              </TextButton>
            </div>
          )}

          {/* ШАГ 2: КОД */}
          {view === 'code' && (
            <form onSubmit={onVerify} noValidate className="space-y-7">
              <p className="font-mono text-[13px] leading-[1.7]">
                {t('auth.code_sent')} <span className="font-medium whitespace-nowrap">+{country.dial} {national}</span>
              </p>
              <Field label={t('auth.code')}>
                <CodeInput value={code} onChange={setCode} />
              </Field>
              {messages}
              <button type="submit" disabled={busy || attempts >= MAX_CODE_ATTEMPTS} className="btn-ink">
                {busy ? '…' : t('auth.confirm')}
              </button>
              <Captcha ref={captcha} onToken={setToken} lang={lang} />
              <div className="flex flex-col gap-3">
                {cooldown > 0 ? (
                  <span className="font-mono text-[12px] text-mute">
                    {t('auth.resend_in')} {cooldown}s
                  </span>
                ) : (
                  <TextButton onClick={() => onSend()}>{t('auth.resend')}</TextButton>
                )}
                <TextButton onClick={() => go('phone')}>← {t('auth.change_number')}</TextButton>
              </div>
            </form>
          )}

          {/* АККАУНТ */}
          {view === 'account' && session && (
            <div className="flex-1 flex flex-col space-y-12">
              <form onSubmit={onSaveProfile} noValidate className="space-y-7">
                <div>
                  <h2 className="font-mono text-[20px]">
                    {newcomer ? t('auth.welcome') : `${t('reg.hello')}${profile?.name ? `, ${profile.name.split(' ')[0]}` : ''}`}
                  </h2>
                  <p className="font-mono text-[12px] text-ink/70 mt-2">{profile?.phone}</p>
                  {newcomer && <p className="font-mono text-[12px] text-ink/70 mt-4">{t('auth.complete_profile')}</p>}
                </div>
                {!newcomer && <MemberCard onNavigate={closeRegister} />}
                <Field label={t('reg.name')}>
                  <input
                    className="field"
                    value={name}
                    onChange={(e) => setName(filterName(e.target.value))}
                    maxLength={LIMITS.name}
                    autoComplete="name"
                  />
                </Field>
                <div>
                  <span className="field-label">{t('reg.pref')}</span>
                  <div className="mt-2">
                    <PrefsPicker value={prefs} onChange={setPrefs} />
                  </div>
                </div>
                {checkbox(marketing, setMarketing, t('reg.marketing'))}
                {messages}
                <button type="submit" disabled={busy} className="btn-ink">
                  {t('reg.update')}
                </button>
              </form>

              {/* Выход — внизу окна, маленькие кнопки */}
              <div className="!mt-auto border-t border-ink/10 pt-5 space-y-3">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      await auth.signOut();
                      closeRegister();
                    }}
                    className="btn-line !h-auto min-h-8 py-1.5 !text-[11px] leading-tight !w-auto flex-1 px-3"
                  >
                    {t('reg.logout')}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await auth.signOut(true);
                      closeRegister();
                    }}
                    className="btn-line !h-auto min-h-8 py-1.5 !text-[11px] leading-tight !w-auto flex-[1.4] px-3 !border-ink/30 text-ink/70"
                  >
                    {t('auth.logout_all')}
                  </button>
                </div>
                <p className="font-mono text-[10.5px] text-mute leading-[1.5]">
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
