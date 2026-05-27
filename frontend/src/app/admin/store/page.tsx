'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Loja = {
  id: string;
  nome: string;
  slug: string;
};

type AdminSession = {
  tipo: 'admin';
  adminId: string;
  username: string;
  loja: Loja;
};

const SESSION_KEY = 'extraplus-session';

export default function AdminStoreConfirmPage() {
  const router = useRouter();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const raw = window.localStorage.getItem(SESSION_KEY);
      if (!raw) {
        router.replace('/admin/login');
        return;
      }
      const parsed = JSON.parse(raw) as AdminSession;
      if (!parsed || parsed.tipo !== 'admin') {
        router.replace('/admin/login');
        return;
      }
      setSession(parsed);
    } catch {
      router.replace('/admin/login');
      return;
    } finally {
      setLoading(false);
    }
  }, [router]);

  function confirmarLoja() {
    router.replace('/admin');
  }

  if (loading || !session) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-950">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  const loja = session.loja;

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-950 px-4">
      <div className="w-full max-w-sm bg-white border border-gray-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.replace('/admin/login')}
            className="text-[11px] text-gray-600 hover:text-amber-600 dark:text-zinc-400 dark:hover:text-amber-400"
          >
            ← Voltar
          </button>
          <span className="text-[11px] text-gray-600 dark:text-zinc-500">
            Lojista:{' '}
            <span className="text-gray-900 font-medium dark:text-zinc-200">{session.username}</span>
          </span>
        </div>

        <div className="space-y-1">
          <p className="text-xs text-amber-400 font-semibold uppercase tracking-wide">Confirmar loja</p>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Esta é a sua loja?</h1>
          <p className="text-xs text-gray-600 dark:text-zinc-400">
            Confirme para acessar o painel de gestão da {loja.nome}.
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-gray-50 dark:border-zinc-800 dark:bg-zinc-950 p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white">{loja.nome}</div>
              <div className="text-[11px] text-gray-600 dark:text-zinc-500">ID: {loja.id}</div>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded-full border border-amber-500/60 text-amber-400">
              Dilbebidas
            </span>
          </div>
          <div className="text-[11px] text-gray-600 dark:text-zinc-500">
            Caso não seja sua loja, saia e entre com outro usuário.
          </div>
        </div>

        <button
          type="button"
          onClick={confirmarLoja}
          className="w-full h-10 rounded-full bg-amber-500 hover:bg-amber-600 text-black text-sm font-semibold"
        >
          Sim, acessar painel
        </button>
      </div>
    </main>
  );
}
