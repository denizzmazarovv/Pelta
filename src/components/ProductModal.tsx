import { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, ShoppingBag, Check } from 'lucide-react';
import { useLang } from '../context/LangContext';
import { useCart } from '../context/CartContext';
import type { Product } from '../lib/products';

export function ProductModal({
  product,
  onClose,
}: {
  product: Product | null;
  onClose: () => void;
}) {
  const { t, lang } = useLang();
  const { add } = useCart();
  const [slide, setSlide] = useState(0);
  const [color, setColor] = useState(0);
  const [added, setAdded] = useState(false);
  const startX = useRef<number | null>(null);

  useEffect(() => {
    setSlide(0);
    setColor(0);
    setAdded(false);
  }, [product]);

  useEffect(() => {
    if (!product) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setSlide((s) => (s === 0 ? product.gallery.length - 1 : s - 1));
      if (e.key === 'ArrowRight') setSlide((s) => (s === product.gallery.length - 1 ? 0 : s + 1));
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [product, onClose]);

  if (!product) return null;

  const name = product[`name_${lang}`];
  const desc = product[`desc_${lang}`];

  function next() { setSlide((s) => (s === product!.gallery.length - 1 ? 0 : s + 1)); }
  function prev() { setSlide((s) => (s === 0 ? product!.gallery.length - 1 : s - 1)); }

  function onTouchStart(e: React.TouchEvent) { startX.current = e.touches[0].clientX; }
  function onTouchEnd(e: React.TouchEvent) {
    if (startX.current === null) return;
    const dx = e.changedTouches[0].clientX - startX.current;
    if (Math.abs(dx) > 50) { dx > 0 ? prev() : next(); }
    startX.current = null;
  }

  function addToCart() {
    add(product!, color);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-6">
      <div className="absolute inset-0 bg-wine-900/70 backdrop-blur-md animate-fade-in" onClick={onClose} />

      <div className="relative w-full max-w-5xl bg-cream sm:rounded-2xl shadow-2xl overflow-hidden animate-scale-in max-h-screen sm:max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-cream/90 hover:bg-cream flex items-center justify-center text-wine-700 shadow-lg transition-colors"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Gallery */}
          <div className="relative bg-brand-50" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
            <div className="aspect-square md:aspect-auto md:h-full overflow-hidden">
              <img
                src={product.gallery[slide]}
                alt={name}
                className="w-full h-full object-cover animate-fade-in"
                key={slide}
              />
            </div>

            {product.gallery.length > 1 && (
              <>
                <button
                  onClick={prev}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-cream/90 hover:bg-cream flex items-center justify-center text-wine-700 shadow-lg transition-colors"
                  aria-label="Previous"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={next}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-cream/90 hover:bg-cream flex items-center justify-center text-wine-700 shadow-lg transition-colors"
                  aria-label="Next"
                >
                  <ChevronRight size={20} />
                </button>

                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {product.gallery.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setSlide(i)}
                      className={`h-1.5 rounded-full transition-all ${i === slide ? 'w-8 bg-brand-500' : 'w-1.5 bg-cream/60'}`}
                      aria-label={`Slide ${i + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Details */}
          <div className="p-6 sm:p-8 lg:p-10 flex flex-col">
            {product.featured && (
              <span className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.2em] text-brand-500 mb-3">
                <span className="w-6 h-px bg-brand-500" /> Pelta Nera
              </span>
            )}
            <h2 className="font-serif text-wine-900 text-3xl sm:text-4xl font-light mb-3">{name}</h2>
            <p className="text-wine-500 text-base leading-relaxed mb-6">{desc}</p>

            <div className="flex items-baseline gap-3 mb-6">
              <span className="text-brand-500 text-3xl font-serif font-semibold">
                {t('common.currency')}{product.price}
              </span>
              <span className="text-wine-400 text-sm">{t('product.from')}</span>
            </div>

            {/* Colors */}
            {product.colors.length > 0 && (
              <div className="mb-6">
                <p className="text-xs uppercase tracking-wider text-wine-400 mb-2.5">{t('product.color')}</p>
                <div className="flex gap-3">
                  {product.colors.map((c, i) => {
                    const hex = c.id === 'tan' ? '#8B5A2B' : c.id === 'black' ? '#1a1a1a' : '#9C4A1A';
                    return (
                      <button
                        key={c.id}
                        onClick={() => setColor(i)}
                        title={t(c.colorKey)}
                        className={`w-9 h-9 rounded-full border-2 transition-all ${color === i ? 'border-brand-500 scale-110 ring-2 ring-brand-500/20' : 'border-brand-200'}`}
                        style={{ backgroundColor: hex }}
                        aria-label={t(c.colorKey)}
                      />
                    );
                  })}
                </div>
                <p className="text-wine-400 text-xs mt-2">{t(product.colors[color].colorKey)}</p>
              </div>
            )}

            {/* Specs */}
            <div className="mb-6">
              <p className="text-xs uppercase tracking-wider text-wine-400 mb-3">{t('product.specs')}</p>
              <dl className="space-y-2.5 text-sm">
                <SpecRow label={t('product.material')} value={t(product.specs.material)} />
                <SpecRow label={t('product.dimensions')} value={product.specs.dimensions} />
                <SpecRow label={t('product.weight')} value={product.specs.weight} />
                <SpecRow label={t('product.handmade')} value={product.specs.handmade ? '✓' : '—'} />
              </dl>
            </div>

            <button
              onClick={addToCart}
              className={`mt-auto w-full py-4 rounded-xl font-medium tracking-wide transition-all flex items-center justify-center gap-2 ${
                added
                  ? 'bg-wine-500 text-cream'
                  : 'bg-brand-500 hover:bg-brand-600 text-cream hover:shadow-lg hover:shadow-brand-500/30'
              }`}
            >
              {added ? <><Check size={18} /> {t('product.add_to_cart')}</> : <><ShoppingBag size={18} /> {t('product.order')}</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-brand-100 pb-2.5">
      <dt className="text-wine-400">{label}</dt>
      <dd className="text-wine-700 font-medium text-right">{value}</dd>
    </div>
  );
}
