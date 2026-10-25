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
  /** Уровень по выполненным покупкам: Member / Silver / Gold / Brilliant */
  tier: Tier | null;
  role: string | null;
  /** Роль VIP / CEO — назначается вручную, от покупок не зависит */
  role_tier?: Tier | null;
  /** Итоговая скидка: большая из скидки уровня и роли */
  discount_pct?: number;
  done_orders: number;
  next: Tier | null;
  links: { title: string; url: string }[];
};

/** Название уровня или роли — всегда на английском, на любом языке сайта. */
export const tierTitle = (t: Tier | null | undefined) => t?.title_en ?? '';

/** Роль клиента (VIP / CEO), если назначена. */
export const roleOf = (s: MemberStatus | null | undefined): Tier | null =>
  s ? (s.role_tier !== undefined ? s.role_tier ?? null : s.tier?.badge ? s.tier : null) : null;

/** Итоговая скидка клиента в процентах. */
export const discountOf = (s: MemberStatus | null | undefined): number =>
  Number(s?.discount_pct ?? s?.tier?.discount_pct ?? 0) || 0;

/** Цена со скидкой уровня: округление до целого, как на сервере. */
export const discounted = (price: number, pct: number) => (pct > 0 ? Math.round((price * (100 - pct)) / 100) : price);
