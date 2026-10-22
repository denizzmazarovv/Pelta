import { SHEET_URL } from './config';

export type SheetType = 'order' | 'contact' | 'register' | 'newsletter';

const WINDOW = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;

function key(type: SheetType) {
  return `pelta_sent_${type}`;
}

export function isRateLimited(type: SheetType): boolean {
  try {
    const list: number[] = JSON.parse(localStorage.getItem(key(type)) || '[]');
    return list.filter((t) => Date.now() - t < WINDOW).length >= MAX_PER_WINDOW;
  } catch {
    return false;
  }
}

function record(type: SheetType) {
  try {
    const list: number[] = JSON.parse(localStorage.getItem(key(type)) || '[]');
    const recent = list.filter((t) => Date.now() - t < WINDOW);
    recent.push(Date.now());
    localStorage.setItem(key(type), JSON.stringify(recent));
  } catch {
    /* ignore */
  }
}

/** Убирает теги и защищает таблицу от формул (=, +, -, @ в начале ячейки). */
function cleanRow(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (typeof v === 'string') {
      const s = v.replace(/<[^>]*>/g, '').trim();
      out[k] = /^[=+\-@]/.test(s) ? `'${s}` : s;
    } else {
      out[k] = v;
    }
  }
  return out;
}

/**
 * Отправляет строку в Google Таблицу через Apps Script.
 * Каждый type попадает на свой лист: Заказы, Сообщения, Клиенты, Рассылка.
 */
export async function sendToSheet(type: SheetType, data: Record<string, unknown>): Promise<void> {
  if (!SHEET_URL) throw new Error('SHEET_URL is not configured');
  await fetch(SHEET_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({
      type,
      timestamp: new Date().toISOString(),
      page: window.location.href,
      ...cleanRow(data),
    }),
  });
  record(type);
}
