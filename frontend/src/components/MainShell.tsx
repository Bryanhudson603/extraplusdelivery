'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';

export function MainShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith('/admin');

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col mx-auto w-full max-w-md md:max-w-5xl lg:max-w-6xl md:px-4">
      {children}
    </div>
  );
}

