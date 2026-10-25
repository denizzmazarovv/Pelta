import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { CATEGORIES, DEFAULT_COLOR, products as staticProducts, type Category, type Product } from '../lib/products';
import { discounted } from '../lib/tiers';
import { useProfile } from './ProfileContext';

/**
 * Каталог: открытые товары из кода сайта + цены из базы (pn_products)
 * + закрытые товары, которые база отдаёт только клиентам с нужным уровнем/ролью.
 * Фото закрытых товаров — из приватного хранилища по временным ссылкам.
 */
type Row = {
  id: string;
  price: number;
  min_rank: number;
  category: string | null;
  name_en: string | null;
  name_ru: string | null;
  name_uz: string | null;
  desc_en: string | null;
  desc_ru: string | null;
  desc_uz: string | null;
  images: string[];
  dimensions: string | null;
  weight: string | null;
};

type Price = { base: number; final: number; discount: number };

type CatalogContextType = {
  products: Product[];
  categories: Category[];
  find: (id: string) => Product | undefined;
  priceOf: (p: Product) => Price;
  ready: boolean;
};

const CatalogContext = createContext<CatalogContextType | null>(null);

async function toExclusive(rows: Row[]): Promise<Product[]> {
  const paths = [...new Set(rows.flatMap((r) => r.images))];
  const urls = new Map<string, string>();
  if (supabase && paths.length) {
    const { data } = await supabase.storage.from('exclusive').createSignedUrls(paths, 60 * 60);
    data?.forEach((d) => d.path && d.signedUrl && urls.set(d.path, d.signedUrl));
  }
  return rows
    .filter((r) => r.name_en)
    .map((r) => {
      const gallery = r.images.map((i) => urls.get(i)).filter((u): u is string => !!u);
      return {
        id: r.id,
        category: 'exclusive' as Category,
        name_en: r.name_en ?? r.id,
        name_ru: r.name_ru || r.name_en || r.id,
        name_uz: r.name_uz || r.name_en || r.id,
        desc_en: r.desc_en ?? '',
        desc_ru: r.desc_ru || r.desc_en || '',
        desc_uz: r.desc_uz || r.desc_en || '',
        price: Number(r.price),
        image: gallery[0] ?? '/images/products/cardholder-pelta.svg',
        gallery: gallery.length ? gallery : ['/images/products/cardholder-pelta.svg'],
        colors: [DEFAULT_COLOR],
        specs: { material: 'product.material_value', dimensions: r.dimensions ?? '', weight: r.weight ?? '', handmade: true },
        featured: false,
        exclusive: true,
      };
    });
}

export function CatalogProvider({ children }: { children: ReactNode }) {
  const { session, status } = useProfile();
  const [rows, setRows] = useState<Row[]>([]);
  const [exclusive, setExclusive] = useState<Product[]>([]);
  const [ready, setReady] = useState(!supabase);

  // Цены и закрытые товары: заново при входе/выходе и смене уровня
  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    supabase
      .from('pn_products')
      .select('id, price, min_rank, category, name_en, name_ru, name_uz, desc_en, desc_ru, desc_uz, images, dimensions, weight')
      .then(async ({ data }) => {
        if (!alive) return;
        const list = (data as Row[] | null) ?? [];
        setRows(list);
        const extra = await toExclusive(list.filter((r) => r.min_rank > 0));
        if (alive) {
          setExclusive(extra);
          setReady(true);
        }
      });
    return () => {
      alive = false;
    };
  }, [session?.user.id, status?.rank]);

  const products = useMemo(() => {
    const prices = new Map(rows.map((r) => [r.id, Number(r.price)]));
    const open = staticProducts.map((p) => (prices.has(p.id) ? { ...p, price: prices.get(p.id)! } : p));
    return [...open, ...exclusive];
  }, [rows, exclusive]);

  const categories = useMemo<Category[]>(
    () => (exclusive.length ? [...CATEGORIES, 'exclusive'] : CATEGORIES),
    [exclusive.length]
  );

  const find = useCallback((id: string) => products.find((p) => p.id === id), [products]);

  const pct = status?.tier?.discount_pct ? Number(status.tier.discount_pct) : 0;
  const priceOf = useCallback(
    (p: Product): Price => ({ base: p.price, final: discounted(p.price, pct), discount: pct }),
    [pct]
  );

  return (
    <CatalogContext.Provider value={{ products, categories, find, priceOf, ready }}>{children}</CatalogContext.Provider>
  );
}

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error('useCatalog must be used within CatalogProvider');
  return ctx;
}
