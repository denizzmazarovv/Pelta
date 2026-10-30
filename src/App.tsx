import { lazy, Suspense, useCallback, useState } from 'react';
import { LangProvider } from './context/LangContext';
import { CartProvider } from './context/CartContext';
import { ProfileProvider } from './context/ProfileContext';
import { CatalogProvider } from './context/CatalogContext';
import { useRoute } from './lib/router';
import { useSeoHead } from './lib/useSeoHead';
import { useLang } from './context/LangContext';
import { useCatalog } from './context/CatalogContext';
import { Header } from './components/Header';
import { MenuDrawer } from './components/MenuDrawer';
import { Footer } from './components/Footer';
import { CartDrawer } from './components/CartDrawer';
import { RegisterDrawer } from './components/RegisterDrawer';
import { CatalogPage } from './pages/CatalogPage';
import { ProductPage } from './pages/ProductPage';
import { AboutPage } from './pages/AboutPage';
import { ContactPage } from './pages/ContactPage';
import { ConsentProvider } from './context/ConsentContext';
import { CookieBanner } from './components/CookieBanner';

const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));

function AppContent() {
  const route = useRoute();
  const { lang } = useLang();
  const { find } = useCatalog();
  useSeoHead(route, lang, route.name === 'product' ? find(route.id) : undefined);
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header route={route} onMenu={() => setMenuOpen(true)} />
      <main className="flex-1 pt-[calc(50px+env(safe-area-inset-top))]">
        {route.name === 'catalog' && <CatalogPage category={route.category} />}
        {route.name === 'product' && <ProductPage id={route.id} />}
        {route.name === 'about' && <AboutPage />}
        {route.name === 'contact' && <ContactPage />}
        {(route.name === 'privacy' || route.name === 'terms') && (
          <Suspense fallback={<div className="min-h-screen" />}>
            <PrivacyPage kind={route.name} />
          </Suspense>
        )}
      </main>
      <Footer />
      <MenuDrawer open={menuOpen} onClose={closeMenu} route={route} />
      <CartDrawer />
      <RegisterDrawer />
      <CookieBanner />
    </div>
  );
}

export default function App() {
  return (
    <LangProvider>
      <ConsentProvider>
      <ProfileProvider>
        <CatalogProvider>
          <CartProvider>
            <AppContent />
          </CartProvider>
        </CatalogProvider>
      </ProfileProvider>
      </ConsentProvider>
    </LangProvider>
  );
}
