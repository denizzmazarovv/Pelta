/** Уровень или роль (VIP, CEO). Чем выше rank, тем больше возможностей. */
export type Tier = {
  code: string;
  rank: number;
  title_en: string;
  title_ru: string;
  title_uz: string;
  min_orders: number | null;
  /** Процент баллов этого уровня или роли (в базе колонка называется discount_pct) */
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
  /** Баллы на счёте (1 балл = 1 сум скидки на следующий заказ) */
  points?: number;
  /** Когда баллы сгорят, если не будет новых выполненных покупок */
  points_expire_at?: string | null;
  /** Сколько процентов оплаченной суммы вернётся баллами (больший из уровня и роли) */
  points_pct?: number;
  /** Какую долю заказа можно закрыть баллами (0.5 = половину) */
  points_max_share?: number;
  done_orders: number;
  next: Tier | null;
  links: { title: string; url: string }[];
};

/** Название уровня или роли — всегда на английском, на любом языке сайта. */
export const tierTitle = (t: Tier | null | undefined) => t?.title_en ?? '';

/** Роль клиента (VIP / CEO), если назначена. */
export const roleOf = (s: MemberStatus | null | undefined): Tier | null =>
  s ? (s.role_tier !== undefined ? s.role_tier ?? null : s.tier?.badge ? s.tier : null) : null;

/** Скидок нет. Сколько процентов оплаченной суммы вернётся баллами. */
export const pointsPctOf = (s: MemberStatus | null | undefined): number => Number(s?.points_pct ?? 0) || 0;

/** Баллы на счёте клиента. */
export const pointsOf = (s: MemberStatus | null | undefined): number => Math.max(0, Math.floor(Number(s?.points ?? 0) || 0));

/** Сколько баллов можно списать в заказе на сумму total (как на сервере). */
export const maxPointsFor = (s: MemberStatus | null | undefined, total: number): number =>
  Math.max(0, Math.min(pointsOf(s), Math.floor(total * (Number(s?.points_max_share ?? 0.5) || 0))));
