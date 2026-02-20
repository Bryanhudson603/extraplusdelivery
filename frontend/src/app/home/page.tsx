'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import {
  banners,
  categories as catsMock,
  store as defaultStore,
  type Product,
  type StoreSettings
} from '@/lib/data';
import { BannerCarousel } from '@/components/BannerCarousel';
import { CategoryList } from '@/components/CategoryList';
import { ProductCard } from '@/components/ProductCard';
import { BottomNav } from '@/components/BottomNav';
import { FloatingCart } from '@/components/FloatingCart';
import { CartDrawer } from '@/components/CartDrawer';
import { StoreHeader } from '@/components/StoreHeader';
import { useCart } from '@/components/CartProvider';

export default function ClientHomePage() {
  const router = useRouter();
  const [produtosMaisPedidos, setProdutosMaisPedidos] = useState<Product[]>([]);
  const [todosProdutos, setTodosProdutos] = useState<Product[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentStore, setCurrentStore] = useState<StoreSettings>(defaultStore);
  const { items, totalQuantity, addProduct } = useCart();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const rawSession = window.localStorage.getItem('extraplus-session');
      if (!rawSession) {
        router.replace('/login');
        return;
      }
      const parsed = JSON.parse(rawSession);
      if (parsed?.tipo !== 'cliente') {
        router.replace('/login');
        return;
      }
    } catch {
      router.replace('/login');
    }
  }, [router]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const rawStore = window.localStorage.getItem('extraplus-store');
      if (!rawStore) return;
      const parsed = JSON.parse(rawStore) as any;
      const name = parsed.name || parsed.nome;

      if (name) {
        setCurrentStore(prev => ({
          ...prev,
          name,
          address: parsed.address || prev.address,
          phone: parsed.phone || prev.phone,
          open: typeof parsed.open === 'boolean' ? parsed.open : prev.open
        }));
      }
    } catch {
    }
  }, []);

  useEffect(() => {
    async function carregar() {
      try {
        const produtosResp = await api.get<Product[]>('/catalogo/produtos-mais-pedidos');
        setProdutosMaisPedidos(produtosResp);
        const todos = await api.get<Product[]>('/catalogo/produtos');
        setTodosProdutos(todos);
      } catch (e) {
        console.error('Erro ao carregar produtos mais pedidos', e);
      }
    }

    carregar();
  }, []);

  return (
    <main className="flex-1 flex flex-col gap-4 p-4 pb-24 bg-gray-50 dark:bg-zinc-950">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push('/stores')}
          className="text-xs text-zinc-500 hover:text-amber-500"
        >
          ← Voltar
        </button>
      </div>

      <StoreHeader store={currentStore} />

      <div className="mt-3">
        <input
          type="search"
          placeholder="Buscar produtos..."
          className="w-full h-11 rounded-full bg-white border border-gray-200 px-4 text-sm outline-none dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500"
        />
      </div>

      <BannerCarousel banners={banners} />

      <button className="w-full h-11 rounded-full bg-white border border-gray-200 text-sm font-semibold mt-1 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100">
        Repetir pedido
      </button>

      <CategoryList categories={catsMock} />

      <section className="mt-3">
        <h2 className="text-lg font-semibold mb-2">Mais pedidos</h2>
        <div className="grid grid-cols-2 gap-3">
          {produtosMaisPedidos.map(prod => (
            <ProductCard
              key={prod.id}
              name={prod.name}
              image={prod.image}
              price={prod.price}
              promoPrice={prod.promoPrice}
              tags={prod.tags}
              packQuantity={prod.packQuantity}
              packPrice={prod.packPrice}
              onAdd={qty => addProduct(prod, qty)}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">Todos os produtos</h2>
        <div className="grid grid-cols-2 gap-3">
          {todosProdutos.map(p => (
            <ProductCard
              key={p.id}
              name={p.name}
              image={p.image}
              price={p.price}
              promoPrice={p.promoPrice}
              tags={p.tags}
              packQuantity={p.packQuantity}
              packPrice={p.packPrice}
              onAdd={qty => addProduct(p, qty)}
            />
          ))}
        </div>
      </section>

      <FloatingCart count={totalQuantity} onOpen={() => setDrawerOpen(true)} />
      <CartDrawer
        open={drawerOpen}
        items={items}
        onClose={() => setDrawerOpen(false)}
        onCheckout={() => {
          setDrawerOpen(false);
          router.push('/checkout');
        }}
      />
      <BottomNav />
    </main>
  );
}
