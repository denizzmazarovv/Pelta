import { useLang } from '../context/LangContext';
import { useReveal } from '../hooks/useReveal';

export function About() {
  const { t } = useLang();
  const { ref, visible } = useReveal<HTMLDivElement>();

  const stats = [
    { value: '25+', label: t('about.stat1') },
    { value: '500', label: t('about.stat2') },
    { value: '100%', label: t('about.stat3') },
  ];

  return (
    <section id="about" className="py-24 sm:py-20 bg-brand-500 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            'radial-gradient(circle at 70% 20%, rgba(250,242,232,0.3) 0%, transparent 50%)',
        }}
      />
      <div ref={ref} className={`relative max-w-5xl mx-auto px-5 sm:px-8 reveal ${visible ? 'is-visible' : ''}`}>
        <div className="text-center mb-16">
          <p className="text-cream/50 text-sm uppercase tracking-[0.3em] mb-3">Pelta Nera</p>
          <h2 className="font-serif text-cream text-4xl sm:text-5xl lg:text-6xl font-light mb-6">
            {t('about.title')}
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <p className="text-cream/80 text-lg leading-relaxed">{t('about.p1')}</p>
          <p className="text-cream/80 text-lg leading-relaxed">{t('about.p2')}</p>
        </div>

        <div className="grid grid-cols-3 gap-4 sm:gap-8">
          {stats.map((s, i) => (
            <div
              key={i}
              className="text-center py-8 border-t border-cream/20"
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <p className="font-serif text-cream text-4xl sm:text-5xl lg:text-6xl font-light mb-2">
                {s.value}
              </p>
              <p className="text-cream/60 text-xs sm:text-sm uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
