export type FormaPagamento = 'pix' | 'cartao_entrega' | 'dinheiro' | 'carteira';
export type TipoEntrega = 'delivery' | 'retirada';
export type PedidoStatus =
  | 'aguardando_pagamento'
  | 'recebido'
  | 'confirmado'
  | 'saiu_para_entrega'
  | 'finalizado'
  | 'cancelado';

export type PedidoItem = { name: string; quantity: number };

export type Pedido = {
  id: string;
  status: PedidoStatus;
  tipoEntrega: TipoEntrega;
  formaPagamento: FormaPagamento;
  total: number;
  createdAt: string;
  items: PedidoItem[];
  trocoPara?: number;
  troco?: number;
  pix?: { qrCodePayload: string };
  motivoRecusa?: string;
  clienteId?: string;
  clienteNome?: string;
  clienteTelefone?: string;
  clienteEndereco?: string;
  entregadorId?: string;
  entregadorNome?: string;
};

export const pedidosStore: Pedido[] = [];
