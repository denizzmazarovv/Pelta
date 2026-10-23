import { createContext, useCallback, useContext, useState, ReactNode } from 'react';

/**
 * Согласие на cookies.
 * necessary — всегда (корзина, язык, вход, защита форм).
 * optional — аналитика/маркетинг. Сейчас на сайте их нет; если добавите,
 * подключайте их только когда consent.optional === true.
 */
export type Consent = { optional: boolean; date: string; v: 1 };

const KEY = 'pelta_consent';

function load(): Consent | null {
  try {
    const raw = localStorage.getItem(KEY);
    const c = raw ? (JSON.parse(raw) as Consent) : null;
    return c && c.v === 1 ? c : null;
  } catch {
    return null;
  }
}

type Ctx = {
  consent: Consent | null;
  bannerOpen: boolean;
  choose: (optional: boolean) => void;
  openSettings: () => void;
};

const ConsentContext = createContext<Ctx | null>(null);

export function ConsentProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<Consent | null>(load);
  const [bannerOpen, setBannerOpen] = useState(() => load() === null);

  const choose = useCallback((optional: boolean) => {
    const c: Consent = { optional, date: new Date().toISOString(), v: 1 };
    setConsent(c);
    setBannerOpen(false);
    try {
      localStorage.setItem(KEY, JSON.stringify(c));
    } catch {
      /* ignore */
    }
  }, []);

  const openSettings = useCallback(() => setBannerOpen(true), []);

  return (
    <ConsentContext.Provider value={{ consent, bannerOpen, choose, openSettings }}>{children}</ConsentContext.Provider>
  );
}

export function useConsent() {
  const ctx = useContext(ConsentContext);
  if (!ctx) throw new Error('useConsent must be used within ConsentProvider');
  return ctx;
}
