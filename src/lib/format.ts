import type { Lang } from './i18n';

const CURRENCY: Record<Lang, string> = { ru: 'сум', uz: 'so‘m', en: 'UZS' };

export function formatNumber(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function formatPrice(n: number, lang: Lang): string {
  return `${formatNumber(n)} ${CURRENCY[lang]}`;
}
