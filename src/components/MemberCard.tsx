import { useState } from 'react';
import { useLang } from '../context/LangContext';
import { useProfile } from '../context/ProfileContext';
import { useCatalog } from '../context/CatalogContext';
import { href } from '../lib/router';
import { tierTitle } from '../lib/tiers';
import { TierBadge } from './TierBadge';

/**
 * Привилегии клиента в профиле: скрыты за кнопкой. Внутри — статус, скидка,
 * прогресс и, для VIP / CEO, ссылка на закрытый Telegram-канал (её отдаёт только сервер).
 */
export function MemberCard({ onNavigate }: { onNavigate?: () => void }) {
  const { t, lang } = useLang();
  const { status } = useProfile();
  const { categories } = useCatalog();
  const [open, setOpen] = useState(false);
  if (!status?.tier) return null;

  const tier = status.tier;
  const done = status.done_orders ?? 0;
  const pct = Number(tier.discount_pct) || 0;
  const next = status.next;
  const need = next?.min_orders != null ? Math.max(0, next.min_orders - done) : 0;
  const progress = next?.min_orders ? Math.min(100, Math.round((done / next.min_orders) * 100)) : 100;
  const isRole = tier.min_orders == null;
  const hasPrivate = status.links?.length > 0 || categories.includes('exclusive');

  return (
    <section className="border border-ink/15">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full h-12 px-4 flex items-center justify-between gap-3 text-left"
      >
        <span className="flex items-center gap-2 nav-caps text-[14px]">
          {t('tier.privileges')}
          <TierBadge tier={tier} />
        </span>
        <svg
          width="9"
          height="9"
          viewBox="0 0 8 8"
          aria-hidden="true"
          className={`shrink-0 transition-transform duration-300 ${open ? 'rotate-90' : ''}`}
        >
          <path d="M2 1 L6 4 L2 7" fill="none" stroke="currentColor" strokeWidth="1.3" />
        </svg>
      </button>

      <div
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-4 space-y-4 border-t border-ink/10 pt-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="field-label">{t('tier.status')}</p>
                <p className="font-mono text-[15px] mt-1">{tierTitle(tier, lang)}</p>
              </div>
              {pct > 0 && (
                <div className="text-right">
                  <p className="field-label">{t('tier.discount')}</p>
                  <p className="font-mono text-[15px] mt-1">−{pct}%</p>
                </div>
              )}
            </div>

            <p className="font-mono text-[12px] leading-[1.6] text-ink/75">
              {isRole ? (t(`tier.desc_${tier.code}`) === `tier.desc_${tier.code}` ? t('tier.desc_role') : t(`tier.desc_${tier.code}`)) : t('tier.desc_level')}
            </p>

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

            {hasPrivate && (
              <div className="space-y-2 pt-1">
                <p className="field-label">{t('tier.private')}</p>
                {status.links.map((l) => (
                  <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="btn-ink !h-9 !text-[12px]">
                    {t('tier.channel')} · {l.title.replace(/^Telegram\s*/i, '')}
                  </a>
                ))}
                {categories.includes('exclusive') && (
                  <a href={href.category('exclusive')} onClick={onNavigate} className="btn-line !h-9 !text-[12px]">
                    {t('cat.exclusive')}
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
