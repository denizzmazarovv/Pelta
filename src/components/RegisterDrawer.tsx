import { useEffect, useState, FormEvent } from 'react';
import { useLang } from '../context/LangContext';
import { useProfile } from '../context/ProfileContext';
import { MAX_NAME, sanitizeEmail, sanitizePhone } from '../lib/sanitize';
import { isRateLimited, sendToSheet } from '../lib/sheets';
import { Field } from '../pages/ContactPage';
import { Check } from './Footer';
import { Mark } from './Logo';

export function RegisterDrawer() {
  const { t, lang } = useLang();
  const { profile, save, signOut, registerOpen, closeRegister } = useProfile();
  const [form, setForm] = useState({ name: '', phone: '', email: '' });
  const [prefs, setPrefs] = useState<string[]>([]);
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<'idle' | 'busy' | 'saved'>('idle');

  useEffect(() => {
    if (!registerOpen) return;
    setForm({ name: profile?.name ?? '', phone: profile?.phone ?? '', email: profile?.email ?? '' });
    setPrefs(profile?.prefs ?? []);
    setAgree(!!profile);
    setErrors({});
    setState('idle');
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeRegister();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registerOpen]);

  if (!registerOpen) return null;

  function validate() {
    const e: Record<string, string> = {};
    if (form.name.trim().length < 2) e.name = t('reg.error_name');
    if (sanitizePhone(form.phone).replace(/\D/g, '').length < 9) e.phone = t('reg.error_phone');
    if (form.email.trim() && !sanitizeEmail(form.email)) e.email = t('reg.error_email');
    if (!agree) e.policy = t('contact.errors.policy');
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    if (isRateLimited('register')) return setErrors({ form: t('common.rate_limit') });
    setState('busy');
    const data = {
      name: form.name.trim().slice(0, MAX_NAME),
      phone: sanitizePhone(form.phone),
      email: sanitizeEmail(form.email),
      prefs,
    };
    try {
      await sendToSheet('register', { ...data, prefs: prefs.join(', '), lang, update: profile ? 'yes' : 'no' });
      save(data);
      setState('saved');
    } catch {
      setState('idle');
      setErrors({ form: t('contact.error') });
    }
  }

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="fixed inset-0 z-[110] flex justify-end" role="dialog" aria-modal="true" aria-label={t('reg.title')}>
      <div className="absolute inset-0 bg-white/30 backdrop-blur-[10px] animate-fade-in" onClick={closeRegister} />
      <aside className="relative w-full sm:w-[440px] h-full bg-white flex flex-col animate-slide-right border-l border-ink/10 pt-safe">
        <div className="h-header shrink-0 flex items-center justify-between px-5 border-b border-ink/10">
          <span className="nav-caps">{profile ? t('nav.account') : t('reg.title')}</span>
          <button
            onClick={closeRegister}
            className="w-9 h-9 flex items-center justify-center hover:rotate-45 transition-transform duration-300"
            aria-label={t('common.close')}
          >
            <Mark size={20} />
          </button>
        </div>

        <form onSubmit={submit} noValidate className="flex-1 overflow-y-auto px-5 py-8 space-y-7 pb-safe">
          {profile ? (
            <div>
              <h2 className="font-mono text-[20px]">
                {t('reg.hello')}, {profile.name.split(' ')[0]}
              </h2>
              <p className="nav-caps text-mute mt-6">{t('reg.profile')}</p>
            </div>
          ) : (
            <p className="font-mono text-[12px] leading-[1.7] text-ink/70">{t('reg.subtitle')}</p>
          )}

          <Field label={t('reg.name')} error={errors.name}>
            <input className="field" value={form.name} onChange={set('name')} maxLength={MAX_NAME} autoComplete="name" />
          </Field>
          <Field label={t('reg.phone')} error={errors.phone}>
            <input
              className="field"
              type="tel"
              value={form.phone}
              onChange={set('phone')}
              placeholder="+998 90 123 45 67"
              maxLength={20}
              autoComplete="tel"
            />
          </Field>
          <Field label={t('reg.email')} error={errors.email}>
            <input className="field" type="email" value={form.email} onChange={set('email')} maxLength={120} autoComplete="email" />
          </Field>

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

          {!profile && (
            <label className="flex gap-2 font-mono text-[11px] leading-[1.5] cursor-pointer">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="sr-only" />
              <span className="mt-[2px]">
                <Check checked={agree} />
              </span>
              <span>
                {t('consent.pre')}{' '}
                <a href="/privacy.html" target="_blank" className="underline underline-offset-2">
                  {t('consent.link')}
                </a>{' '}
                {t('consent.post')}
              </span>
            </label>
          )}
          {errors.policy && <p className="font-mono text-[11px] text-red-700 -mt-4">{errors.policy}</p>}
          {errors.form && <p className="font-mono text-[12px] text-red-700">{errors.form}</p>}

          <button type="submit" disabled={state === 'busy'} className="btn-ink">
            {state === 'busy' ? t('reg.saving') : state === 'saved' ? t('reg.saved') : profile ? t('reg.update') : t('reg.submit')}
          </button>

          {profile && (
            <button
              type="button"
              onClick={() => {
                signOut();
                closeRegister();
              }}
              className="btn-line"
            >
              {t('reg.logout')}
            </button>
          )}
        </form>
      </aside>
    </div>
  );
}
