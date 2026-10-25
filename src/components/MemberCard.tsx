import { useLang } from '../context/LangContext';
import { useProfile } from '../context/ProfileContext';
import { useCatalog } from '../context/CatalogContext';
import { href } from '../lib/router';
import { tierTitle } from '../lib/tiers';
import { TierBadge } from './TierBadge';

/** Уровень клиента в профиле: скидка, покупки, прогресс до следующего уровня, закрытые ссылки. */
export function MemberCard({ onNavigate }: { onNavigate?: () => void }) {
  const { t, lang } = useLang();
  const { status } = useProfile();
  const { categories } = useCatalog();
  if (!status?.tier) return null;

  const done = status.done_orders ?? 0;
  const pct = Number(status.tier.discount_pct) || 0;
  const next = status.next;
  const need = next?.min_orders != null ? Math.max(0, next.min_orders - done) : 0;
  const progress = next?.min_orders ? Math.min(100, Math.round((done / next.min_orders) * 100)) : 100;

  return (
    <section className="border border-ink/15 p-4 space-y-4" aria-label={t('tier.your_level')}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="field-label">{t('tier.your_level')}</p>
          <p className="font-mono text-[16px] flex items-center gap-2 mt-1">
            {status.tier.badge ? <TierBadge tier={status.tier} className="!h-[22px] !text-[12px] !px-2" /> : tierTitle(status.tier, lang)}
          </p>
        </div>
        {pct > 0 && (
          <div className="text-right">
            <p className="field-label">{t('tier.discount')}</p>
            <p className="font-mono text-[16px] mt-1">−{pct}%</p>
          </div>
        )}
      </div>

      <p className="font-mono text-[12px] text-ink/70">
        {t('tier.purchases')}: {done}
      </p>

      {next && (
        <div>
          <div className="h-[3px] bg-ink/10" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full bg-ink transition-[width] duration-500" style={{ width: `${progress}%` }} />
          </div>
          <p className="font-mono text-[11px] text-ink/60 mt-2">
            {t('tier.to_next').replace('{n}', String(need)).replace('{level}', tierTitle(next, lang))}
            {Number(next.discount_pct) > 0 ? ` (−${Number(next.discount_pct)}%)` : ''}
          </p>
        </div>
      )}
      <p className="font-mono text-[10.5px] text-mute leading-[1.5]">{t('tier.how')}</p>

      {(status.links?.length > 0 || categories.includes('exclusive')) && (
        <div className="space-y-2 pt-1">
          <p className="field-label">{t('tier.private')}</p>
          {categories.includes('exclusive') && (
            <a href={href.category('exclusive')} onClick={onNavigate} className="btn-line !h-9 !text-[12px]">
              {t('cat.exclusive')}
            </a>
          )}
          {status.links.map((l) => (
            <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="btn-ink !h-9 !text-[12px]">
              {l.title}
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
