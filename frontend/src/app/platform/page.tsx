'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';

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

export default function PlatformHomePage() {
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [usuarios, setUsuarios] = useState<UsuariosResp>({ admins: [], clientes: [] });
  const [loading, setLoading] = useState(true);

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

  const lojasAtivas = useMemo(() => lojas.filter(l => l.ativo), [lojas]);

  async function carregar() {
    setLoading(true);
    try {
      const [ls, us] = await Promise.all([
        api.get<Loja[]>('/platform/lojas'),
        api.get<UsuariosResp>('/platform/usuarios')
      ]);
      setLojas(ls);
      setUsuarios(us);
      if (!novoAdminLoja && ls.length) setNovoAdminLoja(ls[0].id);
      if (!novoClienteLoja && ls.length) setNovoClienteLoja(ls[0].id);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

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
              ))}
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
                <div key={c.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{c.nome}</div>
                    <div className="text-xs text-gray-600 dark:text-zinc-400">
                      {c.telefone} • lojaId: {c.lojaId} • {c.ativo ? 'ativo' : 'inativo'}
                    </div>
                  </div>
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
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
