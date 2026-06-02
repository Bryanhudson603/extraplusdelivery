import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { resolveLojaId } from '../../common/resolve-loja-id';
import { ClienteCarteiraEntity } from '../../entities/clienteCarteira.entity';
import { PedidoEntity } from '../../entities/pedido.entity';
import { PedidoItemEntity } from '../../entities/pedidoItem.entity';
import { ClienteCarteiraRepository } from '../../repositories/cliente-carteira.repository';
import { CupomClienteRepository } from '../../repositories/cupom-cliente.repository';
import { CupomRepository } from '../../repositories/cupom.repository';
import { EntregadorRepository } from '../../repositories/entregador.repository';
import { LojaRepository } from '../../repositories/loja.repository';
import { PedidoItemRepository } from '../../repositories/pedido-item.repository';
import { PedidoRepository } from '../../repositories/pedido.repository';
import { ProdutoRepository } from '../../repositories/produto.repository';
import type { CriarPedidoDto, FormaPagamento, PedidoResponse, TipoEntrega } from './pedidos.dto';

@Injectable()
export class PedidosService {
  constructor(
    private readonly lojaRepo: LojaRepository,
    private readonly pedidoRepo: PedidoRepository,
    private readonly pedidoItemRepo: PedidoItemRepository,
    private readonly produtoRepo: ProdutoRepository,
    private readonly entregadorRepo: EntregadorRepository,
    private readonly cupomRepo: CupomRepository,
    private readonly cupomClienteRepo: CupomClienteRepository,
    private readonly carteiraRepo: ClienteCarteiraRepository
  ) {}

  private toResponse(p: PedidoEntity): PedidoResponse {
    return {
      id: p.id,
      status: p.status,
      tipoEntrega: p.tipoEntrega as TipoEntrega,
      formaPagamento: p.formaPagamento as FormaPagamento,
      total: Number(p.total),
      createdAt: p.criadoEm.toISOString(),
      items: (p.itens || []).map(it => ({ name: it.nomeProduto, quantity: it.quantidade })),
      trocoPara: p.trocoPara != null ? Number(p.trocoPara) : undefined,
      troco: p.troco != null ? Number(p.troco) : undefined,
      pix: p.pixPayload ? { qrCodePayload: p.pixPayload } : undefined,
      motivoRecusa: p.motivoRecusa || undefined,
      clienteId: p.clienteId || undefined,
      clienteNome: p.clienteNome || undefined,
      clienteTelefone: p.clienteTelefone || undefined,
      clienteEndereco: p.clienteEndereco || undefined,
      entregadorId: p.entregadorId || undefined,
      entregadorNome: p.entregadorNome || undefined
    };
  }

  async listar(req: { headers?: Record<string, unknown> }): Promise<PedidoResponse[]> {
    const lojaId = await resolveLojaId(req, this.lojaRepo);
    if (!lojaId) return [];
    const pedidos = await this.pedidoRepo.listByLoja(lojaId);
    return pedidos.map(p => this.toResponse(p));
  }

