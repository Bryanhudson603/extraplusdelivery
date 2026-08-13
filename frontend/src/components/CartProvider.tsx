'use client';

import { createContext, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import type { Product } from '@/lib/data';

export type CartItem = {
  product: Product;
  qty: number;
  /** Quando true, `qty` representa quantidade de FARDOS (nao de unidades) e o preco usado e o do fardo. */
  isPack?: boolean;
};

type CartContextType = {
  items: CartItem[];
  totalQuantity: number;
  addProduct: (product: Product, quantity?: number, isPack?: boolean) => void;
  removeProduct: (lineId: string) => void;
  updateQuantity: (lineId: string, quantity: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function cartLineId(productId: string, isPack?: boolean): string {
  return isPack ? `${productId}::fardo` : productId;
}

export function getCartLineUnitPrice(item: CartItem): number {
  if (item.isPack && typeof item.product.packPrice === 'number') {
    return item.product.packPrice;
  }
  return item.product.promoPrice ?? item.product.price;
}

export function getCartLineTotal(item: CartItem): number {
  return getCartLineUnitPrice(item) * item.qty;
}

export function getCartLineUnitsCount(item: CartItem): number {
  if (item.isPack && item.product.packQuantity) {
    return item.qty * item.product.packQuantity;
  }
  return item.qty;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const isFirstWrite = useRef(true);

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
    // Pula a primeira execução (montagem) para não sobrescrever o carrinho
    // salvo com o estado inicial vazio antes do efeito de carregamento rodar.
    if (isFirstWrite.current) {
      isFirstWrite.current = false;
      return;
    }
    try {
      if (typeof window === 'undefined') return;
      window.localStorage.setItem('cart', JSON.stringify(items));
    } catch {
      // ignore write error
    }
  }, [items]);

  const addProduct = (product: Product, quantity = 1, isPack = false) => {
    const qtyToAdd = Number.isFinite(quantity) && quantity > 0 ? Math.floor(quantity) : 1;
    setItems(prev => {
      const index = prev.findIndex(it => it.product.id === product.id && !!it.isPack === isPack);
      if (index === -1) {
        return [...prev, { product, qty: qtyToAdd, isPack }];
      }
      const next = [...prev];
      next[index] = { ...next[index], qty: next[index].qty + qtyToAdd };
      return next;
    });
  };

  const removeProduct = (lineId: string) => {
    setItems(prev => prev.filter(it => cartLineId(it.product.id, it.isPack) !== lineId));
  };

  const updateQuantity = (lineId: string, quantity: number) => {
    const qty = Math.floor(quantity);
    if (qty <= 0) {
      removeProduct(lineId);
      return;
    }
    setItems(prev =>
      prev.map(it => (cartLineId(it.product.id, it.isPack) === lineId ? { ...it, qty } : it))
    );
  };

  const clear = () => setItems([]);

  const totalQuantity = useMemo(
    () => items.reduce((sum, it) => sum + getCartLineUnitsCount(it), 0),
    [items]
  );

  const value: CartContextType = {
    items,
    totalQuantity,
    addProduct,
    removeProduct,
    updateQuantity,
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
