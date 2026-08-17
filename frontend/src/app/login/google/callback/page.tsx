'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { BrandLogo } from '@/components/BrandLogo';
import { AddressModal } from '@/components/AddressModal';
import { saveAddresses, syncSessionEndereco, toCompatAddressString } from '@/lib/addresses';
import type { AddressRecord } from '@/lib/addresses';

type ClienteLoginResponse = {
  tipo: 'cliente';
  clienteId: string;
  telefone: string;
  nome: string;
  endereco: string;
  loja: { id: string; nome: string; slug: string };
  novoCadastro?: boolean;
};

const SESSION_KEY = 'extraplus-session';

function atualizarSessaoLocal(patch: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    window.localStorage.setItem(SESSION_KEY, JSON.stringify({ ...parsed, ...patch }));
  } catch {
  }
}

export default function GoogleLoginCallbackPage() {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [pedirTelefone, setPedirTelefone] = useState(false);
  const [telefoneInput, setTelefoneInput] = useState('');
  const [erroTelefone, setErroTelefone] = useState<string | null>(null);
  const [salvandoTelefone, setSalvandoTelefone] = useState(false);
  const [pedirEndereco, setPedirEndereco] = useState(false);
  const [salvandoEndereco, setSalvandoEndereco] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    async function concluirLogin() {
      const params = new URLSearchParams(window.location.search);
      const ticket = params.get('ticket');

      if (!ticket) {
        setErro('Link de login com Google inválido ou expirado.');
        return;
      }

      try {
        const resposta = await api.post<ClienteLoginResponse>('/auth/google/exchange', { ticket });
        window.localStorage.setItem(SESSION_KEY, JSON.stringify(resposta));

        // Primeiro cadastro via Google: telefone e obrigatorio (usado como
        // segunda chave pra vincular os pedidos do cliente com confianca) e
        // endereco e pedido em seguida. Uma vez salvos no backend, ficam
        // guardados na conta e nunca mais pedimos de novo.
        if (resposta.novoCadastro) {
          if (!resposta.telefone?.trim()) {
            setPedirTelefone(true);
            return;
          }
          if (!resposta.endereco?.trim()) {
            setPedirEndereco(true);
            return;
          }
        }

        router.replace('/stores');
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          setErro('Este link de login com Google já expirou. Tente novamente.');
        } else {
          setErro('Não foi possível concluir o login com Google.');
        }
      }
    }

    concluirLogin();
  }, [router]);

  async function salvarTelefoneInicial() {
    if (salvandoTelefone) return;
    const telefone = telefoneInput.replace(/\D/g, '');
    if (telefone.length < 10) {
      setErroTelefone('Informe um telefone válido, com DDD.');
      return;
    }

    setSalvandoTelefone(true);
    setErroTelefone(null);
    try {
      await api.put('/clientes/me', { telefone });
      atualizarSessaoLocal({ telefone });
      setPedirTelefone(false);

      const raw = window.localStorage.getItem(SESSION_KEY);
      const enderecoAtual = raw ? (JSON.parse(raw)?.endereco as string | undefined) : undefined;
      if (!enderecoAtual?.trim()) {
        setPedirEndereco(true);
      } else {
        router.replace('/stores');
      }
    } catch (e) {
      console.error('Erro ao salvar telefone inicial do cadastro Google', e);
      setErroTelefone('Não foi possível salvar o telefone. Tente novamente.');
    } finally {
      setSalvandoTelefone(false);
    }
  }

  async function salvarEnderecoInicial(endereco: AddressRecord) {
    setSalvandoEndereco(true);
    try {
      saveAddresses([endereco]);
      syncSessionEndereco(endereco);
      await api.put('/clientes/me', { endereco: toCompatAddressString(endereco) });
    } catch (e) {
      console.error('Erro ao salvar endereço inicial do cadastro Google', e);
    } finally {
      setSalvandoEndereco(false);
      setPedirEndereco(false);
      router.replace('/stores');
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[var(--brand-soft-bg)] dark:bg-zinc-950 px-4">
      <div className="w-full max-w-sm bg-[var(--brand-soft-surface)] border border-[var(--brand-soft-border)] dark:bg-zinc-900 dark:border-zinc-800 rounded-2xl p-6 space-y-4 text-center shadow-sm">
        <div className="flex justify-center">
          <BrandLogo size={96} priority />
        </div>

        {erro ? (
          <>
            <p className="text-sm text-red-500">{erro}</p>
            <button
              type="button"
              onClick={() => router.replace('/login')}
              className="w-full h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
            >
              Voltar para o login
            </button>
          </>
        ) : pedirTelefone ? (
          <div className="space-y-3 text-left">
            <p className="text-sm text-gray-600 dark:text-zinc-400 text-center">
              Falta pouco! Informe seu telefone com DDD para concluir o cadastro.
            </p>
            <input
              type="tel"
              inputMode="numeric"
              autoFocus
              value={telefoneInput}
              onChange={e => setTelefoneInput(e.target.value)}
              placeholder="(82) 99999-9999"
              className="w-full h-11 rounded-full border border-[var(--brand-soft-border)] bg-white dark:bg-zinc-950 px-4 text-sm text-center outline-none dark:text-zinc-100"
            />
            {erroTelefone && <p className="text-xs text-red-500 text-center">{erroTelefone}</p>}
            <button
              type="button"
              disabled={salvandoTelefone}
              onClick={() => void salvarTelefoneInicial()}
              className="w-full h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-60"
            >
              {salvandoTelefone ? 'Salvando...' : 'Continuar'}
            </button>
          </div>
        ) : pedirEndereco ? (
          <p className="text-sm text-gray-600 dark:text-zinc-400">
            Falta pouco! Informe seu endereço de entrega para concluir o cadastro.
          </p>
        ) : (
          <p className="text-sm text-gray-600 dark:text-zinc-400">Entrando com sua conta Google...</p>
        )}
      </div>

      <AddressModal
        open={pedirEndereco}
        initialAddress={null}
        onClose={() => {
          // Pulou por agora: continua sem endereco, sera perguntado de novo
          // no proximo login enquanto nao houver endereco salvo.
          setPedirEndereco(false);
          router.replace('/stores');
        }}
        onSave={endereco => {
          if (!salvandoEndereco) void salvarEnderecoInicial(endereco);
        }}
      />
    </main>
  );
}
