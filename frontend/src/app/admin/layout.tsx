'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BrandLogo } from '@/components/BrandLogo';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  function sair() {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('extraplus-session');
        window.localStorage.removeItem('extraplus-store');
      }
    } catch {
    }
    router.replace('/admin/login');
  }

  const items = [
    { href: '/admin', label: 'Dashboard', icon: '▦' },
    { href: '/admin/orders', label: 'Pedidos', icon: '🧾' },
    { href: '/admin/products', label: 'Produtos', icon: '📦' },
    { href: '/admin/customers', label: 'Clientes', icon: '👥' },
    { href: '/admin/reports', label: 'Relatórios', icon: '📈' },
    { href: '/admin/settings', label: 'Configurações', icon: '⚙️' }
  ];

  useEffect(() => {
    items.forEach(item => {
      router.prefetch(item.href);
    });
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="flex min-h-screen">
        <aside className="hidden md:flex md:flex-col md:w-72 bg-white border-r border-gray-200 dark:bg-zinc-900 dark:border-zinc-800">
          <div className="h-14 px-4 flex items-center justify-between border-b border-gray-200 dark:border-zinc-800">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl overflow-hidden border border-blue-100 bg-blue-50">
                  <BrandLogo size={40} />
              </div>
              <div>
                <div className="text-gray-900 font-semibold dark:text-white">Dil Bebidas</div>
                <div className="text-[11px] text-gray-600 dark:text-zinc-400">Painel Admin</div>
              </div>
            </div>
          </div>

          <nav className="p-3 flex-1">
            <div className="space-y-1">
              {items.map(item => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 h-10 rounded-lg text-sm font-semibold ${
                      active
                        ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <span>{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>

          <div className="p-3 border-t border-gray-200 dark:border-zinc-800">
            <Link
              href="/home"
              className="w-full h-10 rounded-lg bg-white text-black font-semibold text-sm flex items-center justify-center"
            >
              Ver Loja
            </Link>
            <button
              type="button"
              onClick={sair}
              className="mt-2 w-full h-10 rounded-lg border border-red-500/50 text-red-400 font-semibold text-sm flex items-center justify-center"
            >
              Sair
            </button>
          </div>
        </aside>

        <div className="flex-1 flex flex-col">
          <header className="sticky top-0 z-30 bg-gray-50 border-b border-gray-200 dark:bg-zinc-950 dark:border-zinc-800 md:border-b-0">
            <div className="max-w-7xl mx-auto h-14 px-4 flex items-center justify-between">
              <div className="flex items-center gap-3 md:hidden">
                <div className="w-10 h-10 rounded-xl overflow-hidden border border-blue-100 bg-blue-50">
                  <BrandLogo size={40} />
                </div>
                <div className="leading-tight">
                  <div className="text-gray-900 font-semibold dark:text-white">Dil Bebidas</div>
                  <div className="text-[11px] text-gray-600 dark:text-zinc-400">Painel Admin</div>
                </div>
              </div>
              <button
                onClick={() => setOpen(true)}
                className="w-9 h-9 rounded-lg border border-gray-300 text-gray-900 flex flex-col items-center justify-center gap-[3px] active:scale-[0.98] dark:border-zinc-800 dark:text-white md:hidden"
                aria-label="Abrir menu"
              >
                <span className="w-4 h-[2px] bg-gray-900 dark:bg-white" />
                <span className="w-4 h-[2px] bg-gray-900 dark:bg-white" />
                <span className="w-4 h-[2px] bg-gray-900 dark:bg-white" />
              </button>
            </div>
          </header>

          <main className="flex-1">{children}</main>
        </div>
      </div>

      {open && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setOpen(false)}
          />
          <aside className="fixed top-0 left-0 bottom-0 w-72 bg-white border-r border-gray-200 dark:bg-zinc-900 dark:border-zinc-800 z-50 flex flex-col md:hidden">
            <div className="h-14 px-4 flex items-center justify-between border-b border-gray-200 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl overflow-hidden border border-blue-100 bg-blue-50">
                  <BrandLogo size={40} />
                </div>
                <div>
                  <div className="text-gray-900 font-semibold dark:text-white">Dil Bebidas</div>
                  <div className="text-[11px] text-gray-600 dark:text-zinc-400">Painel Admin</div>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-lg border border-gray-300 text-gray-900 dark:border-zinc-800 dark:text-white"
                aria-label="Fechar menu"
              >
                ×
              </button>
            </div>

            <nav className="p-3 flex-1">
              <div className="space-y-1">
                {items.map(item => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-3 px-3 h-10 rounded-lg text-sm font-semibold ${
                        active
                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                          : 'text-gray-700 hover:bg-gray-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
                      }`}
                    >
                      <span>{item.icon}</span>
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </nav>

            <div className="p-3 border-t border-gray-200 dark:border-zinc-800">
              <Link
                href="/home"
                onClick={() => setOpen(false)}
                className="w-full h-10 rounded-lg bg-white text-black font-semibold text-sm flex items-center justify-center"
              >
                Ver Loja
              </Link>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  sair();
                }}
                className="mt-2 w-full h-10 rounded-lg border border-red-500/50 text-red-400 font-semibold text-sm flex items-center justify-center"
              >
                Sair
              </button>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
