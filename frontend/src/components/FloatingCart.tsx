export function FloatingCart({ count = 0, onOpen }: { count?: number; onOpen?: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="fixed bottom-16 right-4 h-12 px-4 rounded-full bg-brand-red text-white text-sm font-semibold shadow-lg"
    >
      Carrinho {count > 0 ? `(${count})` : ''}
    </button>
  );
}
