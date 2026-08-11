'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BottomNav } from '@/components/BottomNav';
import { AddressModal } from '@/components/AddressModal';
import { useCart } from '@/components/CartProvider';
import { api } from '@/lib/api';
import { matchesClientOrder } from '@/lib/orders';
import {
  type AddressRecord,
  formatAddressSummary,
  fromLegacyString,
  loadAddresses,
  saveAddresses,
  syncSessionEndereco
} from '@/lib/addresses';

type User = {
  name: string;
  telefone: string;
  endereco: string;
};

type CupomCliente = {
  id: string;
  nome: string;
  codigo: string;
  validoDe?: string;
  validoAte?: string;
  descontoPercentual?: number;
  usosPorCliente?: number;
  usosConsumidos: number;
  disponivel: boolean;
};

type PedidoResumo = {
  id: string;
  total: number;
  status: string;
  clienteId?: string;
  clienteTelefone?: string;
};

export default function ProfilePage() {
  const router = useRouter();
  const { clear } = useCart();
  const [user, setUser] = useState<User>({
    name: 'Cliente',
    telefone: '',
    endereco: ''
  });
  const [addresses, setAddresses] = useState<AddressRecord[]>([]);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<AddressRecord | null>(null);
  const [addressToDelete, setAddressToDelete] = useState<string | null>(null);
  const [addressesOpen, setAddressesOpen] = useState(false);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [ordersCount, setOrdersCount] = useState(0);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [couponsOpen, setCouponsOpen] = useState(false);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<CupomCliente[]>([]);
  async function carregarCuponsParaSessao(): Promise<void> {
    try {
      const rawSession = localStorage.getItem('extraplus-session');
      if (!rawSession) return;
      const parsed = JSON.parse(rawSession);
      if (parsed?.tipo !== 'cliente') return;
      const lista = await api.get<CupomCliente[]>('/clientes/me/cupons');
      setCoupons(Array.isArray(lista) ? lista : []);
    } catch {
      setCoupons([]);
    }
  }

  useEffect(() => {
    try {
      const stored = localStorage.getItem('favorites');
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        setFavoritesCount(parsed.length);
        setFavorites(parsed);
      }
    } catch {
      setFavoritesCount(0);
    }
  }, []);

  useEffect(() => {
    try {
      const rawSession = localStorage.getItem('extraplus-session');
      if (rawSession) {
        const parsed = JSON.parse(rawSession);
        if (parsed?.tipo === 'cliente') {
          const nome = parsed.nome || 'Cliente';
          const telefone = parsed.telefone || '';
          const endereco = parsed.endereco || '';
          setUser({
            name: nome,
            telefone,
            endereco
          });
          carregarCuponsParaSessao();
          const enderecosSalvos = loadAddresses();
          if (enderecosSalvos.length === 0 && endereco) {
            const migrado = [fromLegacyString(endereco)];
            saveAddresses(migrado);
            setAddresses(migrado);
          } else {
            setAddresses(enderecosSalvos);
          }
        }
      }
    } catch {
    }
  }, []);

  useEffect(() => {
    if (couponsOpen) {
      carregarCuponsParaSessao();
    }
  }, [couponsOpen]);
  useEffect(() => {
    async function carregarPedidos() {
      try {
        const rawSession = localStorage.getItem('extraplus-session');
        if (!rawSession) return;
        const parsed = JSON.parse(rawSession);
        if (parsed?.tipo !== 'cliente') return;
        const resposta = await api.get<PedidoResumo[]>('/pedidos');
        const filtrados = resposta.filter((pedido: PedidoResumo) =>
          matchesClientOrder(pedido, parsed.clienteId || null, parsed.telefone || null)
        );
        setOrdersCount(filtrados.length);
        const total = filtrados.reduce((sum: number, p: PedidoResumo) => sum + p.total, 0);
        setOrdersTotal(total);
      } catch {
      }
    }
    carregarPedidos();
  }, []);

  function handleSalvarEndereco(endereco: AddressRecord) {
    setAddresses(prev => {
      const existe = prev.some(a => a.id === endereco.id);
      const next = existe ? prev.map(a => (a.id === endereco.id ? endereco : a)) : [endereco, ...prev];
      saveAddresses(next);
      return next;
    });
    syncSessionEndereco(endereco);
    setUser(prev => ({ ...prev, endereco: formatAddressSummary(endereco) }));
    setAddressModalOpen(false);
    setEditingAddress(null);
  }

  function handleExcluirEndereco(id: string) {
    setAddresses(prev => {
      const next = prev.filter(a => a.id !== id);
      saveAddresses(next);
      if (next.length > 0) {
        syncSessionEndereco(next[0]);
        setUser(prevUser => ({ ...prevUser, endereco: formatAddressSummary(next[0]) }));
      }
      return next;
    });
    setAddressToDelete(null);
  }

  return (
    <main className="flex-1 bg-gray-50 dark:bg-zinc-950 pb-16">
      <div className="max-w-md mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
            <span className="text-2xl font-semibold text-white">DB</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{user.name}</h1>
            {user.telefone && <p className="text-gray-600 dark:text-zinc-400 text-sm">{user.telefone}</p>}
            {user.endereco && <p className="text-gray-600 dark:text-zinc-500 text-xs">{user.endereco}</p>}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white border border-gray-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-blue-600">{ordersCount}</p>
            <p className="text-gray-600 dark:text-zinc-500 text-xs mt-1">Pedidos</p>
          </div>
          <div className="bg-white border border-gray-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-emerald-500">R$ {ordersTotal.toFixed(2)}</p>
            <p className="text-gray-600 dark:text-zinc-500 text-xs mt-1">Total em compras</p>
          </div>
          <div className="bg-white border border-gray-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-violet-500">{coupons.length}</p>
            <p className="text-gray-600 dark:text-zinc-500 text-xs mt-1">Cupons</p>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <div className="bg-white border border-gray-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-zinc-800">
              <button
                type="button"
                className="flex items-center gap-3 flex-1 text-left"
                onClick={() => setAddressesOpen(true)}
              >
                <span className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 text-lg">
                  📍
                </span>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">Meus endereços</div>
                  {addresses.length === 0 ? (
                    <div className="text-xs text-gray-600 dark:text-zinc-500">Nenhum endereço cadastrado</div>
                  ) : (
                    <div className="text-xs text-gray-600 dark:text-zinc-400">
                      {formatAddressSummary(addresses[0])}
                      {addresses.length > 1 ? ` +${addresses.length - 1}` : ''}
                    </div>
                  )}
                </div>
              </button>
              <button
                type="button"
                className="text-xs font-semibold text-blue-600 flex-shrink-0"
                onClick={() => {
                  setEditingAddress(null);
                  setAddressModalOpen(true);
                }}
              >
                Adicionar
              </button>
            </div>
          </div>

          <div className="bg-white border border-gray-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-xl px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-pink-500/10 flex items-center justify-center text-pink-400 text-lg">
                ❤
              </span>
              <div>
                <div className="font-semibold text-gray-900 dark:text-white">Favoritos</div>
                <div className="text-xs text-gray-600 dark:text-zinc-500">{favoritesCount} produtos</div>
              </div>
            </div>
            <button
              type="button"
              className="text-xs font-semibold text-blue-600"
              onClick={() => setFavoritesOpen(true)}
            >
              Ver
            </button>
          </div>

          <div className="bg-white border border-gray-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-xl px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-violet-500/10 flex items-center justify-center text-violet-400 text-lg">
                🎁
              </span>
              <div>
                <div className="font-semibold text-gray-900 dark:text-white">Cupons</div>
                <div className="text-xs text-gray-600 dark:text-zinc-500">{coupons.length} disponível(is)</div>
              </div>
            </div>
            <button
              type="button"
              className="text-xs font-semibold text-amber-400"
              onClick={() => setCouponsOpen(true)}
            >
              Ver
            </button>
          </div>

          <button
            className="w-full h-11 rounded-full border border-gray-300 text-sm font-semibold text-red-600 mt-2 dark:border-zinc-800 dark:text-red-400"
            onClick={() => {
              try {
                if (typeof window !== 'undefined') {
                  window.localStorage.removeItem('extraplus-session');
                  window.localStorage.removeItem('extraplus-store');
                  window.localStorage.removeItem('favorites');
                  window.localStorage.removeItem('cart');
                }
              } catch {
              }
              clear();
              router.replace('/login');
            }}
          >
            Sair da conta
          </button>
        </div>
      </div>
      <BottomNav />

      {addressesOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-40"
            onClick={() => {
              setAddressesOpen(false);
              setAddressToDelete(null);
            }}
          />
          <div className="fixed inset-x-0 bottom-0 max-w-md mx-auto bg-white border-t border-gray-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-t-2xl z-50 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-zinc-800 flex-shrink-0">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">Meus endereços</span>
              <button
                type="button"
                className="text-xs text-gray-600 dark:text-zinc-400"
                onClick={() => {
                  setAddressesOpen(false);
                  setAddressToDelete(null);
                }}
              >
                Fechar
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {addresses.length === 0 ? (
                <div className="text-xs text-gray-600 dark:text-zinc-500 py-6 text-center">
                  Nenhum endereço cadastrado
                </div>
              ) : (
                addresses.map(endereco => (
                  <div
                    key={endereco.id}
                    className="rounded-lg border border-gray-200 dark:border-zinc-800 px-3 py-2.5 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                          {endereco.nome}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-zinc-400">
                          {formatAddressSummary(endereco)}
                        </div>
                        {endereco.referencia && (
                          <div className="text-[11px] text-gray-500 dark:text-zinc-500">
                            Referência: {endereco.referencia}
                          </div>
                        )}
                      </div>
                    </div>

                    {addressToDelete === endereco.id ? (
                      <div className="flex items-center justify-between gap-2 bg-red-50 dark:bg-red-950/30 rounded-lg px-2 py-1.5">
                        <span className="text-[11px] text-red-600 dark:text-red-300">Excluir este endereço?</span>
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            type="button"
                            className="text-[11px] text-gray-600 dark:text-zinc-400"
                            onClick={() => setAddressToDelete(null)}
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            className="text-[11px] font-semibold text-red-600 dark:text-red-400"
                            onClick={() => handleExcluirEndereco(endereco.id)}
                          >
                            Confirmar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-3 text-xs">
                        <button
                          type="button"
                          className="font-semibold text-blue-600"
                          onClick={() => {
                            setEditingAddress(endereco);
                            setAddressModalOpen(true);
                          }}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="font-semibold text-red-600 dark:text-red-400"
                          onClick={() => setAddressToDelete(endereco.id)}
                        >
                          Excluir
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-zinc-800 flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  setEditingAddress(null);
                  setAddressModalOpen(true);
                }}
                className="w-full h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
              >
                + Adicionar novo endereço
              </button>
            </div>
          </div>
        </>
      )}

      <AddressModal
        open={addressModalOpen}
        initialAddress={editingAddress}
        onClose={() => {
          setAddressModalOpen(false);
          setEditingAddress(null);
        }}
        onSave={handleSalvarEndereco}
      />

      {favoritesOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-40"
            onClick={() => setFavoritesOpen(false)}
          />
          <div className="fixed inset-x-0 bottom-0 max-w-md mx-auto bg-white border-t border-gray-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-t-2xl z-50">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-zinc-800">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">Favoritos</span>
              <button
                type="button"
                className="text-xs text-gray-600 dark:text-zinc-400"
                onClick={() => setFavoritesOpen(false)}
              >
                Fechar
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto px-4 py-3 space-y-2">
              {favorites.length === 0 ? (
                <div className="text-xs text-gray-600 dark:text-zinc-500 py-6 text-center">
                  Nenhum produto favoritado
                </div>
              ) : (
                favorites.map((fav, index) => (
                  <div
                    key={fav.id ?? index}
                    className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-zinc-800 px-3 py-2"
                  >
                    <div className="text-sm text-gray-900 dark:text-white truncate">
                      {fav.name || fav.nome || 'Produto'}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-zinc-400">
                      {typeof fav.price === 'number'
                        ? `R$ ${fav.price.toFixed(2)}`
                        : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {couponsOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-40"
            onClick={() => setCouponsOpen(false)}
          />
          <div className="fixed inset-x-0 bottom-0 max-w-md mx-auto bg-white border-t border-gray-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-t-2xl z-50">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-zinc-800">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">Cupons</span>
              <button
                type="button"
                className="text-xs text-gray-600 dark:text-zinc-400"
                onClick={() => setCouponsOpen(false)}
              >
                Fechar
              </button>
            </div>
            <div className="px-4 py-4 max-h-80 overflow-y-auto space-y-2">
              {coupons.length === 0 ? (
                <div className="text-xs text-gray-600 dark:text-zinc-500 text-center py-6">
                  Nenhum cupom disponível no momento
                </div>
              ) : (
                coupons.map(c => {
                  const inicioTexto = c.validoDe
                    ? new Date(c.validoDe).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                      })
                    : 'Sem início';
                  const fimTexto = c.validoAte
                    ? new Date(c.validoAte).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                      })
                    : 'Sem fim';
                  const restante =
                    c.usosPorCliente != null ? Math.max(0, c.usosPorCliente - c.usosConsumidos) : null;
                  return (
                    <div
                      key={c.id}
                      className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-zinc-800 px-3 py-2"
                    >
                      <div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                          {c.nome} • {c.codigo}
                        </div>
                        <div className="text-[11px] text-gray-600 dark:text-zinc-500">
                          {inicioTexto} até {fimTexto}
                        </div>
                        {c.descontoPercentual && (
                          <div className="text-[11px] text-emerald-400">
                            {c.descontoPercentual}% de desconto
                          </div>
                        )}
                      </div>
                      <div className="text-right text-[11px]">
                        {restante != null ? (
                          <div className="text-gray-600 dark:text-zinc-500">{restante} uso(s) restante(s)</div>
                        ) : (
                          <div className="text-gray-600 dark:text-zinc-500">Sem limite por cliente</div>
                        )}
                        <div
                          className={
                            c.disponivel
                              ? 'text-emerald-400 font-semibold'
                              : 'text-gray-600 dark:text-zinc-500 font-semibold'
                          }
                        >
                          {c.disponivel ? 'Disponível' : 'Indisponível'}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </main>
  );
}
