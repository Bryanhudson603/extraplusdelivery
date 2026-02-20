'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { categories as allCategories, type Product } from '@/lib/data';
import { api } from '@/lib/api';
import { CategoryList } from '@/components/CategoryList';
import { ProductCard } from '@/components/ProductCard';
import { FloatingCart } from '@/components/FloatingCart';
import { CartDrawer } from '@/components/CartDrawer';
import { BottomNav } from '@/components/BottomNav';
import { useCart } from '@/components/CartProvider';

export default function CatalogPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { items, totalQuantity, addProduct } = useCart();
  const [produtos, setProdutos] = useState<Product[]>([]);

  useEffect(() => {
    async function carregar() {
      try {
        const todos = await api.get<Product[]>('/catalogo/produtos');
        setProdutos(todos);
      } catch (e) {
        console.error('Erro ao carregar catálogo', e);
      }
    }
    carregar();
  }, []);

  const filteredProducts = useMemo(() => {
    return produtos.filter(p => {
      const byCategory = !selectedCategory || p.categoryId === selectedCategory;
      const bySearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase());
      return byCategory && bySearch;
    });
  }, [search, selectedCategory, produtos]);

  return (
    <main className="flex-1 bg-gray-50 pb-24 dark:bg-zinc-950">
      <div className="max-w-md mx-auto px-4 py-4 flex flex-col gap-4">
        <header className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold">Buscar</h1>
          <p className="text-xs text-neutral-500 dark:text-zinc-400">
            Encontre produtos pelo nome ou categoria
          </p>
        </header>

        <div className="mt-1">
          <input
            type="search"
            placeholder="Buscar produtos..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-11 rounded-full bg-white border border-gray-200 px-4 text-sm outline-none dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500"
          />
        </div>

        <CategoryList
          categories={allCategories}
          onSelect={id => setSelectedCategory(current => (current === id ? null : id))}
        />

        <section className="mt-2 flex-1">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold">
              Resultados
            </h2>
            <span className="text-[11px] text-neutral-500 dark:text-zinc-400">
              {filteredProducts.length} produto(s)
            </span>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="text-center text-xs text-neutral-500 py-12 dark:text-zinc-400">
              Nenhum produto encontrado
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filteredProducts.map(prod => (
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
          )}
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
      </div>
      <BottomNav />
    </main>
  );
}
