'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { BrandLogo } from '@/components/BrandLogo';
import { GoogleLoginButton } from '@/components/GoogleLoginButton';
import { DELIVERY_NEIGHBORHOODS, FIXED_CITY_NAME, formatClientAddress } from '@/lib/delivery';

const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  google_not_configured: 'Login com Google indisponível no momento.',
  google_auth_denied: 'Login com Google cancelado.',
  google_auth_failed: 'Não foi possível concluir o login com Google. Tente novamente.'
};

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
  const [rua, setRua] = useState('');
  const [bairro, setBairro] = useState(DELIVERY_NEIGHBORHOODS[0]?.nome || '');
  const [telefone, setTelefone] = useState('');
  const [senha, setSenha] = useState('');
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
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const errorCode = params.get('error');
    if (errorCode) {
      setErro(GOOGLE_ERROR_MESSAGES[errorCode] || 'Não foi possível entrar com o Google.');
      window.history.replaceState(null, '', '/login');
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
          rua,
          bairro,
          cidade: FIXED_CITY_NAME
        });
      }

      if (typeof window !== 'undefined') {
        const endereco = formatClientAddress(rua, bairro);
        window.localStorage.setItem(
          SESSION_KEY,
          JSON.stringify(
            modo === 'register'
              ? {
                  ...resposta,
                  endereco,
                  rua,
                  bairro,
                  cidade: FIXED_CITY_NAME
                }
              : resposta
          )
        );
      }

      router.replace('/stores');
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
          setErro('Telefone ou senha inválidos.');
        } else {
          setErro(`Erro na API (${e.status}).`);
        }
      } else {
        setErro(e instanceof Error ? e.message : 'Falha ao conectar na API.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  const lojaNome = lojas.length > 0 ? lojas[0].nome : 'Dil Bebidas';
  const bloqueadoSemLojas = !loadingLojas && lojas.length === 0;

  return (
    <main className="min-h-screen flex items-center justify-center bg-[var(--brand-soft-bg)] dark:bg-zinc-950 px-4">
      <div className="w-full max-w-sm bg-[var(--brand-soft-surface)] border border-[var(--brand-soft-border)] dark:bg-zinc-900 dark:border-zinc-800 rounded-2xl p-6 space-y-6 shadow-sm">
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
            className="text-[11px] text-gray-600 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400"
          >
            ← Voltar
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex justify-center">
            <BrandLogo size={128} priority />
          </div>
          <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide text-center">{lojaNome}</p>
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
          <div className="text-xs rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300 px-3 py-2">
            Nenhuma loja cadastrada. Acesse /platform para cadastrar uma loja primeiro.
          </div>
        )}

        <div className="flex items-center gap-2 text-[11px] bg-blue-50 border border-blue-100 dark:bg-zinc-950 dark:border-zinc-800 rounded-full p-1">
          <button
            type="button"
            onClick={() => setModo('login')}
            className={`flex-1 py-1 rounded-full text-center ${
              modo === 'login' ? 'bg-blue-600 text-white font-semibold' : 'text-gray-700 dark:text-zinc-300'
            }`}
          >
            Já tenho conta
          </button>
          <button
            type="button"
            onClick={() => setModo('register')}
            className={`flex-1 py-1 rounded-full text-center ${
              modo === 'register' ? 'bg-blue-600 text-white font-semibold' : 'text-gray-700 dark:text-zinc-300'
            }`}
          >
            Criar conta
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          {modo === 'register' && (
            <>
              <div className="space-y-1">
                <label className="text-xs text-gray-600 dark:text-zinc-400">Nome completo</label>
                <input
                  type="text"
                  autoComplete="off"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  className="w-full h-10 rounded-lg bg-white border border-gray-300 px-3 text-sm text-gray-900 outline-none dark:bg-zinc-950 dark:border-zinc-700 dark:text-zinc-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-600 dark:text-zinc-400">Rua</label>
                <input
                  type="text"
                  autoComplete="off"
                  value={rua}
                  onChange={e => setRua(e.target.value)}
                  className="w-full h-10 rounded-lg bg-white border border-gray-300 px-3 text-sm text-gray-900 outline-none dark:bg-zinc-950 dark:border-zinc-700 dark:text-zinc-100"
                  placeholder="Ex: Rua Sao Jose, 120"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-600 dark:text-zinc-400">Bairro</label>
                <select
                  value={bairro}
                  onChange={e => setBairro(e.target.value)}
                  className="w-full h-10 rounded-lg bg-white border border-gray-300 px-3 text-sm text-gray-900 outline-none dark:bg-zinc-950 dark:border-zinc-700 dark:text-zinc-100"
                >
                  {DELIVERY_NEIGHBORHOODS.map(item => (
                    <option key={item.nome} value={item.nome}>
                      {item.nome}
                      {item.taxaEntrega > 0 ? ` • taxa R$ ${item.taxaEntrega.toFixed(2)}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-600 dark:text-zinc-400">Cidade</label>
                <input
                  type="text"
                  value={FIXED_CITY_NAME}
                  readOnly
                  className="w-full h-10 rounded-lg bg-gray-100 border border-gray-300 px-3 text-sm text-gray-700 outline-none dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-200"
                />
              </div>
            </>
          )}

          <div className="space-y-1">
            <label className="text-xs text-gray-600 dark:text-zinc-400">Telefone</label>
            <input
              type="tel"
              autoComplete="off"
              value={telefone}
              onChange={e => setTelefone(e.target.value)}
              className="w-full h-10 rounded-lg bg-white border border-gray-300 px-3 text-sm text-gray-900 outline-none dark:bg-zinc-950 dark:border-zinc-700 dark:text-zinc-100"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-gray-600 dark:text-zinc-400">Senha</label>
            <input
              type="password"
              autoComplete="off"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              className="w-full h-10 rounded-lg bg-white border border-gray-300 px-3 text-sm text-gray-900 outline-none dark:bg-zinc-950 dark:border-zinc-700 dark:text-zinc-100"
            />
          </div>

          {erro && <div className="text-xs text-red-400">{erro}</div>}

          <button
            type="submit"
            disabled={submitting || bloqueadoSemLojas}
            className="w-full h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed mt-2"
          >
            {submitting ? (modo === 'login' ? 'Entrando...' : 'Cadastrando...') : modo === 'login' ? 'Entrar' : 'Cadastrar'}
          </button>
        </form>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-200 dark:bg-zinc-800" />
          <span className="text-[11px] text-gray-500 dark:text-zinc-500">ou</span>
          <div className="h-px flex-1 bg-gray-200 dark:bg-zinc-800" />
        </div>

        <GoogleLoginButton disabled={bloqueadoSemLojas} />
      </div>
    </main>
  );
}
