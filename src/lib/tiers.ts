import type { Lang } from './i18n';

/** Уровень или роль (VIP, CEO). Чем выше rank, тем больше возможностей. */
export type Tier = {
  code: string;
  rank: number;
  title_en: string;
  title_ru: string;
  title_uz: string;
  min_orders: number | null;
  discount_pct: number;
  badge: boolean;
};

/** Статус клиента: считается на сервере (pn_my_status), подделать с сайта нельзя. */
export type MemberStatus = {
  rank: number;
  tier: Tier | null;
  role: string | null;
  done_orders: number;
  next: Tier | null;
  links: { title: string; url: string }[];
};

export const tierTitle = (t: Tier | null | undefined, lang: Lang) => (t ? t[`title_${lang}`] || t.title_en : '');

/** Цена со скидкой уровня: округление до целого, как на сервере. */
export const discounted = (price: number, pct: number) => (pct > 0 ? Math.round((price * (100 - pct)) / 100) : price);
