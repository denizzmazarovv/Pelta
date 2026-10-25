import { supabase } from './supabase';
import { GOOGLE_CART_URL, GOOGLE_CONTACT_URL } from './config';
import type { Lang } from './i18n';

/**
 * Заказы и сообщения уходят в Telegram-канал через ваши Google Apps Script
 * (как раньше), и параллельно сохраняются в Supabase, если таблицы уже созданы.
 * Подписки на рассылку — только в Supabase.
 */

type Kind = 'order' | 'contact' | 'newsletter';

const WINDOW = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;

export function isRateLimited(kind: Kind): boolean {
  try {
    const list: number[] = JSON.parse(localStorage.getItem(`pelta_sent_${kind}`) || '[]');
    return list.filter((t) => Date.now() - t < WINDOW).length >= MAX_PER_WINDOW;
  } catch {
    return false;
  }
}

function record(kind: Kind) {
  try {
    const key = `pelta_sent_${kind}`;
    const list: number[] = JSON.parse(localStorage.getItem(key) || '[]');
    const recent = list.filter((t) => Date.now() - t < WINDOW);
    recent.push(Date.now());
    localStorage.setItem(key, JSON.stringify(recent));
  } catch {
    /* ignore */
  }
}

export class RateLimitError extends Error {
  constructor() {
    super('rate_limited');
  }
}

const clean = (s: string | undefined | null) => {
  const v = (s ?? '').replace(/<[^>]*>/g, '').trim();
  return v || null;
};

async function insert(table: string, row: Record<string, unknown>, kind: Kind, ignoreDuplicate = false) {
  if (!supabase) throw new Error('not_configured');
  const { error } = await supabase.from(table).insert(row);
  if (error) {
    if (ignoreDuplicate && error.code === '23505') return record(kind);
    if (error.message?.includes('rate_limited')) throw new RateLimitError();
    throw new Error(error.message);
  }
  record(kind);
}

export type OrderItem = { id: string; name: string; color: string; quantity: number; price: number };

/** Отправка в Google Apps Script → Telegram. no-cors: ответ не читается, ошибка только при сбое сети. */
async function toGoogle(url: string, body: string, contentType: string) {
  if (!url) throw new Error('not_configured');
  await fetch(url, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': contentType }, body });
}

/** Копия в Supabase: не мешает отправке, если база ещё не настроена. */
async function toSupabase(table: string, row: Record<string, unknown>) {
  try {
    if (supabase) await supabase.from(table).insert(row);
  } catch {
    /* ignore */
  }
}

/** Тип устройства без лишних подробностей (для удобства ответа). */
function deviceType(): string {
  const ua = navigator.userAgent;
  if (/iPad/i.test(ua) || (/Mac/i.test(navigator.platform) && navigator.maxTouchPoints > 1)) return 'iPad';
  if (/iPhone|iPod/i.test(ua)) return 'iPhone';
  if (/Android/i.test(ua)) return /Mobi/i.test(ua) ? 'Android phone' : 'Android tablet';
  if (/Windows/i.test(ua)) return 'Windows PC';
  if (/Mac/i.test(ua)) return 'Mac';
  return /Mobi/i.test(ua) ? 'Mobile' : 'Desktop';
}

export class NameRequiredError extends Error {
  constructor() {
    super('name_required');
  }
}

export class ItemsUnavailableError extends Error {
  constructor() {
    super('items_unavailable');
  }
}

export class AuthRequiredError extends Error {
  constructor() {
    super('auth_required');
  }
}

/**
 * Заказ принимают только от вошедших клиентов: скрипт Google проверяет токен входа
 * в Supabase и берёт номер из подтверждённого аккаунта, а не из формы.
 */
export async function saveOrder(o: {
  name: string;
  phone: string;
  accessToken: string;
  telegram?: string;
  email?: string;
  userId?: string;
  address: string;
  comment?: string;
  items: OrderItem[];
  total: number;
  lang: Lang;
}) {
  const payload = {
    timestamp: new Date().toISOString(),
    user_id: o.userId ?? '',
    user_email: o.email ?? '',
    customer_name: clean(o.name) ?? '',
    phone: clean(o.phone) ?? '',
    telegram: o.telegram ?? '',
    address: clean(o.address) ?? '',
    // Ник Telegram/Instagram дублируем в комментарий, чтобы он точно был виден в канале
    comment: [o.telegram ? `Telegram/Instagram: ${o.telegram}` : '', clean(o.comment) ?? ''].filter(Boolean).join(' | '),
    total: Math.round(o.total),
    items: o.items.map((i) => ({ ...i, subtotal: i.price * i.quantity })),
    items_summary: o.items.map((i) => `${i.name} (${i.color}) ×${i.quantity} = ${i.price * i.quantity}`).join('; '),
  };
  if (!o.accessToken) throw new AuthRequiredError();
  if (!GOOGLE_CART_URL) throw new Error('not_configured');
  // text/plain — без предварительного CORS-запроса; ответ скрипта читается
  const res = await fetch(GOOGLE_CART_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ ...payload, lang: o.lang, access_token: o.accessToken }),
  });
  const out = (await res.json().catch(() => null)) as { status?: string; code?: string } | null;
  if (out?.status !== 'ok') {
    if (out?.code === 'auth') throw new AuthRequiredError();
    if (out?.code === 'rate') throw new RateLimitError();
    if (out?.code === 'name') throw new NameRequiredError();
    if (out?.code === 'items') throw new ItemsUnavailableError();
    throw new Error(out?.code || 'order_failed');
  }
  record('order');
  // Запись заказа в базу делает сервер (pn_create_order): там же считаются цены и скидка
}

export async function saveMessage(m: { name: string; phone?: string; email?: string; message: string; lang: Lang }) {
  const form = new URLSearchParams();
  form.append('name', clean(m.name) ?? '');
  form.append('phone', clean(m.phone) ?? '');
  form.append('email', clean(m.email) ?? '');
  form.append('message', clean(m.message) ?? '');
  form.append('device', deviceType());
  await toGoogle(GOOGLE_CONTACT_URL, form.toString(), 'application/x-www-form-urlencoded');
  record('contact');
  await toSupabase('pn_contact_messages', {
    name: clean(m.name),
    phone: clean(m.phone),
    email: clean(m.email),
    message: clean(m.message),
    lang: m.lang,
  });
}

export function subscribe(email: string, prefs: string[], lang: Lang) {
  // Повторная подписка того же email — не ошибка
  return insert('pn_newsletter', { email: clean(email), prefs, lang }, 'newsletter', true);
}
