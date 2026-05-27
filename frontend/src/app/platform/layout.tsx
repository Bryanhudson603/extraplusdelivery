'use client';

import { ReactNode, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const SESSION_KEY = 'extraplus-platform-session';

export default function PlatformLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isLogin = pathname === '/platform/login';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isLogin) return;

    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) {
      router.replace('/platform/login');
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      if (parsed?.tipo !== 'plataforma') {
        router.replace('/platform/login');
      }
    } catch {
      router.replace('/platform/login');
    }
  }, [isLogin, router]);

  if (isLogin) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-zinc-950 dark:text-zinc-50">
      <header className="border-b border-gray-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/60 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="font-semibold">Admin da Plataforma</div>
          <div className="flex items-center gap-3 text-sm">
            <Link
              className="text-gray-700 hover:text-amber-600 dark:text-zinc-300 dark:hover:text-amber-400"
              href="/platform"
            >
              Lojas & Usuários
            </Link>
            <button
              type="button"
              className="text-gray-700 hover:text-red-600 dark:text-zinc-300 dark:hover:text-red-400"
              onClick={() => {
                window.localStorage.removeItem(SESSION_KEY);
                router.replace('/platform/login');
              }}
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
