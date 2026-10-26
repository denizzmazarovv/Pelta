import { useEffect, useRef, useState, ReactNode } from 'react';
import { useLang } from '../context/LangContext';
import { useCart } from '../context/CartContext';
import { useCatalog } from '../context/CatalogContext';
import { Price } from '../components/Price';
import { href } from '../lib/router';
import { CONTACTS } from '../lib/config';
import { ProductCard } from '../components/ProductCard';
import { useHeaderHidden } from '../lib/useHeaderHidden';

const SWATCH: Record<string, string> = { tan: '#5a3a22', black: '#151515', cognac: '#8e4a1f' };

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-8 lg:mt-5">
      <h3 className="font-mono text-[17px] text-ink/85">{title}</h3>
      <div className="pl-[14px] mt-1 font-mono text-[13px] text-ink/60 leading-[1.7]">{children}</div>
    </div>
  );
}

/** Характеристика: раскрывается при наведении (компьютер) или по нажатию на стрелку. */
function Fold({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  // Раскрыли — показываем целиком, если панель невысокая
  useEffect(() => {
    if (open) setTimeout(() => ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 320);
  }, [open]);
  return (
    <div
      ref={ref}
      className="mt-6 lg:mt-4"
      onPointerEnter={(e) => e.pointerType === 'mouse' && setOpen(true)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-2 font-mono text-[15px] text-ink/85"
      >
        {title}
        <svg
          width="8"
          height="8"
          viewBox="0 0 8 8"
          aria-hidden="true"
          className={`transition-transform duration-300 ${open ? 'rotate-90' : ''}`}
        >
          <path d="M2 1 L6 4 L2 7" fill="none" stroke="currentColor" strokeWidth="1.3" />
        </svg>
      </button>
      <div
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="pl-[14px] pt-1 font-mono text-[13px] text-ink/60 leading-[1.7]">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function ProductPage({ id }: { id: string }) {
  const { t, lang } = useLang();
  const headerHidden = useHeaderHidden();
  const { add } = useCart();
  const { find, products, priceOf } = useCatalog();
  const product = find(id);
  const [color, setColor] = useState(0);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    setColor(0);
    setAdded(false);
  }, [id]);


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

  const actions = (
    <div className="mt-8 lg:mt-0 space-y-2 max-w-[360px]">
      <button onClick={addToBag} className="btn-ink !h-9 !text-[12px]">
        {added ? t('product.added') : t('product.add')}
      </button>
      <a href={CONTACTS.telegramHref} target="_blank" rel="noopener noreferrer" className="btn-line !h-9 !text-[12px]">
        {t('product.ask')}
      </a>
    </div>
  );

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
          <div className="hidden lg:flex flex-col gap-[3px] bg-white">
            <img src={first} alt={name} className="w-full aspect-[4/5] object-cover bg-smoke" />
            {rest.map((src, i) => (
              <img key={src + i} src={src} alt="" loading="lazy" className="w-full aspect-[4/5] object-cover bg-smoke" />
            ))}
          </div>
        </div>

        {/* Информация. На компьютере — панель во всю высоту экрана: стоит на месте, пока
            листают фото, кнопки внизу панели. Когда фото закончились, уезжает вместе со страницей. */}
        <div className="px-5 sm:px-7 pt-10 pb-16 lg:p-0">
          <div
            className={`lg:sticky lg:flex lg:flex-col lg:px-7 lg:pt-6 lg:pb-6 transition-[top,height] duration-300 ease-out ${
              headerHidden ? 'lg:top-0 lg:h-[100dvh]' : 'lg:top-[50px] lg:h-[calc(100dvh-50px)]'
            }`}
          >
            <div className="max-w-[500px] lg:flex-1 lg:min-h-0 lg:overflow-y-auto hide-scrollbar">
              <h1 className="font-mono text-[20px] text-ink">{name}</h1>
              <p className="pl-[14px] mt-6 lg:mt-3 font-mono text-[13px] leading-[1.7] text-ink/85">{desc}</p>

              <Block title={t('product.price')}>
                <p>
                  <Price {...priceOf(product)} />
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

              {/* Телефон: кнопки сразу после цвета */}
              <div className="lg:hidden">{actions}</div>

            <Fold title={t('product.material')}>
              <p>{t(product.specs.material)}</p>
              <p>
                {t('product.handmade')}: {product.specs.handmade ? t('product.handmade_yes') : t('product.handmade_no')}
              </p>
            </Fold>

            <Fold title={t('product.size_guide')}>
              <p>
                {t('product.dimensions')}: {product.specs.dimensions}
              </p>
              <p>
                {t('product.weight')}: {product.specs.weight}
              </p>
            </Fold>

            </div>

            {/* Компьютер: кнопки прижаты к низу панели */}
            <div className="hidden lg:block pt-4 shrink-0">{actions}</div>
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
