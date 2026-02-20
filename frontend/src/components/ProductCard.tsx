 'use client';

import { useState } from 'react';
import Image from 'next/image';

type Props = {
  name: string;
  image: string;
  price?: number;
  promoPrice?: number;
  onAdd?: (quantity: number) => void;
  tags?: string[];
  packQuantity?: number;
  packPrice?: number;
};

export function ProductCard({ name, image, price, promoPrice, onAdd, tags, packQuantity, packPrice }: Props) {
  const [modalAberto, setModalAberto] = useState(false);
  const [modoModal, setModoModal] = useState<'unidades' | 'fardos'>('unidades');
  const [valorInput, setValorInput] = useState('1');

  const basePrice = Number(price ?? 0);
  const promo = promoPrice != null ? Number(promoPrice) : undefined;
  const isExternal = image.startsWith('http');
  const hasPack = typeof packQuantity === 'number' && packQuantity > 1;

  function handleAddUnits() {
    if (!onAdd) return;
    setModoModal('unidades');
    setValorInput('1');
    setModalAberto(true);
  }

  function handleAddPacks() {
    if (!onAdd || !hasPack || !packQuantity) return;
    setModoModal('fardos');
    setValorInput('1');
    setModalAberto(true);
  }

  function fecharModal() {
    setModalAberto(false);
  }

  function confirmarAdicionar() {
    if (!onAdd) return;
    const normalized = valorInput.replace(',', '.');
    const value = Number(normalized);
    if (!Number.isFinite(value) || value <= 0) return;
    const quantidadeBase = Math.floor(value);
    if (quantidadeBase <= 0) return;
    if (modoModal === 'unidades') {
      onAdd(quantidadeBase);
    } else if (modoModal === 'fardos' && hasPack && packQuantity) {
      const totalUnits = quantidadeBase * packQuantity;
      if (totalUnits <= 0) return;
      onAdd(totalUnits);
    }
    setModalAberto(false);
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 dark:bg-zinc-900 dark:border-zinc-800">
        <div className="relative w-full h-28 bg-gray-100 rounded dark:bg-zinc-800">
          {isExternal ? (
            <img src={image} alt={name} className="w-full h-full object-cover rounded" />
          ) : (
            <Image src={image} alt={name} fill className="object-cover rounded" />
          )}
        </div>
        <div className="mt-2">
          <div className="text-sm font-semibold dark:text-zinc-100">{name}</div>
          <div className="flex items-center gap-2 mt-1">
            {typeof promo === 'number' ? (
              <>
                <span className="text-xs line-through text-gray-500 dark:text-zinc-400">
                  R$ {basePrice.toFixed(2)}
                </span>
                <span className="text-sm font-bold text-brand-red">R$ {promo.toFixed(2)}</span>
              </>
            ) : (
              <span className="text-sm font-bold dark:text-zinc-100">R$ {basePrice.toFixed(2)}</span>
            )}
          </div>
          {tags && tags.length > 0 && (
            <div className="mt-1 flex gap-1 flex-wrap">
              {tags.slice(0, 2).map(t => (
                <span
                  key={t}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-300"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
          <div className="mt-2 flex gap-2">
            <button
              onClick={handleAddUnits}
              className="flex-1 h-10 rounded-lg bg-brand-red text-white text-sm font-semibold"
            >
              Adicionar
            </button>
            {hasPack && (
              <button
                onClick={handleAddPacks}
                className="h-10 px-3 rounded-lg bg-zinc-900 text-xs font-semibold text-zinc-100 border border-zinc-700"
              >
                Fardo {packQuantity}x
                {typeof packPrice === 'number' && (
                  <span className="block text-[10px] text-zinc-400">
                    R$ {packPrice.toFixed(2)}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {modalAberto && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-40"
            onClick={fecharModal}
          />
          <div className="fixed inset-x-0 bottom-0 max-w-md mx-auto bg-zinc-900 border-t border-zinc-800 rounded-t-2xl z-50">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <div>
                <div className="text-sm font-semibold text-white">
                  {modoModal === 'unidades'
                    ? 'Adicionar unidades'
                    : `Adicionar fardos de ${packQuantity} unidades`}
                </div>
                <p className="text-[11px] text-zinc-500">
                  Informe a quantidade que deseja adicionar ao carrinho.
                </p>
              </div>
              <button
                type="button"
                className="text-xs text-zinc-400"
                onClick={fecharModal}
              >
                Fechar
              </button>
            </div>
            <div className="px-4 py-3 space-y-3 max-h-80 overflow-y-auto">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">
                  {modoModal === 'unidades' ? 'Quantidade de unidades' : 'Quantidade de fardos'}
                </label>
                <input
                  type="number"
                  min={1}
                  value={valorInput}
                  onChange={e => setValorInput(e.target.value)}
                  className="w-full h-10 rounded-lg bg-zinc-950 border border-zinc-700 px-3 text-sm text-zinc-100 outline-none"
                />
              </div>
            </div>
            <div className="px-4 py-3 border-t border-zinc-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={fecharModal}
                className="h-9 px-4 rounded-full bg-zinc-800 text-zinc-100 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarAdicionar}
                className="h-9 px-4 rounded-full bg-amber-500 text-black text-xs font-semibold"
              >
                Adicionar
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
