import { useCallback, useState } from 'react';
import { LangProvider } from './context/LangContext';
import { CartProvider } from './context/CartContext';
import { ProfileProvider } from './context/ProfileContext';
import { useRoute } from './lib/router';
import { Header } from './components/Header';
import { MenuDrawer } from './components/MenuDrawer';
import { Footer } from './components/Footer';
import { CartDrawer } from './components/CartDrawer';
import { RegisterDrawer } from './components/RegisterDrawer';
import { CatalogPage } from './pages/CatalogPage';
import { ProductPage } from './pages/ProductPage';
import { AboutPage } from './pages/AboutPage';
import { ContactPage } from './pages/ContactPage';

function AppContent() {
  const route = useRoute();
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
      </main>
      <Footer />
      <MenuDrawer open={menuOpen} onClose={closeMenu} route={route} />
      <CartDrawer />
      <RegisterDrawer />
    </div>
  );
}

export default function App() {
  return (
    <LangProvider>
      <ProfileProvider>
        <CartProvider>
          <AppContent />
        </CartProvider>
      </ProfileProvider>
    </LangProvider>
  );
}
