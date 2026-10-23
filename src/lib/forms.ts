import { supabase } from './supabase';
import type { Lang } from './i18n';

/**
 * Заказы, сообщения и подписки сохраняются в Supabase.
 * Сайт может только добавлять строки; читать их можно только в панели Supabase.
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

export function saveOrder(o: {
  name: string;
  phone: string;
  email?: string;
  address: string;
  comment?: string;
  items: OrderItem[];
  total: number;
  lang: Lang;
}) {
  return insert(
    'orders',
    {
      name: clean(o.name),
      phone: clean(o.phone),
      email: clean(o.email),
      address: clean(o.address),
      comment: clean(o.comment),
      items: o.items,
      total: Math.round(o.total),
      lang: o.lang,
    },
    'order'
  );
}

export function saveMessage(m: { name: string; phone?: string; email?: string; message: string; lang: Lang }) {
  return insert(
    'contact_messages',
    { name: clean(m.name), phone: clean(m.phone), email: clean(m.email), message: clean(m.message), lang: m.lang },
    'contact'
  );
}

export function subscribe(email: string, prefs: string[], lang: Lang) {
  // Повторная подписка того же email — не ошибка
  return insert('newsletter_subscribers', { email: clean(email), prefs, lang }, 'newsletter', true);
}
