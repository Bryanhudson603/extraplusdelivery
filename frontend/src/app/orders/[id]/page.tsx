'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { OrderStatusBadge } from '@/components/OrderStatusBadge';
import { api } from '@/lib/api';

type BackendOrderItem = {
  name: string;
  quantity: number;
};

type BackendOrder = {
  id: string;
  status: string;
  total: number;
  createdAt: string;
  items?: BackendOrderItem[];
  clienteNome?: string;
  clienteTelefone?: string;
  clienteEndereco?: string;
};

export default function OrderDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const id = params.id;
  const [order, setOrder] = useState<BackendOrder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregar() {
      try {
        const lista = await api.get<BackendOrder[]>('/pedidos');
        const encontrado = lista.find(p => p.id === id);
        if (encontrado) {
          setOrder(encontrado);
        }
      } catch (e) {
        console.error('Erro ao carregar pedido', e);
      } finally {
        setLoading(false);
      }
    }
    carregar();
  }, [id]);

  if (loading) {
    return (
      <main className="flex-1 flex flex-col p-4 pb-24 bg-zinc-950">
        <div className="max-w-md mx-auto w-full">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-xs text-zinc-400 mb-4"
          >
            ← Voltar
          </button>
          <div className="text-sm text-zinc-500">Carregando pedido...</div>
        </div>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="flex-1 flex flex-col p-4 pb-24 bg-zinc-950">
        <div className="max-w-md mx-auto w-full">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-xs text-zinc-400 mb-4"
          >
            ← Voltar
          </button>
          <div className="text-sm text-zinc-500">Pedido não encontrado.</div>
        </div>
      </main>
    );
  }

  const createdAt = new Date(order.createdAt).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const itens = order.items ?? [];
  const totalItens = itens.reduce((sum, it) => sum + it.quantity, 0);

  return (
    <main className="flex-1 flex flex-col p-4 pb-24 bg-zinc-950">
      <div className="max-w-md mx-auto w-full space-y-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-xs text-zinc-400"
        >
          ← Voltar
        </button>

        <h1 className="text-lg font-bold text-white">
          Pedido #{order.id.slice(-6).toUpperCase()}
        </h1>

        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-300">Status</span>
            <OrderStatusBadge status={order.status} />
          </div>
          <div className="text-xs text-zinc-500">
            Realizado em {createdAt}
          </div>
          {(order.clienteNome || order.clienteTelefone) && (
            <div className="text-xs text-zinc-400">
              Cliente: {order.clienteNome || order.clienteTelefone}
            </div>
          )}
          {order.clienteEndereco && (
            <div className="text-xs text-zinc-400">
              Endereço: {order.clienteEndereco}
            </div>
          )}
        </div>

        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-white">Itens</span>
            <span className="text-xs text-zinc-400">{totalItens} item(s)</span>
          </div>
          {itens.length === 0 ? (
            <div className="text-xs text-zinc-500">Itens não disponíveis.</div>
          ) : (
            <div className="space-y-1">
              {itens.map(it => (
                <div
                  key={`${it.name}-${it.quantity}-${order.id}`}
                  className="flex items-center justify-between text-xs text-zinc-300"
                >
                  <span>
                    {it.quantity}x {it.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-300">Total</span>
            <span className="text-lg font-bold text-amber-400">
              R$ {order.total.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}
