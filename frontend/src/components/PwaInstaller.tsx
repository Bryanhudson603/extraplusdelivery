'use client';

import { useEffect } from 'react';

export function PwaInstaller() {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    const hostname = window.location.hostname;
    const isVercelPreview = hostname.endsWith('.vercel.app') && hostname !== 'extraplusdelivery.vercel.app';
    if (isVercelPreview) return;
    if (process.env.NODE_ENV !== 'production') {
      navigator.serviceWorker.getRegistrations().then(regs => {
        regs.forEach(r => r.unregister());
      });
      if ('caches' in window) {
        caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
      }
      return;
    }
    const register = () => {
      navigator.serviceWorker
        .register('/sw.js')
        .catch(() => {});
    };
    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', register, { once: true });
    }
  }, []);

  return null;
}
