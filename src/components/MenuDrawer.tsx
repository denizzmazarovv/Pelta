import { useEffect, useState, ReactNode } from 'react';
import { useLang } from '../context/LangContext';
import { useProfile } from '../context/ProfileContext';
import { LANGS } from '../lib/i18n';
import { CONTACTS, SOCIALS } from '../lib/config';
import { href, type Route } from '../lib/router';
import { useCatalog } from '../context/CatalogContext';
import { TierBadge } from './TierBadge';
import { roleOf } from '../lib/tiers';
import { Mark, Wordmark } from './Logo';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-12">
      <h2 className="font-display uppercase text-[19px] leading-none mb-5">{title}</h2>
      <div className="pl-[26px] space-y-[9px] font-display uppercase text-[16px] leading-tight">{children}</div>
    </section>
  );
}

export function MenuDrawer({ open, onClose, route }: { open: boolean; onClose: () => void; route: Route }) {
  const { t, lang, setLang } = useLang();
  const { session, profile, status, openRegister } = useProfile();
  const { categories } = useCatalog();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  // Закрываем меню при переходе по ссылке
  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route]);

  if (!open) return null;

  const activeCat = route.name === 'catalog' ? route.category : null;
  const cls = (active: boolean) => (active ? 'underline underline-offset-4' : 'link-u');

  return (
    <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true" aria-label={t('nav.menu')}>
      <div
        className="absolute inset-0 bg-white/30 backdrop-blur-[10px] animate-fade-in"
        onClick={onClose}
      />
      <aside className="relative h-full w-full sm:w-[350px] bg-white overflow-y-auto hide-scrollbar animate-slide-left pt-safe">
        <div className="relative h-header flex items-center px-4 sm:px-5">
          <button
            onClick={onClose}
            className="w-9 h-9 -ml-1.5 flex items-center justify-center hover:rotate-45 transition-transform duration-300"
            aria-label={t('nav.close')}
          >
            <Mark size={22} />
          </button>
          <Wordmark className="sm:hidden absolute left-1/2 -translate-x-1/2 text-[28px]" />
        </div>

        <div
          className="px-7 pt-12 pb-safe"
          onClick={(e) => {
            if ((e.target as HTMLElement).closest('a[href^="#"]')) onClose();
          }}
        >
          <Section title={t('menu.collection')}>
            <a href={href.category('all')} className={`block ${cls(activeCat === 'all')}`}>
              {t('cat.all')}
            </a>
            {categories.map((c) => (
              <a key={c} href={href.category(c)} className={`block ${cls(activeCat === c)}`}>
                {t(`cat.${c}`)}
              </a>
            ))}
          </Section>

          <Section title={t('menu.house')}>
            <a href={href.about} className={`block ${cls(route.name === 'about')}`}>
              {t('nav.about')}
            </a>
            <a href={href.contact} className={`block ${cls(route.name === 'contact')}`}>
              {t('nav.contact')}
            </a>
          </Section>

          <Section title={t('menu.contacts')}>
            <ContactRow label={t('menu.email')} value={CONTACTS.email} to={`mailto:${CONTACTS.email}`} />
            <ContactRow label={t('menu.phone')} value={CONTACTS.phone} to={CONTACTS.phoneHref} />
            <ContactRow label={t('menu.telegram')} value={CONTACTS.telegramHandle} to={CONTACTS.telegramHref} />
          </Section>

          <Section title={t('menu.account')}>
            <button
              onClick={() => {
                onClose();
                openRegister();
              }}
              className="block link-u uppercase text-left">
              {session ? profile?.name ? `${t('reg.hello')}, ${profile.name.split(' ')[0]}` : t('nav.account') : `${t('nav.signin')} / ${t('nav.signup')}`}
              {session && <TierBadge tier={roleOf(status)} className="ml-2" />}
            </button>
          </Section>

          <Section title={t('menu.socials')}>
            {SOCIALS.map((s) => (
              <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" className="block link-u">
                {s.label}
              </a>
            ))}
          </Section>

          <Section title={t('menu.language')}>
            <div className="flex gap-5">
              {LANGS.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLang(l.code)}
                  className={lang === l.code ? 'underline underline-offset-4' : 'text-mute hover:text-ink'}
                  aria-pressed={lang === l.code}
                >
                  {l.short}
                </button>
              ))}
            </div>
          </Section>
        </div>
      </aside>
    </div>
  );
}

function ContactRow({ label, value, to }: { label: string; value: string; to: string }) {
  // Компьютер: значение раскрывается при наведении. Телефон: по нажатию на название.
  const [open, setOpen] = useState(false);
  const external = to.startsWith('http');
  return (
    <div
      onPointerEnter={(e) => e.pointerType === 'mouse' && setOpen(true)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-2 uppercase text-left"
      >
        <span className={open ? 'underline underline-offset-4' : ''}>{label}</span>
        <svg
          width="8"
          height="8"
          viewBox="0 0 8 8"
          aria-hidden="true"
          className={`transition-transform duration-300 ${open ? 'rotate-90' : ''}`}
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
          <a
            href={to}
            target={external ? '_blank' : undefined}
            rel="noopener noreferrer"
            tabIndex={open ? 0 : -1}
            className="inline-block pt-1.5 pb-1 normal-case font-mono text-[13px] tracking-tight text-ink/80 hover:text-ink underline-offset-4 hover:underline break-all"
          >
            {value}
          </a>
        </div>
      </div>
    </div>
  );
}
