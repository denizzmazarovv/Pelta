import { createContext, useCallback, useContext, useMemo, useState, useEffect, ReactNode } from 'react';
import type { Product } from '../lib/products';
import { useCatalog } from './CatalogContext';

export type CartItem = {
  id: string;
  product: Product;
  colorIndex: number;
  quantity: number;
};

type Saved = { id: string; productId: string; colorIndex: number; quantity: number };

type CartContextType = {
  items: CartItem[];
  isOpen: boolean;
  open: () => void;
  close: () => void;
  add: (product: Product, colorIndex: number, quantity?: number) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  count: number;
  /** Сумма с учётом скидки уровня (окончательно считает сервер). */
  total: number;
  /** Сумма без скидки. */
  baseTotal: number;
};

const CartContext = createContext<CartContextType | null>(null);

const STORAGE_KEY = 'pelta_cart';

function loadSaved(): Saved[] {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as {
      id: string;
      productId?: string;
      product?: { id: string };
      colorIndex: number;
      quantity: number;
    }[];
    return raw
      .map((s) => ({
        id: String(s.id),
        productId: String(s.productId ?? s.product?.id ?? ''),
        colorIndex: Math.max(0, s.colorIndex | 0),
        quantity: Math.min(99, Math.max(1, s.quantity | 0)),
      }))
      .filter((s) => s.productId);
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { find, priceOf, ready } = useCatalog();
  const [saved, setSaved] = useState<Saved[]>(loadSaved);
  const [isOpen, setIsOpen] = useState(false);
  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    } catch {
      /* ignore */
    }
  }, [saved]);

  // Актуальные данные товара берём из каталога (цены и закрытые товары)
  const items = useMemo(() => {
    const out: CartItem[] = [];
    for (const s of saved) {
      const product = find(s.productId);
      if (product && product.colors[s.colorIndex]) out.push({ id: s.id, product, colorIndex: s.colorIndex, quantity: s.quantity });
    }
    return out;
  }, [saved, find]);

  // Товар больше недоступен (например, закрытый после выхода) — убираем, когда каталог загружен
  useEffect(() => {
    if (ready && items.length !== saved.length) setSaved((prev) => prev.filter((s) => items.some((i) => i.id === s.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, items]);

  function add(product: Product, colorIndex: number, quantity = 1) {
    const id = `${product.id}-${colorIndex}`;
    setSaved((prev) => {
      const existing = prev.find((i) => i.id === id);
      if (existing) {
        return prev.map((i) => (i.id === id ? { ...i, quantity: Math.min(99, i.quantity + quantity) } : i));
      }
      return [...prev, { id, productId: product.id, colorIndex, quantity }];
    });
    setIsOpen(true);
  }

  function remove(id: string) {
    setSaved((prev) => prev.filter((i) => i.id !== id));
  }

  function setQty(id: string, qty: number) {
    if (qty < 1) return remove(id);
    setSaved((prev) => prev.map((i) => (i.id === id ? { ...i, quantity: Math.min(99, qty) } : i)));
  }

  function clear() {
    setSaved([]);
  }

  const count = items.reduce((s, i) => s + i.quantity, 0);
  const total = items.reduce((s, i) => s + priceOf(i.product).final * i.quantity, 0);
  const baseTotal = items.reduce((s, i) => s + i.product.price * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, isOpen, open: openCart, close: closeCart, add, remove, setQty, clear, count, total, baseTotal }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
