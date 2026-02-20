'use client';

import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import type { Product } from '@/lib/data';

export type CartItem = {
  product: Product;
  qty: number;
};

type CartContextType = {
  items: CartItem[];
  totalQuantity: number;
  addProduct: (product: Product, quantity?: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      const stored = typeof window !== 'undefined' ? window.localStorage.getItem('cart') : null;
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        setItems(parsed);
      }
    } catch {
      // ignore parse error
    }
  }, []);

  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      window.localStorage.setItem('cart', JSON.stringify(items));
    } catch {
      // ignore write error
    }
  }, [items]);

  const addProduct = (product: Product, quantity = 1) => {
    const qtyToAdd = Number.isFinite(quantity) && quantity > 0 ? Math.floor(quantity) : 1;
    setItems(prev => {
      const index = prev.findIndex(it => it.product.id === product.id);
      if (index === -1) {
        return [...prev, { product, qty: qtyToAdd }];
      }
      const next = [...prev];
      next[index] = { ...next[index], qty: next[index].qty + qtyToAdd };
      return next;
    });
  };

  const clear = () => setItems([]);

  const totalQuantity = useMemo(
    () => items.reduce((sum, it) => sum + it.qty, 0),
    [items]
  );

  const value: CartContextType = {
    items,
    totalQuantity,
    addProduct,
    clear
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used within CartProvider');
  }
  return ctx;
}
