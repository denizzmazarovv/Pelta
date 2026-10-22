import { useRef, useState } from 'react';
import { useLang } from '../context/LangContext';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../lib/format';
import { href } from '../lib/router';
import type { Product } from '../lib/products';
import { Mark } from './Logo';

function SlideArrow({ dir }: { dir: 'l' | 'r' }) {
  return (
    <svg width="10" height="14" viewBox="0 0 10 14" aria-hidden="true">
      <path
        d={dir === 'r' ? 'M2 1.5 L8 7 L2 12.5' : 'M8 1.5 L2 7 L8 12.5'}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
      />
    </svg>
  );
}

export function ProductCard({ product, eager = false }: { product: Product; eager?: boolean }) {
  const { t, lang } = useLang();
  const { add } = useCart();
  const [slide, setSlide] = useState(0);
  const [added, setAdded] = useState(false);
  const startX = useRef<number | null>(null);
  const name = product[`name_${lang}`];
  const n = product.gallery.length;

  function go(e: React.MouseEvent, d: number) {
    e.preventDefault();
    e.stopPropagation();
    setSlide((s) => (s + d + n) % n);
  }

  function quickAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    add(product, 0);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <div className="group relative bg-ash">
    <a href={href.product(product.id)} className="block" aria-label={name}>
      <div
        className="relative aspect-[7/9] bg-smoke overflow-hidden"
        onTouchStart={(e) => (startX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (startX.current === null) return;
          const dx = e.changedTouches[0].clientX - startX.current;
          if (Math.abs(dx) > 40) setSlide((s) => (s + (dx < 0 ? 1 : -1) + n) % n);
          startX.current = null;
        }}
      >
        {product.gallery.map((src, i) => (
          <img
            key={src + i}
            src={src}
            alt={i === 0 ? name : ''}
            loading={eager && i === 0 ? 'eager' : 'lazy'}
            draggable={false}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
              i === slide ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ))}

      </div>

      <div className="px-[15px] pt-[14px] pb-[34px] min-h-[96px]">
        <h3 className="font-display uppercase text-[13px] sm:text-[14px] leading-tight text-ink/85 group-hover:text-ink">
          {name}
        </h3>
        <p className="font-mono text-[12px] text-ink/60 mt-[3px]">{formatPrice(product.price, lang)}</p>
      </div>
    </a>
      <div className="absolute inset-x-0 top-0 aspect-[7/9] pointer-events-none [&>*]:pointer-events-auto">
        <button
          onClick={quickAdd}
          className={`absolute top-3 right-3 w-8 h-8 flex items-center justify-center text-[#f3ece4] transition-transform duration-300 hover:rotate-45 ${
            added ? 'rotate-45' : ''
          }`}
          aria-label={t('product.quick_add')}
          title={added ? t('product.added') : t('product.quick_add')}
        >
          <Mark size={18} />
        </button>

        {n > 1 && (
          <>
            <button
              onClick={(e) => go(e, -1)}
              className="absolute left-0 top-1/2 -translate-y-1/2 w-11 h-16 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Previous"
            >
              <SlideArrow dir="l" />
            </button>
            <button
              onClick={(e) => go(e, 1)}
              className="absolute right-0 top-1/2 -translate-y-1/2 w-11 h-16 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Next"
            >
              <SlideArrow dir="r" />
            </button>
            <div className="absolute left-4 bottom-3 flex gap-[3px] opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
              {product.gallery.map((_, i) => (
                <span
                  key={i}
                  className={`w-[6px] h-[4px] rounded-full border border-white ${i === slide ? 'bg-white' : ''}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
