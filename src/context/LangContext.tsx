import { createContext, useCallback, useContext, useState, useEffect, ReactNode } from 'react';
import { Lang, translations } from '../lib/i18n';

type LangContextType = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
};

const LangContext = createContext<LangContextType | undefined>(undefined);

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem('pelta_lang');
    if (saved === 'ru' || saved === 'uz' || saved === 'en') return saved;
  } catch {
    /* ignore */
  }
  return 'ru';
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(initialLang);

  useEffect(() => {
    try {
      localStorage.setItem('pelta_lang', lang);
    } catch {
      /* ignore */
    }
    document.documentElement.lang = lang;
  }, [lang]);

  const t = useCallback((key: string) => translations[lang][key] ?? translations.ru[key] ?? key, [lang]);

  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be used within LangProvider');
  return ctx;
}
