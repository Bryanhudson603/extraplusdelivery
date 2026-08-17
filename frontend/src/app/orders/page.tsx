'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { OrderStatusBadge } from '@/components/OrderStatusBadge';
import { BottomNav } from '@/components/BottomNav';
import { api } from '@/lib/api';
import { formatOrderShortId, isFinishedOrderStatus } from '@/lib/orders';

type Item = { productName: string; productImage?: string; quantity: number };

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
};

type Order = {
  id: string;
  status: string;
  total: number;
  createdAt: string;
  estimatedDelivery?: number;
  items: Item[];
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      try {
        // Endpoint autenticado: o backend ja filtra pelos pedidos do
        // cliente logado (via cookie/JWT), sem depender de comparar
        // clienteId/telefone lidos do localStorage no navegador.
        const resposta = await api.get<BackendOrder[]>('/pedidos/meus');
        const normalizados: Order[] = resposta.map(p => ({
          id: p.id,
          status: p.status,
          total: p.total,
          createdAt: new Date(p.createdAt).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          }),
          items:
            p.items?.map(it => ({
              productName: it.name,
              quantity: it.quantity
            })) ?? []
        }));
        if (!ativo) return;
        setOrders(normalizados);
      } catch (e) {
        console.error('Erro ao carregar pedidos', e);
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
  }, []);

  const activeOrders = orders.filter(o => !isFinishedOrderStatus(o.status));
  const pastOrders = orders.filter(o => isFinishedOrderStatus(o.status));

  return (
    <main className="flex-1 bg-[var(--brand-soft-bg)] pb-16">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Meus Pedidos</h1>
          <span className="text-xs px-2 py-1 rounded-full bg-white border border-blue-100 text-slate-500">
            {orders.length} no histórico
          </span>
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-500 text-sm">Carregando pedidos...</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 rounded-3xl border border-blue-100 bg-white/90 shadow-sm">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-blue-50 flex items-center justify-center text-3xl">
              📦
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Nenhum pedido ainda</h3>
            <p className="text-slate-500 mb-6">Faça seu primeiro pedido!</p>
            <Link
              href="/home"
              className="inline-flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 h-11"
            >
              Ver produtos
            </Link>
          </div>
        ) : (
          <>
            {activeOrders.length > 0 && (
              <section className="mb-8">
                <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <span className="text-blue-600 text-xl">⏱️</span>
                  Em andamento
                </h2>
                <div className="space-y-3">
                  {activeOrders.map(order => {
                    const totalItems = order.items.reduce((acc, it) => acc + it.quantity, 0);
                    return (
                      <Link
                        key={order.id}
                        href={`/orders/${order.id}`}
                        className="block bg-white/95 border border-blue-100 rounded-2xl p-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="text-slate-500 text-xs">
                              Pedido {formatOrderShortId(order.id)}
                            </p>
                            <p className="text-slate-900 font-semibold text-sm">{order.createdAt}</p>
                          </div>
                          <OrderStatusBadge status={order.status} />
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <p className="text-slate-500 text-xs">
                              {totalItems} itens • R$ {order.total.toFixed(2)}
                            </p>
                            {order.items[0] && (
                              <p className="text-slate-700 text-xs mt-1 line-clamp-1">
                                {order.items[0].productName}
                                {order.items.length > 1 && ` + ${order.items.length - 1} itens`}
                              </p>
                            )}
                          </div>
                          <div className="text-right text-xs text-slate-500">
                            <p className="mt-1 text-blue-600 font-semibold text-sm">
                              Ver detalhes →
                            </p>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            {pastOrders.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Pedidos anteriores</h2>
                <div className="space-y-3">
                  {pastOrders.map(order => {
                    const totalItems = order.items.reduce((acc, it) => acc + it.quantity, 0);
                    return (
                      <Link
                        key={order.id}
                        href={`/orders/${order.id}`}
                        className="block bg-white/90 border border-blue-100 rounded-2xl p-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-slate-500 text-xs">
                              Pedido {formatOrderShortId(order.id)}
                            </p>
                            <p className="text-slate-900 text-sm">{order.createdAt}</p>
                          </div>
                          <OrderStatusBadge status={order.status} />
                        </div>
                        <p className="text-slate-600 text-xs">
                          {totalItems} itens • R$ {order.total.toFixed(2)}
                        </p>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            {activeOrders.length === 0 && pastOrders.length > 0 && (
              <div className="mt-6 rounded-2xl border border-blue-100 bg-white/90 px-4 py-3 text-sm text-slate-600 shadow-sm">
                Nao ha pedido em andamento agora, mas seu historico continua disponivel logo abaixo.
              </div>
            )}
          </>
        )}
      </div>
      <BottomNav />
    </main>
  );
}
