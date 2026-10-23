import { useEffect, useMemo, useState } from 'react';
import { useLang } from '../context/LangContext';
import { CATEGORIES, products, type Category } from '../lib/products';
import { href } from '../lib/router';
import { Mark } from '../components/Logo';
import { ProductCard } from '../components/ProductCard';
import { useHeaderHidden } from '../lib/useHeaderHidden';

type Sort = 'featured' | 'price_asc' | 'price_desc';

function FilterIcon() {
  return (
    <svg width="18" height="12" viewBox="0 0 18 12" aria-hidden="true" stroke="currentColor" strokeWidth="1.6">
      <path d="M1 1h16M4 6h13M7 11h10" />
    </svg>
  );
}

export function CatalogPage({ category }: { category: Category | 'all' }) {
  const { t } = useLang();
  const [sort, setSort] = useState<Sort>('featured');
  const [sortOpen, setSortOpen] = useState(false);
  const headerHidden = useHeaderHidden();

  useEffect(() => {
    document.title = category === 'all' ? 'Pelta Nera' : `${t(`cat.${category}`)} — Pelta Nera`;
  }, [category, t]);

  const list = useMemo(() => {
    const base = category === 'all' ? products : products.filter((p) => p.category === category);
    const arr = [...base];
    if (sort === 'price_asc') arr.sort((a, b) => a.price - b.price);
    else if (sort === 'price_desc') arr.sort((a, b) => b.price - a.price);
    else arr.sort((a, b) => Number(b.featured) - Number(a.featured));
    return arr;
  }, [category, sort]);

  const tabs: (Category | 'all')[] = ['all', ...CATEGORIES];

  return (
    <div className="bg-ash min-h-[calc(100vh-50px)] flex flex-col">
      {/* Подзаголовок: знак, категории, фильтр */}
      <div
        className={`sticky z-40 bg-white transition-[top] duration-300 ease-out ${
          headerHidden ? 'top-0' : 'top-[calc(50px+env(safe-area-inset-top))]'
        }`}
      >
        {/* Знак — по центру сверху */}
        <div className="flex justify-center pt-2">
          <a href={href.home} aria-label="Pelta Nera">
            <Mark size={30} />
          </a>
        </div>

        {/* Категории — строго по центру, сортировка справа */}
        <div className="relative h-[42px] flex items-center px-4 sm:px-5">
          <nav className="flex-1 min-w-0 overflow-x-auto hide-scrollbar pr-9 sm:pr-0">
            <div className="flex gap-1 sm:gap-2 w-max mx-auto">
              {tabs.map((c) => {
                const active = c === category;
                return (
                  <a
                    key={c}
                    href={href.category(c)}
                    className={`nav-caps text-[15px] sm:text-[16px] px-[5px] py-[4px] border whitespace-nowrap transition-colors ${
                      active ? 'border-ink' : 'border-transparent hover:border-ink/30'
                    }`}
                    aria-current={active ? 'page' : undefined}
                  >
                    {t(`cat.${c}`)}
                  </a>
                );
              })}
            </div>
          </nav>

          <div className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 bg-white pl-2">
              <button
                onClick={() => setSortOpen((o) => !o)}
                className="nav-caps text-[16px] flex items-center gap-2"
                aria-expanded={sortOpen}
              >
                <FilterIcon />
                <span className="hidden sm:inline">{t('sort.label')}</span>
              </button>
              {sortOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setSortOpen(false)} />
                  <div className="absolute right-0 top-full mt-3 z-20 bg-white border border-ink w-[230px] py-2 animate-fade-in">
                    {(['featured', 'price_asc', 'price_desc'] as Sort[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          setSort(s);
                          setSortOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 font-mono text-[12px] hover:bg-fog ${
                          sort === s ? 'underline underline-offset-4' : ''
                        }`}
                      >
                        {t(`sort.${s}`)}
                      </button>
                    ))}
                  </div>
                </>
              )}
          </div>
        </div>
      </div>

      {/* Сетка */}
      {list.length === 0 ? (
        <p className="font-mono text-[13px] p-8">{t('catalog.empty')}</p>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4">
          {list.map((p, i) => (
            <ProductCard key={p.id} product={p} eager={i < 4} />
          ))}
        </div>
      )}

      <p className="font-mono text-[11px] text-ink/50 px-[15px] py-6 mt-auto">
        {list.length} {t('catalog.items')}
      </p>
    </div>
  );
}
