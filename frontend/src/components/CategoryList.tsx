import { Category } from '@/lib/data';

type Props = {
  categories: Category[];
  onSelect?: (id: string) => void;
};

export function CategoryList({ categories, onSelect }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
      {categories.map(cat => (
        <button
          key={cat.id}
          onClick={() => onSelect?.(cat.id)}
          className="flex-shrink-0 px-3 h-10 rounded-full bg-white border border-gray-200 shadow-sm text-xs font-semibold dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100"
          title={cat.name}
        >
          {cat.icon} {cat.name}
        </button>
      ))}
    </div>
  );
}
