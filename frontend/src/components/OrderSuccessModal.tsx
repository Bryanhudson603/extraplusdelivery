'use client';

import { useState } from 'react';

const WHATSAPP_NUMBER = '558288430373';
const MENSAGEM_PADRAO = 'Aqui está minha localização exata para entrega do pedido.';

type GeoStatus = 'idle' | 'buscando' | 'negado' | 'indisponivel' | 'enviado';

type Props = {
  open: boolean;
  pedidoId?: string;
  total?: number;
  pixPayload?: string | null;
  onDismiss: () => void;
};

function abrirWhatsApp(mensagem: string) {
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(mensagem)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function OrderSuccessModal({ open, pedidoId, total, pixPayload, onDismiss }: Props) {
  const [geoStatus, setGeoStatus] = useState<GeoStatus>('idle');

  if (!open) return null;

  function solicitarLocalizacao() {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setGeoStatus('indisponivel');
      return;
    }

    setGeoStatus('buscando');
    navigator.geolocation.getCurrentPosition(
      position => {
        const { latitude, longitude } = position.coords;
        const link = `https://www.google.com/maps?q=${latitude},${longitude}`;
        abrirWhatsApp(`${MENSAGEM_PADRAO}\n${link}`);
        setGeoStatus('enviado');
      },
      () => {
        setGeoStatus('negado');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  function abrirSemLocalizacao() {
    abrirWhatsApp(MENSAGEM_PADRAO);
    setGeoStatus('enviado');
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center">
      <div className="w-full max-w-md mx-auto bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-t-2xl sm:rounded-2xl p-6 space-y-4 text-center">
        <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto text-3xl">
          ✅
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Pedido realizado com sucesso!</h2>
          {pedidoId && (
            <p className="text-xs text-gray-500 dark:text-zinc-500 mt-1">
              Pedido #{pedidoId.slice(0, 8).toUpperCase()}
              {typeof total === 'number' ? ` • R$ ${total.toFixed(2)}` : ''}
            </p>
          )}
        </div>

        {pixPayload && (
          <div className="text-left">
            <p className="text-xs text-gray-600 dark:text-zinc-400 mb-1">Código PIX gerado:</p>
            <div className="break-all rounded-lg bg-gray-50 border border-gray-200 dark:bg-zinc-950 dark:border-zinc-800 p-2 text-[11px] text-gray-700 dark:text-zinc-300">
              {pixPayload}
            </div>
          </div>
        )}

        <div className="bg-blue-50 dark:bg-zinc-950 border border-blue-100 dark:border-zinc-800 rounded-xl p-4 space-y-3">
          <p className="text-sm text-gray-700 dark:text-zinc-300">
            Para facilitar a entrega, envie sua localização exata pelo WhatsApp.
          </p>

          {geoStatus === 'idle' && (
            <button
              type="button"
              onClick={solicitarLocalizacao}
              className="w-full h-11 rounded-full bg-emerald-500 hover:bg-emerald-600 text-black text-sm font-semibold"
            >
              📍 Enviar minha localização pelo WhatsApp
            </button>
          )}

          {geoStatus === 'buscando' && (
            <div className="text-xs text-gray-600 dark:text-zinc-400 py-1">Obtendo sua localização...</div>
          )}

          {(geoStatus === 'negado' || geoStatus === 'indisponivel') && (
            <div className="space-y-2">
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Não conseguimos obter sua localização
                {geoStatus === 'negado' ? ' (permissão não concedida)' : ' (indisponível neste dispositivo)'}.
                Você ainda pode abrir o WhatsApp com uma mensagem padrão.
              </p>
              <button
                type="button"
                onClick={abrirSemLocalizacao}
                className="w-full h-11 rounded-full bg-white border border-gray-300 dark:bg-zinc-900 dark:border-zinc-700 text-gray-700 dark:text-zinc-200 text-sm font-semibold"
              >
                Abrir WhatsApp sem localização
              </button>
            </div>
          )}

          {geoStatus === 'enviado' && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400">
              WhatsApp aberto em outra aba. Confirme o envio da mensagem por lá.
            </p>
          )}

          <p className="text-[10px] text-gray-500 dark:text-zinc-500">
            Você vai enviar sua localização diretamente pelo WhatsApp da loja.
          </p>
        </div>

        <button type="button" onClick={onDismiss} className="w-full h-10 text-sm font-semibold text-gray-500 dark:text-zinc-400">
          Agora não
        </button>
      </div>
    </div>
  );
}
