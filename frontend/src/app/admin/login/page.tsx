'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

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
  const [username, setUsername] = useState('bhnsilva');
  const [password, setPassword] = useState('Brasill1');
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
      setErro('Usuário ou senha inválidos');
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6">
        <div className="space-y-1">
          <p className="text-xs text-amber-400 font-semibold uppercase tracking-wide">PC Bebidas</p>
          <h1 className="text-xl font-bold text-white">Login do lojista</h1>
          <p className="text-xs text-zinc-400">
            Acesse o painel administrativo para gerenciar pedidos e produtos.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-zinc-400">Usuário</label>
            <input
              type="text"
              autoComplete="username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full h-10 rounded-lg bg-zinc-950 border border-zinc-700 px-3 text-sm text-zinc-100 outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-zinc-400">Senha</label>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full h-10 rounded-lg bg-zinc-950 border border-zinc-700 px-3 text-sm text-zinc-100 outline-none"
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

        <div className="text-[11px] text-zinc-500">
          Cliente? Acesse o app pelo login de cliente e faça seus pedidos normalmente.
        </div>
      </div>
    </main>
  );
}
