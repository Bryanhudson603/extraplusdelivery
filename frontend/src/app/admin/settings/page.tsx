'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

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

export default function AdminSettingsPage() {
  const router = useRouter();
  const [lojaAberta, setLojaAberta] = useState(false);
  const [horariosAbertos, setHorariosAbertos] = useState(false);
  const [fidelidadeAberta, setFidelidadeAberta] = useState(false);
  const [cuponsAbertos, setCuponsAbertos] = useState(false);
  const [nomeLoja, setNomeLoja] = useState('');
  const [telefoneLoja, setTelefoneLoja] = useState('');
  const [enderecoLoja, setEnderecoLoja] = useState('');
  const [horaAbertura, setHoraAbertura] = useState('');
  const [horaFechamento, setHoraFechamento] = useState('');
  const [salvandoLoja, setSalvandoLoja] = useState(false);
  const [feedbackLoja, setFeedbackLoja] = useState<string | null>(null);
  const [horarios, setHorarios] = useState<
    { dia: number; nome: string; abre: string; fecha: string; fechado: boolean }[]
  >(() => [
    { dia: 0, nome: 'Domingo', abre: '10:00', fecha: '20:00', fechado: false },
    { dia: 1, nome: 'Segunda', abre: '08:00', fecha: '22:00', fechado: false },
    { dia: 2, nome: 'Terça', abre: '08:00', fecha: '22:00', fechado: false },
    { dia: 3, nome: 'Quarta', abre: '08:00', fecha: '22:00', fechado: false },
    { dia: 4, nome: 'Quinta', abre: '08:00', fecha: '22:00', fechado: false },
    { dia: 5, nome: 'Sexta', abre: '08:00', fecha: '23:00', fechado: false },
    { dia: 6, nome: 'Sábado', abre: '08:00', fecha: '23:00', fechado: false }
  ]);
  const [salvandoHorarios, setSalvandoHorarios] = useState(false);
  const [feedbackHorarios, setFeedbackHorarios] = useState<string | null>(null);
  const [pontosPorReal, setPontosPorReal] = useState('1');
  const [cashbackPercentual, setCashbackPercentual] = useState('0');
  const [minimoCashback, setMinimoCashback] = useState('0');
  const [salvandoFidelidade, setSalvandoFidelidade] = useState(false);
  const [feedbackFidelidade, setFeedbackFidelidade] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [codigo, setCodigo] = useState('');
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [usosPorCliente, setUsosPorCliente] = useState('1');
  const [descontoPercentual, setDescontoPercentual] = useState('0');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [quantidadeTotal, setQuantidadeTotal] = useState('');
  const [ativo, setAtivo] = useState(true);
  const [cupons, setCupons] = useState<Cupom[]>([]);
  const [entregadoresAbertos, setEntregadoresAbertos] = useState(false);
  const [entregadores, setEntregadores] = useState<
    Array<{ id: string; nome: string; telefone?: string; ativo: boolean }>
  >([]);
  const [novoEntregadorNome, setNovoEntregadorNome] = useState('');
  const [novoEntregadorTelefone, setNovoEntregadorTelefone] = useState('');
  const [salvandoEntregador, setSalvandoEntregador] = useState(false);
  const [feedbackEntregador, setFeedbackEntregador] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem('extraplus-store');
      if (raw) {
        const parsed = JSON.parse(raw);
        setNomeLoja(parsed.name || parsed.nome || 'PC Bebidas');
        setTelefoneLoja(parsed.phone || '');
        setEnderecoLoja(parsed.address || '');
        setHoraAbertura(parsed.horaAbertura || '');
        setHoraFechamento(parsed.horaFechamento || '');
      } else {
        setNomeLoja('PC Bebidas');
      }
    } catch {
      setNomeLoja('PC Bebidas');
    }

    try {
      const rawLoyalty = window.localStorage.getItem('extraplus-loyalty');
      if (rawLoyalty) {
        const loyalty = JSON.parse(rawLoyalty);
        if (loyalty.pontosPorReal != null) {
          setPontosPorReal(String(loyalty.pontosPorReal));
        }
        if (loyalty.cashbackPercentual != null) {
          setCashbackPercentual(String(loyalty.cashbackPercentual));
        }
        if (loyalty.minimoCashback != null) {
          setMinimoCashback(String(loyalty.minimoCashback));
        }
      }
    } catch {
    }

    try {
      const rawHours = window.localStorage.getItem('extraplus-hours');
      if (rawHours) {
        const parsed = JSON.parse(rawHours) as any[];
        if (Array.isArray(parsed) && parsed.length === 7) {
          setHorarios(prev =>
            prev.map((h, index) => {
              const entry = parsed[index] as any;
              return {
                ...h,
                abre: typeof entry?.abre === 'string' ? entry.abre : h.abre,
                fecha: typeof entry?.fecha === 'string' ? entry.fecha : h.fecha,
                fechado: typeof entry?.fechado === 'boolean' ? entry.fechado : h.fechado
              };
            })
          );
        }
      }
    } catch {
    }
  }, []);

  useEffect(() => {
    async function carregarCupons(): Promise<void> {
      try {
        const lista = await api.get<Cupom[]>('/admin/cupons');
        setCupons(lista);
      } catch (e) {
        console.error('Erro ao carregar cupons', e);
      }
    }
    carregarCupons();
  }, []);

  useEffect(() => {
    async function carregarEntregadores(): Promise<void> {
      try {
        const lista = await api.get<
          Array<{ id: string; nome: string; telefone?: string; ativo: boolean }>
        >('/admin/entregadores');
        setEntregadores(lista);
      } catch (e) {
        console.error('Erro ao carregar entregadores', e);
      }
    }
    carregarEntregadores();
  }, []);

  async function salvarConfiguracoesLoja() {
    if (salvandoLoja) return;
    setSalvandoLoja(true);
    setFeedbackLoja(null);
    try {
      const payload = {
        name: nomeLoja,
        phone: telefoneLoja,
        address: enderecoLoja,
        horaAbertura,
        horaFechamento,
        open: true
      };
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('extraplus-store', JSON.stringify(payload));
      }
      setFeedbackLoja('Configurações salvas com sucesso.');
    } catch (e) {
      setFeedbackLoja('Falha ao salvar configurações da loja.');
      console.error(e);
    } finally {
      setSalvandoLoja(false);
    }
  }

  function atualizarHorarioHora(index: number, campo: 'abre' | 'fecha', valor: string) {
    setHorarios(prev =>
      prev.map((h, i) => (i === index ? { ...h, [campo]: valor } : h))
    );
  }

  function atualizarHorarioFechado(index: number, fechado: boolean) {
    setHorarios(prev =>
      prev.map((h, i) => (i === index ? { ...h, fechado } : h))
    );
  }

  async function salvarHorarios() {
    if (salvandoHorarios) return;
    setSalvandoHorarios(true);
    setFeedbackHorarios(null);
    try {
      if (typeof window !== 'undefined') {
        const payload = horarios.map(h => ({
          dia: h.dia,
          abre: h.abre,
          fecha: h.fecha,
          fechado: h.fechado
        }));
        window.localStorage.setItem('extraplus-hours', JSON.stringify(payload));
      }
      setFeedbackHorarios('Horários salvos com sucesso.');
    } catch (e) {
      setFeedbackHorarios('Falha ao salvar horários.');
      console.error(e);
    } finally {
      setSalvandoHorarios(false);
    }
  }

  async function salvarFidelidade() {
    if (salvandoFidelidade) return;
    setSalvandoFidelidade(true);
    setFeedbackFidelidade(null);
    try {
      const payload = {
        pontosPorReal: Number(pontosPorReal || '0'),
        cashbackPercentual: Number(cashbackPercentual || '0'),
        minimoCashback: Number(minimoCashback || '0')
      };
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('extraplus-loyalty', JSON.stringify(payload));
      }
      setFeedbackFidelidade('Configurações de fidelidade salvas.');
    } catch (e) {
      setFeedbackFidelidade('Falha ao salvar fidelidade.');
      console.error(e);
    } finally {
      setSalvandoFidelidade(false);
    }
  }

  async function criarCupom() {
    if (submitting) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      const payload = {
        nome,
        codigo,
        validoDe: inicio || undefined,
        validoAte: fim || undefined,
        usosPorCliente: usosPorCliente ? Number(usosPorCliente) : undefined,
        quantidadeTotal: quantidadeTotal ? Number(quantidadeTotal) : undefined,
        ativo,
        descontoPercentual:
          descontoPercentual && Number(descontoPercentual) > 0
            ? Number(descontoPercentual)
            : undefined
      };
      const r = await api.post<Cupom>('/admin/cupons', payload);
      setFeedback(`Cupom ${r.codigo} criado com sucesso.`);
      setCupons(prev => [r, ...prev]);
      setNome('');
      setCodigo('');
      setInicio('');
      setFim('');
      setUsosPorCliente('1');
      setDescontoPercentual('0');
      setQuantidadeTotal('');
      setAtivo(true);
    } catch (e) {
      setFeedback('Falha ao criar cupom. Verifique os dados.');
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  }

  const cuponsAtivos = cupons.filter(
    c => c.ativo !== false && (c.quantidadeRestante == null || c.quantidadeRestante > 0)
  );

  async function criarEntregador() {
    if (salvandoEntregador) return;
    const nome = novoEntregadorNome.trim();
    const telefone = novoEntregadorTelefone.trim();
    if (!nome) {
      setFeedbackEntregador('Informe o nome do entregador.');
      return;
    }
    setSalvandoEntregador(true);
    setFeedbackEntregador(null);
    try {
      const criado = await api.post<{
        id: string;
        nome: string;
        telefone?: string;
        ativo: boolean;
      }>('/admin/entregadores', {
        nome,
        telefone: telefone || undefined
      });
      setEntregadores(prev => [criado, ...prev]);
      setNovoEntregadorNome('');
      setNovoEntregadorTelefone('');
      setFeedbackEntregador('Entregador cadastrado com sucesso.');
    } catch (e) {
      console.error(e);
      setFeedbackEntregador('Falha ao cadastrar entregador. Tente novamente.');
    } finally {
      setSalvandoEntregador(false);
    }
  }

  async function alternarAtivoEntregador(id: string, ativoAtual: boolean) {
    try {
      const atualizado = await api.put<{
        id: string;
        nome: string;
        telefone?: string;
        ativo: boolean;
      }>(`/admin/entregadores/${id}`, {
        ativo: !ativoAtual
      });
      if (!atualizado) return;
      setEntregadores(prev =>
        prev.map(e => (e.id === id ? { ...e, ativo: atualizado.ativo } : e))
      );
    } catch (e) {
      console.error('Erro ao atualizar entregador', e);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
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
              <h1 className="text-2xl font-bold text-white">Configurações</h1>
              <p className="text-xs text-zinc-500">
                Ajustes da loja PC Bebidas e preferências do painel.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setLojaAberta(true)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-left"
          >
            <h2 className="text-sm font-semibold text-white mb-1">Dados da loja</h2>
            <p className="text-xs text-zinc-500">
              Editar nome, telefone, endereço e horários da PC Bebidas.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setHorariosAbertos(true)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-left"
          >
            <h2 className="text-sm font-semibold text-white mb-1">Horários</h2>
            <p className="text-xs text-zinc-500">
              Definir horário de funcionamento por dia da semana.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setFidelidadeAberta(true)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-left"
          >
            <h2 className="text-sm font-semibold text-white mb-1">Fidelidade</h2>
            <p className="text-xs text-zinc-500">
              Definir pontos, cashback e valor mínimo para premiações.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setCuponsAbertos(true)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-left"
          >
            <h2 className="text-sm font-semibold text-white mb-1">Cupons</h2>
            <p className="text-xs text-zinc-500">
              Criar cupons com período de validade e limite por cliente.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setEntregadoresAbertos(true)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-left"
          >
            <h2 className="text-sm font-semibold text-white mb-1">Entregadores</h2>
            <p className="text-xs text-zinc-500">
              Cadastrar entregadores para vincular aos pedidos.
            </p>
          </button>
        </div>
      </div>

      {lojaAberta && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-40"
            onClick={() => setLojaAberta(false)}
          />
          <div className="fixed inset-x-0 bottom-0 max-w-5xl mx-auto bg-zinc-900 border-t border-zinc-800 rounded-t-2xl z-50">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <div>
                <div className="text-sm font-semibold text-white">Configurações da loja</div>
                <p className="text-[11px] text-zinc-500">
                  Essas informações aparecem para o cliente no app.
                </p>
              </div>
              <button
                type="button"
                className="text-xs text-zinc-400"
                onClick={() => setLojaAberta(false)}
              >
                Fechar
              </button>
            </div>
            <div className="px-4 py-3 space-y-3 max-h-96 overflow-y-auto">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Nome da loja</label>
                  <input
                    value={nomeLoja}
                    onChange={e => setNomeLoja(e.target.value)}
                    className="w-full h-10 rounded-lg bg-zinc-950 border border-zinc-700 px-3 text-sm text-zinc-100 outline-none"
                    placeholder="PC Bebidas"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Telefone</label>
                  <input
                    value={telefoneLoja}
                    onChange={e => setTelefoneLoja(e.target.value)}
                    className="w-full h-10 rounded-lg bg-zinc-950 border border-zinc-700 px-3 text-sm text-zinc-100 outline-none"
                    placeholder="(82) 99999-9999"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs text-zinc-400 mb-1">Endereço</label>
                  <input
                    value={enderecoLoja}
                    onChange={e => setEnderecoLoja(e.target.value)}
                    className="w-full h-10 rounded-lg bg-zinc-950 border border-zinc-700 px-3 text-sm text-zinc-100 outline-none"
                    placeholder="Rua, número, bairro"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Horário de abertura</label>
                  <input
                    type="time"
                    value={horaAbertura}
                    onChange={e => setHoraAbertura(e.target.value)}
                    className="w-full h-10 rounded-lg bg-zinc-950 border border-zinc-700 px-3 text-sm text-zinc-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Horário de fechamento</label>
                  <input
                    type="time"
                    value={horaFechamento}
                    onChange={e => setHoraFechamento(e.target.value)}
                    className="w-full h-10 rounded-lg bg-zinc-950 border border-zinc-700 px-3 text-sm text-zinc-100 outline-none"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 pt-1 pb-2">
                <button
                  type="button"
                  onClick={salvarConfiguracoesLoja}
                  disabled={salvandoLoja || !nomeLoja.trim()}
                  className="h-10 px-4 rounded-lg bg-amber-500 hover:bg-amber-600 text-black text-sm font-semibold disabled:opacity-60"
                >
                  {salvandoLoja ? 'Salvando...' : 'Salvar configurações'}
                </button>
                {feedbackLoja && (
                  <span className="text-xs text-zinc-400">{feedbackLoja}</span>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {horariosAbertos && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-40"
            onClick={() => setHorariosAbertos(false)}
          />
          <div className="fixed inset-x-0 bottom-0 max-w-5xl mx-auto bg-zinc-900 border-t border-zinc-800 rounded-t-2xl z-50">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <div>
                <div className="text-sm font-semibold text-white">Horário de funcionamento</div>
                <p className="text-[11px] text-zinc-500">
                  Configure os horários por dia da semana.
                </p>
              </div>
              <button
                type="button"
                className="text-xs text-zinc-400"
                onClick={() => setHorariosAbertos(false)}
              >
                Fechar
              </button>
            </div>
            <div className="px-4 py-3 space-y-3 max-h-96 overflow-y-auto">
              <div className="space-y-2">
                {horarios.map((h, index) => (
                  <div
                    key={h.dia}
                    className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 px-3 py-2"
                  >
                    <div className="w-28 text-sm font-semibold text-white">{h.nome}</div>
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={h.abre}
                        onChange={e => atualizarHorarioHora(index, 'abre', e.target.value)}
                        disabled={h.fechado}
                        className="h-9 rounded-lg bg-zinc-950 border border-zinc-700 px-2 text-sm text-zinc-100 outline-none"
                      />
                      <span className="text-[11px] text-zinc-500">às</span>
                      <input
                        type="time"
                        value={h.fecha}
                        onChange={e => atualizarHorarioHora(index, 'fecha', e.target.value)}
                        disabled={h.fechado}
                        className="h-9 rounded-lg bg-zinc-950 border border-zinc-700 px-2 text-sm text-zinc-100 outline-none"
                      />
                    </div>
                    <label className="flex items-center gap-1 text-[11px] text-zinc-400">
                      <span>Fechado</span>
                      <input
                        type="checkbox"
                        checked={h.fechado}
                        onChange={e => atualizarHorarioFechado(index, e.target.checked)}
                        className="w-4 h-4 rounded border border-zinc-700 bg-zinc-950"
                      />
                    </label>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3 pt-1 pb-2">
                <button
                  type="button"
                  onClick={salvarHorarios}
                  disabled={salvandoHorarios}
                  className="h-10 px-4 rounded-lg bg-amber-500 hover:bg-amber-600 text-black text-sm font-semibold disabled:opacity-60"
                >
                  {salvandoHorarios ? 'Salvando...' : 'Salvar horários'}
                </button>
                {feedbackHorarios && (
                  <span className="text-xs text-zinc-400">{feedbackHorarios}</span>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {fidelidadeAberta && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-40"
            onClick={() => setFidelidadeAberta(false)}
          />
          <div className="fixed inset-x-0 bottom-0 max-w-5xl mx-auto bg-zinc-900 border-t border-zinc-800 rounded-t-2xl z-50">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <div>
                <div className="text-sm font-semibold text-white">Programa de fidelidade</div>
                <p className="text-[11px] text-zinc-500">
                  Configure pontos por real gasto e cashback.
                </p>
              </div>
              <button
                type="button"
                className="text-xs text-zinc-400"
                onClick={() => setFidelidadeAberta(false)}
              >
                Fechar
              </button>
            </div>
            <div className="px-4 py-3 space-y-3 max-h-96 overflow-y-auto">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">
                    Pontos por R$ gasto
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.1"
                    value={pontosPorReal}
                    onChange={e => setPontosPorReal(e.target.value)}
                    className="w-full h-10 rounded-lg bg-zinc-950 border border-zinc-700 px-3 text-sm text-zinc-100 outline-none"
                    placeholder="1"
                  />
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Ex: 1 ponto a cada R$ 1 gasto.
                  </p>
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">% de cashback</label>
                  <input
                    type="number"
                    min={0}
                    step="0.1"
                    value={cashbackPercentual}
                    onChange={e => setCashbackPercentual(e.target.value)}
                    className="w-full h-10 rounded-lg bg-zinc-950 border border-zinc-700 px-3 text-sm text-zinc-100 outline-none"
                    placeholder="3"
                  />
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Ex: 3% de cashback sobre o valor da compra.
                  </p>
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">
                    Compra mínima para cashback (R$)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={minimoCashback}
                    onChange={e => setMinimoCashback(e.target.value)}
                    className="w-full h-10 rounded-lg bg-zinc-950 border border-zinc-700 px-3 text-sm text-zinc-100 outline-none"
                    placeholder="50"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 pt-1 pb-2">
                <button
                  type="button"
                  onClick={salvarFidelidade}
                  disabled={salvandoFidelidade}
                  className="h-10 px-4 rounded-lg bg-amber-500 hover:bg-amber-600 text-black text-sm font-semibold disabled:opacity-60"
                >
                  {salvandoFidelidade ? 'Salvando...' : 'Salvar programa'}
                </button>
                {feedbackFidelidade && (
                  <span className="text-xs text-zinc-400">{feedbackFidelidade}</span>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {entregadoresAbertos && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-40"
            onClick={() => setEntregadoresAbertos(false)}
          />
          <div className="fixed inset-x-0 bottom-0 max-w-5xl mx-auto bg-zinc-900 border-t border-zinc-800 rounded-t-2xl z-50">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <div>
                <div className="text-sm font-semibold text-white">Entregadores</div>
                <p className="text-[11px] text-zinc-500">
                  Cadastre e ative entregadores para vincular aos pedidos.
                </p>
              </div>
              <button
                type="button"
                className="text-xs text-zinc-400"
                onClick={() => setEntregadoresAbertos(false)}
              >
                Fechar
              </button>
            </div>
            <div className="px-4 py-3 space-y-4 max-h-96 overflow-y-auto">
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-xs text-zinc-400 mb-1">
                    Nome do entregador
                  </label>
                  <input
                    value={novoEntregadorNome}
                    onChange={e => setNovoEntregadorNome(e.target.value)}
                    className="w-full h-9 rounded-lg bg-zinc-950 border border-zinc-700 px-3 text-xs text-zinc-100 outline-none"
                    placeholder="Ex: João"
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="block text-xs text-zinc-400 mb-1">Telefone</label>
                  <input
                    value={novoEntregadorTelefone}
                    onChange={e => setNovoEntregadorTelefone(e.target.value)}
                    className="w-full h-9 rounded-lg bg-zinc-950 border border-zinc-700 px-3 text-xs text-zinc-100 outline-none"
                    placeholder="(82) 99999-9999"
                  />
                </div>
                <div className="sm:col-span-1 flex items-end">
                  <button
                    type="button"
                    onClick={criarEntregador}
                    disabled={salvandoEntregador}
                    className="w-full h-9 rounded-lg bg-amber-500 hover:bg-amber-600 text-black text-xs font-semibold disabled:opacity-60"
                  >
                    {salvandoEntregador ? 'Salvando...' : 'Cadastrar entregador'}
                  </button>
                </div>
              </div>
              {feedbackEntregador && (
                <div className="text-[11px] text-zinc-400">{feedbackEntregador}</div>
              )}
              <div className="space-y-2">
                {entregadores.length === 0 ? (
                  <div className="text-xs text-zinc-500 py-4 text-center">
                    Nenhum entregador cadastrado até o momento.
                  </div>
                ) : (
                  entregadores.map(e => (
                    <div
                      key={e.id}
                      className="flex items-center justify-between rounded-lg border border-zinc-800 px-3 py-2"
                    >
                      <div>
                        <div className="text-sm font-semibold text-white">{e.nome}</div>
                        {e.telefone && (
                          <div className="text-[11px] text-zinc-500">{e.telefone}</div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => alternarAtivoEntregador(e.id, e.ativo)}
                        className={`px-3 h-7 rounded-full text-[11px] font-semibold ${
                          e.ativo
                            ? 'bg-emerald-500 text-black'
                            : 'bg-zinc-800 text-zinc-300 border border-zinc-600'
                        }`}
                      >
                        {e.ativo ? 'Ativo' : 'Inativo'}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {cuponsAbertos && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-40"
            onClick={() => setCuponsAbertos(false)}
          />
          <div className="fixed inset-x-0 bottom-0 max-w-5xl mx-auto bg-zinc-900 border-t border-zinc-800 rounded-t-2xl z-50">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <div>
                <div className="text-sm font-semibold text-white">Cupons</div>
                <p className="text-[11px] text-zinc-500">
                  Crie cupons para enviar aos clientes cadastrados.
                </p>
              </div>
              <button
                type="button"
                className="text-xs text-zinc-400"
                onClick={() => setCuponsAbertos(false)}
              >
                Fechar
              </button>
            </div>
            <div className="px-4 py-3 space-y-4 max-h-96 overflow-y-auto">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Nome do cupom</label>
                  <input
                    value={nome}
                    onChange={e => setNome(e.target.value)}
                    className="w-full h-10 rounded-lg bg-zinc-950 border border-zinc-700 px-3 text-sm text-zinc-100 outline-none"
                    placeholder="Promoção Julho"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Código</label>
                  <input
                    value={codigo}
                    onChange={e => setCodigo(e.target.value.toUpperCase())}
                    className="w-full h-10 rounded-lg bg-zinc-950 border border-zinc-700 px-3 text-sm text-zinc-100 outline-none"
                    placeholder="JULHO10"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Data de início</label>
                  <input
                    type="datetime-local"
                    value={inicio}
                    onChange={e => setInicio(e.target.value)}
                    className="w-full h-10 rounded-lg bg-zinc-950 border border-zinc-700 px-3 text-sm text-zinc-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Data de fim</label>
                  <input
                    type="datetime-local"
                    value={fim}
                    onChange={e => setFim(e.target.value)}
                    className="w-full h-10 rounded-lg bg-zinc-950 border border-zinc-700 px-3 text-sm text-zinc-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">
                    Quantidade de uso por cliente
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={usosPorCliente}
                    onChange={e => setUsosPorCliente(e.target.value)}
                    className="w-full h-10 rounded-lg bg-zinc-950 border border-zinc-700 px-3 text-sm text-zinc-100 outline-none"
                  />
                </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Desconto (%)</label>
                <input
                  type="number"
                  min={0}
                  step="0.1"
                  value={descontoPercentual}
                  onChange={e => setDescontoPercentual(e.target.value)}
                  className="w-full h-10 rounded-lg bg-zinc-950 border border-zinc-700 px-3 text-sm text-zinc-100 outline-none"
                  placeholder="Ex: 10"
                />
              </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">
                    Quantidade total de cupons
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={quantidadeTotal}
                    onChange={e => setQuantidadeTotal(e.target.value)}
                    className="w-full h-10 rounded-lg bg-zinc-950 border border-zinc-700 px-3 text-sm text-zinc-100 outline-none"
                    placeholder="Ex: 100"
                  />
                </div>
                <div className="sm:col-span-2 flex items-center gap-2 mt-1">
                  <label className="flex items-center gap-2 text-xs text-zinc-400">
                    <input
                      type="checkbox"
                      checked={ativo}
                      onChange={e => setAtivo(e.target.checked)}
                      className="w-4 h-4 rounded border border-zinc-700 bg-zinc-950"
                    />
                    <span>Cupom ativo</span>
                  </label>
                </div>
              </div>
              <div className="flex items-center gap-3 pb-2">
                <button
                  type="button"
                  onClick={criarCupom}
                  disabled={submitting || !codigo.trim() || !nome.trim()}
                  className="h-10 px-4 rounded-lg bg-amber-500 hover:bg-amber-600 text-black text-sm font-semibold disabled:opacity-60"
                >
                  {submitting ? 'Criando...' : 'Criar cupom'}
                </button>
                {feedback && <span className="text-xs text-zinc-400">{feedback}</span>}
              </div>
              {cupons.length > 0 && (
                <div className="border-t border-zinc-800 pt-3 mt-1 space-y-2">
                  <div className="text-[11px] text-zinc-500 font-semibold uppercase tracking-wide">
                    Cupons ativos
                  </div>
                  {cuponsAtivos.length === 0 ? (
                    <div className="text-[11px] text-zinc-500">
                      Nenhum cupom ativo no momento.
                    </div>
                  ) : (
                    cuponsAtivos.map(c => {
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
                      return (
                        <div
                          key={c.id}
                          className="flex items-center justify-between text-[11px] text-zinc-300"
                        >
                          <div>
                            <div className="font-semibold">
                              {c.nome} • {c.codigo}
                            </div>
                            <div className="text-zinc-500">
                              {inicioTexto} até {fimTexto}
                            </div>
                            {c.descontoPercentual && c.descontoPercentual > 0 && (
                              <div className="text-emerald-400">
                                {c.descontoPercentual}% de desconto
                              </div>
                            )}
                          </div>
                          <div className="text-right text-zinc-500">
                            {c.quantidadeTotal != null ? (
                              <div>
                                {c.quantidadeRestante ?? c.quantidadeTotal}/
                                {c.quantidadeTotal} restantes
                              </div>
                            ) : (
                              <div>Sem limite de quantidade</div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </main>
  );
}
