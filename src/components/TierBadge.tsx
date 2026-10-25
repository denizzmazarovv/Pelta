import type { Tier } from '../lib/tiers';

/** Значок роли у ника: галочка + VIP / CEO. */
export function TierBadge({ tier, className = '' }: { tier: Tier | null | undefined; className?: string }) {
  if (!tier?.badge) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 h-[18px] px-1.5 rounded-full bg-ink text-white font-mono text-[10px] leading-none uppercase tracking-[0.04em] align-middle ${className}`}
      title={tier.title_en}
    >
      <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden="true">
        <path d="M1.5 5.3 L4 7.6 L8.6 2.4" fill="none" stroke="currentColor" strokeWidth="1.6" />
      </svg>
      {tier.code}
    </span>
  );
}
