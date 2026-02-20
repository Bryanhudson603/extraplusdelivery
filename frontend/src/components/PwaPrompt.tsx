'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

type DeferredPromptEvent = {
  prompt: () => void;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

export function PwaPrompt() {
  const pathname = usePathname();
  const [event, setEvent] = useState<DeferredPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  const isAdmin = pathname.startsWith('/admin');
   const isLogin = pathname.startsWith('/login');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handler = (e: Event) => {
      e.preventDefault();
      setEvent(e as unknown as DeferredPromptEvent);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  useEffect(() => {
    if (isAdmin) return;
    if (isLogin) {
      setVisible(true);
    }
  }, [isAdmin, isLogin]);

  if (!visible || isAdmin) {
    return null;
  }

  const handleInstall = async () => {
    if (!event) {
      if (typeof window !== 'undefined') {
        const ua = window.navigator.userAgent || '';
        const isIOS = /iPhone|iPad|iPod/.test(ua);
        if (isIOS) {
          window.alert(
            'No iPhone, para instalar vá em Compartilhar > Adicionar à Tela de Início.'
          );
        } else {
          window.alert(
            'Seu navegador ainda não liberou instalação automática. Use o menu do navegador e escolha "Adicionar à tela inicial".'
          );
        }
      }
      return;
    }
    event.prompt();
    try {
      await event.userChoice;
    } catch {
    }
    setVisible(false);
    setEvent(null);
  };

  const handleClose = () => {
    setVisible(false);
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-40 md:left-auto md:right-4 md:max-w-sm">
      <div className="rounded-2xl bg-zinc-900 text-white border border-zinc-700 shadow-xl p-4 flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-black text-lg">
          🍺
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold">Instalar Extraplus?</div>
          <div className="mt-1 text-xs text-zinc-300">
            Tenha acesso rápido ao app direto da tela inicial do seu celular.
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleInstall}
              className="flex-1 h-9 rounded-lg bg-amber-500 text-black text-xs font-semibold"
            >
              Instalar app
            </button>
            <button
              onClick={handleClose}
              className="px-3 h-9 rounded-lg border border-zinc-600 text-xs text-zinc-300"
            >
              Agora não
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
