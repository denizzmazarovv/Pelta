import { useLang } from '../context/LangContext';
import { href } from '../lib/router';
import { Mark } from '../components/Logo';

export function AboutPage() {
  const { t } = useLang();


  const stats = [
    { value: '25+', label: t('about.stat1') },
    { value: '500', label: t('about.stat2') },
    { value: '100%', label: t('about.stat3') },
  ];

  return (
    <div className="grid lg:grid-cols-2">
      <img
        src="/images/products/pelta_denim.jpg"
        alt="Pelta Nera"
        className="w-full aspect-[4/5] lg:aspect-auto lg:h-[calc(100vh-50px)] lg:sticky lg:top-[50px] object-cover bg-smoke"
      />
      <div className="px-5 sm:px-10 lg:px-14 py-14 lg:py-24 max-w-[620px]">
        <Mark size={30} />
        <h1 className="font-display uppercase text-[34px] leading-none mt-8">{t('about.title')}</h1>
        <div className="mt-10 space-y-6 font-mono text-[14px] leading-[1.8] text-ink/80">
          <p>{t('about.p1')}</p>
          <p>{t('about.p2')}</p>
        </div>

        <dl className="mt-14 grid grid-cols-3 border-t border-ink">
          {stats.map((s) => (
            <div key={s.label} className="pt-5 pr-3">
              <dt className="font-display text-[36px] leading-none">{s.value}</dt>
              <dd className="font-mono text-[11px] text-ink/60 mt-2 leading-snug">{s.label}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-14 flex flex-wrap gap-x-8 gap-y-3 nav-caps">
          <a href={href.home} className="link-u">
            {t('nav.catalog')} →
          </a>
          <a href={href.contact} className="link-u">
            {t('nav.contact')} →
          </a>
        </div>
      </div>
    </div>
  );
}
