import { useEffect, ReactNode } from 'react';
import { useLang } from '../context/LangContext';
import { useProfile } from '../context/ProfileContext';
import { LANGS } from '../lib/i18n';
import { CONTACTS, SOCIALS } from '../lib/config';
import { href, type Route } from '../lib/router';
import { CATEGORIES } from '../lib/products';
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
  const { profile, openRegister } = useProfile();

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
            {CATEGORIES.map((c) => (
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
              {profile ? `${t('reg.hello')}, ${profile.name.split(' ')[0]}` : t('nav.signup')}
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
  return (
    <a
      href={to}
      target={to.startsWith('http') ? '_blank' : undefined}
      rel="noopener noreferrer"
      className="grid grid-cols-[104px_1fr] items-baseline group"
    >
      <span>{label}</span>
      <span className="text-[12px] normal-case font-mono tracking-tight text-ink/80 group-hover:underline underline-offset-4 break-all">
        {value}
      </span>
    </a>
  );
}
