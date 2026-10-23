/**
 * Строгая проверка полей формы заказа.
 * Принцип: разрешаем только нужные символы (белый список), всё остальное отбрасываем.
 * Это защищает от HTML/JS-инъекций (<script>, onerror=), шаблонных ($, {, }),
 * формул в таблицах (=, +, @ в начале), разметки Telegram (*, _, `, [ ]) и мусора (~, |, ^, \).
 */

export const LIMITS = { name: 20, telegram: 30, address: 200, comment: 300 } as const;

// Невидимые и управляющие символы (в т.ч. RTL-override, zero-width) — всегда удаляем
/* eslint-disable no-control-regex -- намеренно удаляем управляющие символы */
const INVISIBLE = new RegExp(
  '[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F-\\u009F\\u200B-\\u200F\\u202A-\\u202E\\u2060-\\u2064\\uFEFF]',
  'g'
);
/* eslint-enable no-control-regex */

const collapse = (s: string) => s.replace(/\s+/g, ' ');

/** Имя: только буквы (любой алфавит), пробел, дефис, апостроф. До 20 символов. */
export function filterName(raw: string): string {
  return collapse(raw.normalize('NFC').replace(INVISIBLE, '').replace(/[^\p{L}\p{M}\s'’‘ʼ-]/gu, '')).slice(0, LIMITS.name);
}
export function validName(v: string): boolean {
  const s = v.trim();
  return s.length >= 2 && s.length <= LIMITS.name && /^\p{L}[\p{L}\p{M}\s'’‘ʼ-]*$/u.test(s);
}

/** Телефон: при вводе — только цифры, пробелы, «+», скобки и дефис. */
export function filterPhone(raw: string): string {
  return raw.replace(INVISIBLE, '').replace(/[^\d+\s()-]/g, '').replace(/(?!^)\+/g, '').slice(0, 20);
}
/**
 * Приводит телефон к виду +998XXXXXXXXX.
 * Принимает: +998 90 999 77 88, 998909997788, 90 999 77 88, 909997788.
 * Иностранный номер с «+» (10–15 цифр) тоже принимаем как есть.
 */
export function normalizePhone(v: string): string | null {
  const plus = v.trim().startsWith('+');
  const d = v.replace(/\D/g, '');
  if (d.length === 9) return `+998${d}`;
  if (d.length === 12 && d.startsWith('998')) return `+${d}`;
  if (plus && d.length >= 10 && d.length <= 15) return `+${d}`;
  return null;
}

/**
 * Ник в Telegram или Instagram (без «@» — он стоит перед полем).
 * Разрешены латиница, цифры, «_» и «.», до 30 символов. Поле необязательное.
 * Ссылки t.me/… и instagram.com/… превращаются в ник.
 */
export function filterHandle(raw: string): string {
  return raw
    .replace(INVISIBLE, '')
    .trim()
    .replace(/^(https?:\/\/)?(www\.)?(t\.me|telegram\.me|instagram\.com)\//i, '')
    .replace(/[/?#].*$/, '')
    .replace(/^@+/, '')
    .replace(/[^A-Za-z0-9._]/g, '')
    .slice(0, LIMITS.telegram);
}
/** '' — не заполнено; null — неверный формат; иначе «@ник». */
export function normalizeHandle(v: string): string | null {
  const u = filterHandle(v);
  if (!u) return '';
  if (u.length < 2 || /^\./.test(u) || /\.$/.test(u) || u.includes('..')) return null;
  return '@' + u;
}

/** Адрес и комментарий: обычный текст. Убираем опасные и служебные символы, оставляя буквы, цифры и пунктуацию. */
const TEXT_ALLOWED = /[^\p{L}\p{M}\p{N}\s.,:;!?()'"’‘«»№#/+\-–—]/gu;
export function filterText(raw: string, max: number): string {
  return raw.normalize('NFC').replace(INVISIBLE, '').replace(TEXT_ALLOWED, '').replace(/[ \t]{2,}/g, ' ').slice(0, max);
}
/** Финальная очистка перед отправкой: схлопываем пробелы, защищаем от формул в таблице. */
export function finalText(v: string, max: number): string {
  let s = collapse(filterText(v, max)).trim();
  while (/^[=+\-@]/.test(s)) s = s.slice(1).trim();
  return s.slice(0, max);
}
