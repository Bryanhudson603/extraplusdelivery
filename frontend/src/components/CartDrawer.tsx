import { Product } from '@/lib/data';
import { AnimatePresence, motion } from 'framer-motion';

type Props = {
  open: boolean;
  items: { product: Product; qty: number }[];
  onClose: () => void;
  onCheckout?: () => void;
};

export function CartDrawer({ open, items, onClose, onCheckout }: Props) {
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
          className="fixed top-0 right-0 bottom-0 w-[85%] max-w-sm bg-white shadow-2xl border-l border-gray-200 z-50"
        >
          <div className="p-4 flex items-center justify-between border-b border-gray-200">
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
                <div key={it.product.id} className="flex items-center justify-between">
                  <div className="text-sm">{it.product.name} x{it.qty}</div>
                  <div className="text-sm font-semibold">
                    R$ {(it.qty * (it.product.promoPrice ?? it.product.price)).toFixed(2)}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-4 border-t border-gray-200">
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
