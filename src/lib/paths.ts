import type { Category } from './products';
import type { Lang } from './i18n';

/**
 * Адреса страниц. Без React — используется и сайтом, и сборкой (sitemap, страницы для поисковиков).
 *
 * Английский — основной язык, без приставки:  /  /c/bag  /p/ch-01  /about  /contact  /privacy
 * Русский и узбекский — с приставкой:          /ru/  /ru/c/bag  /uz/p/ch-01 …
 */

export type Route =
  | { name: 'catalog'; category: Category | 'all' }
  | { name: 'product'; id: string }
  | { name: 'about' }
  | { name: 'contact' }
  | { name: 'privacy' };

export const LANG_CODES: Lang[] = ['en', 'ru', 'uz'];
export const DEFAULT_LANG: Lang = 'en';
const PREFIXED: Lang[] = ['ru', 'uz'];
const CATS = ['cardholder', 'keychain', 'bag', 'belt', 'exclusive'];

export type ParsedPath = {
  lang: Lang;
  /** В адресе есть /ru или /uz */
  prefixed: boolean;
  route: Route;
  /** /login — ссылка «Вернуться на сайт» из Telegram-бота */
  login: boolean;
};

/** Разделить адрес на язык и остальную часть: /ru/p/ch-01 → ['ru', '/p/ch-01'] */
export function splitLang(pathname: string): [Lang | null, string] {
  const m = pathname.match(/^\/(ru|uz)(?=\/|$)(.*)$/);
  if (m) return [m[1] as Lang, m[2] || '/'];
  return [null, pathname || '/'];
}

export function parsePath(pathname: string): ParsedPath {
  const [prefix, rest] = splitLang(pathname);
  const parts = rest
    .replace(/\.html$/, '')
    .split('/')
    .filter(Boolean);
  const lang = prefix ?? DEFAULT_LANG;
  const base = { lang, prefixed: !!prefix, login: parts[0] === 'login' };
  if (parts[0] === 'p' && parts[1]) return { ...base, route: { name: 'product', id: decodeURIComponent(parts[1]) } };
  if (parts[0] === 'c' && parts[1] && CATS.includes(parts[1]))
    return { ...base, route: { name: 'catalog', category: parts[1] as Category } };
  if (parts[0] === 'about') return { ...base, route: { name: 'about' } };
  if (parts[0] === 'contact') return { ...base, route: { name: 'contact' } };
  if (parts[0] === 'privacy') return { ...base, route: { name: 'privacy' } };
  return { ...base, route: { name: 'catalog', category: 'all' } };
}

export const langPrefix = (lang: Lang) => (PREFIXED.includes(lang) ? `/${lang}` : '');

/** Адрес страницы на нужном языке */
export function pathFor(route: Route, lang: Lang): string {
  const p = langPrefix(lang);
  switch (route.name) {
    case 'catalog':
      return route.category === 'all' ? `${p}/` : `${p}/c/${route.category}`;
    case 'product':
      return `${p}/p/${encodeURIComponent(route.id)}`;
    default:
      return `${p}/${route.name}`;
  }
}

/** Тот же адрес на другом языке (работает и для неизвестных адресов) */
export function withLang(pathname: string, lang: Lang): string {
  const rest = splitLang(pathname)[1];
  const p = langPrefix(lang);
  return rest === '/' ? `${p}/` : `${p}${rest}`;
}

/** Старые ссылки вида /#/p/ch-01 → /p/ch-01 */
export function hashToPath(hash: string): string | null {
  if (!/^#\/./.test(hash) && hash !== '#/') return null;
  const h = hash.slice(1);
  return h || '/';
}
