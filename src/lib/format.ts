import type { Lang } from './i18n';

/** 1 234 — пробел между тысячами. */
export function formatNumber(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/** Валюта: цены на сайте только в сумах (закон о валютном регулировании). */
export const CURRENCY: Record<Lang, string> = { ru: 'сум', uz: 'so‘m', en: 'UZS' };

/** Цена в сумах: «710 000 сум». */
export function formatPrice(n: number, lang: Lang = 'ru'): string {
  return `${formatNumber(n)} ${CURRENCY[lang]}`;
}
