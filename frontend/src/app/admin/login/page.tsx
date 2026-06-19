'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';

type Loja = {
  id: string;
  nome: string;
  slug: string;
};

type AdminLoginResponse = {
  tipo: 'admin';
  adminId: string;
  username: string;
  loja: Loja;
};

const SESSION_KEY = 'extraplus-session';

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const raw = window.localStorage.getItem(SESSION_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.tipo === 'admin') {
        router.replace('/admin');
      }
    } catch {
    }
  }, [router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setErro(null);

    try {
      const resposta = await api.post<AdminLoginResponse>('/auth/login-admin', {
        username,
        password
      });

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(SESSION_KEY, JSON.stringify(resposta));
      }

      router.replace('/admin/store');
    } catch (e) {
      if (e instanceof ApiError) {
        if (typeof e.payload === 'object' && e.payload && 'message' in (e.payload as any)) {
          const msg = (e.payload as any).message;
          const detail = (e.payload as any).detail;
          const bodySnippet = (e.payload as any).body;
          const base = Array.isArray(msg) ? msg.join(', ') : String(msg);
          const extra = [
            typeof detail === 'string' && detail.trim() ? detail.trim() : null,
            typeof bodySnippet === 'string' && bodySnippet.trim() ? bodySnippet.trim() : null
          ]
            .filter(Boolean)
            .join(' | ');
          setErro(extra ? `${base} | ${extra}` : base);
        } else if (typeof e.payload === 'string' && e.payload.trim()) {
          setErro(e.payload);
        } else if (e.status === 401) {
          setErro('Usuário ou senha inválidos');
        } else {
          setErro(`Erro na API (${e.status})`);
        }
      } else {
        setErro(e instanceof Error ? e.message : 'Falha ao conectar na API');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-950 px-4">
      <div className="w-full max-w-sm bg-white border border-gray-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-2xl p-6 space-y-6">
        <div className="space-y-1">
          <p className="text-xs text-amber-400 font-semibold uppercase tracking-wide">Dilbebidas</p>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Login do lojista</h1>
          <p className="text-xs text-gray-600 dark:text-zinc-400">
            Acesse o painel administrativo para gerenciar pedidos e produtos.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          <div className="space-y-1">
            <label className="text-xs text-gray-600 dark:text-zinc-400">Usuário</label>
            <input
              type="text"
              autoComplete="off"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full h-10 rounded-lg bg-white border border-gray-300 px-3 text-sm text-gray-900 outline-none dark:bg-zinc-950 dark:border-zinc-700 dark:text-zinc-100"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-gray-600 dark:text-zinc-400">Senha</label>
            <input
              type="password"
              autoComplete="off"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full h-10 rounded-lg bg-white border border-gray-300 px-3 text-sm text-gray-900 outline-none dark:bg-zinc-950 dark:border-zinc-700 dark:text-zinc-100"
            />
          </div>

          {erro && <div className="text-xs text-red-400">{erro}</div>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-10 rounded-full bg-amber-500 hover:bg-amber-600 text-black text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed mt-2"
          >
            {submitting ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="text-[11px] text-gray-600 dark:text-zinc-500">
          Cliente? Acesse o app pelo login de cliente e faça seus pedidos normalmente.
        </div>
      </div>
    </main>
  );
}
