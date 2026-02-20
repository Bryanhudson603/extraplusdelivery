'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

type Cliente = {
  id: string;
  nome: string;
  telefone?: string;
  endereco?: string;
  ultimoPedidoEm: string;
  totalPedidos: number;
  valorTotal: number;
  saldoCarteira: number;
};

type ClientePedido = {
  id: string;
  total: number;
  status: string;
  createdAt: string;
};

type Cupom = {
  id: string;
  nome: string;
  codigo: string;
  validoDe?: string;
  validoAte?: string;
  usosPorCliente?: number;
  quantidadeTotal?: number;
  quantidadeRestante?: number;
  ativo: boolean;
  descontoPercentual?: number;
};

export default function AdminCustomersPage() {
  const router = useRouter();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [detalheAberto, setDetalheAberto] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [pedidosCliente, setPedidosCliente] = useState<ClientePedido[]>([]);
  const [loadingPedidos, setLoadingPedidos] = useState(false);
  const [selecionados, setSelecionados] = useState<Record<string, boolean>>({});
  const [cupons, setCupons] = useState<Cupom[]>([]);
  const [cupomSelecionado, setCupomSelecionado] = useState<string>('');
  const [enviando, setEnviando] = useState(false);
  const [feedbackEnvio, setFeedbackEnvio] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [editarAberto, setEditarAberto] = useState(false);
  const [clienteEdicao, setClienteEdicao] = useState<Cliente | null>(null);
  const [nomeEdicao, setNomeEdicao] = useState('');
  const [telefoneEdicao, setTelefoneEdicao] = useState('');
  const [enderecoEdicao, setEnderecoEdicao] = useState('');
  const [salvandoCliente, setSalvandoCliente] = useState(false);
  const [feedbackEdicao, setFeedbackEdicao] = useState<string | null>(null);
  const [carteiraAberta, setCarteiraAberta] = useState(false);
  const [clienteCarteira, setClienteCarteira] = useState<Cliente | null>(null);
  const [valorCarteira, setValorCarteira] = useState('');
  const [processandoCarteira, setProcessandoCarteira] = useState(false);
  const [feedbackCarteira, setFeedbackCarteira] = useState<string | null>(null);

  useEffect(() => {
    async function carregar() {
      try {
        const r = await api.get<Cliente[]>('/admin/clientes');
        setClientes(r);
      } catch (e) {
        console.error('Erro ao carregar clientes', e);
      } finally {
        setLoading(false);
      }
    }
    carregar();
  }, []);

  useEffect(() => {
    async function carregarCupons(): Promise<void> {
      try {
        const r = await api.get<Cupom[]>('/admin/cupons');
        const ativos = r.filter(
          c => c.ativo !== false && (c.quantidadeRestante == null || c.quantidadeRestante > 0)
        );
        setCupons(ativos);
        if (ativos.length > 0) {
          setCupomSelecionado(ativos[0].codigo);
        } else {
          setCupomSelecionado('');
        }
      } catch (e) {
        console.error('Erro ao carregar cupons', e);
      }
    }
    carregarCupons();
  }, []);

  async function abrirPedidos(cliente: Cliente) {
    setClienteSelecionado(cliente);
    setDetalheAberto(true);
    setLoadingPedidos(true);
    try {
      const r = await api.get<ClientePedido[]>(`/admin/clientes/${cliente.id}/pedidos`);
      setPedidosCliente(r);
    } catch (e) {
      console.error('Erro ao carregar pedidos do cliente', e);
      setPedidosCliente([]);
    } finally {
      setLoadingPedidos(false);
    }
  }

  function abrirEdicao(cliente: Cliente) {
    setClienteEdicao(cliente);
    setNomeEdicao(cliente.nome);
    setTelefoneEdicao(cliente.telefone ?? '');
    setEnderecoEdicao(cliente.endereco ?? '');
    setFeedbackEdicao(null);
    setEditarAberto(true);
  }

  async function salvarEdicaoCliente() {
    if (!clienteEdicao || salvandoCliente) return;
    setSalvandoCliente(true);
    setFeedbackEdicao(null);
    try {
      const payload = {
        nome: nomeEdicao.trim() || clienteEdicao.nome,
        telefone: telefoneEdicao.trim() || undefined,
        endereco: enderecoEdicao.trim() || undefined
      };
      const atualizado = await api.put<Cliente>(
        `/admin/clientes/${clienteEdicao.id}`,
        payload
      );
      setClientes(prev =>
        prev.map(c => (c.id === atualizado.id ? { ...c, ...atualizado } : c))
      );
      setClienteEdicao(atualizado);
      setFeedbackEdicao('Dados do cliente atualizados com sucesso.');
      setEditarAberto(false);
    } catch (e) {
      console.error(e);
      setFeedbackEdicao('Falha ao salvar alterações. Tente novamente.');
    } finally {
      setSalvandoCliente(false);
    }
  }

  function abrirCarteira(cliente: Cliente) {
    setClienteCarteira(cliente);
    setValorCarteira('');
    setFeedbackCarteira(null);
    setCarteiraAberta(true);
  }

  async function adicionarSaldoCarteira() {
    if (!clienteCarteira || processandoCarteira) return;
    const valor = Number(valorCarteira.replace(',', '.'));
    if (!valorCarteira || Number.isNaN(valor) || valor <= 0) {
      setFeedbackCarteira('Informe um valor válido para adicionar.');
      return;
    }
    setProcessandoCarteira(true);
    setFeedbackCarteira(null);
    try {
      const resposta = await api.post<{ id: string; saldoCarteira: number }>(
        `/admin/clientes/${clienteCarteira.id}/carteira`,
        { valor }
      );
      setClientes(prev =>
        prev.map(c =>
          c.id === resposta.id ? { ...c, saldoCarteira: resposta.saldoCarteira } : c
        )
      );
      setClienteCarteira(prev =>
        prev ? { ...prev, saldoCarteira: resposta.saldoCarteira } : prev
      );
      setFeedbackCarteira('Saldo adicionado com sucesso.');
      setCarteiraAberta(false);
    } catch (e) {
      console.error(e);
      setFeedbackCarteira('Falha ao adicionar saldo. Tente novamente.');
    } finally {
      setProcessandoCarteira(false);
    }
  }

  function toggleSelecionado(id: string) {
    setSelecionados(prev => ({ ...prev, [id]: !prev[id] }));
  }

  async function enviarCupom() {
    if (!cupomSelecionado) return;
    const ids = Object.entries(selecionados)
      .filter(([_, v]) => v)
      .map(([id]) => id);
    if (ids.length === 0) {
      setFeedbackEnvio('Selecione pelo menos um cliente.');
      return;
    }
    setEnviando(true);
    setFeedbackEnvio(null);
    try {
      const r = await api.post<{ codigo: string; enviados: number }>(
        `/admin/cupons/${cupomSelecionado}/enviar`,
        { clientes: ids }
      );
      setFeedbackEnvio(`Cupom ${r.codigo} enviado para ${r.enviados} cliente(s).`);
      setSelecionados({});
    } catch (e) {
      setFeedbackEnvio('Falha ao enviar cupom. Tente novamente.');
      console.error(e);
    } finally {
      setEnviando(false);
    }
  }

  const totalClientes = clientes.length;
  const totalAtivos = totalClientes;
  const totalBloqueados = 0;
  const topClienteValor =
    clientes.length > 0
      ? clientes.reduce((max, c) => (c.valorTotal > max ? c.valorTotal : max), 0)
      : 0;

  const termoBusca = busca.trim().toLowerCase();
  const clientesFiltrados =
    termoBusca.length === 0
      ? clientes
      : clientes.filter(c => {
          const alvo = `${c.nome} ${c.telefone ?? ''} ${c.endereco ?? ''}`.toLowerCase();
          return alvo.includes(termoBusca);
        });

  return (
    <main className="min-h-screen bg-zinc-950 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push('/admin')}
              className="text-xs text-zinc-400 hover:text-amber-400"
            >
              ← Voltar
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">Clientes</h1>
              <p className="text-xs text-zinc-500">
                {totalClientes} cliente(s) cadastrados
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-3">
            <div className="text-[11px] text-zinc-500 mb-1">Total</div>
            <div className="text-xl font-bold text-white">{totalClientes}</div>
          </div>
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-3">
            <div className="text-[11px] text-zinc-500 mb-1">Ativos</div>
            <div className="text-xl font-bold text-emerald-400">{totalAtivos}</div>
          </div>
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-3">
            <div className="text-[11px] text-zinc-500 mb-1">Bloqueados</div>
            <div className="text-xl font-bold text-red-400">{totalBloqueados}</div>
          </div>
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-3">
            <div className="text-[11px] text-zinc-500 mb-1">Top cliente</div>
            <div className="text-xl font-bold text-amber-400">
              R$ {topClienteValor.toFixed(2)}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={cupomSelecionado}
              onChange={e => setCupomSelecionado(e.target.value)}
              className="h-10 rounded-lg bg-zinc-950 border border-zinc-700 px-3 text-sm text-zinc-100 outline-none sm:min-w-[220px]"
            >
              {cupons.length === 0 ? (
                <option value="">Nenhum cupom criado</option>
              ) : (
                cupons.map(c => (
                  <option key={c.id} value={c.codigo}>
                    {c.nome} • {c.codigo}
                    {c.descontoPercentual && c.descontoPercentual > 0
                      ? ` • ${c.descontoPercentual}%`
                      : ''}
                  </option>
                ))
              )}
            </select>
            <button
              type="button"
              onClick={enviarCupom}
              disabled={enviando || !cupomSelecionado}
              className="h-10 px-4 rounded-lg bg-amber-500 hover:bg-amber-600 text-black text-sm font-semibold disabled:opacity-60"
            >
              {enviando ? 'Enviando...' : 'Enviar cupom para selecionados'}
            </button>
          </div>
          {feedbackEnvio && <span className="text-xs text-zinc-400">{feedbackEnvio}</span>}
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
          <div className="mb-3">
            <input
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar por nome, telefone ou endereço..."
              className="w-full h-9 rounded-lg bg-zinc-950 border border-zinc-800 px-3 text-xs text-zinc-100 outline-none placeholder:text-zinc-600"
            />
          </div>
          {loading ? (
            <div className="p-4 text-xs text-zinc-500">Carregando clientes...</div>
          ) : clientes.length === 0 ? (
            <div className="p-4 text-xs text-zinc-500">
              Nenhum cliente ainda fez pedido na sua loja.
            </div>
          ) : clientesFiltrados.length === 0 ? (
            <div className="p-4 text-xs text-zinc-500">Nenhum cliente encontrado nessa busca.</div>
          ) : (
            <div className="space-y-2">
              {clientesFiltrados.map(cliente => {
                const inicial = cliente.nome?.trim().charAt(0).toUpperCase() || '?';
                const isTop =
                  topClienteValor > 0 && cliente.valorTotal === topClienteValor && topClienteValor > 0;
                return (
                  <div
                    key={cliente.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-amber-500 flex items-center justify-center text-xs font-bold text-black">
                        {inicial}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white">{cliente.nome}</span>
                          {isTop && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/60 text-[10px] text-amber-300 font-semibold">
                              Top
                            </span>
                          )}
                        </div>
                        {cliente.telefone && (
                          <div className="text-[11px] text-zinc-500">{cliente.telefone}</div>
                        )}
                        {cliente.endereco && (
                          <div className="text-[11px] text-zinc-600">{cliente.endereco}</div>
                        )}
                        <div className="flex gap-4 mt-1 text-[11px] text-zinc-500">
                          <span>{cliente.totalPedidos} pedido(s)</span>
                          <span>
                            R$ {cliente.valorTotal.toFixed(2)} <span className="text-zinc-600">total</span>
                          </span>
                          <span className="text-emerald-400">
                            Carteira: R$ {(cliente.saldoCarteira ?? 0).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 text-[11px] text-zinc-500">
                      <label className="inline-flex items-center gap-1 text-[10px]">
                        <input
                          type="checkbox"
                          checked={!!selecionados[cliente.id]}
                          onChange={() => toggleSelecionado(cliente.id)}
                          className="w-4 h-4 rounded border border-zinc-700 bg-zinc-950"
                        />
                        <span>Selecionar</span>
                      </label>
                      <div>
                        Último pedido em{' '}
                        {new Date(cliente.ultimoPedidoEm).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false
                        })}
                      </div>
                      <button
                        type="button"
                        onClick={() => abrirPedidos(cliente)}
                        className="mt-1 px-2 h-6 rounded-full border border-amber-500/60 text-amber-400 text-[10px] font-semibold"
                      >
                        Ver pedidos
                      </button>
                      <button
                        type="button"
                        onClick={() => abrirEdicao(cliente)}
                        className="mt-1 px-2 h-6 rounded-full border border-zinc-700 text-zinc-300 text-[10px] font-semibold"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => abrirCarteira(cliente)}
                        className="mt-1 px-2 h-6 rounded-full border border-emerald-500/60 text-emerald-400 text-[10px] font-semibold"
                      >
                        Adicionar saldo
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {detalheAberto && clienteSelecionado && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-40"
            onClick={() => setDetalheAberto(false)}
          />
          <div className="fixed inset-x-0 bottom-0 max-w-5xl mx-auto bg-zinc-900 border-t border-zinc-800 rounded-t-2xl z-50">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <div>
                <div className="text-sm font-semibold text-white">
                  Pedidos de {clienteSelecionado.nome}
                </div>
                {clienteSelecionado.telefone && (
                  <div className="text-[11px] text-zinc-500">
                    {clienteSelecionado.telefone}
                  </div>
                )}
              </div>
              <button
                type="button"
                className="text-xs text-zinc-400"
                onClick={() => setDetalheAberto(false)}
              >
                Fechar
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto px-4 py-3">
              {loadingPedidos ? (
                <div className="text-xs text-zinc-500 py-4">
                  Carregando pedidos...
                </div>
              ) : pedidosCliente.length === 0 ? (
                <div className="text-xs text-zinc-500 py-4">
                  Nenhum pedido encontrado para este cliente.
                </div>
              ) : (
                <div className="space-y-2 text-xs text-zinc-300">
                  {pedidosCliente.map(p => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-lg border border-zinc-800 px-3 py-2"
                    >
                      <div>
                        <div className="font-semibold text-white">
                          Pedido #{p.id.slice(-6).toUpperCase()}
                        </div>
                        <div className="text-[11px] text-zinc-500">
                          {new Date(p.createdAt).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false
                          })}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[11px] text-zinc-400 mb-1">
                          {p.status}
                        </div>
                        <div className="text-sm font-semibold text-amber-400">
                          R$ {p.total.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {editarAberto && clienteEdicao && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-40"
            onClick={() => setEditarAberto(false)}
          />
          <div className="fixed inset-x-0 bottom-0 max-w-5xl mx-auto bg-zinc-900 border-t border-zinc-800 rounded-t-2xl z-50">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <div>
                <div className="text-sm font-semibold text-white">
                  Editar cliente
                </div>
                <div className="text-[11px] text-zinc-500">
                  {clienteEdicao.nome}
                </div>
              </div>
              <button
                type="button"
                className="text-xs text-zinc-400"
                onClick={() => setEditarAberto(false)}
              >
                Fechar
              </button>
            </div>
            <div className="px-4 py-3 space-y-3 max-h-96 overflow-y-auto">
              <div className="space-y-1">
                <label className="text-[11px] text-zinc-400">Nome</label>
                <input
                  type="text"
                  value={nomeEdicao}
                  onChange={e => setNomeEdicao(e.target.value)}
                  className="w-full h-9 rounded-lg bg-zinc-950 border border-zinc-700 px-3 text-xs text-zinc-100 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-zinc-400">Telefone</label>
                <input
                  type="text"
                  value={telefoneEdicao}
                  onChange={e => setTelefoneEdicao(e.target.value)}
                  className="w-full h-9 rounded-lg bg-zinc-950 border border-zinc-700 px-3 text-xs text-zinc-100 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-zinc-400">Endereço</label>
                <input
                  type="text"
                  value={enderecoEdicao}
                  onChange={e => setEnderecoEdicao(e.target.value)}
                  className="w-full h-9 rounded-lg bg-zinc-950 border border-zinc-700 px-3 text-xs text-zinc-100 outline-none"
                />
              </div>
              {feedbackEdicao && (
                <div className="text-[11px] text-zinc-400">{feedbackEdicao}</div>
              )}
            </div>
            <div className="px-4 py-3 border-t border-zinc-800 flex justify-end">
              <button
                type="button"
                disabled={salvandoCliente}
                onClick={salvarEdicaoCliente}
                className="h-9 px-4 rounded-full bg-amber-500 text-black text-xs font-semibold disabled:opacity-60"
              >
                {salvandoCliente ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </div>
          </div>
        </>
      )}

      {carteiraAberta && clienteCarteira && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-40"
            onClick={() => setCarteiraAberta(false)}
          />
          <div className="fixed inset-x-0 bottom-0 max-w-5xl mx-auto bg-zinc-900 border-t border-zinc-800 rounded-t-2xl z-50">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <div>
                <div className="text-sm font-semibold text-white">
                  Adicionar saldo na carteira
                </div>
                <div className="text-[11px] text-zinc-500">
                  {clienteCarteira.nome} • Saldo atual: R${' '}
                  {(clienteCarteira.saldoCarteira ?? 0).toFixed(2)}
                </div>
              </div>
              <button
                type="button"
                className="text-xs text-zinc-400"
                onClick={() => setCarteiraAberta(false)}
              >
                Fechar
              </button>
            </div>
            <div className="px-4 py-3 space-y-3 max-h-96 overflow-y-auto">
              <div className="space-y-1">
                <label className="text-[11px] text-zinc-400">
                  Valor para adicionar (R$)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]*[.,]?[0-9]*"
                  value={valorCarteira}
                  onChange={e => setValorCarteira(e.target.value)}
                  placeholder="Ex: 20,00"
                  className="w-full h-9 rounded-lg bg-zinc-950 border border-zinc-700 px-3 text-xs text-zinc-100 outline-none"
                />
              </div>
              {feedbackCarteira && (
                <div className="text-[11px] text-zinc-400">{feedbackCarteira}</div>
              )}
            </div>
            <div className="px-4 py-3 border-t border-zinc-800 flex justify-end">
              <button
                type="button"
                disabled={processandoCarteira}
                onClick={adicionarSaldoCarteira}
                className="h-9 px-4 rounded-full bg-emerald-500 text-black text-xs font-semibold disabled:opacity-60"
              >
                {processandoCarteira ? 'Adicionando...' : 'Adicionar saldo'}
              </button>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
