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

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'ru' || saved === 'uz' || saved === 'en') return saved;
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
