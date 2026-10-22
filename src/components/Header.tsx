import { Fragment } from 'react';
import { useLang } from '../context/LangContext';
import { useCart } from '../context/CartContext';
import { useProfile } from '../context/ProfileContext';
import { LANGS } from '../lib/i18n';
import { href, type Route } from '../lib/router';
import { findProduct } from '../lib/products';
import { Wordmark } from './Logo';

export function MenuIcon() {
  return (
    <span className="flex flex-col gap-[4px] w-[20px]" aria-hidden="true">
      <span className="h-[2.5px] bg-current rounded-full" />
      <span className="h-[2.5px] bg-current rounded-full" />
      <span className="h-[2.5px] bg-current rounded-full" />
    </span>
  );
}

function Chevron() {
  return (
    <svg width="7" height="10" viewBox="0 0 7 10" aria-hidden="true" className="mx-2.5 shrink-0">
      <path d="M1 0.8 L5.6 5 L1 9.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function useCrumbs(route: Route) {
  const { t, lang } = useLang();
  const crumbs: { label: string; to?: string }[] = [{ label: t('nav.home'), to: href.home }];
  if (route.name === 'catalog' && route.category !== 'all') {
    crumbs.push({ label: t(`cat.${route.category}`) });
  } else if (route.name === 'product') {
    const p = findProduct(route.id);
    if (p) {
      crumbs.push({ label: t(`cat.${p.category}`), to: href.category(p.category) });
      crumbs.push({ label: p[`name_${lang}`] });
    }
  } else if (route.name === 'about') {
    crumbs.push({ label: t('nav.about') });
  } else if (route.name === 'contact') {
    crumbs.push({ label: t('nav.contact') });
  } else {
    crumbs.push({ label: t('cat.all') });
  }
  return crumbs;
}

export function Header({ route, onMenu }: { route: Route; onMenu: () => void }) {
  const { t, lang, setLang } = useLang();
  const { count, open } = useCart();
  const { session, profile, openRegister } = useProfile();
  const crumbs = useCrumbs(route);

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-white pt-safe">
      <div className="relative h-header flex items-center px-4 sm:px-5">
        {/* Левая часть */}
        <div className="flex items-center min-w-0 flex-1">
          <button
            onClick={onMenu}
            className="w-9 h-9 -ml-1.5 flex items-center justify-center text-ink/80 hover:text-ink"
            aria-label={t('nav.menu')}
          >
            <MenuIcon />
          </button>
          <nav aria-label="Breadcrumb" className="hidden lg:flex items-center ml-12 nav-caps min-w-0">
            {crumbs.map((c, i) => (
              <Fragment key={i}>
                {i > 0 && <Chevron />}
                {c.to && i < crumbs.length - 1 ? (
                  <a href={c.to} className="link-u whitespace-nowrap">
                    {c.label}
                  </a>
                ) : (
                  <span className="truncate max-w-[260px]" aria-current="page">
                    {c.label}
                  </span>
                )}
              </Fragment>
            ))}
          </nav>
        </div>

        {/* Логотип по центру */}
        <a
          href={href.home}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          aria-label="Pelta Nera"
        >
          <Wordmark className="text-[28px] sm:text-[36px]" />
        </a>

        {/* Правая часть */}
        <div className="flex items-center justify-end gap-5 flex-1 nav-caps">
          <div className="hidden lg:flex items-center gap-2.5">
            {LANGS.map((l) => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                className={lang === l.code ? 'text-ink' : 'text-mute hover:text-ink'}
                aria-pressed={lang === l.code}
              >
                {l.short}
              </button>
            ))}
          </div>
          <button onClick={openRegister} className="hidden lg:block link-u max-w-[160px] truncate">
            {session ? profile?.name.split(' ')[0] || t('nav.account') : t('nav.signin')}
          </button>
          <button onClick={open} className="link-u whitespace-nowrap" aria-label={t('nav.bag')}>
            <span className="hidden sm:inline">{t('nav.bag')} </span>
            <span className="sm:hidden">
              <BagIcon />
            </span>
            <span className="hidden sm:inline">({count})</span>
            {count > 0 && <span className="sm:hidden font-mono text-[11px] align-top ml-0.5">{count}</span>}
          </button>
        </div>
      </div>
    </header>
  );
}

function BagIcon() {
  return (
    <svg width="18" height="20" viewBox="0 0 18 20" fill="none" stroke="currentColor" strokeWidth="1.4" className="inline -mt-1" aria-hidden="true">
      <path d="M1.5 6h15l-1 12.5h-13z" />
      <path d="M5.5 6V4.5a3.5 3.5 0 0 1 7 0V6" />
    </svg>
  );
}
