import { createContext, useCallback, useContext, useState, useEffect, ReactNode } from 'react';
import { findProduct, type Product } from '../lib/products';

export type CartItem = {
  id: string;
  product: Product;
  colorIndex: number;
  quantity: number;
};

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
  total: number;
};

const CartContext = createContext<CartContextType | null>(null);

const STORAGE_KEY = 'pelta_cart';

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    // Подтягиваем актуальные данные товара (цены могли измениться)
    const saved = JSON.parse(raw) as { id: string; productId?: string; product?: { id: string }; colorIndex: number; quantity: number }[];
    const fresh: CartItem[] = [];
    for (const s of saved) {
      const product = findProduct(s.productId ?? s.product?.id ?? '');
      if (product && product.colors[s.colorIndex]) {
        fresh.push({ id: s.id, product, colorIndex: s.colorIndex, quantity: Math.max(1, s.quantity | 0) });
      }
    }
    return fresh;
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadCart);
  const [isOpen, setIsOpen] = useState(false);
  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(items.map((i) => ({ id: i.id, productId: i.product.id, colorIndex: i.colorIndex, quantity: i.quantity })))
      );
    } catch {
      /* ignore */
    }
  }, [items]);

  function add(product: Product, colorIndex: number, quantity = 1) {
    const id = `${product.id}-${colorIndex}`;
    setItems((prev) => {
      const existing = prev.find((i) => i.id === id);
      if (existing) {
        return prev.map((i) => (i.id === id ? { ...i, quantity: i.quantity + quantity } : i));
      }
      return [...prev, { id, product, colorIndex, quantity }];
    });
    setIsOpen(true);
  }

  function remove(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function setQty(id: string, qty: number) {
    if (qty < 1) return remove(id);
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, quantity: qty } : i)));
  }

  function clear() {
    setItems([]);
  }

  const count = items.reduce((s, i) => s + i.quantity, 0);
  const total = items.reduce((s, i) => s + i.product.price * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, isOpen, open: openCart, close: closeCart, add, remove, setQty, clear, count, total }}
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
