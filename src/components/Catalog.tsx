import { useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import { useLang } from '../context/LangContext';
import { useReveal } from '../hooks/useReveal';
import { products, Product } from '../lib/products';
import { ProductModal } from './ProductModal';

type Category = 'all' | 'cardholder' | 'bag' | 'belt';

export function Catalog() {
  const { t, lang } = useLang();
  const { ref, visible } = useReveal<HTMLDivElement>();
  const [active, setActive] = useState<Category>('all');
  const [selected, setSelected] = useState<Product | null>(null);

  const cats: { key: Category; label: string }[] = [
    { key: 'all', label: t('cat.all') },
    { key: 'cardholder', label: t('cat.cardholder') },
    { key: 'bag', label: t('cat.bag') },
    { key: 'belt', label: t('cat.belt') },
  ];

  const filtered = active === 'all' ? products : products.filter((p) => p.category === active);

  function name(p: Product) {
    return p[`name_${lang}`];
  }
  function desc(p: Product) {
    return p[`desc_${lang}`];
  }

  return (
    <section id="catalog" className="py-24 sm:py-32 bg-cream relative">
      <div
        ref={ref}
        className={`max-w-7xl mx-auto px-0 sm:px-8 reveal ${visible ? 'is-visible' : ''}`}
      >
        <div className="text-center mb-14">
          <p className="text-brand-500 text-sm uppercase tracking-[0.3em] mb-3">Pelta Nera</p>
          <h2 className="font-serif text-wine-900 text-4xl sm:text-5xl lg:text-6xl font-light mb-4">
            {t('catalog.title')}
          </h2>
          <p className="text-wine-400 text-lg max-w-2xl mx-auto">{t('catalog.subtitle')}</p>
        </div>

        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {cats.map((c) => (
            <button
              key={c.key}
              onClick={() => setActive(c.key)}
              className={`px-6 py-2.5  text-sm font-medium tracking-wide transition-all duration-300 ${
                active === c.key
                  ? 'bg-brand-500 text-cream shadow-lg shadow-brand-500/25 scale-105'
                  : 'bg-brand-50 text-wine-600 hover:bg-brand-100 hover:scale-105'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {filtered.map((p, i) => (
            <ProductCard
              key={p.id}
              product={p}
              name={name(p)}
              desc={desc(p)}
              delay={i * 80}
              onOpen={() => setSelected(p)}
            />
          ))}
        </div>
      </div>

      <ProductModal product={selected} onClose={() => setSelected(null)} />
    </section>
  );
}

function ProductCard({
  product,
  name,
  desc,
  delay,
  onOpen,
}: {
  product: Product;
  name: string;
  desc: string;
  delay: number;
  onOpen: () => void;
}) {
  const { t } = useLang();
  const { ref, visible } = useReveal<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={`group bg-cream-50  overflow-hidden border border-brand-100 hover:border-brand-300 transition-all duration-500 hover:shadow-2xl hover:shadow-brand-900/10 hover:-translate-y-1 reveal cursor-pointer ${visible ? 'is-visible' : ''}`}
      style={{ transitionDelay: `${delay}ms` }}
      onClick={onOpen}
    >
      <div className="relative h-72 overflow-hidden bg-brand-50">
        <img
          src={product.image}
          alt={name}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        {product.featured && (
          <span className="absolute top-4 left-4 bg-wine-500 text-cream text-xs uppercase tracking-wider px-3 py-1  ">
            ★
          </span>
        )}
        <div className="absolute inset-0 bg-wine-900/0 group-hover:bg-wine-900/10 transition-colors duration-500" />
      </div>

      <div className="p-6">
        <h3 className="font-serif text-wine-900 text-xl font-medium mb-2">{name}</h3>
        <p className="text-wine-400 text-sm leading-relaxed mb-4 line-clamp-2">{desc}</p>
        <div className="flex items-center justify-between">
          <span className="text-brand-500 text-2xl font-serif font-semibold">
            {t('product.from')} {t('common.currency')}{product.price}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onOpen(); }}
            className="flex items-center gap-2 px-4 py-2  bg-brand-500 text-cream text-sm font-medium hover:bg-brand-600 transition-all hover:shadow-lg hover:shadow-brand-500/25 active:scale-95"
          >
            <ShoppingBag size={16} />
            {t('product.order')}
          </button>
        </div>
      </div>
    </div>
  );
}
