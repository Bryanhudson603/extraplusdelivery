'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { BrandLogo } from '@/components/BrandLogo';

type PlatformLoginResponse = {
  tipo: 'plataforma';
  adminId: string;
  username: string;
};

const SESSION_KEY = 'extraplus-platform-session';

export default function PlatformLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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
    <main className="min-h-screen flex items-center justify-center bg-[var(--brand-soft-bg)] dark:bg-zinc-950 px-4">
      <div className="w-full max-w-sm bg-[var(--brand-soft-surface)] border border-[var(--brand-soft-border)] dark:bg-zinc-900 dark:border-zinc-800 rounded-2xl p-6 space-y-6 shadow-sm">
        <div className="space-y-3">
          <div className="flex justify-center">
            <BrandLogo size={120} priority />
          </div>
          <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide text-center">Plataforma</p>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Login do sistema</h1>
          <p className="text-xs text-gray-600 dark:text-zinc-400">
            Acesso para gerenciar lojas e usuários dos seus clientes.
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

          {erro && <div className="text-xs text-red-500">{erro}</div>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-60"
          >
            {submitting ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </main>
  );
}
