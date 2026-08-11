import { Category } from '@/lib/data';

type Props = {
  categories: Category[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
};

export function CategoryList({ categories, selectedId, onSelect }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
      {categories.map(cat => {
        const active = selectedId === cat.id;
        return (
          <button
            key={cat.id}
            onClick={() => onSelect?.(cat.id)}
            className={`flex-shrink-0 px-3 h-10 rounded-full border shadow-sm text-xs font-semibold transition-colors ${
              active
                ? 'bg-amber-500 border-amber-500 text-black'
                : 'bg-white border-gray-200 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100'
            }`}
            title={cat.name}
          >
            {cat.icon} {cat.name}
          </button>
        );
      })}
    </div>
  );
}
