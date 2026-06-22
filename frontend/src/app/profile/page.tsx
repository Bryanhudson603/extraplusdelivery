'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BottomNav } from '@/components/BottomNav';
import { useCart } from '@/components/CartProvider';
import { api } from '@/lib/api';
import { matchesClientOrder } from '@/lib/orders';

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
  const [addresses, setAddresses] = useState<string[]>([]);
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
          try {
            const rawAddresses = localStorage.getItem('extraplus-addresses');
            if (rawAddresses) {
              const parsedAddresses = JSON.parse(rawAddresses);
              if (Array.isArray(parsedAddresses) && parsedAddresses.length > 0) {
                setAddresses(parsedAddresses.map(String));
              } else if (endereco) {
                setAddresses([endereco]);
              }
            } else if (endereco) {
              setAddresses([endereco]);
            }
          } catch {
            if (endereco) {
              setAddresses([endereco]);
            }
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
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 text-lg">
                  📍
                </span>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">Meus endereços</div>
                  {addresses.length === 0 ? (
                    <div className="text-xs text-gray-600 dark:text-zinc-500">Nenhum endereço cadastrado</div>
                  ) : (
                    <div className="text-xs text-gray-600 dark:text-zinc-400">
                      {addresses[0]}
                    </div>
                  )}
                </div>
              </div>
              <button
                className="text-xs font-semibold text-blue-600"
                onClick={() => {
                  const novo = window.prompt('Informe o endereço de entrega:');
                  if (!novo) return;
                  const texto = novo.trim();
                  if (!texto) return;
                  setAddresses(prev => {
                    const next = [texto, ...prev.filter(a => a !== texto)];
                    try {
                      localStorage.setItem('extraplus-addresses', JSON.stringify(next));
                      const rawSession = localStorage.getItem('extraplus-session');
                      if (rawSession) {
                        const parsed = JSON.parse(rawSession);
                        if (parsed?.tipo === 'cliente') {
                          const atualizado = { ...parsed, endereco: texto };
                          localStorage.setItem('extraplus-session', JSON.stringify(atualizado));
                        }
                      }
                    } catch {
                    }
                    setUser(prevUser => ({
                      ...prevUser,
                      endereco: texto
                    }));
                    return next;
                  });
                }}
              >
                {addresses.length === 0 ? 'Adicionar' : 'Editar'}
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
