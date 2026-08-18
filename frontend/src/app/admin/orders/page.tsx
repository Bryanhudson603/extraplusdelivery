'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { OrderStatusBadge } from '@/components/OrderStatusBadge';
import {
  formatOrderShortId,
  getOrderStatusLabel,
  isFinishedOrderStatus,
  isIncomingOrderStatus
} from '@/lib/orders';
import {
  type BridgePrinter,
  getBridgeHealth,
  getBridgeSettings,
  listBridgePrinters,
  printViaBridge,
  updateBridgeSettings
} from '@/lib/print-bridge';

type BackendOrderItem = { name: string; quantity: number };

type BackendOrder = {
  id: string;
  status: string;
  total: number;
  createdAt: string;
  items?: BackendOrderItem[];
  motivoRecusa?: string;
  clienteNome?: string;
  clienteTelefone?: string;
  clienteEndereco?: string;
  formaPagamento?: string;
  tipoEntrega?: string;
  entregadorId?: string;
  entregadorNome?: string;
};

type Order = {
  id: string;
  status: string;
  total: number;
  createdAt: string;
  createdAtLabel: string;
  items: BackendOrderItem[];
  motivoRecusa?: string;
  clienteNome?: string;
  clienteTelefone?: string;
  clienteEndereco?: string;
  formaPagamento?: string;
  tipoEntrega?: string;
  entregadorId?: string;
  entregadorNome?: string;
};

const POLL_INTERVAL_MS = 5000;
const PREFS_KEY = 'extraplus-admin-orders-preferences';
const PAUSE_POLL_INTERVAL_MS = 15000;
const BRIDGE_RETRY_INTERVAL_MS = 20000;

