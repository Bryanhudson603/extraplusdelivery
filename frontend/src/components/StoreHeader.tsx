import { StoreSettings } from '@/lib/data';
import { BrandLogo } from './BrandLogo';

export function StoreHeader({ store }: { store: StoreSettings }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-blue-100 bg-white/90 p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl overflow-hidden border border-blue-100 bg-blue-50 dark:border-zinc-700 dark:bg-zinc-800">
          <BrandLogo size={56} />
        </div>
        <div>
          <div className="text-lg font-bold text-slate-900 dark:text-white">{store.name || 'Dil Bebidas'}</div>
        <div className="text-xs text-gray-600 dark:text-zinc-400">
          {store.open ? 'Aberta' : 'Fechada'} • {store.address}
        </div>
      </div>
      </div>
      <div className="text-xs text-gray-600 dark:text-zinc-400">{store.phone}</div>
    </div>
  );
}
