import { useState } from 'react';
import { X, Mail, Lock, User, Loader2, ArrowLeft, MailCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { supabase } from '../lib/supabase';

type Mode = 'login' | 'register' | 'reset' | 'confirm';

export function AuthModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useLang();
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  function reset() {
    setEmail('');
    setPassword('');
    setName('');
    setError(null);
    setInfo(null);
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
      const { error, needsConfirmation } = await signUp(email, password, name);
      setBusy(false);
      if (error) setError(error);
      else if (needsConfirmation) {
        setMode('confirm');
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
      setMode('confirm');
    } else {
      reset();
      onClose();
    }
  }

  async function resendConfirmation() {
    setBusy(true);
    setError(null);
    setInfo(null);
    const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim().toLowerCase() });
    setBusy(false);
    if (error) setError(t('auth.error.generic'));
    else setInfo(t('auth.confirm.resent'));
  }

  const title =
    mode === 'login' ? t('auth.login')
    : mode === 'register' ? t('auth.register')
    : mode === 'reset' ? t('auth.reset')
    : t('auth.confirm.title');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-wine-900/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-md bg-cream rounded-2xl shadow-2xl border border-brand-200 overflow-hidden animate-scale-in">
        <div className="bg-brand-500 px-6 py-5 flex items-center justify-between">
          <div>
            <p className="text-cream/70 text-xs uppercase tracking-[0.25em]">Pelta Nera</p>
            <h3 className="text-cream text-xl font-serif font-semibold">{title}</h3>
          </div>
          <button onClick={onClose} className="text-cream/70 hover:text-cream transition-colors" aria-label={t('common.close')}>
            <X size={22} />
          </button>
        </div>

        {mode === 'confirm' ? (
          <div className="p-6 space-y-5 text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-brand-50 flex items-center justify-center">
              <MailCheck size={28} className="text-brand-500" />
            </div>
            <p className="text-wine-700 text-sm leading-relaxed">{t('auth.confirm.text')}</p>
            {info && <p className="text-brand-600 text-sm bg-brand-50 rounded-lg px-3 py-2 animate-fade-in">{info}</p>}
            {error && <p className="text-wine-500 text-sm bg-wine-50 rounded-lg px-3 py-2 animate-fade-in">{error}</p>}
            <button
              onClick={resendConfirmation}
              disabled={busy}
              className="w-full bg-brand-500 hover:bg-brand-600 text-cream py-3.5 rounded-xl font-medium tracking-wide transition-all hover:shadow-lg hover:shadow-brand-500/30 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {busy && <Loader2 size={18} className="animate-spin" />}
              {t('auth.confirm.resend')}
            </button>
            <button
              onClick={() => switchMode('login')}
              className="w-full text-center text-sm text-wine-400 hover:text-wine-600 transition-colors"
            >
              {t('auth.reset.back')}
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="p-6 space-y-4">
            {mode === 'register' && (
              <Field icon={<User size={18} />} label={t('auth.name')}>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-transparent outline-none text-wine-900 placeholder-wine-300"
                  placeholder={t('auth.name')}
                />
              </Field>
            )}
            <Field icon={<Mail size={18} />} label={t('auth.email')}>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                required
                className="w-full bg-transparent outline-none text-wine-900 placeholder-wine-300"
                placeholder="you@example.com"
              />
            </Field>
            {mode !== 'reset' && (
              <Field icon={<Lock size={18} />} label={t('auth.password')}>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  required
                  className="w-full bg-transparent outline-none text-wine-900 placeholder-wine-300"
                  placeholder="••••••"
                />
              </Field>
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

            {error && <p className="text-wine-500 text-sm bg-wine-50 rounded-lg px-3 py-2 animate-fade-in">{error}</p>}
            {info && <p className="text-brand-600 text-sm bg-brand-50 rounded-lg px-3 py-2 animate-fade-in">{info}</p>}

            <button
              type="submit"
              disabled={busy}
              className="w-full bg-brand-500 hover:bg-brand-600 text-cream py-3.5 rounded-xl font-medium tracking-wide transition-all hover:shadow-lg hover:shadow-brand-500/30 disabled:opacity-60 flex items-center justify-center gap-2"
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

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wider text-wine-400 mb-1.5 block">{label}</span>
      <div className="flex items-center gap-2.5 border border-brand-200 rounded-xl px-3.5 py-3 focus-within:border-brand-500 transition-colors">
        <span className="text-brand-500">{icon}</span>
        {children}
      </div>
    </label>
  );
}
