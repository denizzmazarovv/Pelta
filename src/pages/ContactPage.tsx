import { useEffect, useState, FormEvent } from 'react';
import { useLang } from '../context/LangContext';
import { useProfile } from '../context/ProfileContext';
import { CONTACTS, SOCIALS } from '../lib/config';
import { MAX_MESSAGE, MAX_NAME, sanitizeEmail, sanitizePhone } from '../lib/sanitize';
import { isRateLimited, RateLimitError, saveMessage } from '../lib/forms';
import { Check } from '../components/Footer';

export function ContactPage() {
  const { t, lang } = useLang();
  const { profile } = useProfile();
  const [form, setForm] = useState({
    name: profile?.name ?? '',
    phone: profile?.phone ?? '',
    email: profile?.email ?? '',
    message: '',
  });
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');

  useEffect(() => {
    document.title = `${t('nav.contact')} — Pelta Nera`;
  }, [t]);

  function validate() {
    const e: Record<string, string> = {};
    if (form.name.trim().length < 2) e.name = t('contact.errors.name');
    if (form.message.trim().length < 2) e.message = t('contact.errors.message');
    const phoneDigits = form.phone.replace(/\D/g, '');
    if (!phoneDigits && !form.email.trim()) e.contact = t('contact.errors.contact');
    if (phoneDigits && (phoneDigits.length < 9 || phoneDigits.length > 15)) e.phone = t('contact.errors.phone');
    if (form.email.trim() && !sanitizeEmail(form.email)) e.email = t('contact.errors.email');
    if (!agree) e.policy = t('contact.errors.policy');
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    if (isRateLimited('contact')) return setErrors({ form: t('common.rate_limit') });
    setState('busy');
    try {
      await saveMessage({
        name: form.name.slice(0, MAX_NAME),
        phone: sanitizePhone(form.phone),
        email: sanitizeEmail(form.email),
        message: form.message.slice(0, MAX_MESSAGE),
        lang,
      });
      setState('done');
      setForm((f) => ({ ...f, message: '' }));
    } catch (err) {
      setState('idle');
      setErrors({ form: err instanceof RateLimitError ? t('common.rate_limit') : t('contact.error') });
    }
  }

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="grid lg:grid-cols-2 min-h-[calc(100vh-50px)]">
      <div className="bg-ash px-5 sm:px-10 lg:px-14 py-14 lg:py-24">
        <h1 className="font-display uppercase text-[34px] leading-none">{t('contact.title')}</h1>
        <p className="font-mono text-[13px] text-ink/70 mt-6 max-w-[380px] leading-[1.7]">{t('contact.subtitle')}</p>

        <dl className="mt-14 space-y-3 font-display uppercase text-[16px]">
          {[
            [t('menu.email'), CONTACTS.email, `mailto:${CONTACTS.email}`],
            [t('menu.phone'), CONTACTS.phone, CONTACTS.phoneHref],
            [t('menu.telegram'), CONTACTS.telegramHandle, CONTACTS.telegramHref],
            [t('footer.collab'), CONTACTS.collabEmail, `mailto:${CONTACTS.collabEmail}`],
          ].map(([l, v, h]) => (
            <div key={l} className="grid grid-cols-[150px_1fr] items-baseline">
              <dt>{l}</dt>
              <dd>
                <a href={h} className="font-mono text-[13px] normal-case link-u break-all">
                  {v}
                </a>
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-10 flex gap-6 nav-caps">
          {SOCIALS.map((s) => (
            <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" className="link-u">
              {s.label}
            </a>
          ))}
        </div>
      </div>

      <div className="px-5 sm:px-10 lg:px-14 py-14 lg:py-24">
        {state === 'done' ? (
          <div className="max-w-[440px]">
            <h2 className="font-mono text-[20px]">{t('contact.success_title')}</h2>
            <p className="font-mono text-[13px] text-ink/70 mt-4">{t('contact.success')}</p>
            <button onClick={() => setState('idle')} className="btn-line mt-10 max-w-[260px]">
              {t('contact.again')}
            </button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="max-w-[440px] space-y-7">
            <Field label={t('contact.name')} error={errors.name}>
              <input className="field" value={form.name} onChange={set('name')} maxLength={MAX_NAME} autoComplete="name" />
            </Field>
            <Field label={t('contact.phone')} error={errors.phone || errors.contact}>
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
            <Field label={t('contact.email')} error={errors.email}>
              <input className="field" type="email" value={form.email} onChange={set('email')} maxLength={120} autoComplete="email" />
            </Field>
            <Field label={t('contact.message')} error={errors.message}>
              <textarea
                className="field h-auto py-2 resize-none"
                rows={4}
                value={form.message}
                onChange={set('message')}
                maxLength={MAX_MESSAGE}
              />
            </Field>

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
            {errors.policy && <p className="font-mono text-[11px] text-red-700 -mt-4">{errors.policy}</p>}
            {errors.form && <p className="font-mono text-[12px] text-red-700">{errors.form}</p>}

            <button type="submit" disabled={state === 'busy'} className="btn-ink">
              {state === 'busy' ? t('contact.sending') : t('contact.send')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block">
        <span className="field-label">{label}</span>
        {children}
      </label>
      {error && <p className="font-mono text-[11px] text-red-700 mt-1">{error}</p>}
    </div>
  );
}
