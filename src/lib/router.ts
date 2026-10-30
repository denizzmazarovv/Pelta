import { useEffect, useMemo, useSyncExternalStore } from 'react';
import type { Category } from './products';
import type { Lang } from './i18n';
import { hashToPath, parsePath, pathFor, type Route } from './paths';
import { showHeader } from './useHeaderHidden';

export type { Route } from './paths';

/**
 * Обычные адреса страниц (без #), чтобы поисковики видели каждую страницу отдельно.
 * Переходы по ссылкам внутри сайта — без перезагрузки (History API).
 */

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export const currentPath = () => window.location.pathname;
export const currentLang = (): Lang => parsePath(window.location.pathname).lang;

export function navigate(to: string, opts: { replace?: boolean } = {}) {
  const now = window.location.pathname + window.location.search + window.location.hash;
  if (to === now) return;
  if (opts.replace) history.replaceState(null, '', to);
  else history.pushState(null, '', to);
  emit();
}

let installed = false;

/** Один раз при запуске: старые ссылки с # и перехват кликов по внутренним ссылкам */
export function installRouter() {
  if (installed) return;
  installed = true;

  // Старые ссылки: /#/p/ch-01, /#/login?tg=… (кнопка из Telegram-бота)
  const fromHash = hashToPath(window.location.hash);
  if (fromHash) {
    const target = fromHash.includes('?') ? fromHash : fromHash + window.location.search;
    history.replaceState(null, '', target);
  }

  window.addEventListener('popstate', emit);

  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as Element | null)?.closest?.('a');
    if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
    const raw = a.getAttribute('href');
    if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return;
    const url = new URL(a.href);
    if (url.origin !== window.location.origin) return;
    e.preventDefault();
    navigate(url.pathname + url.search + url.hash);
  });
}

/** Текущий адрес (pathname) — перерисовка при каждом переходе */
export function usePath(): string {
  return useSyncExternalStore(subscribe, currentPath, currentPath);
}

export function useRoute(): Route {
  const path = usePath();
  useEffect(() => {
    window.scrollTo(0, 0);
    showHeader();
  }, [path]);
  return useMemo(() => parsePath(path).route, [path]);
}

export { subscribe as subscribeLocation };

/** Ссылки на страницы — на текущем языке посетителя */
export const href = {
  get home() {
    return pathFor({ name: 'catalog', category: 'all' }, currentLang());
  },
  category: (c: Category | 'all') => pathFor({ name: 'catalog', category: c }, currentLang()),
  product: (id: string) => pathFor({ name: 'product', id }, currentLang()),
  get about() {
    return pathFor({ name: 'about' }, currentLang());
  },
  get contact() {
    return pathFor({ name: 'contact' }, currentLang());
  },
  get terms() {
    return pathFor({ name: 'terms' }, currentLang());
  },
  get privacy() {
    return pathFor({ name: 'privacy' }, currentLang());
  },
};
