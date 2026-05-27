'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';

type Loja = {
  id: string;
  nome: string;
  slug: string;
};

type ClienteLoginResponse = {
  tipo: 'cliente';
  clienteId: string;
  telefone: string;
  nome: string;
  endereco: string;
  loja: Loja;
};

const SESSION_KEY = 'extraplus-session';

export default function ClientLoginPage() {
  const router = useRouter();
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [loadingLojas, setLoadingLojas] = useState(true);
  const [modo, setModo] = useState<'login' | 'register'>('login');
  const [nome, setNome] = useState('');
  const [endereco, setEndereco] = useState('');
  const [telefone, setTelefone] = useState('82993107309');
  const [senha, setSenha] = useState('123456');
  const [submitting, setSubmitting] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const raw = window.localStorage.getItem(SESSION_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.tipo === 'cliente') {
        router.replace('/stores');
      }
    } catch {
    }
  }, [router]);

  useEffect(() => {
    let mounted = true;
    async function carregarLojas() {
      setLoadingLojas(true);
      try {
        const resp = await api.get<Loja[]>('/auth/lojas');
        if (mounted) setLojas(Array.isArray(resp) ? resp : []);
      } catch {
        if (mounted) setLojas([]);
      } finally {
        if (mounted) setLoadingLojas(false);
      }
    }
    carregarLojas();
    return () => {
      mounted = false;
    };
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setErro(null);

    try {
      let resposta: ClienteLoginResponse;

      if (modo === 'login') {
        resposta = await api.post<ClienteLoginResponse>('/auth/login-cliente', {
          telefone,
          senha
        });
      } else {
        resposta = await api.post<ClienteLoginResponse>('/auth/register-cliente', {
          nome,
          telefone,
          senha,
          endereco
        });
      }

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(SESSION_KEY, JSON.stringify(resposta));
      }

      router.replace('/stores');
    } catch (e) {
      if (e instanceof ApiError) {
        if (typeof e.payload === 'object' && e.payload && 'message' in (e.payload as any)) {
          setErro(String((e.payload as any).message));
        } else if (e.status === 401) {
          setErro('Telefone ou senha inválidos.');
        } else {
          setErro(`Erro na API (${e.status}).`);
        }
      } else {
        setErro('Falha ao conectar na API.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  const lojaNome = lojas.length > 0 ? lojas[0].nome : 'Extraplus';
  const bloqueadoSemLojas = !loadingLojas && lojas.length === 0;

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-950 px-4">
      <div className="w-full max-w-sm bg-white border border-gray-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-2xl p-6 space-y-6">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined' && window.history.length > 1) {
                router.back();
              } else {
                router.push('/');
              }
            }}
            className="text-[11px] text-gray-600 hover:text-amber-600 dark:text-zinc-400 dark:hover:text-amber-400"
          >
            ← Voltar
          </button>
        </div>

        <div className="space-y-1">
          <p className="text-xs text-amber-400 font-semibold uppercase tracking-wide">{lojaNome}</p>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            {modo === 'login' ? 'Entrar no app' : 'Criar meu cadastro'}
          </h1>
          <p className="text-xs text-gray-600 dark:text-zinc-400">
            {modo === 'login'
              ? 'Use seu telefone para acessar seus pedidos e fazer novas compras.'
              : 'Informe seus dados para criar sua conta e comprar com mais facilidade.'}
          </p>
        </div>

        {bloqueadoSemLojas && (
          <div className="text-xs rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 px-3 py-2">
            Nenhuma loja cadastrada. Acesse /platform para cadastrar uma loja primeiro.
          </div>
        )}

        <div className="flex items-center gap-2 text-[11px] bg-gray-100 border border-gray-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-full p-1">
          <button
            type="button"
            onClick={() => setModo('login')}
            className={`flex-1 py-1 rounded-full text-center ${
              modo === 'login' ? 'bg-amber-500 text-black font-semibold' : 'text-gray-700 dark:text-zinc-300'
            }`}
          >
            Já tenho conta
          </button>
          <button
            type="button"
            onClick={() => setModo('register')}
            className={`flex-1 py-1 rounded-full text-center ${
              modo === 'register' ? 'bg-amber-500 text-black font-semibold' : 'text-gray-700 dark:text-zinc-300'
            }`}
          >
            Criar conta
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {modo === 'register' && (
            <>
              <div className="space-y-1">
                <label className="text-xs text-gray-600 dark:text-zinc-400">Nome completo</label>
                <input
                  type="text"
                  autoComplete="name"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  className="w-full h-10 rounded-lg bg-white border border-gray-300 px-3 text-sm text-gray-900 outline-none dark:bg-zinc-950 dark:border-zinc-700 dark:text-zinc-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-600 dark:text-zinc-400">Endereço</label>
                <input
                  type="text"
                  autoComplete="street-address"
                  value={endereco}
                  onChange={e => setEndereco(e.target.value)}
                  className="w-full h-10 rounded-lg bg-white border border-gray-300 px-3 text-sm text-gray-900 outline-none dark:bg-zinc-950 dark:border-zinc-700 dark:text-zinc-100"
                />
              </div>
            </>
          )}

          <div className="space-y-1">
            <label className="text-xs text-gray-600 dark:text-zinc-400">Telefone</label>
            <input
              type="tel"
              autoComplete="tel"
              value={telefone}
              onChange={e => setTelefone(e.target.value)}
              className="w-full h-10 rounded-lg bg-white border border-gray-300 px-3 text-sm text-gray-900 outline-none dark:bg-zinc-950 dark:border-zinc-700 dark:text-zinc-100"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-gray-600 dark:text-zinc-400">Senha</label>
            <input
              type="password"
              autoComplete="current-password"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              className="w-full h-10 rounded-lg bg-white border border-gray-300 px-3 text-sm text-gray-900 outline-none dark:bg-zinc-950 dark:border-zinc-700 dark:text-zinc-100"
            />
          </div>

          {erro && <div className="text-xs text-red-400">{erro}</div>}

          <button
            type="submit"
            disabled={submitting || bloqueadoSemLojas}
            className="w-full h-10 rounded-full bg-amber-500 hover:bg-amber-600 text-black text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed mt-2"
          >
            {submitting ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="text-[11px] text-gray-600 dark:text-zinc-500">
          Lojista? Acesse o painel em{' '}
          <button
            type="button"
            onClick={() => router.push('/admin/login')}
            className="text-amber-400 underline underline-offset-2"
          >
            login do lojista
          </button>
          .
        </div>
      </div>
    </main>
  );
}
