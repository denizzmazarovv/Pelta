import { useState, useEffect } from 'react';
import { Menu, X, User, LogOut, Globe, ChevronDown } from 'lucide-react';
import { useLang } from '../context/LangContext';
import { useAuth } from '../context/AuthContext';
import { LANGS, Lang } from '../lib/i18n';

export function Navbar({ onOpenAuth, onOpenAccount }: { onOpenAuth: () => void; onOpenAccount: () => void }) {
  const { t, lang, setLang } = useLang();
  const { session, signOut } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { key: 'nav.home', href: '#home' },
    { key: 'nav.catalog', href: '#catalog' },
    { key: 'nav.about', href: '#about' },
    { key: 'nav.contact', href: '#contact' },
  ];

  function handleSignOut() {
    signOut();
    setMobileOpen(false);
  }

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? 'glass shadow-lg shadow-brand-900/5 py-3' : 'bg-transparent py-5'
      }`}
    >
      <nav className="max-w-7xl mx-auto px-5 sm:px-8 flex items-center justify-between">
        <a href="#home" className="flex items-center gap-2 group">
          <img src="/public/favicon-32x32.png" alt="Pelta Nera Logo" className={`w-10 h-10 transition-transform ${scrolled ? 'scale-90' : 'scale-100'}`} />
          <span className={`font-serif text-2xl sm:text-3xl font-semibold tracking-tight transition-colors ${scrolled ? 'text-brand-500' : 'text-cream'}`}>
            Pelta
          </span>
          <span className={`font-serif text-2xl sm:text-3xl font-light italic transition-colors ${scrolled ? 'text-wine-500' : 'text-cream-200'}`}>
            Nera
          </span>
        </a>

        <div className="hidden lg:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.key}
              href={link.href}
              className={`text-sm font-medium tracking-wide relative group transition-colors ${scrolled ? 'text-wine-700 hover:text-brand-500' : 'text-cream/90 hover:text-cream'}`}
            >
              {t(link.key)}
              <span className="absolute -bottom-1 left-0 w-0 h-px bg-current group-hover:w-full transition-all duration-300" />
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <div className="relative">
            <button
              onClick={() => setLangOpen(!langOpen)}
              className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${scrolled ? 'text-wine-700 hover:text-brand-500' : 'text-cream/90 hover:text-cream'}`}
            >
              <Globe size={16} />
              <span className="hidden sm:inline">{LANGS.find((l) => l.code === lang)?.short}</span>
              <ChevronDown size={14} className={`transition-transform ${langOpen ? 'rotate-180' : ''}`} />
            </button>
            {langOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setLangOpen(false)} />
                <div className="absolute right-0 mt-5 w-40 glass  shadow-xl shadow-brand-900/10 border border-white/20 overflow-hidden z-20 animate-scale-in backdrop-blur-xl">
                  {LANGS.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => {
                        setLang(l.code as Lang);
                        setLangOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-brand-50 ${
                        lang === l.code ? 'text-brand-500 font-semibold' : 'text-wine-700'
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {session ? (
            <div className="hidden lg:flex items-center gap-3">
              <button
                onClick={onOpenAccount}
                className={`flex items-center gap-2 text-sm font-medium transition-colors ${scrolled ? 'text-wine-700 hover:text-brand-500' : 'text-cream/90 hover:text-cream'}`}
              >
                <User size={18} />
                {t('nav.account')}
              </button>
              <button
                onClick={handleSignOut}
                className={`flex items-center gap-1.5 text-sm transition-colors ${scrolled ? 'text-wine-400 hover:text-wine-600' : 'text-cream/60 hover:text-cream'}`}
              >
                <LogOut size={16} />
                {t('nav.logout')}
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="hidden lg:flex items-center gap-2 px-5 py-2  -full bg-brand-500 text-cream text-sm font-medium hover:bg-brand-600 transition-all hover:shadow-lg hover:shadow-brand-500/30"
            >
              <User size={16} />
              {t('nav.login')}
            </button>
          )}

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className={`lg:hidden ${scrolled ? 'text-wine-700' : 'text-cream'}`}
            aria-label="Menu"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div className="lg:hidden absolute top-full left-0 right-0 glass border-t border-brand-200 animate-fade-in">
          <div className="px-5 py-5 space-y-3">
            {navLinks.map((link) => (
              <a
                key={link.key}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block text-wine-700 hover:text-brand-500 font-medium py-1.5"
              >
                {t(link.key)}
              </a>
            ))}
            <div className="pt-3 border-t border-brand-200 flex items-center gap-4">
              {session ? (
                <>
                  <button
                    onClick={() => {
                      onOpenAccount();
                      setMobileOpen(false);
                    }}
                    className="flex items-center gap-2 text-wine-700 font-medium"
                  >
                    <User size={18} />
                    {t('nav.account')}
                  </button>
                  <button onClick={handleSignOut} className="flex items-center gap-1.5 text-wine-400">
                    <LogOut size={16} />
                    {t('nav.logout')}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    onOpenAuth();
                    setMobileOpen(false);
                  }}
                  className="flex items-center gap-2 px-5 py-2  -full bg-brand-500 text-cream text-sm font-medium"
                >
                  <User size={16} />
                  {t('nav.login')}
                </button>
              )}
            </div>
            <div className="flex gap-3 pt-2">
              {LANGS.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLang(l.code as Lang)}
                  className={`px-3 py-1  -lg text-sm ${lang === l.code ? 'bg-brand-500 text-cream' : 'bg-brand-50 text-wine-600'}`}
                >
                  {l.short}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
