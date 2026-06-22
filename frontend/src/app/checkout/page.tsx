'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/components/CartProvider';
import { BottomNav } from '@/components/BottomNav';
import { api } from '@/lib/api';

type TipoEntrega = 'delivery' | 'retirada';
type FormaPagamento = 'pix' | 'cartao_entrega' | 'dinheiro' | 'carteira';

type PedidoResponse = {
  id: string;
  status: string;
  total: number;
  tipoEntrega: TipoEntrega;
  formaPagamento: FormaPagamento;
  trocoPara?: number;
  troco?: number;
  pix?: { qrCodePayload: string };
};

export default function CheckoutPage() {
  const router = useRouter();
  const { items, clear } = useCart();
  const [tipoEntrega, setTipoEntrega] = useState<TipoEntrega>('delivery');
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('pix');
  const [submitting, setSubmitting] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pixPayload, setPixPayload] = useState<string | null>(null);
  const [trocoPara, setTrocoPara] = useState<string>('');
  const [clienteId, setClienteId] = useState<string | undefined>(undefined);
  const [clienteNome, setClienteNome] = useState<string | undefined>(undefined);
  const [clienteTelefone, setClienteTelefone] = useState<string | undefined>(undefined);
  const [clienteEndereco, setClienteEndereco] = useState<string | undefined>(undefined);
  const [cupomCodigo, setCupomCodigo] = useState<string>('');
  const [cupomAplicadoCodigo, setCupomAplicadoCodigo] = useState<string>('');
  const [feedbackCupom, setFeedbackCupom] = useState<string | null>(null);
  const [cuponsDisponiveis, setCuponsDisponiveis] = useState<
    Array<{ codigo: string; descontoPercentual?: number; disponivel: boolean }>
  >([]);
  const [mostrarListaCupons, setMostrarListaCupons] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [usarCarteira, setUsarCarteira] = useState(false);

  const total = useMemo(
    () =>
      items.reduce((sum, it) => {
        const price = it.product.promoPrice ?? it.product.price;
        return sum + price * it.qty;
      }, 0),
    [items]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem('extraplus-session');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.tipo === 'cliente') {
        setClienteId(parsed.clienteId);
        setClienteNome(parsed.nome);
        setClienteTelefone(parsed.telefone);
        setClienteEndereco(parsed.endereco);
        if (parsed.clienteId) {
          (async () => {
            try {
              const cliente = await api.get<{ saldoCarteira: number }>(
                `/admin/clientes/${parsed.clienteId}`
              );
              if (typeof cliente.saldoCarteira === 'number') {
                setWalletBalance(cliente.saldoCarteira);
              }
            } catch {
              setWalletBalance(0);
            }
          })();
        }
        const ids: string[] = [];
        if (parsed.clienteId) ids.push(String(parsed.clienteId));
        if (parsed.telefone) ids.push(String(parsed.telefone));
        const unicos = Array.from(new Set(ids.filter(Boolean)));
        if (unicos.length > 0) {
          (async () => {
            try {
              const agregados: Array<{
                codigo: string;
                descontoPercentual?: number;
                disponivel: boolean;
              }> = [];
              for (const id of unicos) {
                try {
                  const lista = await api.get<
                    Array<{
                      codigo: string;
                      descontoPercentual?: number;
                      disponivel: boolean;
                    }>
                  >(`/admin/clientes/${id}/cupons`);
                  if (Array.isArray(lista)) {
                    agregados.push(...lista);
                  }
                } catch {
                }
              }
              const porCodigo: Record<string, { codigo: string; descontoPercentual?: number; disponivel: boolean }> =
                {};
              for (const c of agregados) {
                porCodigo[c.codigo] = c;
              }
              setCuponsDisponiveis(Object.values(porCodigo));
            } catch {
              setCuponsDisponiveis([]);
            }
          })();
        } else {
          setCuponsDisponiveis([]);
        }
      }
    } catch {
    }
  }, []);

  async function handleConfirmar() {
    if (items.length === 0 || submitting) return;

    const cupomDigitado = cupomCodigo.trim().toUpperCase();
    if (cupomDigitado && cupomAplicadoCodigo !== cupomDigitado) {
      setErro('Clique em aplicar cupom antes de finalizar o pedido.');
      return;
    }

    if (formaPagamento === 'carteira' && walletBalance < totalComDesconto) {
      setErro(
        'Seu saldo de carteira é menor que o total. Use outra forma de pagamento ou combine com carteira.'
      );
      return;
    }

    if (formaPagamento === 'dinheiro') {
      const valorTroco = Number(trocoPara.replace(',', '.'));
      if (
        !trocoPara ||
        Number.isNaN(valorTroco) ||
        valorTroco <= 0 ||
        valorTroco < restantePagar
      ) {
        setErro(
          'Informe um valor de troco válido (maior ou igual ao valor a pagar em dinheiro).'
        );
        return;
      }
    }

    setSubmitting(true);
    setErro(null);
    setPixPayload(null);

    try {
      const body = {
        tipoEntrega,
        formaPagamento,
        itens: items.map(it => ({
          productId: it.product.id,
          name: it.product.name,
          quantity: it.qty,
          unitPrice: it.product.promoPrice ?? it.product.price
        })),
        trocoPara:
          formaPagamento === 'dinheiro'
            ? Number(trocoPara.replace(',', '.'))
            : undefined,
        clienteId,
        clienteNome,
        clienteTelefone,
        clienteEndereco,
        cupomCodigo: cupomAplicadoCodigo || undefined,
        usarCarteira: formaPagamento !== 'carteira' ? usarCarteira : undefined
      };

      const resposta = await api.post<PedidoResponse>('/pedidos', body);

      if (resposta.pix?.qrCodePayload && formaPagamento === 'pix') {
        setPixPayload(resposta.pix.qrCodePayload);
      }

      clear();
      router.push('/orders');
    } catch (e) {
      setErro('Ocorreu um erro ao registrar seu pedido. Tente novamente.');
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  }

  function aplicarCupom() {
    const codigo = cupomCodigo.trim().toUpperCase();
    if (!codigo) {
      setCupomAplicadoCodigo('');
      setFeedbackCupom('Digite um cupom para aplicar.');
      return;
    }

    const encontrado = cuponsDisponiveis.find(x => x.codigo === codigo);
    if (!encontrado) {
      setCupomAplicadoCodigo('');
      setFeedbackCupom('Cupom nao encontrado para seu perfil.');
      return;
    }

    if (!encontrado.disponivel) {
      setCupomAplicadoCodigo('');
      setFeedbackCupom('Cupom encontrado, mas indisponivel no momento.');
      return;
    }

    setCupomAplicadoCodigo(codigo);
    setFeedbackCupom(
      encontrado.descontoPercentual
        ? `Cupom aplicado com sucesso: ${encontrado.descontoPercentual}% de desconto.`
        : 'Cupom aplicado com sucesso.'
    );
    setErro(null);
  }

  const cupomAtivo = (() => {
    if (!cupomAplicadoCodigo) return null;
    const encontrado = cuponsDisponiveis.find(
      x => x.codigo === cupomAplicadoCodigo && x.disponivel
    );
    return encontrado || null;
  })();

  const descontoPreview =
    cupomAtivo && cupomAtivo.descontoPercentual
      ? Number(((total * cupomAtivo.descontoPercentual) / 100).toFixed(2))
      : 0;

  const totalComDesconto = Math.max(
    0,
    Number((total - descontoPreview).toFixed(2))
  );

  const carteiraUsadaPreview = usarCarteira
    ? Math.min(walletBalance, totalComDesconto)
    : 0;

  const restantePagar = Number(
    (totalComDesconto - carteiraUsadaPreview).toFixed(2)
  );

  return (
    <main className="flex-1 bg-[var(--brand-soft-bg)] dark:bg-zinc-950 pb-16">
      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Finalizar pedido</h1>

        <section className="bg-white border border-blue-100 dark:bg-zinc-900 dark:border-zinc-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-900 dark:text-white">Resumo</span>
            <span className="text-sm text-slate-500 dark:text-zinc-400">
              {items.length} item(s) • R$ {total.toFixed(2)}
            </span>
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto text-xs text-slate-500 dark:text-zinc-400">
            {items.map(it => (
              <div key={it.product.id} className="flex items-center justify-between">
                <span>
                  {it.qty}x {it.product.name}
                </span>
                <span>
                  R$ {((it.product.promoPrice ?? it.product.price) * it.qty).toFixed(2)}
                </span>
              </div>
            ))}
            {items.length === 0 && <span>Carrinho vazio</span>}
          </div>
        </section>

        <section className="bg-white border border-blue-100 dark:bg-zinc-900 dark:border-zinc-800 rounded-2xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Forma de entrega</h2>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTipoEntrega('delivery')}
              className={`h-11 rounded-xl text-sm font-semibold border ${
                tipoEntrega === 'delivery'
                  ? 'bg-blue-600 text-white border-blue-500'
                  : 'bg-blue-50 text-slate-700 border-blue-100 dark:bg-zinc-950 dark:text-zinc-300 dark:border-zinc-700'
              }`}
            >
              Entrega
            </button>
            <button
              type="button"
              onClick={() => setTipoEntrega('retirada')}
              className={`h-11 rounded-xl text-sm font-semibold border ${
                tipoEntrega === 'retirada'
                  ? 'bg-blue-600 text-white border-blue-500'
                  : 'bg-blue-50 text-slate-700 border-blue-100 dark:bg-zinc-950 dark:text-zinc-300 dark:border-zinc-700'
              }`}
            >
              Retirada
            </button>
          </div>
        </section>

        <section className="bg-white border border-blue-100 dark:bg-zinc-900 dark:border-zinc-800 rounded-2xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Forma de pagamento</h2>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setFormaPagamento('pix')}
              className={`h-11 rounded-xl text-sm font-semibold border ${
                formaPagamento === 'pix'
                  ? 'bg-emerald-500 text-black border-emerald-400'
                  : 'bg-blue-50 text-slate-700 border-blue-100 dark:bg-zinc-950 dark:text-zinc-300 dark:border-zinc-700'
              }`}
            >
              PIX
            </button>
            <button
              type="button"
              onClick={() => setFormaPagamento('cartao_entrega')}
              className={`h-11 rounded-xl text-sm font-semibold border ${
                formaPagamento === 'cartao_entrega'
                  ? 'bg-blue-600 text-white border-blue-500'
                  : 'bg-blue-50 text-slate-700 border-blue-100 dark:bg-zinc-950 dark:text-zinc-300 dark:border-zinc-700'
              }`}
            >
              Cartão na entrega
            </button>
            <button
              type="button"
              onClick={() => setFormaPagamento('dinheiro')}
              className={`h-11 rounded-xl text-sm font-semibold border ${
                formaPagamento === 'dinheiro'
                  ? 'bg-blue-600 text-white border-blue-500'
                  : 'bg-blue-50 text-slate-700 border-blue-100 dark:bg-zinc-950 dark:text-zinc-300 dark:border-zinc-700'
              }`}
            >
              Dinheiro
            </button>
            <button
              type="button"
              onClick={() => setFormaPagamento('carteira')}
              className={`h-11 rounded-xl text-sm font-semibold border ${
                formaPagamento === 'carteira'
                  ? 'bg-purple-500 text-black border-purple-400'
                  : 'bg-blue-50 text-slate-700 border-blue-100 dark:bg-zinc-950 dark:text-zinc-300 dark:border-zinc-700'
              }`}
            >
              Carteira digital
            </button>
          </div>

          {walletBalance > 0 && formaPagamento !== 'carteira' && (
            <div className="mt-3 flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-slate-700 dark:text-zinc-200">
                <input
                  type="checkbox"
                  checked={usarCarteira}
                  onChange={e => setUsarCarteira(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-600 bg-zinc-900"
                />
                <span className="font-semibold">
                  Usar saldo da carteira (R$ {walletBalance.toFixed(2)})
                </span>
              </label>
              {usarCarteira && carteiraUsadaPreview > 0 && (
                <span className="text-emerald-400 font-semibold">
                  Carteira: R$ {carteiraUsadaPreview.toFixed(2)} • Restante: R${' '}
                  {restantePagar.toFixed(2)}
                </span>
              )}
            </div>
          )}

          {formaPagamento === 'dinheiro' && (
            <div className="mt-3 space-y-1">
              <label className="text-xs text-slate-500 dark:text-zinc-400">
                Troco para quanto?
              </label>
              <input
                type="text"
                inputMode="decimal"
                placeholder={`Ex: ${(total + 10).toFixed(2)}`}
                value={trocoPara}
                onChange={e => setTrocoPara(e.target.value)}
                className="w-full h-10 rounded-lg bg-white border border-blue-100 px-3 text-sm text-slate-900 outline-none dark:bg-zinc-950 dark:border-zinc-700 dark:text-zinc-100"
              />
              <p className="text-[11px] text-slate-500 dark:text-zinc-500">
                Informe o valor em dinheiro que você vai pagar para o entregador.
              </p>
            </div>
          )}
        </section>

        {erro && <div className="text-xs text-red-400">{erro}</div>}

        <section className="bg-white border border-blue-100 dark:bg-zinc-900 dark:border-zinc-800 rounded-2xl p-4 space-y-2">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Cupom de desconto</h2>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Digite o código"
              value={cupomCodigo}
              onChange={e => {
                const nextValue = e.target.value.toUpperCase();
                setCupomCodigo(nextValue);
                if (cupomAplicadoCodigo && nextValue.trim().toUpperCase() !== cupomAplicadoCodigo) {
                  setCupomAplicadoCodigo('');
                }
                setFeedbackCupom(null);
              }}
              className="flex-1 h-10 rounded-lg bg-white border border-blue-100 px-3 text-sm text-slate-900 outline-none dark:bg-zinc-950 dark:border-zinc-700 dark:text-zinc-100"
            />
            <button
              type="button"
              onClick={aplicarCupom}
              className="h-10 px-3 rounded-lg bg-blue-600 text-xs font-semibold text-white whitespace-nowrap hover:bg-blue-700"
            >
              Aplicar cupom
            </button>
            <button
              type="button"
              className="h-10 px-3 rounded-lg bg-white border border-blue-100 text-[11px] text-slate-500 dark:bg-zinc-950 dark:border-zinc-700 dark:text-zinc-400 flex items-center whitespace-nowrap"
              onClick={() =>
                cuponsDisponiveis.filter(c => c.disponivel).length > 0 &&
                setMostrarListaCupons(v => !v)
              }
            >
              {cuponsDisponiveis.filter(c => c.disponivel).length} disponível(is)
            </button>
          </div>
          {mostrarListaCupons && cuponsDisponiveis.filter(c => c.disponivel).length > 0 && (
            <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
              {cuponsDisponiveis
                .filter(c => c.disponivel)
                .map(c => (
                  <button
                    key={c.codigo}
                    type="button"
                    onClick={() => {
                      setCupomCodigo(c.codigo);
                      setCupomAplicadoCodigo('');
                      setFeedbackCupom(null);
                      setMostrarListaCupons(false);
                    }}
                    className="w-full flex items-center justify-between text-[11px] rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-blue-900 dark:border-amber-500/40 dark:bg-zinc-950 dark:text-amber-100"
                  >
                    <span className="font-semibold">{c.codigo}</span>
                    <span className="text-xs text-blue-600 dark:text-amber-300">
                      {c.descontoPercentual ? `${c.descontoPercentual}% off` : 'Aplicar'}
                    </span>
                  </button>
                ))}
            </div>
          )}
          {(cupomCodigo || feedbackCupom) && (
            <div className="text-[11px] text-slate-500 dark:text-zinc-500 space-y-1">
              {feedbackCupom && <div>{feedbackCupom}</div>}
              {cupomCodigo && cupomAplicadoCodigo !== cupomCodigo.trim().toUpperCase() && (
                <div>Cupom digitado ainda nao foi aplicado.</div>
              )}
              {cupomAtivo && descontoPreview > 0 && (
                <div className="text-emerald-400">
                  Desconto: R$ {descontoPreview.toFixed(2)} • Total com desconto: R${' '}
                  {totalComDesconto.toFixed(2)}
                </div>
              )}
            </div>
          )}
        </section>

        <button
          type="button"
          disabled={items.length === 0 || submitting}
          onClick={handleConfirmar}
          className="w-full h-12 rounded-full bg-brand-red text-white text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting ? 'Enviando...' : 'Confirmar pedido'}
        </button>

        {pixPayload && formaPagamento === 'pix' && (
          <div className="mt-2 text-xs text-slate-500 dark:text-zinc-400">
            Código PIX gerado:
            <div className="mt-1 break-all rounded-md bg-white border border-blue-100 p-2 dark:bg-zinc-950 dark:border-zinc-800">
              {pixPayload}
            </div>
          </div>
        )}
      </div>
      <BottomNav />
    </main>
  );
}
