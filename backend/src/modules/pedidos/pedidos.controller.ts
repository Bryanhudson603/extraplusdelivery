import { Body, Controller, Get, Post, Param, NotFoundException, BadRequestException } from '@nestjs/common';
import { listarProdutos, salvarProduto } from '../catalogo/catalogo.store';
import { pedidosStore, type Pedido as PedidoStore, type PedidoStatus as PedidoStatusStore } from './pedidos.store';
import { randomUUID } from 'crypto';
import { cuponsStore, cuponsClientesStore } from '../cupons/cupons.store';
import { clientesCarteiraStore } from '../carteira/carteira.store';
import { entregadoresStore } from '../entregadores/entregadores.store';

type FormaPagamento = 'pix' | 'cartao_entrega' | 'dinheiro' | 'carteira';
type TipoEntrega = 'delivery' | 'retirada';

type PedidoItemDto = {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
};

type CriarPedidoDto = {
  tipoEntrega: TipoEntrega;
  formaPagamento: FormaPagamento;
  itens: PedidoItemDto[];
  observacaoCliente?: string;
  trocoPara?: number;
  clienteId?: string;
  clienteNome?: string;
  clienteTelefone?: string;
  clienteEndereco?: string;
  cupomCodigo?: string;
  usarCarteira?: boolean;
  entregadorId?: string;
};

type PedidoStatus = PedidoStatusStore;

export type Pedido = {
  id: string;
  status: PedidoStatus;
  tipoEntrega: TipoEntrega;
  formaPagamento: FormaPagamento;
  total: number;
  createdAt: string;
  items: { name: string; quantity: number }[];
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

export const pedidos: Pedido[] = pedidosStore as Pedido[];

@Controller('pedidos')
export class PedidosController {
  @Get()
  listar() {
    return pedidos;
  }

  @Post()
  criar(@Body() body: CriarPedidoDto) {
    const totalBruto = body.itens.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0);
    let desconto = 0;
    if (body.cupomCodigo) {
      const codigo = String(body.cupomCodigo).trim().toUpperCase();
      const cupom = cuponsStore.find(c => c.codigo === codigo && c.ativo);
      const agora = Date.now();
      const dentroJanela =
        !!cupom &&
        (!cupom.validoDe || new Date(cupom.validoDe).getTime() <= agora) &&
        (!cupom.validoAte || new Date(cupom.validoAte).getTime() >= agora);
      const atribuicao =
        !!cupom &&
        (body.clienteId || body.clienteTelefone) &&
        cuponsClientesStore.find(
          cc =>
            cc.codigo === codigo &&
            (cc.clienteId === body.clienteId || cc.clienteId === body.clienteTelefone)
        );
      const usosOk =
        !!cupom &&
        !!atribuicao &&
        (cupom.usosPorCliente == null || atribuicao.usos < cupom.usosPorCliente);
      if (cupom && dentroJanela && atribuicao && usosOk && cupom.descontoPercentual) {
        desconto = Number(((totalBruto * cupom.descontoPercentual) / 100).toFixed(2));
        atribuicao.usos += 1;
      }
    }
    const total = Math.max(0, Number((totalBruto - desconto).toFixed(2)));
    const id = randomUUID();

    const chaveCarteira = body.clienteId || body.clienteTelefone;

    let usadoCarteira = 0;

    if (body.formaPagamento === 'carteira') {
      if (!chaveCarteira) {
        throw new BadRequestException('Cliente não identificado para pagamento com carteira.');
      }
      let carteira = clientesCarteiraStore.find(c => c.id === chaveCarteira);
      if (!carteira || carteira.saldo < total) {
        throw new BadRequestException('Saldo insuficiente na carteira.');
      }
      carteira.saldo = Number((carteira.saldo - total).toFixed(2));
      usadoCarteira = total;
    } else if (body.usarCarteira && chaveCarteira) {
      let carteira = clientesCarteiraStore.find(c => c.id === chaveCarteira);
      if (carteira && carteira.saldo > 0) {
        const aplicavel = Math.min(carteira.saldo, total);
        carteira.saldo = Number((carteira.saldo - aplicavel).toFixed(2));
        usadoCarteira = aplicavel;
      }
    }

    const totalRestante = Math.max(0, Number((total - usadoCarteira).toFixed(2)));

    const trocoPara = typeof body.trocoPara === 'number' ? body.trocoPara : undefined;
    const troco =
      body.formaPagamento === 'dinheiro' && trocoPara && trocoPara > totalRestante
        ? Number((trocoPara - totalRestante).toFixed(2))
        : undefined;

    let entregadorNome: string | undefined;
    if (body.entregadorId) {
      const entregador = entregadoresStore.find(e => e.id === body.entregadorId);
      if (entregador) {
        entregadorNome = entregador.nome;
      }
    }

    const pedido: Pedido = {
      id,
      status: body.formaPagamento === 'pix' ? 'aguardando_pagamento' : 'recebido',
      tipoEntrega: body.tipoEntrega,
      formaPagamento: body.formaPagamento,
      total,
      createdAt: new Date().toISOString(),
      items: body.itens.map(it => ({ name: it.name, quantity: it.quantity })),
      trocoPara,
      troco,
      pix:
        body.formaPagamento === 'pix'
          ? { qrCodePayload: `PIX:EXTRAPLUS:${id}:${total.toFixed(2)}` }
          : undefined,
      clienteId: body.clienteId,
      clienteNome: body.clienteNome,
      clienteTelefone: body.clienteTelefone,
      clienteEndereco: body.clienteEndereco,
      entregadorId: body.entregadorId,
      entregadorNome
    };

    pedidosStore.unshift(pedido as PedidoStore);

    if (chaveCarteira) {
      const cashbackValor = Number((total * 0.01).toFixed(2));
      if (cashbackValor > 0) {
        let carteira = clientesCarteiraStore.find(c => c.id === chaveCarteira);
        if (!carteira) {
          carteira = { id: chaveCarteira, saldo: 0 };
          clientesCarteiraStore.push(carteira);
        }
        carteira.saldo = Number((carteira.saldo + cashbackValor).toFixed(2));
      }
    }

    const lojaId = 'pc-bebidas';
    for (const item of body.itens) {
      const lista = listarProdutos(lojaId);
      const produto = lista.find(p => p.id === item.productId);
      if (!produto) continue;
      const novoEstoque = produto.stock - item.quantity;
      salvarProduto(lojaId, {
        ...produto,
        stock: novoEstoque > 0 ? novoEstoque : 0
      });
    }
    return pedido;
  }

  @Post(':id/entregador')
  atualizarEntregador(
    @Param('id') id: string,
    @Body() body: { entregadorId: string }
  ) {
    const pedido = pedidosStore.find(p => p.id === id);
    if (!pedido) {
      throw new NotFoundException('Pedido não encontrado');
    }
    const entregador = entregadoresStore.find(e => e.id === body.entregadorId);
    if (!entregador) {
      throw new BadRequestException('Entregador não encontrado');
    }
    (pedido as PedidoStore).entregadorId = entregador.id;
    (pedido as PedidoStore).entregadorNome = entregador.nome;
    return pedido as Pedido;
  }

  @Post(':id/status')
  atualizarStatus(
    @Param('id') id: string,
    @Body() body: { status: PedidoStatus; motivoRecusa?: string }
  ) {
    const pedido = pedidosStore.find(p => p.id === id);
    if (!pedido) {
      throw new NotFoundException('Pedido não encontrado');
    }
    pedido.status = body.status;
    pedido.motivoRecusa = body.status === 'cancelado' ? body.motivoRecusa || '' : undefined;
    return pedido;
  }
}
