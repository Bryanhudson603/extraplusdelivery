import './globals.css';
import { ReactNode } from 'react';
import { ThemeProvider } from '@/components/ThemeProvider';
import { ThemeToggle } from '@/components/ThemeToggle';
import { CartProvider } from '@/components/CartProvider';
import { PwaInstaller } from '@/components/PwaInstaller';
import { MainShell } from '@/components/MainShell';
import { PwaPrompt } from '@/components/PwaPrompt';

export const metadata = {
  title: 'Dil Bebidas',
  description: 'App de bebidas da Dil Bebidas'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const enablePwa = process.env.VERCEL_ENV === 'production';
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {enablePwa ? <link rel="manifest" href="/manifest.webmanifest" /> : null}
        <meta name="theme-color" content="#2563eb" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body>
        <ThemeProvider>
          <CartProvider>
            <ThemeToggle />
            <MainShell>{children}</MainShell>
          </CartProvider>
          <script dangerouslySetInnerHTML={{ __html: `window.__cart__=window.__cart__||[]` }} />
          <PwaInstaller />
          <PwaPrompt />
        </ThemeProvider>
      </body>
    </html>
  );
}
