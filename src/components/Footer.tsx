import { useState, FormEvent } from 'react';
import { useLang } from '../context/LangContext';
import { CONTACTS, SOCIALS } from '../lib/config';
import { href } from '../lib/router';
import { useCatalog } from '../context/CatalogContext';
import { sanitizeEmail } from '../lib/sanitize';
import { isRateLimited, subscribe } from '../lib/forms';
import { Mark } from './Logo';
import { useConsent } from '../context/ConsentContext';

export function Arrow({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size * 1.4} viewBox="0 0 10 14" aria-hidden="true">
      <path d="M2 1.5 L8 7 L2 12.5" fill="none" stroke="currentColor" strokeWidth="2.2" />
    </svg>
  );
}

/** Чекбокс-лепесток: контур — не выбрано, чёрная заливка — выбрано. */
export function Check({ checked, size = 14 }: { checked: boolean; size?: number }) {
  // Пустой белый круг → при отметке превращается в логотип
  return (
    <span className="relative inline-flex shrink-0 text-ink" style={{ width: size, height: size }} aria-hidden="true">
      <span
        className={`absolute inset-0 rounded-full border-[1.5px] border-ink bg-transparent transition-[opacity,transform] duration-200 ${
          checked ? 'opacity-0 scale-75' : 'opacity-100 scale-100'
        }`}
      />
      <Mark
        size={size}
        className={`absolute inset-0 transition-[opacity,transform] duration-200 ${
          checked ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-50 -rotate-45'
        }`}
      />
    </span>
  );
}

/** Интересы: «Все» = женское и мужское вместе. */
export function PrefsPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const { t } = useLang();
  const all = value.includes('women') && value.includes('men');
  const opts: { key: 'all' | 'women' | 'men'; on: boolean; next: () => string[] }[] = [
    { key: 'all', on: all, next: () => (all ? [] : ['women', 'men']) },
    { key: 'women', on: value.includes('women'), next: () => (value.includes('women') ? value.filter((x) => x !== 'women') : [...value, 'women']) },
    { key: 'men', on: value.includes('men'), next: () => (value.includes('men') ? value.filter((x) => x !== 'men') : [...value, 'men']) },
  ];
  return (
    <div className="flex flex-wrap gap-x-10 gap-y-2 font-mono text-[13px] font-medium">
      {opts.map((o) => (
        <button key={o.key} type="button" onClick={() => onChange(o.next())} className="flex items-center gap-2" aria-pressed={o.on}>
          <Check checked={o.on} />
          {t(`news.${o.key}`)}
        </button>
      ))}
    </div>
  );
}

function Newsletter() {
  const { t, lang } = useLang();
  const [email, setEmail] = useState('');
  const [prefs, setPrefs] = useState<string[]>([]);
  const [agree, setAgree] = useState(false);
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [error, setError] = useState('');
  const [consentError, setConsentError] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    const clean = sanitizeEmail(email);
    if (!clean) return setError(t('news.error_email'));
    setError('');
    if (!agree) return setConsentError(t('news.error_consent'));
    setConsentError('');
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
            className="w-8 h-8 shrink-0 border border-ink flex items-center justify-center hover:bg-ink hover:text-ash transition-colors disabled:opacity-50"
            aria-label={t('contact.send')}
          >
            <Arrow />
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="font-mono text-[11px] mt-2 text-red-700">
          {error}
        </p>
      )}

      <div className="mt-3">
        <PrefsPicker value={prefs} onChange={setPrefs} />
      </div>

      <label className="flex items-start gap-2 mt-4 font-mono text-[10.5px] leading-[1.45] cursor-pointer select-none">
        <input
          type="checkbox"
          checked={agree}
          onChange={(e) => {
            setAgree(e.target.checked);
            if (e.target.checked) setConsentError('');
          }}
          className="sr-only peer"
        />
        <span className="peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-offset-2 rounded-full mt-[2px]">
          <Check checked={agree} />
        </span>
        <span>
          {t('consent.pre')}{' '}
          <a href="#/privacy" className="font-medium underline underline-offset-2">
            {t('consent.link')}
          </a>{' '}
          {t('consent.post')}
        </span>
      </label>
      {consentError && (
        <p role="alert" className="font-mono text-[11px] mt-1.5 pl-[22px] text-red-700">
          {consentError}
        </p>
      )}
    </form>
  );
}

/** Разделы меню — только на больших экранах, чтобы левая часть подвала не пустовала. */
function FooterNav() {
  const { t } = useLang();
  const { categories } = useCatalog();
  const col = (title: string, links: { label: string; to: string; external?: boolean }[]) => (
    <div>
      <h3 className="font-display uppercase text-[15px] leading-none mb-4">{title}</h3>
      <ul className="space-y-[7px] font-display uppercase text-[13px] leading-tight text-ink/75">
        {links.map((l) => (
          <li key={l.label}>
            <a
              href={l.to}
              className="link-u hover:text-ink"
              {...(l.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            >
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
  return (
    <nav aria-label={t('nav.menu')} className="hidden lg:grid grid-cols-4 gap-10 xl:gap-16 pt-1">
      {col(t('menu.collection'), [
        { label: t('cat.all'), to: href.category('all') },
        ...categories.map((c) => ({ label: t(`cat.${c}`), to: href.category(c) })),
      ])}
      {col(t('menu.house'), [
        { label: t('nav.about'), to: href.about },
        { label: t('nav.contact'), to: href.contact },
        { label: t('footer.privacy'), to: href.privacy },
      ])}
      {col(t('menu.contacts'), [
        { label: t('menu.email'), to: `mailto:${CONTACTS.email}` },
        { label: t('menu.phone'), to: CONTACTS.phoneHref },
        { label: t('menu.telegram'), to: CONTACTS.telegramHref, external: true },
      ])}
      {col(
        t('menu.socials'),
        SOCIALS.map((x) => ({ label: x.label, to: x.href, external: true }))
      )}
    </nav>
  );
}

export function Footer() {
  const { t } = useLang();
  const { openSettings } = useConsent();
  const year = new Date().getFullYear();

  const items: { label: string; value: string; to?: string }[] = [
    { label: t('footer.company'), value: CONTACTS.company },
    { label: t('footer.founder'), value: CONTACTS.founder },
    { label: t('footer.phone'), value: CONTACTS.phone, to: CONTACTS.phoneHref },
    { label: t('footer.mail'), value: CONTACTS.email, to: `mailto:${CONTACTS.email}` },
  ];

  return (
    <footer className="bg-ash border-t-[3px] border-smoke">
      <div className="flex justify-end lg:justify-between gap-10 px-4 sm:px-5 pt-5 pb-8">
        <FooterNav />
        <div className="w-full sm:w-[400px] shrink-0">
          <Newsletter />
        </div>
      </div>
      <div className="px-4 sm:px-5 pb-safe">
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
          <a href="#/privacy" className="whitespace-nowrap link-u">
            {t('footer.privacy')}
          </a>
          <button onClick={openSettings} className="whitespace-nowrap link-u text-left">
            {t('cookie.settings')}
          </button>
        </div>
      </div>
    </footer>
  );
}
