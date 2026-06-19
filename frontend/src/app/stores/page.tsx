'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { BrandLogo } from '@/components/BrandLogo';

type Loja = {
  id: string;
  nome: string;
  slug: string;
};

const SESSION_KEY = 'extraplus-session';
const STORE_KEY = 'extraplus-store';

export default function StoreSelectPage() {
  const router = useRouter();
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const raw = window.localStorage.getItem(SESSION_KEY);
      if (!raw) {
        router.replace('/login');
        return;
      }
      const parsed = JSON.parse(raw);
      if (parsed?.tipo !== 'cliente') {
        router.replace('/login');
        return;
      }
    } catch {
      router.replace('/login');
      return;
    }
  }, [router]);

  useEffect(() => {
    async function carregar() {
      try {
        const resposta = await api.get<Loja[]>('/auth/lojas');
        if (resposta && resposta.length > 0) {
          setLojas(resposta);
        } else {
          setLojas([]);
        }
      } catch (e) {
        console.error('Erro ao carregar lojas', e);
        setLojas([]);
      } finally {
        setLoading(false);
      }
    }
    carregar();
  }, []);

  function selecionarLoja(loja: Loja) {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORE_KEY, JSON.stringify(loja));
    }
    router.replace('/home');
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[var(--brand-soft-bg)] dark:bg-zinc-950">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[var(--brand-soft-bg)] dark:bg-zinc-950 px-4">
      <div className="w-full max-w-md bg-[var(--brand-soft-surface)] border border-[var(--brand-soft-border)] dark:bg-zinc-900 dark:border-zinc-800 rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.replace('/login')}
            className="text-[11px] text-gray-600 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400"
          >
            ← Voltar
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex justify-center">
            <BrandLogo size={120} priority />
          </div>
          <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide text-center">
            Escolha a loja
          </p>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Onde você quer comprar?</h1>
          <p className="text-xs text-gray-600 dark:text-zinc-400">
            Selecione a loja para ver os produtos e fazer seu pedido.
          </p>
        </div>

        <div className="space-y-3 mt-2">
          {lojas.map(loja => (
            <button
              key={loja.id}
              type="button"
              onClick={() => selecionarLoja(loja)}
              className="w-full text-left p-4 rounded-xl border border-blue-100 bg-white hover:border-blue-500 hover:bg-blue-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-blue-500 dark:hover:bg-zinc-900 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">{loja.nome}</div>
                  <div className="text-[11px] text-gray-600 dark:text-zinc-500">Clique para comprar nesta loja</div>
                </div>
                <span className="text-blue-600 text-sm">Selecionar →</span>
              </div>
            </button>
          ))}

          {lojas.length === 0 && (
            <div className="text-xs text-gray-600 dark:text-zinc-500">Nenhuma loja disponível no momento.</div>
          )}
        </div>
      </div>
    </main>
  );
}
