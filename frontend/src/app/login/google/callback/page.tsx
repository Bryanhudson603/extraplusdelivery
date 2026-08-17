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

export default function GoogleLoginCallbackPage() {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
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

        // Primeiro cadastro via Google: ainda nao tem endereco guardado no
        // backend, entao pedimos uma vez aqui. Depois de salvo, fica
        // armazenado no cliente e nunca mais pede de novo.
        if (resposta.novoCadastro && !resposta.endereco?.trim()) {
          setPedirEndereco(true);
          return;
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
