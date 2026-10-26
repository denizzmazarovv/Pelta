import { useLang } from '../context/LangContext';
import { useConsent } from '../context/ConsentContext';
import { POLICIES, type Block } from '../lib/privacy';
import { Mark } from '../components/Logo';

function renderBlock(b: Block, i: number) {
  if (Array.isArray(b)) {
    return (
      <ul key={i} className="space-y-1.5 pl-5">
        {b.map((li, j) => (
          <li key={j} className="relative before:content-['—'] before:absolute before:-left-5 before:text-ink/40">
            {li}
          </li>
        ))}
      </ul>
    );
  }
  // Короткая строка с двоеточием на конце — подзаголовок блока
  if (b.endsWith(':') && b.length < 80) {
    return (
      <p key={i} className="font-display uppercase text-[14px] tracking-[0.02em] text-ink pt-3">
        {b.slice(0, -1)}
      </p>
    );
  }
  return <p key={i}>{b}</p>;
}

export default function PrivacyPage() {
  const { lang, t } = useLang();
  const { openSettings } = useConsent();
  const p = POLICIES[lang];


  return (
    <div className="px-5 sm:px-10 lg:px-14 py-14 lg:py-20">
      <div className="max-w-[1100px] mx-auto">
        <Mark size={28} />
        <h1 className="font-display uppercase text-[34px] sm:text-[44px] leading-none mt-8">{p.title}</h1>
        <p className="font-mono text-[12px] text-mute mt-4">{p.updated}</p>

        <div className="grid lg:grid-cols-[260px_1fr] gap-x-16 mt-12">
          <nav className="hidden lg:block" aria-label={p.toc}>
            <div className="sticky top-[150px]">
              <p className="nav-caps text-mute mb-4">{p.toc}</p>
              <ol className="space-y-2 font-mono text-[12px]">
                {p.sections.map((s) => (
                  <li key={s.id}>
                    <a href={`#${s.id}`} onClick={(e) => { e.preventDefault(); document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} className="link-u text-ink/70 hover:text-ink">
                      {s.title}
                    </a>
                  </li>
                ))}
              </ol>
              <button onClick={openSettings} className="btn-line mt-8 h-10 text-[12px]">
                {t('cookie.settings')}
              </button>
            </div>
          </nav>

          <article className="max-w-[680px]">
            <p className="font-mono text-[14px] leading-[1.8] text-ink/85 border-l-2 border-ink pl-5">{p.intro}</p>
            {p.sections.map((s) => (
              <section key={s.id} id={s.id} className="mt-14 scroll-mt-[150px]">
                <h2 className="font-display uppercase text-[20px] leading-tight border-b border-ink/15 pb-3">{s.title}</h2>
                <div className="mt-5 space-y-3 font-mono text-[13px] leading-[1.75] text-ink/80">
                  {s.body.map(renderBlock)}
                </div>
              </section>
            ))}
            <button onClick={openSettings} className="btn-line mt-14 lg:hidden">
              {t('cookie.settings')}
            </button>
          </article>
        </div>
      </div>
    </div>
  );
}
