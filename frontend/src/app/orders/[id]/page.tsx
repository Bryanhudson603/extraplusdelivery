'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { OrderStatusBadge } from '@/components/OrderStatusBadge';
import { api } from '@/lib/api';
import { formatOrderShortId } from '@/lib/orders';

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
    let ativo = true;

    async function carregar() {
      try {
        // Endpoint autenticado: retorna so os pedidos do cliente logado.
        const lista = await api.get<BackendOrder[]>('/pedidos/meus');
        const encontrado = lista.find(p => p.id === id);
        if (ativo && encontrado) {
          setOrder(encontrado);
        } else if (ativo) {
          setOrder(null);
        }
      } catch (e) {
        console.error('Erro ao carregar pedido', e);
      } finally {
        if (ativo) {
          setLoading(false);
        }
      }
    }
    carregar();
    const intervalId = window.setInterval(carregar, 5000);
    return () => {
      ativo = false;
      window.clearInterval(intervalId);
    };
  }, [id]);

  if (loading) {
    return (
      <main className="flex-1 flex flex-col p-4 pb-24 bg-[var(--brand-soft-bg)]">
        <div className="max-w-md mx-auto w-full">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-xs text-slate-500 mb-4"
          >
            ← Voltar
          </button>
          <div className="text-sm text-slate-500">Carregando pedido...</div>
        </div>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="flex-1 flex flex-col p-4 pb-24 bg-[var(--brand-soft-bg)]">
        <div className="max-w-md mx-auto w-full">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-xs text-slate-500 mb-4"
          >
            ← Voltar
          </button>
          <div className="rounded-2xl border border-blue-100 bg-white/90 p-4 text-sm text-slate-500 shadow-sm">
            Pedido nao encontrado.
          </div>
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
    <main className="flex-1 flex flex-col p-4 pb-24 bg-[var(--brand-soft-bg)]">
      <div className="max-w-md mx-auto w-full space-y-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-xs text-slate-500"
        >
          ← Voltar
        </button>

        <h1 className="text-lg font-bold text-slate-900">
          Pedido {formatOrderShortId(order.id)}
        </h1>

        <div className="bg-white/95 rounded-2xl border border-blue-100 p-4 space-y-2 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-700">Status</span>
            <OrderStatusBadge status={order.status} />
          </div>
          <div className="text-xs text-slate-500">
            Realizado em {createdAt}
          </div>
          {(order.clienteNome || order.clienteTelefone) && (
            <div className="text-xs text-slate-600">
              Cliente: {order.clienteNome || order.clienteTelefone}
            </div>
          )}
          {order.clienteEndereco && (
            <div className="text-xs text-slate-600">
              Endereço: {order.clienteEndereco}
            </div>
          )}
        </div>

        <div className="bg-white/95 rounded-2xl border border-blue-100 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-slate-900">Itens</span>
            <span className="text-xs text-slate-500">{totalItens} item(s)</span>
          </div>
          {itens.length === 0 ? (
            <div className="text-xs text-slate-500">Itens nao disponiveis.</div>
          ) : (
            <div className="space-y-1">
              {itens.map(it => (
                <div
                  key={`${it.name}-${it.quantity}-${order.id}`}
                  className="flex items-center justify-between text-xs text-slate-700"
                >
                  <span>
                    {it.quantity}x {it.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white/95 rounded-2xl border border-blue-100 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-700">Total</span>
            <span className="text-lg font-bold text-blue-700">
              R$ {order.total.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}
