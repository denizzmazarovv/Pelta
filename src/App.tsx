import { useState } from 'react';
import { LangProvider } from './context/LangContext';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { Marquee } from './components/Marquee';
import { Catalog } from './components/Catalog';
import { About } from './components/About';
import { Contact } from './components/Contact';
import { Footer } from './components/Footer';
import { AuthModal } from './components/AuthModal';
import { AccountModal } from './components/AccountModal';
import { CartDrawer } from './components/CartDrawer';

function AppContent() {
  const [authOpen, setAuthOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  return (
    <div className="min-h-screen bg-cream">
      <Navbar onOpenAuth={() => setAuthOpen(true)} onOpenAccount={() => setAccountOpen(true)} />
      <main>
        <Hero />
        <Marquee />
        <Catalog />
        <About />
        <Contact />
      </main>
      <Footer />
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      <AccountModal open={accountOpen} onClose={() => setAccountOpen(false)} />
      <CartDrawer />
    </div>
  );
}

export default function App() {
  return (
    <LangProvider>
      <AuthProvider>
        <CartProvider>
          <AppContent />
        </CartProvider>
      </AuthProvider>
    </LangProvider>
  );
}
