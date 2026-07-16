import { useLang } from '../context/LangContext';

export function Footer() {
  const { t } = useLang();
  const year = new Date().getFullYear();

  return (
    <footer className="bg-wine-500 text-cream/80">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-16">
        <div className="grid md:grid-cols-3 gap-10 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="font-serif text-2xl font-semibold text-cream">Pelta</span>
              <span className="font-serif text-2xl font-light italic text-cream-200">Nera</span>
            </div>
            <p className="text-cream/60 text-sm leading-relaxed max-w-xs">{t('footer.tagline')}</p>
          </div>

          <div>
            <h4 className="text-cream text-sm uppercase tracking-wider mb-4">{t('nav.catalog')}</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#catalog" className="text-cream/60 hover:text-cream transition-colors">{t('cat.cardholder')}</a></li>
              <li><a href="#catalog" className="text-cream/60 hover:text-cream transition-colors">{t('cat.bag')}</a></li>
              <li><a href="#catalog" className="text-cream/60 hover:text-cream transition-colors">{t('cat.belt')}</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-cream text-sm uppercase tracking-wider mb-4">{t('nav.contact')}</h4>
            <ul className="space-y-2 text-sm text-cream/60">
              <li>+998 90 939 12 1</li>
              <li>peltanera@gmail.com</li>
              <li>Tashkent, Amir Temur St.</li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-cream/15 flex flex-col sm:flex-row justify-between items-center gap-3 text-sm text-cream/50">
          <p>© {year} Pelta Nera. {t('footer.rights')}.</p>
          <p className="font-serif italic">Pelta Nera — {t('footer.tagline')}</p>
        </div>
      </div>
    </footer>
  );
}
