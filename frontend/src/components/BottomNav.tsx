'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

const items = [
  { href: '/home', label: 'Home' },
  { href: '/catalog', label: 'Buscar' },
  { href: '/orders', label: 'Pedidos' },
  { href: '/profile', label: 'Perfil' }
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    items.forEach(item => {
      router.prefetch(item.href);
    });
  }, [router]);
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 h-14 dark:bg-zinc-900/95 dark:border-zinc-800 backdrop-blur">
      <div className="max-w-md mx-auto h-full grid grid-cols-4">
        {items.map(item => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`text-xs flex items-center justify-center font-semibold ${
                active ? 'text-brand-red' : 'text-gray-700 dark:text-zinc-300'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
