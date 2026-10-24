import { createContext, useCallback, useContext, useState, useEffect, ReactNode } from 'react';
import { Lang, translations } from '../lib/i18n';

type LangContextType = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
};

const LangContext = createContext<LangContextType | undefined>(undefined);

// Основной язык — английский. Новый ключ, чтобы старое автосохранение 'ru' не мешало.
const KEY = 'pelta_lang_v2';
const isLang = (v: unknown): v is Lang => v === 'ru' || v === 'uz' || v === 'en';

/**
 * Язык при открытии:
 * 1) ссылка с ?lang=uz|ru|en (так открывается peltanera.uz — пересылка на peltanera.com/?lang=uz);
 * 2) сайт открыт прямо на домене .uz;
 * 3) язык, который посетитель выбрал раньше;
 * 4) английский.
 */
function initialLang(): Lang {
  try {
    const url = new URL(window.location.href);
    const fromUrl = url.searchParams.get('lang');
    if (isLang(fromUrl)) {
      url.searchParams.delete('lang');
      history.replaceState(null, '', url.pathname + url.search + url.hash);
      return fromUrl;
    }
    if (/\.uz$/i.test(window.location.hostname)) return 'uz';
    const saved = localStorage.getItem(KEY);
    if (isLang(saved)) return saved;
  } catch {
    /* ignore */
  }
  return 'en';
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(initialLang);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, lang);
    } catch {
      /* ignore */
    }
    document.documentElement.lang = lang;
  }, [lang]);

  const t = useCallback((key: string) => translations[lang][key] ?? translations.en[key] ?? key, [lang]);

  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be used within LangProvider');
  return ctx;
}
