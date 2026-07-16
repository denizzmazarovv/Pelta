import { useState } from 'react';
import { X, Phone, User, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';

export function AccountModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useLang();
  const { profile, updateProfile, signOut } = useAuth();
  const [name, setName] = useState(profile?.full_name ?? '');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!open) return null;

  async function save() {
    setBusy(true);
    await updateProfile(name);
    setBusy(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-wine-900/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-md bg-cream rounded-2xl shadow-2xl border border-brand-200 overflow-hidden animate-scale-in">
        <div className="bg-brand-500 px-6 py-5 flex items-center justify-between">
          <div>
            <p className="text-cream/70 text-xs uppercase tracking-[0.25em]">Pelta Nera</p>
            <h3 className="text-cream text-xl font-serif font-semibold">{t('account.title')}</h3>
          </div>
          <button onClick={onClose} className="text-cream/70 hover:text-cream transition-colors" aria-label={t('common.close')}>
            <X size={22} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <span className="text-xs uppercase tracking-wider text-wine-400 mb-1.5 block">{t('account.phone')}</span>
            <div className="flex items-center gap-2.5 border border-brand-200 rounded-xl px-3.5 py-3 bg-brand-50/50">
              <Phone size={18} className="text-brand-500" />
              <span className="text-wine-700">{profile?.phone}</span>
            </div>
          </div>

          <div>
            <span className="text-xs uppercase tracking-wider text-wine-400 mb-1.5 block">{t('account.name')}</span>
            <div className="flex items-center gap-2.5 border border-brand-200 rounded-xl px-3.5 py-3 focus-within:border-brand-500 transition-colors">
              <User size={18} className="text-brand-500" />
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-transparent outline-none text-wine-900"
                placeholder={t('auth.name')}
              />
            </div>
          </div>

          <button
            onClick={save}
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-cream py-3.5 rounded-xl font-medium transition-all hover:shadow-lg hover:shadow-brand-500/25 disabled:opacity-60"
          >
            {busy ? <Loader2 size={18} className="animate-spin" /> : saved ? <CheckCircle2 size={18} /> : null}
            {saved ? t('account.saved') : t('account.save')}
          </button>

          <button
            onClick={() => {
              signOut();
              onClose();
            }}
            className="w-full text-center text-sm text-wine-400 hover:text-wine-600 transition-colors py-2"
          >
            {t('nav.logout')}
          </button>
        </div>
      </div>
    </div>
  );
}
