import './globals.css';
import { ReactNode } from 'react';
import { ThemeProvider } from '@/components/ThemeProvider';
import { ThemeToggle } from '@/components/ThemeToggle';
import { CartProvider } from '@/components/CartProvider';
import { PwaInstaller } from '@/components/PwaInstaller';
import { MainShell } from '@/components/MainShell';
import { PwaPrompt } from '@/components/PwaPrompt';

export const metadata = {
  title: 'Extraplus Delivery',
  description: 'App de bebidas em PWA'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#EA1D2C" />
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
