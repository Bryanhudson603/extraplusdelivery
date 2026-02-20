'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { OrderStatusBadge } from '@/components/OrderStatusBadge';
import { BottomNav } from '@/components/BottomNav';
import { api } from '@/lib/api';

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
  clienteId?: string;
  clienteTelefone?: string;
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
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [clienteTelefone, setClienteTelefone] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem('extraplus-session');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.tipo === 'cliente') {
          setClienteId(parsed.clienteId || null);
          setClienteTelefone(parsed.telefone || null);
        }
      }
    } catch {
    }
  }, []);

  useEffect(() => {
    async function carregar() {
      try {
        const resposta = await api.get<BackendOrder[]>('/pedidos');
        const doCliente = resposta.filter(p => {
          if (!p.clienteId && !p.clienteTelefone) {
            return true;
          }
          if (clienteId) {
            return p.clienteId === clienteId;
          }
          if (clienteTelefone) {
            return p.clienteTelefone === clienteTelefone;
          }
          return true;
        });
        const normalizados: Order[] = doCliente.map(p => ({
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
        setOrders(normalizados);
      } catch (e) {
        console.error('Erro ao carregar pedidos', e);
      } finally {
        setLoading(false);
      }
    }

    carregar();
  }, [clienteId, clienteTelefone]);

  const activeOrders = orders.filter(o => o.status !== 'finalizado' && o.status !== 'cancelado');
  const pastOrders = orders.filter(o => o.status === 'finalizado' || o.status === 'cancelado');

  return (
    <main className="flex-1 bg-zinc-950 pb-16">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Meus Pedidos</h1>
          <span className="text-xs px-2 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400">
            {orders.length} no histórico
          </span>
        </div>

        {loading ? (
          <div className="text-center py-16 text-zinc-500 text-sm">Carregando pedidos...</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-zinc-800/50 flex items-center justify-center text-3xl">
              📦
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Nenhum pedido ainda</h3>
            <p className="text-zinc-500 mb-6">Faça seu primeiro pedido!</p>
            <Link
              href="/home"
              className="inline-flex items-center justify-center rounded-full bg-amber-500 hover:bg-amber-600 text-black text-sm font-semibold px-5 h-11"
            >
              Ver produtos
            </Link>
          </div>
        ) : (
          <>
            {activeOrders.length > 0 && (
              <section className="mb-8">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="text-amber-400 text-xl">⏱️</span>
                  Em andamento
                </h2>
                <div className="space-y-3">
                  {activeOrders.map(order => {
                    const totalItems = order.items.reduce((acc, it) => acc + it.quantity, 0);
                    return (
                      <Link
                        key={order.id}
                        href={`/orders/${order.id}`}
                        className="block bg-gradient-to-br from-zinc-900 to-zinc-900/40 border border-amber-500/30 rounded-2xl p-4"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="text-zinc-400 text-xs">
                              Pedido #{order.id.slice(-6).toUpperCase()}
                            </p>
                            <p className="text-white font-semibold text-sm">{order.createdAt}</p>
                          </div>
                          <OrderStatusBadge status={order.status} />
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <p className="text-zinc-400 text-xs">
                              {totalItems} itens • R$ {order.total.toFixed(2)}
                            </p>
                            {order.items[0] && (
                              <p className="text-zinc-300 text-xs mt-1 line-clamp-1">
                                {order.items[0].productName}
                                {order.items.length > 1 && ` + ${order.items.length - 1} itens`}
                              </p>
                            )}
                          </div>
                          <div className="text-right text-xs text-zinc-500">
                            <p className="mt-1 text-amber-400 font-semibold text-sm">
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
                <h2 className="text-lg font-semibold text-white mb-4">Pedidos anteriores</h2>
                <div className="space-y-3">
                  {pastOrders.map(order => {
                    const totalItems = order.items.reduce((acc, it) => acc + it.quantity, 0);
                    return (
                      <Link
                        key={order.id}
                        href={`/orders/${order.id}`}
                        className="block bg-zinc-900 border border-zinc-800 rounded-2xl p-4"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-zinc-500 text-xs">
                              Pedido #{order.id.slice(-6).toUpperCase()}
                            </p>
                            <p className="text-white text-sm">{order.createdAt}</p>
                          </div>
                          <OrderStatusBadge status={order.status} />
                        </div>
                        <p className="text-zinc-400 text-xs">
                          {totalItems} itens • R$ {order.total.toFixed(2)}
                        </p>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}
      </div>
      <BottomNav />
    </main>
  );
}
