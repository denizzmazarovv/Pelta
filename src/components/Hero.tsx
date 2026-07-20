import { ArrowDown } from 'lucide-react';
import { useLang } from '../context/LangContext';

export function Hero() {
  const { t } = useLang();

  return (
    <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden bg-brand-500">
      <div className="absolute inset-0 bg-gradient-to-br from-brand-600 via-brand-500 to-brand-800" />
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 30%, rgba(250,242,232,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(76,20,19,0.25) 0%, transparent 50%)',
        }}
      />
      <div className="absolute top-1/4 left-10 w-64 h-64  -full bg-cream/5 blur-3xl animate-float" />
      <div className="absolute bottom-1/4 right-10 w-80 h-80  -full bg-wine-500/10 blur-3xl animate-float" style={{ animationDelay: '2s' }} />

      <div className="relative z-10 text-center px-6 max-w-4xl">
        <p className="text-cream/60 text-sm sm:text-base uppercase tracking-[0.4em] mb-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          Pelta Nera
        </p>
        <h1 className="font-serif text-cream text-5xl sm:text-7xl lg:text-8xl font-light leading-[1.05] mb-8 text-balance animate-fade-up">
          {t('hero.title')}
        </h1>
        <p className="text-cream/70 text-lg sm:text-xl max-w-2xl mx-auto mb-12 leading-relaxed animate-fade-up" style={{ animationDelay: '0.3s' }}>
          {t('hero.subtitle')}
        </p>
        <a
          href="#catalog"
          className="inline-flex items-center gap-3 px-8 py-4 bg-cream text-brand-600  -full font-medium tracking-wide hover:bg-cream-200 transition-all hover:shadow-2xl hover:shadow-cream/20 hover:scale-105 active:scale-100 animate-fade-up"
          style={{ animationDelay: '0.4s' }}
        >
          {t('hero.cta')}
        </a>
      </div>

      <a
        href="#catalog"
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-cream/50 hover:text-cream/80 transition-colors animate-fade-in"
        style={{ animationDelay: '0.8s' }}
      >
        <span className="text-xs uppercase tracking-[0.3em]">{t('hero.scroll')}</span>
        <ArrowDown size={20} className="animate-bounce" />
      </a>
    </section>
  );
}
