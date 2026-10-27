import { useLang } from '../context/LangContext';
import { useConsent } from '../context/ConsentContext';
import { href } from '../lib/router';
import { Mark } from './Logo';

export function CookieBanner() {
  const { t } = useLang();
  const { bannerOpen, choose, consent } = useConsent();
  if (!bannerOpen) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label={t('cookie.title')}
      className="fixed z-[120] bottom-0 inset-x-0 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-[420px] bg-paper border-t sm:border border-ink shadow-[0_8px_30px_rgba(0,0,0,0.08)] animate-fade-in pb-safe"
    >
      <div className="p-5">
        <div className="flex items-center gap-2.5">
          <Mark size={14} />
          <p className="nav-caps">{t('cookie.title')}</p>
        </div>
        <p className="font-mono text-[12px] leading-[1.65] text-ink/75 mt-3">
          {t('cookie.text')}{' '}
          <a href={href.privacy} className="underline underline-offset-2 text-ink">
            {t('cookie.link')}
          </a>
          .
        </p>
        {consent && (
          <p className="font-mono text-[11px] text-mute mt-2">
            {t('cookie.current')}: {consent.optional ? t('cookie.all') : t('cookie.necessary')}
          </p>
        )}
        <div className="grid grid-cols-2 gap-2 mt-4">
          <button onClick={() => choose(false)} className="btn-line h-10 text-[12px]">
            {t('cookie.necessary')}
          </button>
          <button onClick={() => choose(true)} className="btn-ink h-10 text-[12px]">
            {t('cookie.all')}
          </button>
        </div>
      </div>
    </div>
  );
}
