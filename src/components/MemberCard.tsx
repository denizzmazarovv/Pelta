import { useState } from 'react';
import { useLang } from '../context/LangContext';
import { useProfile } from '../context/ProfileContext';
import { useCatalog } from '../context/CatalogContext';
import { href } from '../lib/router';
import { pointsOf, pointsPctOf, roleOf, tierTitle } from '../lib/tiers';
import { formatNumber } from '../lib/format';
import { TierBadge } from './TierBadge';

/**
 * Привилегии в личном кабинете: строка «Привилегии ›» со стрелкой, без рамки.
 * По нажатию раскрываются подробности: уровень, баллы, прогресс, роль, закрытый доступ.
 */
export function MemberCard({ onNavigate }: { onNavigate?: () => void }) {
  const { t, lang } = useLang();
  const { status } = useProfile();
  const { categories } = useCatalog();
  const [open, setOpen] = useState(false);
  if (!status?.tier) return null;

  const tier = status.tier;
  const role = roleOf(status);
  const done = status.done_orders ?? 0;
  const pct = pointsPctOf(status);
  const points = pointsOf(status);
  const expire = status.points_expire_at ? new Date(status.points_expire_at) : null;
  const next = status.next;
  const need = next?.min_orders != null ? Math.max(0, next.min_orders - done) : 0;
  const progress = next?.min_orders ? Math.min(100, Math.round((done / next.min_orders) * 100)) : 100;
  const roleDesc = role ? (t(`tier.desc_${role.code}`) === `tier.desc_${role.code}` ? t('tier.desc_role') : t(`tier.desc_${role.code}`)) : '';
  const hasPrivate = status.links?.length > 0 || categories.includes('exclusive');

  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="group w-full flex items-center justify-between gap-3 py-1 text-left"
      >
        <span className="flex items-center gap-2 nav-caps text-[14px]">
          {t('tier.privileges')}
          <TierBadge tier={role} />
        </span>
        <span className="flex items-center gap-2 font-mono text-[12px] text-ink/70 group-hover:text-ink">
          {tierTitle(tier)} · {formatNumber(points)} {t('points.unit')}
          <svg
            width="10"
            height="10"
            viewBox="0 0 8 8"
            aria-hidden="true"
            className={`shrink-0 transition-transform duration-300 ${open ? 'rotate-90' : ''}`}
          >
            <path d="M2 1 L6 4 L2 7" fill="none" stroke="currentColor" strokeWidth="1.3" />
          </svg>
        </span>
      </button>

      <div
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="pt-4 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="field-label">{t('tier.your_level')}</p>
                <p className="font-mono text-[15px] mt-1">{tierTitle(tier)}</p>
              </div>
              <div className="text-right">
                <p className="field-label">{t('points.balance')}</p>
                <p className="font-mono text-[15px] mt-1 tabular-nums">{formatNumber(points)}</p>
              </div>
            </div>

            <div className="font-mono text-[11px] leading-[1.6] text-ink/75 space-y-1">
              {pct > 0 && <p>{t('points.rate').replace('{pct}', String(pct))}</p>}
              <p>{t('points.use')}</p>
              {points > 0 && expire && (
                <p className="text-mute">
                  {t('points.expire').replace('{date}', expire.toLocaleDateString(lang === 'en' ? 'en-GB' : lang === 'uz' ? 'uz-UZ' : 'ru-RU'))}
                </p>
              )}
            </div>

            <p className="font-mono text-[12px] text-ink/70">
              {t('tier.purchases')}: {done}
            </p>

            {next && (
              <div>
                <div className="h-[3px] bg-ink/10" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                  <div className="h-full bg-burgundy transition-[width] duration-500" style={{ width: `${progress}%` }} />
                </div>
                <p className="font-mono text-[11px] text-ink/70 mt-2">
                  {t('tier.to_next').replace('{n}', String(need)).replace('{level}', tierTitle(next))}
                  {Number(next.discount_pct) > 0 ? ` (${t('points.rate_short').replace('{pct}', String(Number(next.discount_pct)))})` : ''}
                </p>
              </div>
            )}
            <p className="font-mono text-[10.5px] text-mute leading-[1.5]">{t('tier.how')}</p>

            {role && (
              <div className="border-t border-ink/10 pt-4 space-y-2">
                <div className="flex items-center gap-2">
                  <p className="field-label">{t('tier.role')}</p>
                  <TierBadge tier={role} />
                </div>
                <p className="font-mono text-[12px] leading-[1.6] text-ink/75">{roleDesc}</p>
                <p className="font-mono text-[10.5px] text-mute leading-[1.5]">{t('tier.role_note')}</p>
              </div>
            )}

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

            <a href={`${href.terms}#loyalty`} onClick={onNavigate} className="inline-block font-mono text-[11px] link-u text-ink/70">
              {t('points.terms_link')}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
