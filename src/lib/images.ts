import type { Lang } from './i18n';
import type { Product } from './products';
import { PRODUCT_SEO } from './productSeo';

/**
 * Фото товаров: уменьшенные копии для телефонов (srcset) и подписи (ALT).
 *
 * У фото из списка ниже рядом лежат копии шириной 480 и 720px (окончания -480.webp, -720.webp).
 * Телефон берёт маленькую копию, большой экран — оригинал. Добавили новое фото:
 * сделайте обе копии и допишите сюда (или не дописывайте — тогда грузится оригинал).
 */
const RESPONSIVE: Record<string, number> = {
  '/images/products/nera-denim-cardholders-gift-box.webp': 1086,
  '/images/products/nera-denim-cardholder-front.webp': 1400,
  '/images/products/nera-denim-cardholder-side.webp': 1400,
  '/images/products/paint-h-cardholder.webp': 1400,
};

/** srcset для фото (или undefined, если уменьшенной копии нет) */
export function srcSetFor(src: string): string | undefined {
  const w = RESPONSIVE[src];
  return w
    ? `${src.replace(/\.webp$/, '-480.webp')} 480w, ${src.replace(/\.webp$/, '-720.webp')} 720w, ${src} ${w}w`
    : undefined;
}

/** Плитка каталога: 2 колонки на телефоне, 4 на компьютере */
export const CARD_SIZES = '(min-width: 1024px) 25vw, 50vw';
/** Страница товара: фото на всю ширину на телефоне, половина экрана на компьютере */
export const PAGE_SIZES = '(min-width: 1024px) 50vw, 100vw';

/** Настоящее фото (а не рисунок-заглушка): только такие отдаём поисковикам картинок */
export const isPhoto = (src: string) => /\.(jpe?g|png|webp|avif)$/i.test(src);

const PHOTO: Record<Lang, string> = { ru: 'фото', uz: 'surat', en: 'photo' };

/** Подпись к фото товара: из productSeo.ts, иначе название товара. Рисунки-заглушки после первого — без подписи. */
export function altFor(p: Product, lang: Lang, i: number): string {
  const own = PRODUCT_SEO[p.id]?.[lang]?.alts?.[i];
  if (own) return own;
  const name = p[`name_${lang}`];
  const src = p.gallery[i] ?? p.image;
  if (i === 0) return name;
  return isPhoto(src) ? `${name}, ${PHOTO[lang]} ${i + 1}` : '';
}
