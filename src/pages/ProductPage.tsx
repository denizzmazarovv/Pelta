import { useEffect, useState, ReactNode } from 'react';
import { useLang } from '../context/LangContext';
import { useCart } from '../context/CartContext';
import { findProduct, products } from '../lib/products';
import { formatNumber } from '../lib/format';
import { href } from '../lib/router';
import { CONTACTS } from '../lib/config';
import { ProductCard } from '../components/ProductCard';

const SWATCH: Record<string, string> = { tan: '#5a3a22', black: '#151515', cognac: '#8e4a1f' };

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-8">
      <h3 className="font-mono text-[17px] text-ink/85">{title}</h3>
      <div className="pl-[14px] mt-1 font-mono text-[13px] text-ink/60 leading-[1.7]">{children}</div>
    </div>
  );
}

export function ProductPage({ id }: { id: string }) {
  const { t, lang } = useLang();
  const { add } = useCart();
  const product = findProduct(id);
  const [color, setColor] = useState(0);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    setColor(0);
    setAdded(false);
  }, [id]);

  useEffect(() => {
    if (product) document.title = `${product[`name_${lang}`]} — Pelta Nera`;
  }, [product, lang]);

  if (!product) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 px-6">
        <p className="font-mono text-[14px]">{t('product.notfound')}</p>
        <a href={href.home} className="nav-caps link-u">
          {t('product.back')}
        </a>
      </div>
    );
  }

  const name = product[`name_${lang}`];
  const desc = product[`desc_${lang}`];
  const related = products.filter((p) => p.id !== product.id && p.category === product.category)
    .concat(products.filter((p) => p.category !== product.category))
    .slice(0, 4);

  function addToBag() {
    add(product!, color);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  const [first, ...rest] = product.gallery;

  return (
    <div>
      <div className="grid lg:grid-cols-2">
        {/* Галерея */}
        <div>
          {/* Мобильная лента */}
          <div className="lg:hidden flex overflow-x-auto snap-x snap-mandatory hide-scrollbar bg-smoke">
            {product.gallery.map((src, i) => (
              <img
                key={src + i}
                src={src}
                alt={i === 0 ? name : ''}
                className="w-full shrink-0 snap-center aspect-[4/5] object-cover"
              />
            ))}
          </div>

          {/* Десктоп: фото столбцом */}
          <div className="hidden lg:block">
            <img src={first} alt={name} className="w-full aspect-[4/5] object-cover bg-smoke" />
          </div>
          <div className="bg-ash px-5 py-3 font-mono text-[15px] sm:text-[18px] leading-[1.6]">
            <p>{name}</p>
            <p>{product.specs.dimensions}</p>
            <p>{t(product.specs.material)}</p>
            <p>{t(product.colors[color].colorKey)}</p>
          </div>
          <div className="hidden lg:flex flex-col gap-[3px] bg-white">
            {rest.map((src, i) => (
              <img key={src + i} src={src} alt="" loading="lazy" className="w-full aspect-[4/5] object-cover bg-smoke" />
            ))}
          </div>
        </div>

        {/* Информация */}
        <div className="px-5 sm:px-7 pt-10 lg:pt-[70px] pb-16">
          <div className="lg:sticky lg:top-[90px] max-w-[500px]">
            <h1 className="font-mono text-[20px] text-ink">{name}</h1>
            <p className="pl-[14px] mt-10 font-mono text-[13px] leading-[1.7] text-ink/85">{desc}</p>

            <Block title={t('product.price')}>
              <p>
                {formatNumber(product.price)}
              </p>
            </Block>

            {product.colors.length > 0 && (
              <Block title={t('product.color')}>
                <div className="flex gap-2 mt-1.5">
                  {product.colors.map((c, i) => (
                    <button
                      key={c.id}
                      onClick={() => setColor(i)}
                      className={`w-7 h-7 p-[3px] border ${color === i ? 'border-ink' : 'border-transparent hover:border-ink/30'}`}
                      aria-label={t(c.colorKey)}
                      aria-pressed={color === i}
                      title={t(c.colorKey)}
                    >
                      <span className="block w-full h-full" style={{ background: SWATCH[c.id] ?? '#777' }} />
                    </button>
                  ))}
                </div>
                <p className="mt-1">{t(product.colors[color].colorKey)}</p>
              </Block>
            )}

            <Block title={t('product.material')}>
              <p>{t(product.specs.material)}</p>
              <p>
                {t('product.handmade')}: {product.specs.handmade ? t('product.handmade_yes') : t('product.handmade_no')}
              </p>
            </Block>

            <Block title={t('product.size_guide')}>
              <p>
                {t('product.dimensions')}: {product.specs.dimensions}
              </p>
              <p>
                {t('product.weight')}: {product.specs.weight}
              </p>
            </Block>

            <div className="mt-12 space-y-3 max-w-[420px]">
              <button onClick={addToBag} className="btn-ink">
                {added ? t('product.added') : t('product.add')}
              </button>
              <a href={CONTACTS.telegramHref} target="_blank" rel="noopener noreferrer" className="btn-line">
                {t('product.ask')}
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Похожие */}
      {related.length > 0 && (
        <section className="bg-ash border-t-[3px] border-smoke">
          <h2 className="nav-caps px-5 py-5">{t('product.related')}</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
