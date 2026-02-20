import { StoreSettings } from '@/lib/data';

export function StoreHeader({ store }: { store: StoreSettings }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-lg font-bold">{store.name}</div>
        <div className="text-xs text-gray-600 dark:text-zinc-400">
          {store.open ? 'Aberta' : 'Fechada'} • {store.address}
        </div>
      </div>
      <div className="text-xs text-gray-600 dark:text-zinc-400">{store.phone}</div>
    </div>
  );
}
