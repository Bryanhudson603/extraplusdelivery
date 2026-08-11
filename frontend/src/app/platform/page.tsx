'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError, api } from '@/lib/api';

type Loja = {
  id: string;
  nome: string;
  slug: string;
  ativo: boolean;
  criadoEm: string;
};

type AdminUser = {
  id: string;
  username: string;
  lojaId: string;
  ativo: boolean;
};

type ClienteUser = {
  id: string;
  nome: string;
  telefone: string;
  lojaId: string;
  ativo: boolean;
};

type UsuariosResp = {
  admins: AdminUser[];
  clientes: ClienteUser[];
};

type PedidoResumo = {
  id: string;
  lojaId: string;
  lojaNome: string;
  clienteNome: string;
  clienteTelefone: string;
  total: number;
  status: string;
  criadoEm: string;
};

export default function PlatformHomePage() {
  const router = useRouter();
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [usuarios, setUsuarios] = useState<UsuariosResp>({ admins: [], clientes: [] });
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [novaLojaNome, setNovaLojaNome] = useState('');
  const [novaLojaSlug, setNovaLojaSlug] = useState('');
  const [criandoLoja, setCriandoLoja] = useState(false);

  const [novoAdminUser, setNovoAdminUser] = useState('');
  const [novoAdminPass, setNovoAdminPass] = useState('');
  const [novoAdminLoja, setNovoAdminLoja] = useState('');
  const [criandoAdmin, setCriandoAdmin] = useState(false);

  const [novoClienteNome, setNovoClienteNome] = useState('');
  const [novoClienteTel, setNovoClienteTel] = useState('');
  const [novoClientePass, setNovoClientePass] = useState('');
  const [novoClienteEndereco, setNovoClienteEndereco] = useState('');
  const [novoClienteLoja, setNovoClienteLoja] = useState('');
  const [criandoCliente, setCriandoCliente] = useState(false);

  const [editandoAdmin, setEditandoAdmin] = useState<AdminUser | null>(null);
  const [editAdminUsername, setEditAdminUsername] = useState('');
  const [editAdminSenha, setEditAdminSenha] = useState('');
  const [salvandoAdmin, setSalvandoAdmin] = useState(false);
  const [feedbackEdicaoAdmin, setFeedbackEdicaoAdmin] = useState<string | null>(null);

  const [clienteParaZerar, setClienteParaZerar] = useState<string | null>(null);
  const [zerandoPedidosId, setZerandoPedidosId] = useState<string | null>(null);
  const [feedbackZerarPorCliente, setFeedbackZerarPorCliente] = useState<Record<string, string>>({});

  const [pedidos, setPedidos] = useState<PedidoResumo[]>([]);
  const [loadingPedidos, setLoadingPedidos] = useState(true);
  const [pedidosSelecionados, setPedidosSelecionados] = useState<Record<string, boolean>>({});
  const [confirmandoApagarPedidos, setConfirmandoApagarPedidos] = useState(false);
  const [apagandoPedidos, setApagandoPedidos] = useState(false);
  const [feedbackPedidos, setFeedbackPedidos] = useState<string | null>(null);

  const lojasAtivas = useMemo(() => lojas.filter(l => l.ativo), [lojas]);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const [ls, us] = await Promise.all([
        api.get<Loja[]>('/platform/lojas'),
        api.get<UsuariosResp>('/platform/usuarios')
      ]);
      setLojas(ls);
      setUsuarios(us);
      if (!novoAdminLoja && ls.length) setNovoAdminLoja(ls[0].id);
      if (!novoClienteLoja && ls.length) setNovoClienteLoja(ls[0].id);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        window.localStorage.removeItem('extraplus-platform-session');
        router.replace('/platform/login');
        return;
      }
      setLojas([]);
      setUsuarios({ admins: [], clientes: [] });
      setErro(e instanceof Error ? e.message : 'Falha ao carregar lojas e usuarios.');
    } finally {
      setLoading(false);
    }
  }, [novoAdminLoja, novoClienteLoja, router]);

  const carregarPedidos = useCallback(async () => {
    setLoadingPedidos(true);
    try {
      const resp = await api.get<PedidoResumo[]>('/platform/pedidos');
      setPedidos(resp);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        window.localStorage.removeItem('extraplus-platform-session');
        router.replace('/platform/login');
        return;
      }
      setPedidos([]);
    } finally {
      setLoadingPedidos(false);
    }
  }, [router]);

  useEffect(() => {
    carregar();
    carregarPedidos();
  }, [carregar, carregarPedidos]);

  function togglePedidoSelecionado(id: string) {
    setPedidosSelecionados(prev => ({ ...prev, [id]: !prev[id] }));
  }

  function toggleSelecionarTodosPedidos() {
    setPedidosSelecionados(prev => {
      const todosMarcados = pedidos.length > 0 && pedidos.every(p => prev[p.id]);
      if (todosMarcados) return {};
      const next: Record<string, boolean> = {};
      for (const p of pedidos) next[p.id] = true;
      return next;
    });
  }

  async function apagarPedidosSelecionados() {
    const ids = Object.entries(pedidosSelecionados)
      .filter(([, v]) => v)
      .map(([id]) => id);
    if (ids.length === 0) return;

    setApagandoPedidos(true);
    setFeedbackPedidos(null);
    try {
      const resposta = await api.post<{ removidos: number }>('/platform/pedidos/apagar', { ids });
      setFeedbackPedidos(`${resposta.removidos} pedido(s) apagado(s) com sucesso.`);
      setPedidosSelecionados({});
      await carregarPedidos();
    } catch (e) {
      setFeedbackPedidos('Falha ao apagar pedidos selecionados.');
    } finally {
      setApagandoPedidos(false);
      setConfirmandoApagarPedidos(false);
    }
  }

  const totalSelecionadosPedidos = Object.values(pedidosSelecionados).filter(Boolean).length;

  async function criarLoja() {
    if (criandoLoja) return;
    setCriandoLoja(true);
    try {
      await api.post('/platform/lojas', { nome: novaLojaNome, slug: novaLojaSlug || undefined });
      setNovaLojaNome('');
      setNovaLojaSlug('');
      await carregar();
    } finally {
      setCriandoLoja(false);
    }
  }

  async function toggleLoja(id: string, ativo: boolean) {
    await api.put(`/platform/lojas/${id}`, { ativo: !ativo });
    await carregar();
  }

  async function criarAdmin() {
    if (criandoAdmin) return;
    setCriandoAdmin(true);
    try {
      await api.post('/platform/usuarios/admin', {
        username: novoAdminUser,
        senha: novoAdminPass,
        lojaId: novoAdminLoja
      });
      setNovoAdminUser('');
      setNovoAdminPass('');
      await carregar();
    } finally {
      setCriandoAdmin(false);
    }
  }

  async function toggleAdmin(id: string, ativo: boolean) {
    await api.put(`/platform/usuarios/admin/${id}`, { ativo: !ativo });
    await carregar();
  }

  function abrirEdicaoAdmin(admin: AdminUser) {
    setEditandoAdmin(admin);
    setEditAdminUsername(admin.username);
    setEditAdminSenha('');
    setFeedbackEdicaoAdmin(null);
  }

  async function salvarEdicaoAdmin() {
    if (!editandoAdmin || salvandoAdmin) return;
    setSalvandoAdmin(true);
    setFeedbackEdicaoAdmin(null);
    try {
      const payload: { username?: string; senha?: string } = {};
      const novoUsername = editAdminUsername.trim();
      if (novoUsername && novoUsername !== editandoAdmin.username) {
        payload.username = novoUsername;
      }
      if (editAdminSenha.trim()) {
        payload.senha = editAdminSenha.trim();
      }
      if (!payload.username && !payload.senha) {
        setFeedbackEdicaoAdmin('Altere o usuário ou informe uma nova senha para salvar.');
        return;
      }
      await api.put(`/platform/usuarios/admin/${editandoAdmin.id}`, payload);
      setEditandoAdmin(null);
      await carregar();
    } catch (e) {
      if (e instanceof ApiError && e.payload && typeof e.payload === 'object' && 'message' in e.payload) {
        setFeedbackEdicaoAdmin(String((e.payload as { message?: unknown }).message || 'Falha ao salvar.'));
      } else {
        setFeedbackEdicaoAdmin('Falha ao salvar alterações.');
      }
    } finally {
      setSalvandoAdmin(false);
    }
  }

  async function zerarPedidosCliente(id: string) {
    setZerandoPedidosId(id);
    try {
      const resposta = await api.delete<{ removidos: number }>(`/platform/usuarios/cliente/${id}/pedidos` as any);
      setFeedbackZerarPorCliente(prev => ({
        ...prev,
        [id]: `${resposta.removidos} pedido(s) apagado(s).`
      }));
    } catch (e) {
      setFeedbackZerarPorCliente(prev => ({ ...prev, [id]: 'Falha ao apagar pedidos.' }));
    } finally {
      setZerandoPedidosId(null);
      setClienteParaZerar(null);
    }
  }

  async function criarCliente() {
    if (criandoCliente) return;
    setCriandoCliente(true);
    try {
      await api.post('/platform/usuarios/cliente', {
        nome: novoClienteNome,
        telefone: novoClienteTel,
        senha: novoClientePass,
        endereco: novoClienteEndereco,
        lojaId: novoClienteLoja
      });
      setNovoClienteNome('');
      setNovoClienteTel('');
      setNovoClientePass('');
      setNovoClienteEndereco('');
      await carregar();
    } finally {
      setCriandoCliente(false);
    }
  }

  async function toggleCliente(id: string, ativo: boolean) {
    await api.put(`/platform/usuarios/cliente/${id}`, { ativo: !ativo });
    await carregar();
  }

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="bg-white border border-gray-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-2xl p-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="text-lg font-bold">Lojas (Clientes)</div>
            <div className="text-xs text-gray-600 dark:text-zinc-400">
              Crie e ative/desative lojas que contrataram o sistema.
            </div>
          </div>
        </div>

        {erro && (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-300">
            {erro}
          </div>
        )}

        <div className="mt-4 grid md:grid-cols-3 gap-3">
          <input
            value={novaLojaNome}
            onChange={e => setNovaLojaNome(e.target.value)}
            placeholder="Nome da loja"
            className="h-10 rounded-lg bg-white border border-gray-300 px-3 text-sm outline-none dark:bg-zinc-950 dark:border-zinc-700"
          />
          <input
            value={novaLojaSlug}
            onChange={e => setNovaLojaSlug(e.target.value)}
            placeholder="Slug (opcional)"
            className="h-10 rounded-lg bg-white border border-gray-300 px-3 text-sm outline-none dark:bg-zinc-950 dark:border-zinc-700"
          />
          <button
            type="button"
            disabled={criandoLoja}
            onClick={criarLoja}
            className="h-10 rounded-lg bg-amber-500 hover:bg-amber-600 text-black text-sm font-semibold disabled:opacity-60"
          >
            {criandoLoja ? 'Criando...' : 'Criar loja'}
          </button>
        </div>

        <div className="mt-4 divide-y divide-gray-200 dark:divide-zinc-800">
          {lojas.map(loja => (
            <div key={loja.id} className="py-3 flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold">{loja.nome}</div>
                <div className="text-xs text-gray-600 dark:text-zinc-400">
                  id/slug: {loja.id} • {loja.ativo ? 'ativa' : 'inativa'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggleLoja(loja.id, loja.ativo)}
                className={`h-9 px-3 rounded-lg text-xs font-semibold border ${
                  loja.ativo
                    ? 'border-red-500/40 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10'
                    : 'border-green-500/40 text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-500/10'
                }`}
              >
                {loja.ativo ? 'Desativar' : 'Ativar'}
              </button>
            </div>
          ))}
          {lojas.length === 0 && (
            <div className="py-4 text-xs text-gray-600 dark:text-zinc-400">
              Nenhuma loja encontrada.
            </div>
          )}
        </div>
      </section>

      <section className="bg-white border border-gray-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-2xl p-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="text-lg font-bold">Pedidos ({pedidos.length})</div>
            <div className="text-xs text-gray-600 dark:text-zinc-400">
              Todos os pedidos de todas as lojas. Selecione e apague os que forem de teste.
            </div>
          </div>
          <button
            type="button"
            onClick={() => void carregarPedidos()}
            className="h-9 px-3 rounded-lg text-xs font-semibold border border-gray-300 dark:border-zinc-700"
          >
            {loadingPedidos ? 'Atualizando...' : 'Atualizar lista'}
          </button>
        </div>

        {pedidos.length > 0 && (
          <div className="mt-4 flex items-center justify-between gap-3 flex-wrap rounded-xl bg-amber-50 dark:bg-amber-950/30 px-3 py-2">
            <label className="inline-flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={pedidos.length > 0 && pedidos.every(p => pedidosSelecionados[p.id])}
                onChange={toggleSelecionarTodosPedidos}
                className="w-4 h-4"
              />
              Selecionar todos ({totalSelecionadosPedidos} selecionado(s))
            </label>
            <button
              type="button"
              disabled={totalSelecionadosPedidos === 0}
              onClick={() => setConfirmandoApagarPedidos(true)}
              className="h-9 px-3 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
            >
              Apagar selecionados
            </button>
          </div>
        )}

        {confirmandoApagarPedidos && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-red-50 dark:bg-red-950/30 px-3 py-2">
            <span className="text-xs text-red-800 dark:text-red-200">
              Apagar {totalSelecionadosPedidos} pedido(s) selecionado(s)? Essa ação não pode ser desfeita.
            </span>
            <div className="flex gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => setConfirmandoApagarPedidos(false)}
                className="text-xs text-gray-600 dark:text-zinc-400"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={apagandoPedidos}
                onClick={apagarPedidosSelecionados}
                className="text-xs font-semibold text-red-600 dark:text-red-400 disabled:opacity-60"
              >
                {apagandoPedidos ? 'Apagando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        )}

        {feedbackPedidos && (
          <div className="mt-3 text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
            {feedbackPedidos}
          </div>
        )}

        <div className="mt-4 max-h-[420px] overflow-y-auto divide-y divide-gray-200 dark:divide-zinc-800">
          {loadingPedidos ? (
            <div className="py-4 text-xs text-gray-600 dark:text-zinc-400">Carregando pedidos...</div>
          ) : pedidos.length === 0 ? (
            <div className="py-4 text-xs text-gray-600 dark:text-zinc-400">
              Nenhum pedido encontrado em nenhuma loja.
            </div>
          ) : (
            pedidos.map(p => (
              <label
                key={p.id}
                className="py-2.5 flex items-center gap-3 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={!!pedidosSelecionados[p.id]}
                  onChange={() => togglePedidoSelecionado(p.id)}
                  className="w-4 h-4 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold">
                      #{p.id.slice(0, 8).toUpperCase()}
                    </span>
                    <span className="text-[11px] text-gray-600 dark:text-zinc-400">{p.lojaNome}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300">
                      {p.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-600 dark:text-zinc-500">
                    {p.clienteNome}
                    {p.clienteTelefone ? ` • ${p.clienteTelefone}` : ''} •{' '}
                    {new Date(p.criadoEm).toLocaleString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false
                    })}
                  </div>
                </div>
                <div className="text-sm font-semibold flex-shrink-0">R$ {p.total.toFixed(2)}</div>
              </label>
            ))
          )}
        </div>
      </section>

      <section className="bg-white border border-gray-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-2xl p-5">
        <div>
          <div className="text-lg font-bold">Usuários</div>
          <div className="text-xs text-gray-600 dark:text-zinc-400">
            Gerencie admins (lojistas) e clientes finais.
          </div>
        </div>

        <div className="mt-4 grid lg:grid-cols-2 gap-6">
          <div className="rounded-xl border border-gray-200 dark:border-zinc-800 p-4">
            <div className="font-semibold mb-3">Criar Admin (Lojista)</div>
            <div className="grid gap-2">
              <input
                value={novoAdminUser}
                onChange={e => setNovoAdminUser(e.target.value)}
                placeholder="username"
                className="h-10 rounded-lg bg-white border border-gray-300 px-3 text-sm outline-none dark:bg-zinc-950 dark:border-zinc-700"
              />
              <input
                value={novoAdminPass}
                onChange={e => setNovoAdminPass(e.target.value)}
                placeholder="senha"
                className="h-10 rounded-lg bg-white border border-gray-300 px-3 text-sm outline-none dark:bg-zinc-950 dark:border-zinc-700"
              />
              <select
                value={novoAdminLoja}
                onChange={e => setNovoAdminLoja(e.target.value)}
                className="h-10 rounded-lg bg-white border border-gray-300 px-3 text-sm outline-none dark:bg-zinc-950 dark:border-zinc-700"
              >
                {lojasAtivas.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.nome}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={criandoAdmin}
                onClick={criarAdmin}
                className="h-10 rounded-lg bg-amber-500 hover:bg-amber-600 text-black text-sm font-semibold disabled:opacity-60"
              >
                {criandoAdmin ? 'Criando...' : 'Criar admin'}
              </button>
            </div>

            <div className="mt-4 divide-y divide-gray-200 dark:divide-zinc-800">
              {usuarios.admins.map(a => (
                <div key={a.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{a.username}</div>
                    <div className="text-xs text-gray-600 dark:text-zinc-400">
                      lojaId: {a.lojaId} • {a.ativo ? 'ativo' : 'inativo'}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => abrirEdicaoAdmin(a)}
                      className="h-9 px-3 rounded-lg text-xs font-semibold border border-blue-500/40 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleAdmin(a.id, a.ativo)}
                      className={`h-9 px-3 rounded-lg text-xs font-semibold border ${
                        a.ativo
                          ? 'border-red-500/40 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10'
                          : 'border-green-500/40 text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-500/10'
                      }`}
                    >
                      {a.ativo ? 'Desativar' : 'Ativar'}
                    </button>
                  </div>
                </div>
              ))}
              {usuarios.admins.length === 0 && (
                <div className="py-4 text-xs text-gray-600 dark:text-zinc-400">
                  Nenhum admin cadastrado.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 dark:border-zinc-800 p-4">
            <div className="font-semibold mb-3">Criar Cliente</div>
            <div className="grid gap-2">
              <input
                value={novoClienteNome}
                onChange={e => setNovoClienteNome(e.target.value)}
                placeholder="nome"
                className="h-10 rounded-lg bg-white border border-gray-300 px-3 text-sm outline-none dark:bg-zinc-950 dark:border-zinc-700"
              />
              <input
                value={novoClienteTel}
                onChange={e => setNovoClienteTel(e.target.value)}
                placeholder="telefone"
                className="h-10 rounded-lg bg-white border border-gray-300 px-3 text-sm outline-none dark:bg-zinc-950 dark:border-zinc-700"
              />
              <input
                value={novoClientePass}
                onChange={e => setNovoClientePass(e.target.value)}
                placeholder="senha"
                className="h-10 rounded-lg bg-white border border-gray-300 px-3 text-sm outline-none dark:bg-zinc-950 dark:border-zinc-700"
              />
              <input
                value={novoClienteEndereco}
                onChange={e => setNovoClienteEndereco(e.target.value)}
                placeholder="endereço"
                className="h-10 rounded-lg bg-white border border-gray-300 px-3 text-sm outline-none dark:bg-zinc-950 dark:border-zinc-700"
              />
              <select
                value={novoClienteLoja}
                onChange={e => setNovoClienteLoja(e.target.value)}
                className="h-10 rounded-lg bg-white border border-gray-300 px-3 text-sm outline-none dark:bg-zinc-950 dark:border-zinc-700"
              >
                {lojasAtivas.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.nome}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={criandoCliente}
                onClick={criarCliente}
                className="h-10 rounded-lg bg-amber-500 hover:bg-amber-600 text-black text-sm font-semibold disabled:opacity-60"
              >
                {criandoCliente ? 'Criando...' : 'Criar cliente'}
              </button>
            </div>

            <div className="mt-4 divide-y divide-gray-200 dark:divide-zinc-800">
              {usuarios.clientes.map(c => (
                <div key={c.id} className="py-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{c.nome}</div>
                      <div className="text-xs text-gray-600 dark:text-zinc-400">
                        {c.telefone} • lojaId: {c.lojaId} • {c.ativo ? 'ativo' : 'inativo'}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setClienteParaZerar(c.id)}
                        className="h-9 px-3 rounded-lg text-xs font-semibold border border-amber-500/40 text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-500/10"
                      >
                        Zerar pedidos
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleCliente(c.id, c.ativo)}
                        className={`h-9 px-3 rounded-lg text-xs font-semibold border ${
                          c.ativo
                            ? 'border-red-500/40 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10'
                            : 'border-green-500/40 text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-500/10'
                        }`}
                      >
                        {c.ativo ? 'Desativar' : 'Ativar'}
                      </button>
                    </div>
                  </div>

                  {clienteParaZerar === c.id && (
                    <div className="flex items-center justify-between gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 px-3 py-2">
                      <span className="text-xs text-amber-800 dark:text-amber-200">
                        Apagar todo o histórico de pedidos de {c.nome}? Essa ação não pode ser desfeita.
                      </span>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => setClienteParaZerar(null)}
                          className="text-xs text-gray-600 dark:text-zinc-400"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          disabled={zerandoPedidosId === c.id}
                          onClick={() => zerarPedidosCliente(c.id)}
                          className="text-xs font-semibold text-red-600 dark:text-red-400 disabled:opacity-60"
                        >
                          {zerandoPedidosId === c.id ? 'Apagando...' : 'Confirmar'}
                        </button>
                      </div>
                    </div>
                  )}

                  {feedbackZerarPorCliente[c.id] && (
                    <div className="text-[11px] text-gray-600 dark:text-zinc-400">
                      {feedbackZerarPorCliente[c.id]}
                    </div>
                  )}
                </div>
              ))}
              {usuarios.clientes.length === 0 && (
                <div className="py-4 text-xs text-gray-600 dark:text-zinc-400">
                  Nenhum cliente cadastrado.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {editandoAdmin && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setEditandoAdmin(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4">
              <div>
                <div className="text-lg font-bold">Editar admin (lojista)</div>
                <div className="text-xs text-gray-600 dark:text-zinc-400">lojaId: {editandoAdmin.lojaId}</div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-600 dark:text-zinc-400">Usuário</label>
                <input
                  value={editAdminUsername}
                  onChange={e => setEditAdminUsername(e.target.value)}
                  className="w-full h-10 rounded-lg bg-white border border-gray-300 px-3 text-sm outline-none dark:bg-zinc-950 dark:border-zinc-700"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-600 dark:text-zinc-400">Nova senha (deixe em branco para não alterar)</label>
                <input
                  value={editAdminSenha}
                  onChange={e => setEditAdminSenha(e.target.value)}
                  placeholder="Nova senha"
                  className="w-full h-10 rounded-lg bg-white border border-gray-300 px-3 text-sm outline-none dark:bg-zinc-950 dark:border-zinc-700"
                />
              </div>

              {feedbackEdicaoAdmin && (
                <div className="text-xs text-red-600 dark:text-red-400">{feedbackEdicaoAdmin}</div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditandoAdmin(null)}
                  className="flex-1 h-10 rounded-lg border border-gray-300 dark:border-zinc-700 text-sm font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={salvandoAdmin}
                  onClick={salvarEdicaoAdmin}
                  className="flex-1 h-10 rounded-lg bg-amber-500 hover:bg-amber-600 text-black text-sm font-semibold disabled:opacity-60"
                >
                  {salvandoAdmin ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
