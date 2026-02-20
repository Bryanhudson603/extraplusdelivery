'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

type BackendOrderItem = { name: string; quantity: number };

type BackendOrder = {
  id: string;
  status: string;
  total: number;
  createdAt: string;
  items?: BackendOrderItem[];
  motivoRecusa?: string;
  clienteNome?: string;
  clienteTelefone?: string;
  clienteEndereco?: string;
  formaPagamento?: string;
  tipoEntrega?: string;
  entregadorId?: string;
  entregadorNome?: string;
};

type Order = {
  id: string;
  status: string;
  total: number;
  createdAt: string;
  motivoRecusa?: string;
  clienteNome?: string;
  clienteTelefone?: string;
  clienteEndereco?: string;
  formaPagamento?: string;
  tipoEntrega?: string;
  entregadorId?: string;
  entregadorNome?: string;
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [entregadores, setEntregadores] = useState<
    Array<{ id: string; nome: string; telefone?: string; ativo: boolean }>
  >([]);

  useEffect(() => {
    async function carregar() {
      try {
        const r = await api.get<BackendOrder[]>('/pedidos');
        const normalizados: Order[] = r.map(p => ({
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
          motivoRecusa: p.motivoRecusa,
          clienteNome: p.clienteNome,
          clienteTelefone: p.clienteTelefone,
          clienteEndereco: p.clienteEndereco,
          formaPagamento: p.formaPagamento,
          tipoEntrega: p.tipoEntrega,
          entregadorId: p.entregadorId,
          entregadorNome: p.entregadorNome
        }));
        setOrders(normalizados);
      } catch (e) {
        console.error('Erro ao carregar pedidos admin', e);
      } finally {
        setLoading(false);
      }
    }
    carregar();
  }, []);

  useEffect(() => {
    async function carregarEntregadores() {
      try {
        const lista = await api.get<
          Array<{ id: string; nome: string; telefone?: string; ativo: boolean }>
        >('/admin/entregadores');
        setEntregadores(lista.filter(e => e.ativo));
      } catch (e) {
        console.error('Erro ao carregar entregadores', e);
      }
    }
    carregarEntregadores();
  }, []);

  async function vincularEntregador(pedidoId: string, entregadorId: string) {
    try {
      const entregador = entregadores.find(e => e.id === entregadorId);
      const atualizado = await api.post<BackendOrder>(`/pedidos/${pedidoId}/entregador`, {
        entregadorId
      });
      setOrders(prev =>
        prev.map(o =>
          o.id === pedidoId
            ? {
                ...o,
                entregadorId: atualizado.entregadorId,
                entregadorNome: atualizado.entregadorNome || entregador?.nome
              }
            : o
        )
      );
    } catch (e) {
      console.error('Erro ao vincular entregador ao pedido', e);
    }
  }

  async function atualizarStatus(id: string, status: 'confirmado' | 'cancelado') {
    try {
      let motivoRecusa: string | undefined;
      if (status === 'cancelado') {
        motivoRecusa = window.prompt('Informe o motivo da recusa do pedido:') || '';
      }
      const atualizado = await api.post<BackendOrder>(`/pedidos/${id}/status`, {
        status,
        motivoRecusa
      });
      setOrders(prev =>
        prev.map(o =>
          o.id === id
            ? {
                ...o,
                status: atualizado.status,
                motivoRecusa: atualizado.motivoRecusa
              }
            : o
        )
      );
    } catch (e) {
      console.error('Erro ao atualizar status do pedido', e);
    }
  }

  const pendentes = orders.filter(o => o.status !== 'finalizado' && o.status !== 'cancelado');

  return (
    <main className="flex-1 bg-zinc-950 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Pedidos</h1>
            <p className="text-zinc-400">
              {pendentes.length} pendentes
            </p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16 text-zinc-500">Carregando pedidos...</div>
        ) : (
          <div className="space-y-3">
            {orders.map(order => {
              const isFinal = order.status === 'finalizado' || order.status === 'cancelado';
              return (
                <div key={order.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-bold">
                          #{order.id.slice(-6).toUpperCase()}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full border border-amber-500/50 text-amber-400">
                          {order.status}
                        </span>
                      </div>
                      <p className="text-zinc-400 text-xs">
                        {order.createdAt}
                      </p>
                      {order.clienteNome && (
                        <p className="text-zinc-300 text-xs mt-1">
                          Cliente: {order.clienteNome}
                        </p>
                      )}
                      {order.clienteTelefone && (
                        <p className="text-zinc-400 text-[11px]">
                          Telefone: {order.clienteTelefone}
                        </p>
                      )}
                      {order.clienteEndereco && (
                        <p className="text-zinc-400 text-[11px]">
                          Endereço: {order.clienteEndereco}
                        </p>
                      )}
                      {order.formaPagamento && (
                        <p className="text-zinc-400 text-[11px]">
                          Pagamento: {order.formaPagamento}
                        </p>
                      )}
                      {order.entregadorNome && (
                        <p className="text-zinc-400 text-[11px]">
                          Entregador: {order.entregadorNome}
                        </p>
                      )}
                      {order.motivoRecusa && (
                        <p className="text-red-400 text-xs mt-1">
                          Motivo da recusa: {order.motivoRecusa}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-amber-400 font-bold text-lg">
                        R$ {order.total.toFixed(2)}
                      </p>
                      {entregadores.length > 0 && order.status === 'confirmado' && (
                        <div className="mt-2">
                          <select
                            value={order.entregadorId || ''}
                            onChange={e => {
                              const id = e.target.value;
                              if (!id) return;
                              vincularEntregador(order.id, id);
                            }}
                            className="w-full h-8 rounded-lg bg-zinc-950 border border-zinc-700 px-2 text-[11px] text-zinc-100 outline-none"
                          >
                            <option value="">Vincular entregador...</option>
                            {entregadores.map(e => (
                              <option key={e.id} value={e.id}>
                                {e.nome}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      {!isFinal && (
                        <div className="flex flex-wrap gap-2 mt-3 justify-end">
                          {order.status === 'recebido' || order.status === 'aguardando_pagamento' ? (
                            <>
                              <button
                                type="button"
                                onClick={async () => {
                                  await api.post<BackendOrder>(`/pedidos/${order.id}/status`, {
                                    status: 'em_separacao'
                                  });
                                  setOrders(prev =>
                                    prev.map(o => (o.id === order.id ? { ...o, status: 'em_separacao' } : o))
                                  );
                                }}
                                className="px-3 h-8 rounded-lg bg-emerald-500 text-xs font-semibold text-black"
                              >
                                Aceitar
                              </button>
                              <button
                                type="button"
                                onClick={() => atualizarStatus(order.id, 'cancelado')}
                                className="px-3 h-8 rounded-lg bg-red-500 text-xs font-semibold text-white"
                              >
                                Recusar
                              </button>
                            </>
                          ) : order.status === 'em_separacao' ? (
                            <button
                              type="button"
                              onClick={async () => {
                                await api.post<BackendOrder>(`/pedidos/${order.id}/status`, {
                                  status: 'confirmado'
                                });
                                setOrders(prev =>
                                  prev.map(o => (o.id === order.id ? { ...o, status: 'confirmado' } : o))
                                );
                              }}
                              className="px-3 h-8 rounded-lg bg-blue-500 text-xs font-semibold text-white"
                            >
                              Confirmar separação
                            </button>
                          ) : order.status === 'confirmado' ? (
                            order.entregadorId ? (
                              <button
                                type="button"
                                onClick={async () => {
                                  await api.post<BackendOrder>(`/pedidos/${order.id}/status`, {
                                    status: 'saiu_para_entrega'
                                  });
                                  setOrders(prev =>
                                    prev.map(o =>
                                      o.id === order.id ? { ...o, status: 'saiu_para_entrega' } : o
                                    )
                                  );
                                }}
                                className="px-3 h-8 rounded-lg bg-purple-500 text-xs font-semibold text-white"
                              >
                                Saiu para entrega
                              </button>
                            ) : null
                          ) : order.status === 'saiu_para_entrega' ? (
                            <button
                              type="button"
                              onClick={async () => {
                                await api.post<BackendOrder>(`/pedidos/${order.id}/status`, {
                                  status: 'finalizado'
                                });
                                setOrders(prev =>
                                  prev.map(o => (o.id === order.id ? { ...o, status: 'finalizado' } : o))
                                );
                              }}
                              className="px-3 h-8 rounded-lg bg-green-500 text-xs font-semibold text-black"
                            >
                              Marcar entregue
                            </button>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {orders.length === 0 && (
              <div className="text-center py-16 text-zinc-500">
                Nenhum pedido registrado
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