  async criar(req: { headers?: Record<string, unknown> }, body: CriarPedidoDto): Promise<PedidoResponse> {
    const lojaId = await resolveLojaId(req, this.lojaRepo);
    if (!lojaId) {
      throw new BadRequestException('Nenhuma loja ativa disponível.');
    }

    const totalBruto = (body.itens || []).reduce((sum, it) => sum + it.unitPrice * it.quantity, 0);
    let desconto = 0;

    if (body.cupomCodigo) {
      const codigo = String(body.cupomCodigo).trim().toUpperCase();
      const cupom = await this.cupomRepo.findAtivoByCodigo(lojaId, codigo);
      const agora = Date.now();
      const dentroJanela =
        !!cupom &&
        (!cupom.validoDe || cupom.validoDe.getTime() <= agora) &&
        (!cupom.validoAte || cupom.validoAte.getTime() >= agora);
      const clienteKeys = [body.clienteId, body.clienteTelefone].map(v => String(v || '')).filter(Boolean);
      const atribuicao =
        !!cupom &&
        (body.clienteId || body.clienteTelefone) &&
        (await this.cupomClienteRepo.findByAnyClienteKey(lojaId, codigo, clienteKeys));
      const usosOk =
        !!cupom && !!atribuicao && (cupom.usosPorCliente == null || atribuicao.usos < cupom.usosPorCliente);
      if (cupom && dentroJanela && atribuicao && usosOk && cupom.descontoPercentual) {
        desconto = Number(((totalBruto * Number(cupom.descontoPercentual)) / 100).toFixed(2));
        atribuicao.usos += 1;
        await this.cupomClienteRepo.save(atribuicao);
      }
    }

    const total = Math.max(0, Number((totalBruto - desconto).toFixed(2)));
    const chaveCarteira = body.clienteId || body.clienteTelefone;
    let usadoCarteira = 0;

    if (body.formaPagamento === 'carteira') {
      if (!chaveCarteira) {
        throw new BadRequestException('Cliente não identificado para pagamento com carteira.');
      }
      const carteira = await this.carteiraRepo.findByKey(lojaId, chaveCarteira);
      if (!carteira || Number(carteira.saldo) < total) {
        throw new BadRequestException('Saldo insuficiente na carteira.');
      }
      carteira.saldo = Number((Number(carteira.saldo) - total).toFixed(2)).toFixed(2);
      await this.carteiraRepo.save(carteira);
      usadoCarteira = total;
    } else if (body.usarCarteira && chaveCarteira) {
      const carteira = await this.carteiraRepo.findByKey(lojaId, chaveCarteira);
      if (carteira && Number(carteira.saldo) > 0) {
        const aplicavel = Math.min(Number(carteira.saldo), total);
        carteira.saldo = Number((Number(carteira.saldo) - aplicavel).toFixed(2)).toFixed(2);
        await this.carteiraRepo.save(carteira);
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
      const entregador = await this.entregadorRepo.findAtivoById(lojaId, body.entregadorId);
      if (entregador) entregadorNome = entregador.nome;
    }

    const pedido = new PedidoEntity();
    pedido.id = randomUUID();
    pedido.lojaId = lojaId;
    pedido.status = body.formaPagamento === 'pix' ? 'aguardando_pagamento' : 'recebido';
    pedido.tipoEntrega = body.tipoEntrega;
    pedido.formaPagamento = body.formaPagamento;
    pedido.total = total.toFixed(2);
    pedido.trocoPara = trocoPara != null ? trocoPara.toFixed(2) : null;
    pedido.troco = troco != null ? troco.toFixed(2) : null;
    pedido.pixPayload = body.formaPagamento === 'pix' ? `PIX:EXTRAPLUS:${pedido.id}:${total.toFixed(2)}` : null;
    pedido.motivoRecusa = null;
    pedido.clienteId = body.clienteId || null;
    pedido.clienteNome = body.clienteNome || null;
    pedido.clienteTelefone = body.clienteTelefone || null;
    pedido.clienteEndereco = body.clienteEndereco || null;
    pedido.entregadorId = body.entregadorId || null;
    pedido.entregadorNome = entregadorNome || null;

    const salvo = await this.pedidoRepo.save(pedido);

    const itens = (body.itens || []).map(it => {
      const item = new PedidoItemEntity();
      item.id = randomUUID();
      item.lojaId = lojaId;
      item.pedidoId = salvo.id;
      item.produtoId = null;
      item.nomeProduto = it.name;
      item.quantidade = it.quantity;
      item.precoUnitario = Number(it.unitPrice).toFixed(2);
      item.precoPromocional = null;
      return item;
    });

    await this.pedidoItemRepo.saveMany(itens);

    for (const item of body.itens || []) {
      const produto = await this.produtoRepo.findById(item.productId);
      if (!produto) continue;
      if (produto.lojaId !== lojaId) continue;
      const novoEstoque = produto.estoqueAtual - item.quantity;
      produto.estoqueAtual = novoEstoque > 0 ? novoEstoque : 0;
      await this.produtoRepo.save(produto);
    }

    if (chaveCarteira) {
      const cashbackValor = Number((total * 0.01).toFixed(2));
      if (cashbackValor > 0) {
        let carteira = await this.carteiraRepo.findByKey(lojaId, chaveCarteira);
        if (!carteira) {
          carteira = new ClienteCarteiraEntity();
          carteira.lojaId = lojaId;
          carteira.clienteKey = chaveCarteira;
          carteira.saldo = '0.00';
        }
        carteira.saldo = Number((Number(carteira.saldo) + cashbackValor).toFixed(2)).toFixed(2);
        await this.carteiraRepo.save(carteira);
      }
    }

    const completo = await this.pedidoRepo.findById(salvo.id);
    if (!completo) {
      throw new NotFoundException('Pedido não encontrado');
    }
    return this.toResponse(completo);
  }

  async atualizarEntregador(
    req: { headers?: Record<string, unknown> },
    id: string,
    body: { entregadorId: string }
  ) {
    const pedido = await this.pedidoRepo.findById(id);
    if (!pedido) {
      throw new NotFoundException('Pedido não encontrado');
    }
    const lojaId = await resolveLojaId(req, this.lojaRepo);
    if (!lojaId) throw new ForbiddenException();
    if (pedido.lojaId !== lojaId) {
      // MULTI TENANT SECURITY CHECK
      throw new ForbiddenException();
    }
    const entregador = await this.entregadorRepo.findAtivoById(pedido.lojaId, body.entregadorId);
    if (!entregador) {
      throw new BadRequestException('Entregador não encontrado');
    }
    pedido.entregadorId = entregador.id;
    pedido.entregadorNome = entregador.nome;
    const salvo = await this.pedidoRepo.save(pedido);
    return this.toResponse(salvo);
  }

  async atualizarStatus(
    req: { headers?: Record<string, unknown> },
    id: string,
    body: { status: string; motivoRecusa?: string }
  ) {
    const pedido = await this.pedidoRepo.findById(id);
    if (!pedido) {
      throw new NotFoundException('Pedido não encontrado');
    }
    const lojaId = await resolveLojaId(req, this.lojaRepo);
    if (!lojaId) throw new ForbiddenException();
    if (pedido.lojaId !== lojaId) {
      // MULTI TENANT SECURITY CHECK
      throw new ForbiddenException();
    }
    pedido.status = body.status;
    pedido.motivoRecusa = body.status === 'cancelado' ? body.motivoRecusa || '' : null;
    const salvo = await this.pedidoRepo.save(pedido);
    return this.toResponse(salvo);
  }
}
