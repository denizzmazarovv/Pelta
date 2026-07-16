import { useLang } from '../context/LangContext';

export function Marquee() {
  const { t } = useLang();
  const items = t('marquee.tag').split(' · ');
  const repeated = [...items, ...items, ...items, ...items];

  return (
    <div className="bg-wine-500 py-4 overflow-hidden">
      <div className="flex animate-marquee whitespace-nowrap">
        {repeated.map((item, i) => (
          <span key={i} className="text-cream/80 text-sm uppercase tracking-[0.3em] mx-8 font-light">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
