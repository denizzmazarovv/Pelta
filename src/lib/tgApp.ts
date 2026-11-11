import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config';

/**
 * Мини-приложение Telegram: тот же сайт, открытый кнопкой «Магазин» в боте.
 *
 * Скрипт Telegram подключает public/tg.js (только внутри Telegram). Здесь — всё, что
 * сайт делает иначе внутри Telegram: цвета шапки, кнопка «Назад» и кнопка корзины Telegram,
 * вибрация, внешние ссылки и вход без кода (Telegram подписывает, кто открыл приложение).
 */

type Button = {
  setText?: (t: string) => Button;
  setParams?: (p: Record<string, unknown>) => Button;
  show: () => void;
  hide: () => void;
  onClick: (cb: () => void) => void;
  offClick: (cb: () => void) => void;
};

type WebApp = {
  initData: string;
  initDataUnsafe?: { user?: { id: number; language_code?: string } };
  version?: string;
  platform?: string;
  isVersionAtLeast?: (v: string) => boolean;
  ready: () => void;
  expand: () => void;
  setHeaderColor?: (c: string) => void;
  setBackgroundColor?: (c: string) => void;
  setBottomBarColor?: (c: string) => void;
  disableVerticalSwipes?: () => void;
  enableClosingConfirmation?: () => void;
  disableClosingConfirmation?: () => void;
  openLink?: (url: string) => void;
  openTelegramLink?: (url: string) => void;
  requestContact?: (cb?: (sent: boolean) => void) => void;
  BackButton?: Button;
  MainButton?: Button;
  HapticFeedback?: {
    impactOccurred: (s: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred: (s: 'error' | 'success' | 'warning') => void;
    selectionChanged: () => void;
  };
};

declare global {
  interface Window {
    Telegram?: { WebApp?: WebApp };
  }
}

/** Сайт открыт как мини-приложение (есть подписанные данные запуска) */
export const tgApp: WebApp | null = (() => {
  try {
    const w = window.Telegram?.WebApp;
    return w && typeof w.initData === 'string' && w.initData.length > 0 ? w : null;
  } catch {
    return null;
  }
})();
export const inTelegram = !!tgApp;

const atLeast = (v: string) => !!tgApp?.isVersionAtLeast?.(v);

/** Язык Telegram клиента (для первого открытия, пока язык не выбран на сайте) */
export function telegramLang(): 'ru' | 'uz' | 'en' | null {
  const code = tgApp?.initDataUnsafe?.user?.language_code ?? '';
  if (code.startsWith('uz')) return 'uz';
  if (code.startsWith('ru')) return 'ru';
  return code ? 'en' : null;
}

let started = false;
/** Один раз при запуске: развернуть на весь экран, цвета бренда, внешние ссылки */
export function startTelegramApp() {
  if (!tgApp || started) return;
  started = true;
  document.documentElement.classList.add('tg-app');
  try {
    tgApp.ready();
    tgApp.expand();
    if (atLeast('6.1')) {
      tgApp.setHeaderColor?.('#E3E3E0');
      tgApp.setBackgroundColor?.('#E3E3E0');
    }
    if (atLeast('7.10')) tgApp.setBottomBarColor?.('#E3E3E0');
    // Прокрутка страницы вниз не должна закрывать магазин
    if (atLeast('7.7')) tgApp.disableVerticalSwipes?.();
  } catch {
    /* ignore */
  }

  // Ссылки на другие сайты и на Telegram открываем средствами Telegram, а не внутри магазина
  document.addEventListener(
    'click',
    (e) => {
      if (e.defaultPrevented) return;
      const a = (e.target as Element | null)?.closest?.('a');
      const raw = a?.getAttribute('href');
      if (!a || !raw || !/^(https?:)?\/\//i.test(raw)) return;
      const url = new URL(a.href);
      if (url.origin === window.location.origin) return;
      e.preventDefault();
      if (/^(t\.me|telegram\.me)$/i.test(url.hostname) && tgApp.openTelegramLink) tgApp.openTelegramLink(url.href);
      else if (tgApp.openLink) tgApp.openLink(url.href);
      else window.open(url.href, '_blank', 'noopener');
    },
    true
  );
}

/** Лёгкая вибрация (товар добавлен, кнопка нажата) */
export function haptic(kind: 'light' | 'success' | 'error' = 'light') {
  try {
    if (!tgApp?.HapticFeedback || !atLeast('6.1')) return;
    if (kind === 'light') tgApp.HapticFeedback.impactOccurred('light');
    else tgApp.HapticFeedback.notificationOccurred(kind);
  } catch {
    /* ignore */
  }
}

/** Кнопка «Назад» Telegram в шапке мини-приложения */
export function setBackButton(onBack: (() => void) | null) {
  const b = tgApp?.BackButton;
  if (!b || !atLeast('6.1')) return () => {};
  if (!onBack) {
    b.hide();
    return () => {};
  }
  b.onClick(onBack);
  b.show();
  return () => b.offClick(onBack);
}

/** Большая кнопка Telegram внизу экрана (корзина) */
export function setMainButton(text: string | null, onClick?: () => void) {
  const b = tgApp?.MainButton;
  if (!b) return () => {};
  if (!text || !onClick) {
    b.hide();
    return () => {};
  }
  b.setParams?.({ text, color: '#56172A', text_color: '#FFFFFF', is_active: true, is_visible: true });
  b.onClick(onClick);
  b.show();
  return () => b.offClick(onClick);
}

/** Попросить номер телефона: Telegram покажет окно «Поделиться номером», номер уйдёт нашему боту */
export function requestPhone(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!tgApp?.requestContact || !atLeast('6.9')) return resolve(false);
    try {
      tgApp.requestContact((sent) => resolve(!!sent));
    } catch {
      resolve(false);
    }
  });
}

export type TgLoginResult =
  | { status: 'ok'; access_token: string; refresh_token: string }
  | { status: 'need_phone' | 'no_account' | 'retry' | 'bad_auth' | 'error' };

const FN_URL = `${SUPABASE_URL}/functions/v1/send-sms-telegram`;

/**
 * Вход по подписи Telegram. create: false — только если аккаунт уже есть (тихий вход при открытии),
 * create: true — клиент сам нажал «Войти» и согласился с политикой.
 */
export async function telegramAppLogin(create: boolean): Promise<TgLoginResult> {
  if (!tgApp) return { status: 'error' };
  try {
    const res = await fetch(FN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify({ action: 'webapp', initData: tgApp.initData, create }),
    });
    const out = (await res.json()) as TgLoginResult;
    return out && typeof out.status === 'string' ? out : { status: 'error' };
  } catch {
    return { status: 'error' };
  }
}

/** Вход с запросом номера: если номера ещё нет, просим поделиться им и ждём, пока бот его сохранит */
export async function telegramAppLoginWithPhone(): Promise<TgLoginResult | { status: 'denied' }> {
  let r = await telegramAppLogin(true);
  if (r.status === 'need_phone') {
    const sent = await requestPhone();
    if (!sent) return { status: 'denied' };
    for (let i = 0; i < 8; i++) {
      await new Promise((ok) => setTimeout(ok, 1500));
      r = await telegramAppLogin(true);
      if (r.status !== 'need_phone' && r.status !== 'retry') break;
    }
  }
  for (let i = 0; i < 3 && r.status === 'retry'; i++) {
    await new Promise((ok) => setTimeout(ok, 3000));
    r = await telegramAppLogin(true);
  }
  return r;
}
