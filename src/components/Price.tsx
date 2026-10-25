import { formatNumber } from '../lib/format';

/** Цена: со скидкой уровня — новая цена и зачёркнутая старая. */
export function Price({ base, final, className = '' }: { base: number; final: number; className?: string }) {
  if (final >= base) return <span className={className}>{formatNumber(base)}</span>;
  return (
    <span className={className}>
      {formatNumber(final)}{' '}
      <s className="text-ink/40" aria-label={`${formatNumber(base)}`}>
        {formatNumber(base)}
      </s>
    </span>
  );
}
