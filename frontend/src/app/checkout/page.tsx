'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/components/CartProvider';
import { BottomNav } from '@/components/BottomNav';
import { OrderSuccessModal } from '@/components/OrderSuccessModal';
import { ApiError, api } from '@/lib/api';
import { PIX_KEY_DISPLAY } from '@/lib/contact';
import { getDeliveryFeeFromAddress, parseClientAddress } from '@/lib/delivery';

type TipoEntrega = 'delivery' | 'retirada';
type FormaPagamento = 'pix' | 'cartao_entrega' | 'dinheiro';

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
  const [pedidoConcluido, setPedidoConcluido] = useState<PedidoResponse | null>(null);
  const [trocoPara, setTrocoPara] = useState<string>('');
  const [clienteId, setClienteId] = useState<string | undefined>(undefined);
  const [clienteNome, setClienteNome] = useState<string | undefined>(undefined);
  const [clienteTelefone, setClienteTelefone] = useState<string | undefined>(undefined);
  const [clienteEndereco, setClienteEndereco] = useState<string | undefined>(undefined);
  const [cupomCodigo, setCupomCodigo] = useState<string>('');
  const [cupomAplicadoCodigo, setCupomAplicadoCodigo] = useState<string>('');
  const [feedbackCupom, setFeedbackCupom] = useState<string | null>(null);
  const [aplicandoCupom, setAplicandoCupom] = useState(false);
  const [cuponsDisponiveis, setCuponsDisponiveis] = useState<
    Array<{ codigo: string; descontoPercentual?: number; disponivel: boolean }>
  >([]);
  const [mostrarListaCupons, setMostrarListaCupons] = useState(false);

  const subtotal = useMemo(
    () =>
      items.reduce((sum, it) => {
        const price = it.product.promoPrice ?? it.product.price;
        return sum + price * it.qty;
      }, 0),
    [items]
  );
  const parsedAddress = parseClientAddress(clienteEndereco);
  const taxaEntregaPreview = getDeliveryFeeFromAddress(clienteEndereco, tipoEntrega);

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
        (async () => {
          try {
            const cupons = await api.get<Array<{ codigo: string; descontoPercentual?: number; disponivel: boolean }>>(
              '/clientes/me/cupons'
            );
            setCuponsDisponiveis(Array.isArray(cupons) ? cupons : []);
          } catch {
            setCuponsDisponiveis([]);
          }
        })();
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

    if (tipoEntrega === 'delivery' && !clienteEndereco?.trim()) {
      setErro('Seu endereco nao foi encontrado. Atualize seu cadastro antes de finalizar.');
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
        clienteTelefone: clienteTelefone?.trim() || undefined,
        clienteEndereco: clienteEndereco?.trim() || undefined,
        cupomCodigo: cupomAplicadoCodigo || undefined,
        taxaEntrega: taxaEntregaPreview
      };

      const resposta = await api.post<PedidoResponse>('/pedidos', body);

      clear();
      setPedidoConcluido(resposta);
    } catch (e) {
      setErro('Ocorreu um erro ao registrar seu pedido. Tente novamente.');
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  }

  async function aplicarCupom() {
    const codigo = cupomCodigo.trim().toUpperCase();
    if (!codigo) {
      setCupomAplicadoCodigo('');
      setFeedbackCupom('Digite um cupom para aplicar.');
      return;
    }

    setAplicandoCupom(true);
    try {
      const validacao = await api.post<{
        valido: boolean;
        codigo: string;
        mensagem: string;
        descontoPercentual?: number;
      }>('/pedidos/validar-cupom', {
        codigo,
        clienteId,
        clienteTelefone: clienteTelefone?.trim() || undefined
      });

      if (!validacao.valido) {
        setCupomAplicadoCodigo('');
        setFeedbackCupom(validacao.mensagem || 'Cupom indisponivel.');
        return;
      }

      setCupomAplicadoCodigo(validacao.codigo || codigo);
      setFeedbackCupom(validacao.mensagem || 'Cupom aplicado com sucesso.');
      setErro(null);
      setCuponsDisponiveis(prev => {
        const existe = prev.some(item => item.codigo === codigo);
        if (existe) {
          return prev.map(item =>
            item.codigo === codigo
              ? {
                  ...item,
                  disponivel: true,
                  descontoPercentual: validacao.descontoPercentual ?? item.descontoPercentual
                }
              : item
          );
        }
        return [
          ...prev,
          {
            codigo,
            disponivel: true,
            descontoPercentual: validacao.descontoPercentual
          }
        ];
      });
    } catch (e) {
      setCupomAplicadoCodigo('');
      if (e instanceof ApiError && e.payload && typeof e.payload === 'object' && 'message' in e.payload) {
        setFeedbackCupom(String((e.payload as { message?: unknown }).message || 'Falha ao validar cupom.'));
      } else {
        setFeedbackCupom('Falha ao validar cupom.');
      }
    } finally {
      setAplicandoCupom(false);
    }
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
      ? Number((((subtotal + taxaEntregaPreview) * cupomAtivo.descontoPercentual) / 100).toFixed(2))
      : 0;

  const totalComDesconto = Math.max(0, Number((subtotal + taxaEntregaPreview - descontoPreview).toFixed(2)));
  const restantePagar = totalComDesconto;

  return (
    <main className="flex-1 bg-[var(--brand-soft-bg)] dark:bg-zinc-950 pb-16">
      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Finalizar pedido</h1>

        <section className="bg-white border border-blue-100 dark:bg-zinc-900 dark:border-zinc-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-900 dark:text-white">Resumo</span>
            <span className="text-sm text-slate-500 dark:text-zinc-400">
              {items.length} item(s) • R$ {subtotal.toFixed(2)}
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
          </div>

          {formaPagamento === 'pix' && (
            <div className="mt-3 rounded-xl bg-emerald-50 dark:bg-zinc-950 border border-emerald-200 dark:border-zinc-800 p-3 space-y-1">
              <p className="text-xs text-slate-700 dark:text-zinc-300">
                Chave PIX (celular): <span className="font-mono font-semibold">{PIX_KEY_DISPLAY}</span>
              </p>
              <p className="text-[11px] text-slate-500 dark:text-zinc-500">
                Após realizar o pagamento, envie o comprovante pelo WhatsApp da loja para confirmarmos seu pedido.
              </p>
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
                placeholder={`Ex: ${(totalComDesconto + 10).toFixed(2)}`}
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
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Entrega</h2>
          <div className="text-xs text-slate-600 dark:text-zinc-400 space-y-1">
            <div>Rua: {parsedAddress.rua || 'Nao informada'}</div>
            <div>Bairro: {parsedAddress.bairro || 'Nao informado'}</div>
            <div>Cidade: {parsedAddress.cidade || 'Rio Largo'}</div>
            <div className="font-semibold text-blue-700 dark:text-blue-400">
              Taxa de entrega: R$ {taxaEntregaPreview.toFixed(2)}
            </div>
          </div>
        </section>

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
              disabled={aplicandoCupom}
              className="h-10 px-3 rounded-lg bg-blue-600 text-xs font-semibold text-white whitespace-nowrap hover:bg-blue-700"
            >
              {aplicandoCupom ? 'Aplicando...' : 'Aplicar cupom'}
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

        <section className="bg-white border border-blue-100 dark:bg-zinc-900 dark:border-zinc-800 rounded-2xl p-4 space-y-2">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Total do pedido</h2>
          <div className="space-y-1 text-sm text-slate-600 dark:text-zinc-400">
            <div className="flex items-center justify-between">
              <span>Subtotal</span>
              <span>R$ {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Taxa de entrega</span>
              <span>R$ {taxaEntregaPreview.toFixed(2)}</span>
            </div>
            {descontoPreview > 0 && (
              <div className="flex items-center justify-between text-emerald-500">
                <span>Desconto</span>
                <span>- R$ {descontoPreview.toFixed(2)}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-base font-bold text-slate-900 dark:text-white pt-2">
              <span>Total final</span>
              <span>R$ {totalComDesconto.toFixed(2)}</span>
            </div>
          </div>
        </section>

        <button
          type="button"
          disabled={items.length === 0 || submitting}
          onClick={handleConfirmar}
          className="w-full h-12 rounded-full bg-brand-red text-white text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting ? 'Enviando...' : 'Confirmar pedido'}
        </button>

      </div>
      <BottomNav />

      <OrderSuccessModal
        open={pedidoConcluido !== null}
        pedidoId={pedidoConcluido?.id}
        total={pedidoConcluido?.total}
        isPix={pedidoConcluido?.formaPagamento === 'pix'}
        onDismiss={() => router.push('/orders')}
      />
    </main>
  );
}
