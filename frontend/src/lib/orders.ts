export type ClientScopedOrder = {
  clienteId?: string;
  clienteTelefone?: string;
};

const FINISHED_ORDER_STATUSES = new Set(['finalizado', 'cancelado']);
const INCOMING_ORDER_STATUSES = new Set(['recebido', 'aguardando_pagamento']);

const ORDER_STATUS_LABELS: Record<string, string> = {
  aguardando_pagamento: 'Aguardando pagamento',
  recebido: 'Recebido',
  em_separacao: 'Em separacao',
  confirmado: 'Pronto para entrega',
  saiu_para_entrega: 'Saiu para entrega',
  finalizado: 'Finalizado',
  cancelado: 'Cancelado'
};

export function formatOrderShortId(id: string): string {
  return `#${id.slice(-6).toUpperCase()}`;
}

export function getOrderStatusLabel(status: string): string {
  return ORDER_STATUS_LABELS[status] || status.replaceAll('_', ' ');
}

export function isFinishedOrderStatus(status: string): boolean {
  return FINISHED_ORDER_STATUSES.has(status);
}

export function isIncomingOrderStatus(status: string): boolean {
  return INCOMING_ORDER_STATUSES.has(status);
}

export function matchesClientOrder(
  order: ClientScopedOrder,
  clienteId: string | null,
  clienteTelefone: string | null
): boolean {
  if (clienteId && order.clienteId === clienteId) {
    return true;
  }

  if (clienteTelefone && order.clienteTelefone === clienteTelefone) {
    return true;
  }

  return false;
}