function formatOrderDate(value: string): string {
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildPrintMarkup(order: Order): string {
  const itemsHtml = order.items
    .map(
      item => `
        <tr>
          <td style="padding: 6px 0; border-bottom: 1px dashed #cbd5e1;">${escapeHtml(item.name)}</td>
          <td style="padding: 6px 0; border-bottom: 1px dashed #cbd5e1; text-align: right;">${item.quantity}x</td>
        </tr>
      `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <title>Pedido ${escapeHtml(formatOrderShortId(order.id))}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 18px;
            color: #0f172a;
          }
          h1, h2, p {
            margin: 0;
          }
          .section {
            margin-top: 16px;
          }
          .muted {
            color: #475569;
            font-size: 12px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
          }
          .total {
            font-size: 18px;
            font-weight: 700;
            color: #1d4ed8;
          }
        </style>
      </head>
      <body>
        <h1 style="font-size: 20px;">Dil Bebidas</h1>
        <p class="muted">Pedido ${escapeHtml(formatOrderShortId(order.id))}</p>
        <p class="muted">${escapeHtml(order.createdAtLabel)}</p>

        <div class="section">
          <h2 style="font-size: 14px; margin-bottom: 6px;">Cliente</h2>
          <p>${escapeHtml(order.clienteNome || 'Cliente')}</p>
          <p class="muted">${escapeHtml(order.clienteTelefone || 'Telefone nao informado')}</p>
          <p class="muted">${escapeHtml(order.clienteEndereco || 'Endereco nao informado')}</p>
        </div>

        <div class="section">
          <h2 style="font-size: 14px; margin-bottom: 6px;">Pedido</h2>
          <p class="muted">Status: ${escapeHtml(getOrderStatusLabel(order.status))}</p>
          <p class="muted">Pagamento: ${escapeHtml(order.formaPagamento || 'Nao informado')}</p>
          <p class="muted">Entrega: ${escapeHtml(order.tipoEntrega || 'Nao informado')}</p>
          ${
            order.entregadorNome
              ? `<p class="muted">Entregador: ${escapeHtml(order.entregadorNome)}</p>`
              : ''
          }
        </div>

        <div class="section">
          <h2 style="font-size: 14px; margin-bottom: 6px;">Itens</h2>
          <table>
            <tbody>${itemsHtml || '<tr><td>Nenhum item informado</td><td></td></tr>'}</tbody>
          </table>
        </div>

        ${
          order.motivoRecusa
            ? `
              <div class="section">
                <h2 style="font-size: 14px; margin-bottom: 6px;">Motivo da recusa</h2>
                <p class="muted">${escapeHtml(order.motivoRecusa)}</p>
              </div>
            `
            : ''
        }

        <div class="section">
          <p class="total">Total: R$ ${order.total.toFixed(2)}</p>
        </div>
      </body>
    </html>
  `;
}

// Impressora termica 57/58mm, fonte padrao ESC/POS (Font A): ~32 colunas
// uteis. Nao e "57 = 57 caracteres" -- depende da fonte/DPI da impressora,
// 32 e o valor seguro/compativel na pratica para esse tamanho de bobina.
const RECEIPT_WIDTH_CHARS = 32;

// Usado na pre-visualizacao quando ainda nao existe nenhum pedido real pra
// mostrar como exemplo.
const SAMPLE_PREVIEW_ORDER: Order = {
  id: 'exemplo-0000-0000-0000-000000000001',
  status: 'recebido',
  total: 45.5,
  createdAt: new Date().toISOString(),
  createdAtLabel: new Date().toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }),
  items: [
    { name: 'Cerveja Skol Lata 350ml', quantity: 2 },
    { name: 'Refrigerante Coca-Cola 2L Garrafa', quantity: 1 }
  ],
  clienteNome: 'Cliente de exemplo',
  clienteTelefone: '(82) 99999-9999',
  clienteEndereco: 'Rua das Bebidas, 123 - Centro, Rio Largo/AL',
  formaPagamento: 'pix',
  tipoEntrega: 'delivery',
  entregadorNome: undefined
};

// O bridge local imprime em ESC/POS bruto (ver windows-print-bridge/server.js),
// entao o texto precisa chegar em ASCII puro -- sem isso, acentos podem sair
// como caracteres errados dependendo da codepage da impressora.
function stripAccentsForPrint(value: string): string {
  const decomposed = String(value || '').normalize('NFD');
  let result = '';
  for (const ch of decomposed) {
    const code = ch.codePointAt(0) || 0;
    const isCombiningDiacritic = code >= 0x0300 && code <= 0x036f;
    if (!isCombiningDiacritic) {
      result += ch;
    }
  }
  return result;
}

// Quebra por palavra: nunca corta no meio de uma palavra a menos que ela
// sozinha ja seja maior que a largura disponivel (nesse caso, so ai quebra).
function wrapReceiptWords(text: string, width: number): string[] {
  const words = stripAccentsForPrint(text).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [''];

  const lines: string[] = [];
  let current = '';

  for (const rawWord of words) {
    const pieces =
      rawWord.length > width ? rawWord.match(new RegExp(`.{1,${width}}`, 'g')) || [rawWord] : [rawWord];

    for (const word of pieces) {
      const candidate = current ? `${current} ${word}` : word;
      if (candidate.length > width) {
        if (current) lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
  }
  if (current) lines.push(current);
  return lines;
}

function centerReceiptLine(text: string, width: number): string {
  const clipped = text.length > width ? text.slice(0, width) : text;
  const totalPad = width - clipped.length;
  const left = Math.floor(totalPad / 2);
  const right = totalPad - left;
  return `${' '.repeat(left)}${clipped}${' '.repeat(right)}`;
}

function rightAlignReceiptPair(label: string, value: string, width: number): string {
  const gap = width - label.length - value.length;
  if (gap <= 0) return `${label} ${value}`.slice(0, width);
  return `${label}${' '.repeat(gap)}${value}`;
}

function receiptSeparator(width: number): string {
  return '-'.repeat(width);
}

function buildBridgeReceiptText(
  order: Order,
  width: number = RECEIPT_WIDTH_CHARS,
  margin: number = 0
): string {
  // Margem = espacos fixos aplicados a esquerda de toda linha (util quando a
  // impressora corta/nao alinha bem o inicio do texto). A largura util pro
  // conteudo diminui na mesma medida, pra nao estourar a bobina.
  const marginNormalizado = Math.max(0, Math.min(10, Math.round(margin) || 0));
  const width_ = Math.max(width - marginNormalizado, 8);
  const lines: string[] = [];

  lines.push(centerReceiptLine(stripAccentsForPrint('DIL BEBIDAS'), width_));
  lines.push(centerReceiptLine(stripAccentsForPrint(`Pedido ${formatOrderShortId(order.id)}`), width_));
  lines.push(centerReceiptLine(stripAccentsForPrint(order.createdAtLabel), width_));
  lines.push(receiptSeparator(width_));
  lines.push('');

  const pushField = (label: string, value: string) => {
    lines.push(`${label}:`);
    lines.push(...wrapReceiptWords(value, width_));
    lines.push('');
  };

  pushField('Cliente', order.clienteNome || 'Cliente');
  pushField('Telefone', order.clienteTelefone || 'Nao informado');
  pushField('Endereco', order.clienteEndereco || 'Nao informado');

  lines.push(...wrapReceiptWords(`Pagamento: ${order.formaPagamento || 'Nao informado'}`, width_));
  lines.push(...wrapReceiptWords(`Entrega: ${order.tipoEntrega || 'Nao informado'}`, width_));
  if (order.entregadorNome) {
    lines.push(...wrapReceiptWords(`Entregador: ${order.entregadorNome}`, width_));
  }

  lines.push('');
  lines.push(receiptSeparator(width_));
  lines.push(centerReceiptLine('ITENS', width_));
  lines.push(receiptSeparator(width_));

  for (const item of order.items) {
    const prefix = `${item.quantity}x `;
    const nameWidth = Math.max(width_ - prefix.length, 8);
    const wrappedName = wrapReceiptWords(item.name, nameWidth);
    lines.push(`${prefix}${wrappedName[0] || ''}`);
    const indent = ' '.repeat(prefix.length);
    for (let i = 1; i < wrappedName.length; i++) {
      lines.push(`${indent}${wrappedName[i]}`);
    }
  }

  if (order.motivoRecusa) {
    lines.push('');
    lines.push('Motivo da recusa:');
    lines.push(...wrapReceiptWords(order.motivoRecusa, width_));
  }

  lines.push('');
  lines.push(receiptSeparator(width_));
  lines.push(rightAlignReceiptPair('TOTAL:', `R$ ${order.total.toFixed(2)}`, width_));
  lines.push(receiptSeparator(width_));
  lines.push('');

  const marginPrefix = ' '.repeat(marginNormalizado);
  return lines.map(line => `${marginPrefix}${line}`).join('\r\n');
}

export default function AdminOrdersPage() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  const printTimeoutsRef = useRef<number[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [togglingPause, setTogglingPause] = useState(false);
  const [autoPrintEnabled, setAutoPrintEnabled] = useState(true);
  const [lastUpdatedAt, setLastUpdatedAt] = useState('');
  const [highlightedOrderIds, setHighlightedOrderIds] = useState<string[]>([]);
  const [entregadores, setEntregadores] = useState<
    Array<{ id: string; nome: string; telefone?: string; ativo: boolean }>
  >([]);
  const [bridgeOnline, setBridgeOnline] = useState(false);
  const [bridgePrinters, setBridgePrinters] = useState<BridgePrinter[]>([]);
  const [selectedPrinterName, setSelectedPrinterName] = useState('');
  const [receiptWidth, setReceiptWidth] = useState(RECEIPT_WIDTH_CHARS);
  const [savingReceiptWidth, setSavingReceiptWidth] = useState(false);
  const [receiptMargin, setReceiptMargin] = useState(0);
  const [savingReceiptMargin, setSavingReceiptMargin] = useState(false);
  const [bridgeEnabled, setBridgeEnabled] = useState(true);
  const [savingBridgeEnabled, setSavingBridgeEnabled] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [bridgeStatusMessage, setBridgeStatusMessage] = useState(
    'Conectando automaticamente com a impressora local...'
  );
  const [syncingBridge, setSyncingBridge] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const raw = window.localStorage.getItem(PREFS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        autoPrintEnabled?: boolean;
      };
      if (typeof parsed.autoPrintEnabled === 'boolean') {
        setAutoPrintEnabled(parsed.autoPrintEnabled);
      }
    } catch {
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(PREFS_KEY, JSON.stringify({ autoPrintEnabled }));
  }, [autoPrintEnabled]);

  const carregarPedidosPausados = useCallback(async () => {
    try {
      const resposta = await api.get<{ pausado: boolean }>('/admin/loja/pedidos-pausados');
      setIsPaused(Boolean(resposta.pausado));
    } catch (error) {
      console.error('Erro ao carregar status de pedidos pausados', error);
    }
  }, []);

  useEffect(() => {
    carregarPedidosPausados();
    const intervalId = window.setInterval(carregarPedidosPausados, PAUSE_POLL_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [carregarPedidosPausados]);

  async function togglePausarPedidos() {
    if (togglingPause) return;
    setTogglingPause(true);
    const proximoValor = !isPaused;
    try {
      const resposta = await api.put<{ pausado: boolean }>('/admin/loja/pedidos-pausados', {
        pausado: proximoValor
      });
      setIsPaused(Boolean(resposta.pausado));
    } catch (error) {
      console.error('Erro ao atualizar status de pedidos pausados', error);
    } finally {
      setTogglingPause(false);
    }
  }

  useEffect(() => {
    function syncFullscreenState() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }

    document.addEventListener('fullscreenchange', syncFullscreenState);
    return () => {
      document.removeEventListener('fullscreenchange', syncFullscreenState);
    };
  }, []);

  useEffect(() => {
    const timeoutIds = printTimeoutsRef.current;
    return () => {
      timeoutIds.forEach(timeoutId => window.clearTimeout(timeoutId));
    };
  }, []);

  const syncBridge = useCallback(async () => {
    setSyncingBridge(true);
    try {
      const [health, printers, settings] = await Promise.all([
        getBridgeHealth(),
        listBridgePrinters(),
        getBridgeSettings()
      ]);

      setBridgeOnline(Boolean(health.ok));
      setBridgePrinters(printers);
      setSelectedPrinterName(settings.selectedPrinterName || printers.find(item => item.isDefault)?.name || '');
      if (settings.charactersPerLine) {
        setReceiptWidth(settings.charactersPerLine);
      }
      if (typeof settings.marginLeft === 'number') {
        setReceiptMargin(settings.marginLeft);
      }
      if (typeof settings.bridgeEnabled === 'boolean') {
        setBridgeEnabled(settings.bridgeEnabled);
      }
      setBridgeStatusMessage(
        health.ok
          ? printers.length > 0
            ? `Bridge conectado com ${printers.length} impressora(s) encontrada(s).`
            : 'Bridge conectado, mas nenhuma impressora foi encontrada no Windows.'
          : 'Bridge local nao conectado.'
      );
    } catch (error) {
      setBridgeOnline(false);
      setBridgePrinters([]);
      setBridgeStatusMessage(
        'O navegador bloqueou ou nao encontrou o bridge local. Clique em sincronizar e permita o acesso local quando o Chrome pedir.'
      );
    } finally {
      setSyncingBridge(false);
    }
  }, []);

  useEffect(() => {
    syncBridge();
    const intervalId = window.setInterval(() => {
      if (!bridgeOnline) {
        void syncBridge();
      }
    }, BRIDGE_RETRY_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bridgeOnline]);

  const printOrder = useCallback(async (order: Order) => {
    if (bridgeEnabled && bridgeOnline && selectedPrinterName) {
      try {
        await printViaBridge(buildBridgeReceiptText(order, receiptWidth, receiptMargin), selectedPrinterName);
        return;
      } catch {
        setBridgeStatusMessage('Nao foi possivel imprimir pelo bridge. O sistema voltou para o modo navegador.');
      }
    }

    if (typeof window === 'undefined') return;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      return;
    }

    doc.open();
    doc.write(buildPrintMarkup(order));
    doc.close();

    const cleanup = () => {
      window.setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1500);
    };

    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (error) {
        console.error('Erro ao imprimir pedido', error);
      } finally {
        cleanup();
      }
    };
  }, [bridgeEnabled, bridgeOnline, selectedPrinterName, receiptWidth, receiptMargin]);

  const queuePrintOrders = useCallback(
    (incomingOrders: Order[]) => {
      incomingOrders.forEach((order, index) => {
        const timeoutId = window.setTimeout(() => {
          void printOrder(order);
        }, index * 1200);
        printTimeoutsRef.current.push(timeoutId);
      });
    },
    [printOrder]
  );

  const carregarPedidos = useCallback(async () => {
    try {
      const response = await api.get<BackendOrder[]>('/pedidos');
      const normalized: Order[] = response.map(order => ({
        id: order.id,
        status: order.status,
        total: Number(order.total ?? 0),
        createdAt: order.createdAt,
        createdAtLabel: formatOrderDate(order.createdAt),
        items: order.items ?? [],
        motivoRecusa: order.motivoRecusa,
        clienteNome: order.clienteNome,
        clienteTelefone: order.clienteTelefone,
        clienteEndereco: order.clienteEndereco,
        formaPagamento: order.formaPagamento,
        tipoEntrega: order.tipoEntrega,
        entregadorId: order.entregadorId,
        entregadorNome: order.entregadorNome
      }));

      const previousIds = knownOrderIdsRef.current;
      const incomingOrders =
        previousIds.size === 0
          ? []
          : normalized.filter(order => isIncomingOrderStatus(order.status) && !previousIds.has(order.id));

      knownOrderIdsRef.current = new Set(normalized.map(order => order.id));
      setOrders(normalized);
      setLastUpdatedAt(
        new Date().toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        })
      );

      if (!isPaused && incomingOrders.length > 0) {
        const newIds = incomingOrders.map(order => order.id);
        setHighlightedOrderIds(prev => Array.from(new Set([...prev, ...newIds])));
        window.setTimeout(() => {
          setHighlightedOrderIds(prev => prev.filter(id => !newIds.includes(id)));
        }, 12000);

        if (autoPrintEnabled) {
          queuePrintOrders(incomingOrders);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar pedidos admin', error);
    } finally {
      setLoading(false);
    }
  }, [autoPrintEnabled, isPaused, queuePrintOrders]);

  useEffect(() => {
    carregarPedidos();
    const intervalId = window.setInterval(carregarPedidos, POLL_INTERVAL_MS);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [carregarPedidos]);

  useEffect(() => {
    async function carregarEntregadores() {
      try {
        const lista = await api.get<
          Array<{ id: string; nome: string; telefone?: string; ativo: boolean }>
        >('/admin/entregadores');
        setEntregadores(lista.filter(entregador => entregador.ativo));
      } catch (error) {
        console.error('Erro ao carregar entregadores', error);
      }
    }

    carregarEntregadores();
  }, []);

  async function vincularEntregador(pedidoId: string, entregadorId: string) {
    try {
      const entregador = entregadores.find(item => item.id === entregadorId);
      const atualizado = await api.post<BackendOrder>(`/pedidos/${pedidoId}/entregador`, {
        entregadorId
      });
      setOrders(prev =>
        prev.map(order =>
          order.id === pedidoId
            ? {
                ...order,
                entregadorId: atualizado.entregadorId,
                entregadorNome: atualizado.entregadorNome || entregador?.nome
              }
            : order
        )
      );
    } catch (error) {
      console.error('Erro ao vincular entregador ao pedido', error);
    }
  }

  async function atualizarStatus(id: string, status: string) {
    try {
      let motivoRecusa: string | undefined;
      if (status === 'cancelado') {
        motivoRecusa = window.prompt('Informe o motivo da recusa do pedido:') || '';
      }

      const atualizado = await api.post<BackendOrder>(`/pedidos/${id}/status`, {
        status,
        motivoRecusa
      });

      setOrders(prev =>
        prev.map(order =>
          order.id === id
            ? {
                ...order,
                status: atualizado.status,
                motivoRecusa: atualizado.motivoRecusa,
                entregadorId: atualizado.entregadorId,
                entregadorNome: atualizado.entregadorNome
              }
            : order
        )
      );
    } catch (error) {
      console.error('Erro ao atualizar status do pedido', error);
    }
  }

  async function toggleFullscreen() {
    const target = containerRef.current;
    if (!target) return;

    try {
      if (!document.fullscreenElement) {
        await target.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('Erro ao alternar tela cheia', error);
    }
  }

  async function handlePrinterSelection(nextPrinterName: string) {
    setSelectedPrinterName(nextPrinterName);
    try {
      await updateBridgeSettings({
        selectedPrinterName: nextPrinterName
      });
      setBridgeStatusMessage(
        nextPrinterName
          ? `Impressora selecionada: ${nextPrinterName}.`
          : 'Nenhuma impressora selecionada no bridge.'
      );
    } catch (error) {
      console.error('Erro ao salvar impressora no bridge', error);
      setBridgeStatusMessage('Nao foi possivel salvar a impressora no bridge local.');
    }
  }

  async function handleReceiptWidthChange(nextWidth: number) {
    const clamped = Math.min(80, Math.max(16, Math.round(nextWidth) || RECEIPT_WIDTH_CHARS));
    setReceiptWidth(clamped);
    setSavingReceiptWidth(true);
    try {
      await updateBridgeSettings({ charactersPerLine: clamped });
      setBridgeStatusMessage(`Largura do cupom ajustada para ${clamped} caracteres por linha.`);
    } catch (error) {
      console.error('Erro ao salvar largura do cupom no bridge', error);
      setBridgeStatusMessage('Nao foi possivel salvar a largura do cupom no bridge local.');
    } finally {
      setSavingReceiptWidth(false);
    }
  }

  async function handleReceiptMarginChange(nextMargin: number) {
    const clamped = Math.min(10, Math.max(0, Math.round(nextMargin) || 0));
    setReceiptMargin(clamped);
    setSavingReceiptMargin(true);
    try {
      await updateBridgeSettings({ marginLeft: clamped });
      setBridgeStatusMessage(`Margem esquerda do cupom ajustada para ${clamped} espaco(s).`);
    } catch (error) {
      console.error('Erro ao salvar margem do cupom no bridge', error);
      setBridgeStatusMessage('Nao foi possivel salvar a margem do cupom no bridge local.');
    } finally {
      setSavingReceiptMargin(false);
    }
  }

  async function handleBridgeEnabledToggle() {
    const nextEnabled = !bridgeEnabled;
    setBridgeEnabled(nextEnabled);
    setSavingBridgeEnabled(true);
    try {
      await updateBridgeSettings({ bridgeEnabled: nextEnabled });
      setBridgeStatusMessage(
        nextEnabled
          ? 'Bridge de impressao ativado. Pedidos voltam a sair automaticamente na impressora.'
          : 'Bridge de impressao desativado. Nenhum pedido sera enviado pra impressora local ate reativar.'
      );
    } catch (error) {
      console.error('Erro ao salvar ativacao do bridge', error);
      setBridgeStatusMessage('Nao foi possivel salvar essa configuracao no bridge local.');
      setBridgeEnabled(!nextEnabled);
    } finally {
      setSavingBridgeEnabled(false);
    }
  }

  const pendingOrders = useMemo(
    () => orders.filter(order => !isFinishedOrderStatus(order.status)),
    [orders]
  );
  const finishedOrders = useMemo(
    () => orders.filter(order => isFinishedOrderStatus(order.status)),
    [orders]
  );

  return (
    <main
      ref={containerRef}
      className="flex-1 bg-[var(--brand-soft-bg)] p-4 sm:p-6 text-slate-900 dark:bg-zinc-950 dark:text-white"
    >
      <div className={`${isFullscreen ? 'max-w-none' : 'max-w-7xl'} mx-auto space-y-6`}>
        <section className="rounded-3xl border border-blue-100 bg-white/90 p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Pedidos</h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">
                Atualizacao automatica a cada 5 segundos para acompanhar os novos pedidos.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-blue-50 px-3 py-1 font-semibold text-blue-700">
                  {pendingOrders.length} em andamento
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
                  {finishedOrders.length} finalizados ou cancelados
                </span>
                {lastUpdatedAt && (
                  <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">
                    Atualizado as {lastUpdatedAt}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 lg:justify-end">
              <button
                type="button"
                onClick={() => void togglePausarPedidos()}
                disabled={togglingPause}
                className={`h-10 rounded-full px-4 text-sm font-semibold disabled:opacity-60 ${
                  isPaused
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {togglingPause ? 'Atualizando...' : isPaused ? 'Retomar chegada de pedidos' : 'Pausar chegada de pedidos'}
              </button>
              <button
                type="button"
                onClick={() => setAutoPrintEnabled(prev => !prev)}
                className={`h-10 rounded-full px-4 text-sm font-semibold ${
                  autoPrintEnabled
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
              >
                {autoPrintEnabled ? 'Autoimpressao ligada' : 'Autoimpressao desligada'}
              </button>
              <button
                type="button"
                onClick={() => void syncBridge()}
                className="h-10 rounded-full border border-blue-200 px-4 text-sm font-semibold text-blue-700 hover:bg-blue-50"
              >
                {syncingBridge ? 'Sincronizando bridge...' : 'Sincronizar bridge'}
              </button>
              <button
                type="button"
                onClick={carregarPedidos}
                className="h-10 rounded-full border border-blue-200 px-4 text-sm font-semibold text-blue-700 hover:bg-blue-50"
              >
                Atualizar agora
              </button>
              <button
                type="button"
                onClick={toggleFullscreen}
                className="h-10 rounded-full border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
              >
                {isFullscreen ? 'Sair da tela cheia' : 'Modo tela cheia'}
              </button>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm text-blue-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
            {isPaused
              ? 'Chegada de pedidos pausada. Os clientes nao conseguem finalizar novos pedidos ate voce retomar.'
              : autoPrintEnabled
                ? 'Novos pedidos recebidos disparam a impressao automaticamente na impressora padrao do Windows. Para imprimir sem dialogo, abra o navegador em modo kiosk-printing.'
                : 'Novos pedidos continuam aparecendo na tela, mas a impressao automatica esta desligada.'}
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm text-slate-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
              <div className="font-semibold text-slate-900 dark:text-white">
                {bridgeOnline ? 'Bridge local conectado' : 'Bridge local offline'}
              </div>
              <div className="mt-1 text-xs text-slate-500 dark:text-zinc-400">{bridgeStatusMessage}</div>
              <div className="mt-2 text-xs text-slate-500 dark:text-zinc-400">
                Quando o bridge estiver ativo, o sistema envia o cupom em texto direto para a impressora escolhida.
                Se o navegador pedir permissao para acessar o computador local, clique em permitir.
              </div>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
              <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400">
                Impressora do bridge
              </label>
              <select
                value={selectedPrinterName}
                disabled={!bridgeOnline || bridgePrinters.length === 0}
                onChange={event => {
                  void handlePrinterSelection(event.target.value);
                }}
                className="mt-2 h-10 w-full rounded-xl border border-blue-200 bg-white px-3 text-sm text-slate-900 outline-none disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              >
                <option value="">Selecione a impressora</option>
                {bridgePrinters.map(printer => (
                  <option key={printer.name} value={printer.name}>
                    {printer.name}
                    {printer.isDefault ? ' (padrao)' : ''}
                  </option>
                ))}
              </select>

              <label className="mt-3 block text-xs font-semibold text-slate-600 dark:text-zinc-400">
                Caracteres por linha do cupom
              </label>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  min={16}
                  max={80}
                  step={1}
                  value={receiptWidth}
                  onChange={event => setReceiptWidth(Number(event.target.value) || RECEIPT_WIDTH_CHARS)}
                  onBlur={event => void handleReceiptWidthChange(Number(event.target.value))}
                  disabled={savingReceiptWidth}
                  className="h-10 w-24 rounded-xl border border-blue-200 bg-white px-3 text-sm text-slate-900 outline-none disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
                <span className="text-xs text-slate-500 dark:text-zinc-400">
                  Ajuste se o cupom sair apertado ou com sobra de espaco na sua impressora (padrao: {RECEIPT_WIDTH_CHARS}).
                </span>
              </div>

              <label className="mt-3 block text-xs font-semibold text-slate-600 dark:text-zinc-400">
                Margem esquerda do cupom
              </label>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={10}
                  step={1}
                  value={receiptMargin}
                  onChange={event => setReceiptMargin(Number(event.target.value) || 0)}
                  onBlur={event => void handleReceiptMarginChange(Number(event.target.value))}
                  disabled={savingReceiptMargin}
                  className="h-10 w-24 rounded-xl border border-blue-200 bg-white px-3 text-sm text-slate-900 outline-none disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
                <span className="text-xs text-slate-500 dark:text-zinc-400">
                  Espacos extras a esquerda de cada linha, caso a impressora corte o inicio do texto.
                </span>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewOpen(true)}
                  className="h-10 rounded-xl border border-blue-200 px-4 text-sm font-semibold text-blue-700 hover:bg-blue-50 dark:border-zinc-700 dark:text-blue-400 dark:hover:bg-zinc-800"
                >
                  Pre-visualizar impressao
                </button>
                <button
                  type="button"
                  onClick={() => void handleBridgeEnabledToggle()}
                  disabled={savingBridgeEnabled}
                  className={`h-10 rounded-xl px-4 text-sm font-semibold disabled:opacity-60 ${
                    bridgeEnabled
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400'
                      : 'bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-400'
                  }`}
                >
                  {bridgeEnabled ? 'Bridge ativado' : 'Bridge desativado'}
                </button>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                Confira a pre-visualizacao e ajuste largura/margem antes de ativar o bridge, pra garantir que os
                pedidos vao sair certinho na impressora sem precisar de teste fisico.
              </p>
            </div>
          </div>
        </section>

        {previewOpen && (
          <>
            <div className="fixed inset-0 z-40 bg-black/60" onClick={() => setPreviewOpen(false)} />
            <div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[85vh] max-w-md rounded-t-2xl border-t border-blue-100 bg-white dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between border-b border-blue-100 px-4 py-3 dark:border-zinc-800">
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                    Pre-visualizacao da impressao
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                    Exatamente como o cupom vai sair, com a largura e a margem atuais.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewOpen(false)}
                  className="text-xs text-slate-500 dark:text-zinc-400"
                >
                  Fechar
                </button>
              </div>
              <div className="max-h-[65vh] overflow-y-auto px-4 py-4">
                <div className="mx-auto w-fit rounded bg-white p-3 shadow-inner ring-1 ring-slate-300">
                  <pre className="whitespace-pre font-mono text-[11px] leading-[14px] text-black">
                    {buildBridgeReceiptText(orders[0] || SAMPLE_PREVIEW_ORDER, receiptWidth, receiptMargin)}
                  </pre>
                </div>
                {!orders[0] && (
                  <p className="mt-3 text-center text-[11px] text-slate-500 dark:text-zinc-400">
                    Nenhum pedido real ainda -- mostrando um cupom de exemplo com o mesmo formato.
                  </p>
                )}
              </div>
            </div>
          </>
        )}

        {loading ? (
          <div className="py-16 text-center text-slate-600 dark:text-zinc-500">Carregando pedidos...</div>
        ) : orders.length === 0 ? (
          <div className="rounded-3xl border border-blue-100 bg-white/90 py-16 text-center text-slate-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-500">
            Nenhum pedido registrado
          </div>
        ) : (
          <div className="space-y-6">
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Em andamento</h2>
                <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                  {pendingOrders.length} pedido(s)
                </span>
              </div>

              {pendingOrders.length === 0 ? (
                <div className="rounded-3xl border border-blue-100 bg-white/90 py-12 text-center text-slate-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-500">
                  Nenhum pedido em andamento no momento.
                </div>
              ) : (
                <div className="grid gap-4 xl:grid-cols-2">
                  {pendingOrders.map(order => {
                    const highlighted = highlightedOrderIds.includes(order.id);
                    return (
                      <article
                        key={order.id}
                        className={`rounded-3xl border bg-white/95 p-5 shadow-sm transition ${
                          highlighted
                            ? 'border-blue-400 ring-2 ring-blue-200'
                            : 'border-blue-100'
                        } dark:border-zinc-800 dark:bg-zinc-900`}
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-lg font-bold text-slate-900 dark:text-white">
                                {formatOrderShortId(order.id)}
                              </span>
                              <OrderStatusBadge status={order.status} />
                              {highlighted && (
                                <span className="rounded-full bg-blue-600 px-2 py-1 text-[11px] font-semibold text-white">
                                  Novo pedido
                                </span>
                              )}
                            </div>

                            <div className="space-y-1 text-sm text-slate-600 dark:text-zinc-400">
                              <p>{order.createdAtLabel}</p>
                              <p>Cliente: {order.clienteNome || 'Cliente'}</p>
                              <p>Telefone: {order.clienteTelefone || 'Nao informado'}</p>
                              <p>Endereco: {order.clienteEndereco || 'Nao informado'}</p>
                              <p>Pagamento: {order.formaPagamento || 'Nao informado'}</p>
                              <p>Entrega: {order.tipoEntrega || 'Nao informado'}</p>
                              {order.entregadorNome && <p>Entregador: {order.entregadorNome}</p>}
                              {order.motivoRecusa && (
                                <p className="font-medium text-red-600">Motivo da recusa: {order.motivoRecusa}</p>
                              )}
                            </div>

                            <div className="rounded-2xl bg-blue-50/80 p-3 dark:bg-zinc-950">
                              <div className="mb-2 flex items-center justify-between">
                                <span className="text-sm font-semibold text-slate-900 dark:text-white">Itens</span>
                                <span className="text-xs text-slate-500 dark:text-zinc-400">
                                  {order.items.reduce((sum, item) => sum + item.quantity, 0)} item(ns)
                                </span>
                              </div>
                              <div className="space-y-2">
                                {order.items.map(item => (
                                  <div
                                    key={`${order.id}-${item.name}-${item.quantity}`}
                                    className="flex items-center justify-between text-sm text-slate-700 dark:text-zinc-300"
                                  >
                                    <span>{item.name}</span>
                                    <span>{item.quantity}x</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="w-full lg:max-w-[260px]">
                            <div className="rounded-2xl border border-blue-100 bg-slate-50 p-4 text-right dark:border-zinc-800 dark:bg-zinc-950">
                              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
                                Total
                              </div>
                              <p className="mt-1 text-2xl font-bold text-blue-700 dark:text-blue-400">
                                R$ {order.total.toFixed(2)}
                              </p>
                            </div>

                            {(order.status === 'confirmado' || order.status === 'em_separacao') && (
                              <div className="mt-3">
                                {entregadores.length === 0 ? (
                                  <p className="text-[11px] text-slate-500 dark:text-zinc-500">
                                    Cadastre entregadores em Configuracoes &gt; Entregadores para vincular pedidos.
                                  </p>
                                ) : (
                                  <select
                                    value={order.entregadorId || ''}
                                    onChange={event => {
                                      const selectedId = event.target.value;
                                      if (!selectedId) return;
                                      vincularEntregador(order.id, selectedId);
                                    }}
                                    className="h-10 w-full rounded-xl border border-blue-200 bg-white px-3 text-sm text-slate-900 outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                                  >
                                    <option value="">Vincular entregador...</option>
                                    {entregadores.map(entregador => (
                                      <option key={entregador.id} value={entregador.id}>
                                        {entregador.nome}
                                      </option>
                                    ))}
                                  </select>
                                )}
                              </div>
                            )}

                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => void printOrder(order)}
                                className="h-10 rounded-full border border-blue-200 px-4 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                              >
                                Imprimir pedido
                              </button>

                              {(order.status === 'recebido' || order.status === 'aguardando_pagamento') && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => atualizarStatus(order.id, 'confirmado')}
                                    className="h-10 rounded-full bg-emerald-500 px-4 text-sm font-semibold text-white hover:bg-emerald-600"
                                  >
                                    Aceitar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => atualizarStatus(order.id, 'cancelado')}
                                    className="h-10 rounded-full bg-red-500 px-4 text-sm font-semibold text-white hover:bg-red-600"
                                  >
                                    Recusar
                                  </button>
                                </>
                              )}

                              {(order.status === 'confirmado' || order.status === 'em_separacao') && (
                                <button
                                  type="button"
                                  onClick={() => atualizarStatus(order.id, 'saiu_para_entrega')}
                                  className="h-10 rounded-full bg-violet-600 px-4 text-sm font-semibold text-white hover:bg-violet-700"
                                >
                                  Saiu para entrega
                                </button>
                              )}

                              {order.status === 'saiu_para_entrega' && (
                                <button
                                  type="button"
                                  onClick={() => atualizarStatus(order.id, 'finalizado')}
                                  className="h-10 rounded-full bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700"
                                >
                                  Marcar entregue
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Historico</h2>
                <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                  {finishedOrders.length} pedido(s)
                </span>
              </div>

              {finishedOrders.length === 0 ? (
                <div className="rounded-3xl border border-blue-100 bg-white/90 py-10 text-center text-slate-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-500">
                  Ainda nao ha pedidos finalizados ou cancelados.
                </div>
              ) : (
                <div className="grid gap-3 xl:grid-cols-2">
                  {finishedOrders.map(order => (
                    <article
                      key={order.id}
                      className="rounded-3xl border border-blue-100 bg-white/90 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {formatOrderShortId(order.id)}
                            </span>
                            <OrderStatusBadge status={order.status} />
                          </div>
                          <p className="text-sm text-slate-600 dark:text-zinc-400">{order.createdAtLabel}</p>
                          <p className="text-sm text-slate-600 dark:text-zinc-400">
                            Cliente: {order.clienteNome || 'Cliente'}
                          </p>
                          {order.motivoRecusa && (
                            <p className="text-sm text-red-600">Motivo da recusa: {order.motivoRecusa}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-blue-700 dark:text-blue-400">
                            R$ {order.total.toFixed(2)}
                          </p>
                          <button
                            type="button"
                            onClick={() => void printOrder(order)}
                            className="mt-2 h-9 rounded-full border border-blue-200 px-4 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                          >
                            Imprimir
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
