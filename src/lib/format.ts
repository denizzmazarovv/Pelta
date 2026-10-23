import type { Lang } from './i18n';

/** 1 234 — пробел между тысячами. */
export function formatNumber(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/** Цена в долларах США: просто число, без знака и без валюты (например, «60»). */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function formatPrice(n: number, _lang?: Lang): string {
  return formatNumber(n);
}
