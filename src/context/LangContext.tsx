import { createContext, useCallback, useContext, useEffect, ReactNode } from 'react';
import { installRouter, navigate, usePath } from '../lib/router';
import { parsePath, withLang } from '../lib/paths';
import { Lang, translations } from '../lib/i18n';

type LangContextType = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
};

const LangContext = createContext<LangContextType | undefined>(undefined);

// Выбор посетителя запоминаем. Новый ключ, чтобы старое автосохранение 'ru' не мешало.
const KEY = 'pelta_lang_v2';
const isLang = (v: unknown): v is Lang => v === 'ru' || v === 'uz' || v === 'en';

/**
 * Язык задаётся адресом: /… — английский, /ru/… — русский, /uz/… — узбекский.
 * Так поисковики видят каждую страницу на каждом языке.
 *
 * При открытии сайта адрес без языка может смениться на язык посетителя:
 * 1) ссылка с ?lang=uz|ru|en (старая пересылка с peltanera.uz; лучше пересылать сразу на https://peltanera.com/uz/);
 * 2) сайт открыт прямо на домене .uz;
 * 3) язык, который посетитель выбрал раньше.
 */
let booted = false;
function bootLang() {
  if (booted) return;
  booted = true;
  try {
    installRouter();
    const url = new URL(window.location.href);
    const parsed = parsePath(url.pathname);
    let target: Lang | null = null;
    const fromUrl = url.searchParams.get('lang');
    if (fromUrl !== null) url.searchParams.delete('lang');
    if (isLang(fromUrl)) target = fromUrl;
    else if (!parsed.prefixed) {
      if (/\.uz$/i.test(window.location.hostname)) target = 'uz';
      else {
        const saved = localStorage.getItem(KEY);
        if (isLang(saved)) target = saved;
      }
    }
    const path = target && target !== parsed.lang ? withLang(url.pathname, target) : url.pathname;
    const next = path + url.search + url.hash;
    if (next !== window.location.pathname + window.location.search + window.location.hash) {
      history.replaceState(null, '', next);
    }
  } catch {
    /* ignore */
  }
}

export function LangProvider({ children }: { children: ReactNode }) {
  bootLang();
  const path = usePath();
  const lang = parsePath(path).lang;

  useEffect(() => {
    try {
      localStorage.setItem(KEY, lang);
    } catch {
      /* ignore */
    }
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    navigate(withLang(window.location.pathname, l) + window.location.search + window.location.hash);
  }, []);

  const t = useCallback((key: string) => translations[lang][key] ?? translations.en[key] ?? key, [lang]);

  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be used within LangProvider');
  return ctx;
}
