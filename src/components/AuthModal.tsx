import { useState } from 'react';
import { X, Phone, Lock, User, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';

export function AuthModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useLang();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = mode === 'login' ? await signIn(phone, password) : await signUp(phone, password, name);
    setBusy(false);
    if (res.error) {
      setError(res.error);
    } else {
      onClose();
      setPhone('');
      setPassword('');
      setName('');
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-wine-900/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md bg-cream rounded-2xl shadow-2xl border border-brand-200 overflow-hidden animate-scale-in">
        <div className="bg-brand-500 px-6 py-5 flex items-center justify-between">
          <div>
            <p className="text-cream/70 text-xs uppercase tracking-[0.25em]">Pelta Nera</p>
            <h3 className="text-cream text-xl font-serif font-semibold">
              {mode === 'login' ? t('auth.login') : t('auth.register')}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-cream/70 hover:text-cream transition-colors"
            aria-label={t('common.close')}
          >
            <X size={22} />
          </button>
        </div>

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
          <Field icon={<Phone size={18} />} label={t('auth.phone')}>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              type="tel"
              required
              className="w-full bg-transparent outline-none text-wine-900 placeholder-wine-300"
              placeholder="+998 90 123 45 67"
            />
          </Field>
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

          {error && (
            <p className="text-wine-500 text-sm bg-wine-50 rounded-lg px-3 py-2 animate-fade-in">{error}</p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-brand-500 hover:bg-brand-600 text-cream py-3.5 rounded-xl font-medium tracking-wide transition-all hover:shadow-lg hover:shadow-brand-500/30 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {busy && <Loader2 size={18} className="animate-spin" />}
            {mode === 'login' ? t('auth.signin') : t('auth.signup')}
          </button>

          <button
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setError(null);
            }}
            className="w-full text-center text-sm text-wine-400 hover:text-wine-600 transition-colors"
          >
            {mode === 'login' ? t('auth.no') : t('auth.have')}
          </button>
        </form>
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
