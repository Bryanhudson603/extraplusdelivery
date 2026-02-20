'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

type Loja = {
  id: string;
  nome: string;
  slug: string;
};

const SESSION_KEY = 'extraplus-session';
const STORE_KEY = 'extraplus-store';
const DEFAULT_LOJA: Loja = {
  id: 'pc-bebidas',
  nome: 'PC Bebidas',
  slug: 'pc-bebidas'
};

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
          setLojas([DEFAULT_LOJA]);
        }
      } catch (e) {
        console.error('Erro ao carregar lojas', e);
        setLojas([DEFAULT_LOJA]);
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
      <main className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.replace('/login')}
            className="text-[11px] text-zinc-400 hover:text-amber-400"
          >
            ← Voltar
          </button>
        </div>

        <div className="space-y-1">
          <p className="text-xs text-amber-400 font-semibold uppercase tracking-wide">
            Escolha a loja
          </p>
          <h1 className="text-xl font-bold text-white">Onde você quer comprar?</h1>
          <p className="text-xs text-zinc-400">
            Selecione a loja para ver os produtos e fazer seu pedido.
          </p>
        </div>

        <div className="space-y-3 mt-2">
          {lojas.map(loja => (
            <button
              key={loja.id}
              type="button"
              onClick={() => selecionarLoja(loja)}
              className="w-full text-left p-4 rounded-xl border border-zinc-800 bg-zinc-950 hover:border-amber-500 hover:bg-zinc-900 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-white">{loja.nome}</div>
                  <div className="text-[11px] text-zinc-500">Clique para comprar nesta loja</div>
                </div>
                <span className="text-amber-400 text-sm">Selecionar →</span>
              </div>
            </button>
          ))}

          {lojas.length === 0 && (
            <div className="text-xs text-zinc-500">Nenhuma loja disponível no momento.</div>
          )}
        </div>
      </div>
    </main>
  );
}
