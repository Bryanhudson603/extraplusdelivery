'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

type Dashboard = {
  vendasHoje: number;
  ticketMedio: number;
  pedidosHoje: number;
  clientesHoje: number;
  produtosMaisVendidos: { nome: string; quantidade: number }[];
  pedidosEmAndamento: { id: string; cliente: string; valor: number; status: string }[];
  estoqueBaixo: { nome: string; estoque: number }[];
  clientesRecorrentes: { nome: string; pedidos: number }[];
};

type Loja = {
  id: string;
  nome: string;
  slug: string;
};

type AdminSession = {
  tipo: 'admin';
  adminId: string;
  username: string;
  loja: Loja;
};

const SESSION_KEY = 'extraplus-session';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<Dashboard>({
    vendasHoje: 0,
    ticketMedio: 0,
    pedidosHoje: 0,
    clientesHoje: 0,
    produtosMaisVendidos: [],
    pedidosEmAndamento: [],
    estoqueBaixo: [],
    clientesRecorrentes: []
  });
  const [session, setSession] = useState<AdminSession | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const raw = window.localStorage.getItem(SESSION_KEY);
      if (!raw) {
        router.replace('/admin/login');
        return;
      }
      const parsed = JSON.parse(raw) as AdminSession;
      if (!parsed || parsed.tipo !== 'admin') {
        router.replace('/admin/login');
        return;
      }
      setSession(parsed);
    } catch {
      router.replace('/admin/login');
      return;
    } finally {
      setCheckingSession(false);
    }
  }, [router]);

  useEffect(() => {
    let timer: any;
    async function carregarTudo() {
      try {
        const d = await api.get<Dashboard>('/admin/dashboard');
        const pedidos = await api.get<any[]>('/pedidos');
        const ativos = pedidos.filter(p => p.status !== 'cancelado');
        const finalizados = ativos.filter(p => p.status === 'finalizado');
        const vendas = finalizados.reduce((sum, p) => sum + Number(p.total ?? 0), 0);
        const pedidosCount = ativos.length;
        const ticket = pedidosCount > 0 ? vendas / pedidosCount : 0;
        const clientesSet = new Set<string>();
        for (const p of ativos) {
          const chave = p.clienteId || p.clienteTelefone;
          if (chave) clientesSet.add(String(chave));
        }
        const mapa: Record<string, number> = {};
        for (const p of ativos) {
          for (const it of p.items || []) {
            mapa[it.name] = (mapa[it.name] || 0) + Number(it.quantity || 0);
          }
        }
        const top = Object.entries(mapa)
          .map(([nome, quantidade]) => ({ nome, quantidade }))
          .sort((a, b) => b.quantidade - a.quantidade);
        const pendentes = ativos
          .filter(p => p.status !== 'finalizado')
          .map(p => ({
            id: p.id,
            cliente: p.clienteNome || p.clienteTelefone || 'Cliente',
            valor: Number(p.total ?? 0),
            status: p.status
          }));
        setData({
          vendasHoje: vendas,
          ticketMedio: ticket,
          pedidosHoje: pedidosCount,
          clientesHoje: clientesSet.size,
          produtosMaisVendidos: top,
          pedidosEmAndamento: pendentes,
          estoqueBaixo: d.estoqueBaixo || [],
          clientesRecorrentes: d.clientesRecorrentes || []
        });
      } catch (e) {
        console.error('Erro ao carregar dashboard admin', e);
      }
    }
    carregarTudo();
    timer = setInterval(carregarTudo, 5000);
    return () => {
      if (timer) clearInterval(timer);
    };
  }, []);

  const stats = useMemo(() => {
    const vendasHojeNumber = Number(data.vendasHoje ?? 0);
    const ticketMedioNumber = Number(data.ticketMedio ?? 0);
    const pedidosHojeNumber = Number(data.pedidosHoje ?? 0);
    const clientesHojeNumber = Number(data.clientesHoje ?? 0);

    return [
      { title: 'Vendas Hoje', value: `R$ ${vendasHojeNumber.toFixed(2)}`, color: 'from-green-500 to-emerald-600', icon: '💰', trend: '+12%' },
      { title: 'Pedidos Hoje', value: pedidosHojeNumber, color: 'from-blue-500 to-cyan-600', icon: '🛍️', trend: '+8%' },
      { title: 'Ticket Médio', value: `R$ ${ticketMedioNumber.toFixed(2)}`, color: 'from-purple-500 to-violet-600', icon: '📈', trend: '+5%' },
      { title: 'Clientes', value: clientesHojeNumber, color: 'from-amber-500 to-orange-600', icon: '👥', trend: '+15%' }
    ];
  }, [data]);

  if (checkingSession) {
    return (
      <main className="flex-1 bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <main className="flex-1 bg-zinc-950 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Dashboard</h1>
            <p className="text-zinc-400">
              {session.loja.nome} • Bem-vindo de volta, {session.username}
            </p>
          </div>
          <span className="px-2 py-1 rounded bg-green-500/20 text-green-400 text-xs border border-green-500/30">
            Loja Aberta
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => (
            <div key={stat.title} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden p-4 sm:p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-zinc-400 text-sm mb-1">{stat.title}</p>
                  <p className="text-2xl sm:text-3xl font-bold text-white">{stat.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                  <span className="text-white">{stat.icon}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 mt-3 text-sm text-green-400">
                <span>↗</span>
                <span>{stat.trend} vs ontem</span>
              </div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl lg:col-span-2">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <div className="text-white font-semibold flex items-center gap-2">
                <span>⏱️</span>
                Pedidos Pendentes ({data.pedidosEmAndamento.length})
              </div>
              <a href="/admin/orders" className="text-amber-400 text-sm font-semibold">Ver todos →</a>
            </div>
            <div className="p-4">
              {data.pedidosEmAndamento.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-zinc-500">Nenhum pedido pendente 🎉</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.pedidosEmAndamento.slice(0, 5).map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-3 rounded-xl bg-zinc-800/50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                          <span className="text-amber-400">🛍️</span>
                        </div>
                        <div>
                          <p className="text-white font-medium">#{order.id?.slice?.(-6) || order.id}</p>
                          <p className="text-zinc-500 text-sm">{order.cliente}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-amber-400 font-bold">
                          R$ {Number(order.valor ?? 0).toFixed(2)}
                        </p>
                        <p className="text-zinc-500 text-xs">{order.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            {data.estoqueBaixo.length > 0 && (
              <div className="rounded-xl border border-red-500/30 bg-gradient-to-br from-red-500/10 to-red-600/5">
                <div className="px-4 py-3 border-b border-red-500/20">
                  <div className="text-red-400 font-semibold text-base flex items-center gap-2">⚠️ Estoque Baixo</div>
                </div>
                <div className="p-4 space-y-2">
                  {data.estoqueBaixo.slice(0, 3).map((p) => (
                    <div key={p.nome} className="flex items-center justify-between text-sm">
                      <span className="text-white truncate">{p.nome}</span>
                      <span className="px-2 py-0.5 rounded border border-red-500/50 text-red-400">{p.estoque} un</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-xl border border-zinc-800 bg-zinc-900">
              <div className="px-4 py-3 border-b border-zinc-800">
                <div className="text-white font-semibold text-base">📦 Top produtos</div>
              </div>
              <div className="p-4 space-y-2">
                {data.produtosMaisVendidos.slice(0, 5).map((p) => (
                  <div key={p.nome} className="flex items-center justify-between text-sm">
                    <span className="text-white">{p.nome}</span>
                    <span className="text-zinc-400">{p.quantidade} vendas</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
