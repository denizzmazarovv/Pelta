import { formatNumber, CURRENCY } from '../lib/format';
import { useLang } from '../context/LangContext';

/** Цена в сумах: со скидкой уровня — новая цена и зачёркнутая старая. */
export function Price({ base, final, className = '' }: { base: number; final: number; className?: string }) {
  const { lang } = useLang();
  const cur = CURRENCY[lang];
  if (final >= base)
    return (
      <span className={className}>
        {formatNumber(base)} {cur}
      </span>
    );
  return (
    <span className={className}>
      {formatNumber(final)} {cur}{' '}
      <s className="text-mute" aria-label={`${formatNumber(base)} ${cur}`}>
        {formatNumber(base)}
      </s>
    </span>
  );
}
