'use client';

import { useEffect, useState } from 'react';
import { DELIVERY_NEIGHBORHOODS, FIXED_CITY_NAME, findNeighborhoodByName } from '@/lib/delivery';
import type { AddressRecord } from '@/lib/addresses';

type Props = {
  open: boolean;
  initialAddress: AddressRecord | null;
  onClose: () => void;
  onSave: (address: AddressRecord) => void;
};

type FormState = {
  nome: string;
  cep: string;
  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  referencia: string;
};

const EMPTY_FORM: FormState = {
  nome: '',
  cep: '',
  rua: '',
  numero: '',
  complemento: '',
  bairro: '',
  referencia: ''
};

function generateId(): string {
  return `end-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatCep(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function AddressModal({ open, initialAddress, onClose, onSave }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [cepStatus, setCepStatus] = useState<'idle' | 'buscando' | 'encontrado' | 'nao_encontrado' | 'erro'>(
    'idle'
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initialAddress) {
      setForm({
        nome: initialAddress.nome || '',
        cep: initialAddress.cep || '',
        rua: initialAddress.rua || '',
        numero: initialAddress.numero || '',
        complemento: initialAddress.complemento || '',
        bairro: initialAddress.bairro || '',
        referencia: initialAddress.referencia || ''
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setErrors({});
    setCepStatus('idle');
  }, [open, initialAddress]);

  async function buscarCep(cepDigitado: string) {
    const digits = cepDigitado.replace(/\D/g, '');
    if (digits.length !== 8) return;

    setCepStatus('buscando');
    try {
      const resp = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      if (!resp.ok) throw new Error('Falha na consulta');
      const data = await resp.json();

      if (data?.erro) {
        setCepStatus('nao_encontrado');
        return;
      }

      const bairroEncontrado = findNeighborhoodByName(data.bairro);

      setForm(prev => ({
        ...prev,
        rua: data.logradouro ? String(data.logradouro) : prev.rua,
        bairro: bairroEncontrado ? bairroEncontrado.nome : prev.bairro
      }));
      setCepStatus('encontrado');
    } catch {
      setCepStatus('erro');
    }
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => (prev[key] ? { ...prev, [key]: undefined } : prev));
  }

  function validar(): boolean {
    const nextErrors: Partial<Record<keyof FormState, string>> = {};
    if (!form.rua.trim()) nextErrors.rua = 'Informe a rua ou avenida.';
    if (!form.numero.trim()) nextErrors.numero = 'Informe o número.';
    if (!form.bairro.trim()) nextErrors.bairro = 'Selecione o bairro.';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleSalvar() {
    if (!validar()) return;
    setSaving(true);

    const endereco: AddressRecord = {
      id: initialAddress?.id || generateId(),
      nome: form.nome.trim() || 'Endereço',
      cep: form.cep.trim(),
      rua: form.rua.trim(),
      numero: form.numero.trim(),
      complemento: form.complemento.trim(),
      bairro: form.bairro.trim(),
      referencia: form.referencia.trim(),
      cidade: FIXED_CITY_NAME
    };

    onSave(endereco);
    setSaving(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[var(--brand-soft-bg)] dark:bg-zinc-950">
      <div className="min-h-full flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm bg-[var(--brand-soft-surface)] border border-[var(--brand-soft-border)] dark:bg-zinc-900 dark:border-zinc-800 rounded-2xl p-6 space-y-6 shadow-sm">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="text-[11px] text-gray-600 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400"
            >
              ← Cancelar
            </button>
          </div>

          <div className="space-y-1">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {initialAddress ? 'Editar endereço' : 'Novo endereço'}
            </h1>
            <p className="text-xs text-gray-600 dark:text-zinc-400">
              Preencha os dados para {initialAddress ? 'atualizar' : 'cadastrar'} seu endereço de entrega.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-gray-600 dark:text-zinc-400">Nome do endereço</label>
              <input
                type="text"
                value={form.nome}
                onChange={e => updateField('nome', e.target.value)}
                placeholder="Ex: Casa, Trabalho"
                className="w-full h-10 rounded-lg bg-white border border-gray-300 px-3 text-sm text-gray-900 outline-none dark:bg-zinc-950 dark:border-zinc-700 dark:text-zinc-100"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-600 dark:text-zinc-400">CEP (opcional)</label>
              <input
                type="text"
                inputMode="numeric"
                value={form.cep}
                onChange={e => {
                  const formatted = formatCep(e.target.value);
                  updateField('cep', formatted);
                  if (formatted.replace(/\D/g, '').length === 8) {
                    buscarCep(formatted);
                  } else {
                    setCepStatus('idle');
                  }
                }}
                placeholder="00000-000"
                className="w-full h-10 rounded-lg bg-white border border-gray-300 px-3 text-sm text-gray-900 outline-none dark:bg-zinc-950 dark:border-zinc-700 dark:text-zinc-100"
              />
              {cepStatus === 'buscando' && (
                <p className="text-[11px] text-blue-600 dark:text-blue-400">Buscando endereço...</p>
              )}
              {cepStatus === 'encontrado' && (
                <p className="text-[11px] text-emerald-500">Endereço encontrado e preenchido. Confira os dados.</p>
              )}
              {cepStatus === 'nao_encontrado' && (
                <p className="text-[11px] text-amber-500">CEP não encontrado. Preencha os campos manualmente.</p>
              )}
              {cepStatus === 'erro' && (
                <p className="text-[11px] text-amber-500">
                  Não foi possível consultar o CEP agora. Preencha os campos manualmente.
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-600 dark:text-zinc-400">Rua/Avenida *</label>
              <input
                type="text"
                value={form.rua}
                onChange={e => updateField('rua', e.target.value)}
                placeholder="Ex: Rua São José"
                className={`w-full h-10 rounded-lg bg-white border px-3 text-sm text-gray-900 outline-none dark:bg-zinc-950 dark:text-zinc-100 ${
                  errors.rua ? 'border-red-400' : 'border-gray-300 dark:border-zinc-700'
                }`}
              />
              {errors.rua && <p className="text-[11px] text-red-500">{errors.rua}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-gray-600 dark:text-zinc-400">Número *</label>
                <input
                  type="text"
                  value={form.numero}
                  onChange={e => updateField('numero', e.target.value)}
                  placeholder="120"
                  className={`w-full h-10 rounded-lg bg-white border px-3 text-sm text-gray-900 outline-none dark:bg-zinc-950 dark:text-zinc-100 ${
                    errors.numero ? 'border-red-400' : 'border-gray-300 dark:border-zinc-700'
                  }`}
                />
                {errors.numero && <p className="text-[11px] text-red-500">{errors.numero}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-600 dark:text-zinc-400">Complemento</label>
                <input
                  type="text"
                  value={form.complemento}
                  onChange={e => updateField('complemento', e.target.value)}
                  placeholder="Apto, bloco..."
                  className="w-full h-10 rounded-lg bg-white border border-gray-300 px-3 text-sm text-gray-900 outline-none dark:bg-zinc-950 dark:border-zinc-700 dark:text-zinc-100"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-600 dark:text-zinc-400">Bairro *</label>
              <select
                value={form.bairro}
                onChange={e => updateField('bairro', e.target.value)}
                className={`w-full h-10 rounded-lg bg-white border px-3 text-sm text-gray-900 outline-none dark:bg-zinc-950 dark:text-zinc-100 ${
                  errors.bairro ? 'border-red-400' : 'border-gray-300 dark:border-zinc-700'
                }`}
              >
                <option value="">Selecione o bairro</option>
                {DELIVERY_NEIGHBORHOODS.map(item => (
                  <option key={item.nome} value={item.nome}>
                    {item.nome}
                    {item.taxaEntrega > 0 ? ` • taxa R$ ${item.taxaEntrega.toFixed(2)}` : ''}
                  </option>
                ))}
              </select>
              {errors.bairro && <p className="text-[11px] text-red-500">{errors.bairro}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-600 dark:text-zinc-400">Ponto de referência</label>
              <input
                type="text"
                value={form.referencia}
                onChange={e => updateField('referencia', e.target.value)}
                placeholder="Próximo a..."
                className="w-full h-10 rounded-lg bg-white border border-gray-300 px-3 text-sm text-gray-900 outline-none dark:bg-zinc-950 dark:border-zinc-700 dark:text-zinc-100"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-600 dark:text-zinc-400">Cidade</label>
              <input
                type="text"
                value={FIXED_CITY_NAME}
                readOnly
                className="w-full h-10 rounded-lg bg-gray-100 border border-gray-300 px-3 text-sm text-gray-700 outline-none dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-300"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleSalvar}
            disabled={saving}
            className="w-full h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? 'Salvando...' : 'Salvar endereço'}
          </button>
        </div>
      </div>
    </div>
  );
}
