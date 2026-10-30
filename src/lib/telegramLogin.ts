import { SUPABASE_ANON_KEY, SUPABASE_URL, TELEGRAM_BOT_USERNAME } from './config';

/**
 * Вход через Telegram-бота в одно касание.
 *
 * Сайт создаёт секретный одноразовый ключ (32 случайных байта) и открывает бота
 * ссылкой t.me/<бот>?start=L_<ключ>. Клиент в боте делится номером (первый раз)
 * или нажимает «✅ Войти на сайт». Сайт в это время спрашивает сервер по ключу и,
 * как только вход подтверждён, получает сессию. Ключ живёт 10 минут и срабатывает один раз.
 *
 * Защита от входа по чужой ссылке: сайт показывает проверочное число (из ключа), и в боте
 * нужно нажать то же число. Человек, которому прислали чужую ссылку, этого числа не видит.
 */

const KEY = 'pelta_tg_login';
const TTL = 10 * 60 * 1000;
const FN_URL = `${SUPABASE_URL}/functions/v1/send-sms-telegram`;

export const telegramEnabled = !!TELEGRAM_BOT_USERNAME;
export const isNonce = (s: string | null | undefined): s is string => !!s && /^[A-Za-z0-9_-]{40,60}$/.test(s);

function newNonce(): string {
  const b = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function saveNonce(nonce: string) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ nonce, at: Date.now() }));
  } catch {
    /* ignore */
  }
}

export function loadNonce(): string | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null') as { nonce?: string; at?: number } | null;
    return v && isNonce(v.nonce) && Date.now() - (v.at ?? 0) < TTL ? v.nonce : null;
  } catch {
    return null;
  }
}

export function clearNonce() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export const botLink = (nonce?: string | null) =>
  `https://t.me/${TELEGRAM_BOT_USERNAME}${nonce ? `?start=L_${nonce}` : ''}`;

/**
 * Начать вход: создать ключ и открыть бота. Вызывать прямо из обработчика нажатия,
 * иначе браузер может заблокировать открытие новой вкладки.
 */
export function startTelegramLogin(): string {
  const nonce = newNonce();
  saveNonce(nonce);
  window.open(botLink(nonce), '_blank', 'noopener');
  return nonce;
}

/** Проверочное число 10–99 из ключа входа (бот считает его так же). */
export async function checkNumber(nonce: string): Promise<number> {
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(nonce)));
  return ((d[0] * 256 + d[1]) % 90) + 10;
}

/** Удаление аккаунта: бот стирает связь номера с Telegram. Ошибка не мешает удалению. */
export async function forgetTelegram(accessToken: string): Promise<void> {
  try {
    await fetch(`${FN_URL}?action=forget`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${accessToken}` },
      body: '{}',
    });
  } catch {
    /* ignore */
  }
}

export type ClaimResult =
  | { status: 'ok'; access_token: string; refresh_token: string }
  | { status: 'waiting' | 'retry' | 'used' | 'expired' | 'rejected' | 'error' };

export async function claimTelegramLogin(nonce: string): Promise<ClaimResult> {
  try {
    const res = await fetch(FN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify({ action: 'claim', nonce }),
    });
    const out = (await res.json()) as ClaimResult;
    return out && typeof out.status === 'string' ? out : { status: 'error' };
  } catch {
    return { status: 'error' };
  }
}
