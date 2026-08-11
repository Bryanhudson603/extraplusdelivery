import { Product } from '@/lib/data';
import { AnimatePresence, motion } from 'framer-motion';

type Props = {
  open: boolean;
  items: { product: Product; qty: number }[];
  onClose: () => void;
  onCheckout?: () => void;
  onRemove?: (productId: string) => void;
  onUpdateQuantity?: (productId: string, qty: number) => void;
};

export function CartDrawer({ open, items, onClose, onCheckout, onRemove, onUpdateQuantity }: Props) {
  const total = items.reduce((sum, it) => {
    const price = it.product.promoPrice ?? it.product.price;
    return sum + price * it.qty;
  }, 0);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'tween', duration: 0.2 }}
          className="fixed top-0 right-0 bottom-0 w-[85%] max-w-sm bg-[var(--brand-soft-surface)] shadow-2xl border-l border-[var(--brand-soft-border)] z-50"
        >
          <div className="p-4 flex items-center justify-between border-b border-[var(--brand-soft-border)]">
            <div className="text-sm font-semibold">Seu carrinho</div>
            <button className="text-sm text-gray-600" onClick={onClose}>
              Fechar
            </button>
          </div>

          <div className="p-4 flex-1 overflow-auto flex flex-col gap-3">
            {items.length === 0 ? (
              <div className="text-sm text-gray-500">Carrinho vazio</div>
            ) : (
              items.map(it => (
                <div
                  key={it.product.id}
                  className="flex items-center justify-between gap-2 pb-3 border-b border-[var(--brand-soft-border)] last:border-b-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm truncate">{it.product.name}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity?.(it.product.id, it.qty - 1)}
                        className="w-6 h-6 rounded-full border border-[var(--brand-soft-border)] text-xs flex items-center justify-center"
                        aria-label="Diminuir quantidade"
                      >
                        −
                      </button>
                      <span className="text-xs w-4 text-center">{it.qty}</span>
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity?.(it.product.id, it.qty + 1)}
                        className="w-6 h-6 rounded-full border border-[var(--brand-soft-border)] text-xs flex items-center justify-center"
                        aria-label="Aumentar quantidade"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <div className="text-sm font-semibold">
                      R$ {(it.qty * (it.product.promoPrice ?? it.product.price)).toFixed(2)}
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemove?.(it.product.id)}
                      className="text-[11px] text-red-600 hover:text-red-700"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-4 border-t border-[var(--brand-soft-border)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm">Subtotal</span>
              <span className="text-sm font-semibold">R$ {total.toFixed(2)}</span>
            </div>
            <button
              className="w-full h-12 rounded-lg bg-brand-red text-white text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={items.length === 0}
              onClick={onCheckout}
            >
              Finalizar pedido
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
