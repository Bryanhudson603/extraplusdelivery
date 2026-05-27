'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';

type PlatformLoginResponse = {
  tipo: 'plataforma';
  adminId: string;
  username: string;
};

const SESSION_KEY = 'extraplus-platform-session';

export default function PlatformLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('bhnsilva');
  const [password, setPassword] = useState('Brasill1');
  const [submitting, setSubmitting] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setErro(null);

    try {
      const resp = await api.post<PlatformLoginResponse>('/auth/login-plataforma', {
        username,
        password
      });

      window.localStorage.setItem(SESSION_KEY, JSON.stringify(resp));
      router.replace('/platform');
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setErro('Usuário ou senha inválidos');
      } else if (e instanceof ApiError) {
        if (typeof e.payload === 'object' && e.payload && 'message' in (e.payload as any)) {
          setErro(String((e.payload as any).message));
        } else {
          setErro(`Erro na API (${e.status})`);
        }
      } else {
        setErro('Falha ao conectar na API');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-950 px-4">
      <div className="w-full max-w-sm bg-white border border-gray-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-2xl p-6 space-y-6">
        <div className="space-y-1">
          <p className="text-xs text-amber-500 font-semibold uppercase tracking-wide">Plataforma</p>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Login do sistema</h1>
          <p className="text-xs text-gray-600 dark:text-zinc-400">
            Acesso para gerenciar lojas e usuários dos seus clientes.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-gray-600 dark:text-zinc-400">Usuário</label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full h-10 rounded-lg bg-white border border-gray-300 px-3 text-sm text-gray-900 outline-none dark:bg-zinc-950 dark:border-zinc-700 dark:text-zinc-100"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-gray-600 dark:text-zinc-400">Senha</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full h-10 rounded-lg bg-white border border-gray-300 px-3 text-sm text-gray-900 outline-none dark:bg-zinc-950 dark:border-zinc-700 dark:text-zinc-100"
            />
          </div>

          {erro && <div className="text-xs text-red-500">{erro}</div>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-10 rounded-full bg-amber-500 hover:bg-amber-600 text-black text-sm font-semibold disabled:opacity-60"
          >
            {submitting ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </main>
  );
}
