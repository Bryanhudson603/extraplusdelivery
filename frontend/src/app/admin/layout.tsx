'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

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
    <div className="min-h-screen bg-zinc-950">
      <div className="flex min-h-screen">
        <aside className="hidden md:flex md:flex-col md:w-72 bg-zinc-900 border-r border-zinc-800">
          <div className="h-14 px-4 flex items-center justify-between border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                <span className="text-black font-bold">🍺</span>
              </div>
              <div>
                <div className="text-white font-semibold">Depósito</div>
                <div className="text-[11px] text-zinc-400">Painel Admin</div>
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
                        ? 'bg-amber-500/10 text-amber-400'
                        : 'text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    <span>{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>

          <div className="p-3 border-t border-zinc-800">
            <Link
              href="/home"
              className="w-full h-10 rounded-lg bg-white text-black font-semibold text-sm flex items-center justify-center"
            >
              Ver Loja
            </Link>
            <Link
              href="/start"
              className="mt-2 w-full h-10 rounded-lg border border-red-500/50 text-red-400 font-semibold text-sm flex items-center justify-center"
            >
              Sair
            </Link>
          </div>
        </aside>

        <div className="flex-1 flex flex-col">
          <header className="sticky top-0 z-30 bg-zinc-950 border-b border-zinc-800 md:border-b-0">
            <div className="max-w-7xl mx-auto h-14 px-4 flex items-center justify-between">
              <div className="flex items-center gap-3 md:hidden">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                  <span className="text-black font-bold">🍺</span>
                </div>
                <div className="leading-tight">
                  <div className="text-white font-semibold">Depósito</div>
                  <div className="text-[11px] text-zinc-400">Painel Admin</div>
                </div>
              </div>
              <button
                onClick={() => setOpen(true)}
                className="w-9 h-9 rounded-lg border border-zinc-800 text-white flex flex-col items-center justify-center gap-[3px] active:scale-[0.98] md:hidden"
                aria-label="Abrir menu"
              >
                <span className="w-4 h-[2px] bg-white" />
                <span className="w-4 h-[2px] bg-white" />
                <span className="w-4 h-[2px] bg-white" />
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
          <aside className="fixed top-0 left-0 bottom-0 w-72 bg-zinc-900 border-r border-zinc-800 z-50 flex flex-col md:hidden">
            <div className="h-14 px-4 flex items-center justify-between border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                  <span className="text-black font-bold">🍺</span>
                </div>
                <div>
                  <div className="text-white font-semibold">Depósito</div>
                  <div className="text-[11px] text-zinc-400">Painel Admin</div>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-lg border border-zinc-800 text-white"
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
                          ? 'bg-amber-500/10 text-amber-400'
                          : 'text-zinc-300 hover:bg-zinc-800'
                      }`}
                    >
                      <span>{item.icon}</span>
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </nav>

            <div className="p-3 border-t border-zinc-800">
              <Link
                href="/home"
                onClick={() => setOpen(false)}
                className="w-full h-10 rounded-lg bg-white text-black font-semibold text-sm flex items-center justify-center"
              >
                Ver Loja
              </Link>
              <Link
                href="/start"
                onClick={() => setOpen(false)}
                className="mt-2 w-full h-10 rounded-lg border border-red-500/50 text-red-400 font-semibold text-sm flex items-center justify-center"
              >
                Sair
              </Link>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
