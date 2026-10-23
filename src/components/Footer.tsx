import { useState, FormEvent } from 'react';
import { useLang } from '../context/LangContext';
import { CONTACTS } from '../lib/config';
import { sanitizeEmail } from '../lib/sanitize';
import { isRateLimited, subscribe } from '../lib/forms';
import { Mark } from './Logo';

export function Arrow({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size * 1.4} viewBox="0 0 10 14" aria-hidden="true">
      <path d="M2 1.5 L8 7 L2 12.5" fill="none" stroke="currentColor" strokeWidth="2.2" />
    </svg>
  );
}

/** Чекбокс-лепесток: контур — не выбрано, чёрная заливка — выбрано. */
export function Check({ checked, size = 14 }: { checked: boolean; size?: number }) {
  return (
    <span className="relative inline-flex shrink-0 text-ink" style={{ width: size, height: size }} aria-hidden="true">
      <Mark size={size} outline className="absolute inset-0" />
      <Mark
        size={size}
        className={`absolute inset-0 transition-[opacity,transform] duration-200 ${
          checked ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
        }`}
      />
    </span>
  );
}

function Newsletter() {
  const { t, lang } = useLang();
  const [email, setEmail] = useState('');
  const [prefs, setPrefs] = useState<string[]>([]);
  const [agree, setAgree] = useState(false);
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [error, setError] = useState('');

  function toggle(p: string) {
    setPrefs((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const clean = sanitizeEmail(email);
    if (!clean) return setError(t('news.error_email'));
    if (!agree) return setError(t('news.error_consent'));
    if (isRateLimited('newsletter')) return setError(t('common.rate_limit'));
    setError('');
    setState('busy');
    try {
      await subscribe(clean, prefs, lang);
      setState('done');
      setEmail('');
    } catch {
      setState('idle');
      setError(t('contact.error'));
    }
  }

  return (
    <form onSubmit={submit} className="w-full max-w-[400px]" noValidate>
      <p className="font-sans text-[15px] mb-5">{t('news.title')}</p>
      {state === 'done' ? (
        <p className="font-mono text-[13px] border-b border-ink pb-3">{t('news.done')}</p>
      ) : (
        <div className="flex items-center gap-3 border-b border-ink pb-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('news.placeholder')}
            className="flex-1 bg-transparent font-mono text-[14px] placeholder:text-ink/70 focus:outline-none min-w-0"
            aria-label="Email"
            maxLength={120}
          />
          <button
            type="submit"
            disabled={state === 'busy'}
            className="w-8 h-8 border border-ink flex items-center justify-center hover:bg-ink hover:text-ash transition-colors disabled:opacity-50"
            aria-label={t('contact.send')}
          >
            <Arrow />
          </button>
        </div>
      )}

      <div className="flex gap-10 mt-3 font-mono text-[13px] font-medium">
        {(['women', 'men'] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => toggle(p)}
            className="flex items-center gap-2"
            aria-pressed={prefs.includes(p)}
          >
            <Check checked={prefs.includes(p)} />
            {t(`news.${p}`)}
          </button>
        ))}
      </div>

      <label className="flex gap-2 mt-4 font-mono text-[10.5px] leading-[1.45] cursor-pointer">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="sr-only peer" />
        <span className="mt-[2px] peer-focus-visible:outline peer-focus-visible:outline-1">
          <Check checked={agree} />
        </span>
        <span>
          {t('consent.pre')}{' '}
          <a href="/privacy.html" target="_blank" className="font-medium underline underline-offset-2">
            {t('consent.link')}
          </a>{' '}
          {t('consent.post')}
        </span>
      </label>

      {error && <p className="font-mono text-[11px] mt-2 text-red-700">{error}</p>}
    </form>
  );
}

export function Footer() {
  const { t } = useLang();
  const year = new Date().getFullYear();

  const items: { label: string; value: string; to?: string }[] = [
    { label: t('footer.company'), value: CONTACTS.company },
    { label: t('footer.ceo'), value: CONTACTS.ceo },
    { label: t('footer.phone'), value: CONTACTS.phone, to: CONTACTS.phoneHref },
    { label: t('footer.mail'), value: CONTACTS.email, to: `mailto:${CONTACTS.email}` },
    { label: t('footer.collab'), value: CONTACTS.collabEmail, to: `mailto:${CONTACTS.collabEmail}` },
  ];

  return (
    <footer className="bg-ash border-t-[3px] border-smoke">
      <div className="flex justify-end px-5 sm:px-0 sm:pr-5 pt-5 pb-8">
        <div className="w-full sm:w-[400px]">
          <Newsletter />
        </div>
      </div>
      <div className="px-5 sm:px-16 pb-safe">
        <div className="border-t-2 border-ink pt-4 pb-8 flex flex-wrap gap-x-5 gap-y-2 font-sans text-[13px] sm:text-[15px] text-ink/75">
          {items.map((i) => (
            <span key={i.label} className="whitespace-nowrap">
              {i.label}:{' '}
              {i.to ? (
                <a href={i.to} className="link-u">
                  {i.value}
                </a>
              ) : (
                i.value
              )}
            </span>
          ))}
          <span className="whitespace-nowrap">
            © {year} Pelta Nera. {t('footer.rights')}
          </span>
        </div>
      </div>
    </footer>
  );
}
