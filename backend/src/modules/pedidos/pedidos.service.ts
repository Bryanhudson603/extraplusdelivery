import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { getNeighborhoodDeliveryFee } from '../../common/delivery';
import { estaDentroDoHorario } from '../../common/store-hours';
import { resolveLojaId } from '../../common/resolve-loja-id';
import { CupomClienteEntity } from '../../entities/cupomCliente.entity';
import { PedidoEntity } from '../../entities/pedido.entity';
import { PedidoItemEntity } from '../../entities/pedidoItem.entity';
import { CupomClienteRepository } from '../../repositories/cupom-cliente.repository';
import { CupomRepository } from '../../repositories/cupom.repository';
import { EntregadorRepository } from '../../repositories/entregador.repository';
import { LojaRepository } from '../../repositories/loja.repository';
import { PedidoItemRepository } from '../../repositories/pedido-item.repository';
import { PedidoRepository } from '../../repositories/pedido.repository';
import { ProdutoRepository } from '../../repositories/produto.repository';
import type { CriarPedidoDto, FormaPagamento, PedidoResponse, TipoEntrega, ValidarCupomDto } from './pedidos.dto';

@Injectable()
export class PedidosService {
  constructor(
    private readonly lojaRepo: LojaRepository,
    private readonly pedidoRepo: PedidoRepository,
    private readonly pedidoItemRepo: PedidoItemRepository,
    private readonly produtoRepo: ProdutoRepository,
    private readonly entregadorRepo: EntregadorRepository,
    private readonly cupomRepo: CupomRepository,
    private readonly cupomClienteRepo: CupomClienteRepository
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

  private async avaliarCupom(
    lojaId: string,
    body: { cupomCodigo?: string; clienteId?: string; clienteTelefone?: string }
  ): Promise<{
    codigo: string;
    valido: boolean;
    mensagem: string;
    descontoPercentual?: number;
    descontoValor?: number;
    atribuicao?: CupomClienteEntity | null;
    clienteKeys: string[];
  }> {
    const codigo = String(body.cupomCodigo || '').trim().toUpperCase();
    if (!codigo) {
      return { codigo: '', valido: false, mensagem: 'Informe um cupom.' , clienteKeys: [] };
    }

    const cupom = await this.cupomRepo.findAtivoByCodigo(lojaId, codigo);
    if (!cupom) {
      return { codigo, valido: false, mensagem: 'Cupom não encontrado ou inativo.', clienteKeys: [] };
    }

    const agora = Date.now();
    const dentroJanela =
      (!cupom.validoDe || cupom.validoDe.getTime() <= agora) &&
      (!cupom.validoAte || cupom.validoAte.getTime() >= agora);
    if (!dentroJanela) {
      return { codigo, valido: false, mensagem: 'Cupom fora do período de validade.', clienteKeys: [] };
    }

    if (cupom.quantidadeRestante != null && cupom.quantidadeRestante <= 0) {
      return { codigo, valido: false, mensagem: 'Cupom indisponível no momento.', clienteKeys: [] };
    }

    const clienteKeys = [body.clienteId, body.clienteTelefone].map(v => String(v || '').trim()).filter(Boolean);
    const atribuicao =
      clienteKeys.length > 0
        ? await this.cupomClienteRepo.findByAnyClienteKey(lojaId, codigo, clienteKeys)
        : null;

    if (atribuicao && cupom.usosPorCliente != null && atribuicao.usos >= cupom.usosPorCliente) {
      return { codigo, valido: false, mensagem: 'Limite de uso deste cupom já foi atingido.', atribuicao, clienteKeys };
    }

    return {
      codigo,
      valido: true,
      mensagem: cupom.descontoPercentual
        ? `Cupom aplicado com ${cupom.descontoPercentual}% de desconto.`
        : 'Cupom válido.',
      descontoPercentual:
        cupom.descontoPercentual != null ? Number(cupom.descontoPercentual) : undefined,
      atribuicao,
      clienteKeys
    };
  }

  async validarCupom(
    req: { headers?: Record<string, unknown> },
    body: ValidarCupomDto
  ): Promise<{ valido: boolean; codigo: string; mensagem: string; descontoPercentual?: number }> {
    const lojaId = await resolveLojaId(req, this.lojaRepo);
    if (!lojaId) {
      throw new BadRequestException('Nenhuma loja ativa disponível.');
    }

    const avaliacao = await this.avaliarCupom(lojaId, {
      cupomCodigo: body.codigo,
      clienteId: body.clienteId,
      clienteTelefone: body.clienteTelefone
    });

    return {
      valido: avaliacao.valido,
      codigo: avaliacao.codigo,
      mensagem: avaliacao.mensagem,
      descontoPercentual: avaliacao.descontoPercentual
    };
  }

  async criar(req: { headers?: Record<string, unknown> }, body: CriarPedidoDto): Promise<PedidoResponse> {
    const lojaId = await resolveLojaId(req, this.lojaRepo);
    if (!lojaId) {
      throw new BadRequestException('Nenhuma loja ativa disponível.');
    }

    const loja = await this.lojaRepo.obterPorId(lojaId);
    if (loja?.pedidosPausados) {
      throw new BadRequestException({
        code: 'PEDIDOS_PAUSADOS',
        message: 'Estamos com o recebimento de pedidos pausado no momento. Voltamos em breve!'
      });
    }

    if (!estaDentroDoHorario(loja?.horarioFuncionamento)) {
      throw new BadRequestException({
        code: 'LOJA_FECHADA',
        message: 'A loja está fechada no momento. Confira nosso horário de funcionamento.'
      });
    }

    if (body.tipoEntrega === 'delivery' && !estaDentroDoHorario(loja?.horarioEntrega)) {
      throw new BadRequestException({
        code: 'FORA_HORARIO_ENTREGA',
        message: 'Não estamos realizando entregas neste horário. Você pode retirar no local.'
      });
    }

    const subtotal = (body.itens || []).reduce((sum, it) => sum + it.unitPrice * it.quantity, 0);
    const taxaEntregaCalculada = getNeighborhoodDeliveryFee(body.clienteEndereco, body.tipoEntrega);
    const taxaEntregaInformada = typeof body.taxaEntrega === 'number' ? Number(body.taxaEntrega) : taxaEntregaCalculada;
    const taxaEntrega = Math.max(taxaEntregaCalculada, taxaEntregaInformada);
    const totalBruto = Number((subtotal + taxaEntrega).toFixed(2));
    let desconto = 0;

    if (body.cupomCodigo) {
      const avaliacao = await this.avaliarCupom(lojaId, body);
      if (avaliacao.valido && avaliacao.descontoPercentual) {
        desconto = Number(((totalBruto * Number(avaliacao.descontoPercentual)) / 100).toFixed(2));

        if (avaliacao.clienteKeys.length > 0) {
          const atribuicao = avaliacao.atribuicao || new CupomClienteEntity();
          if (!avaliacao.atribuicao) {
            atribuicao.id = randomUUID();
            atribuicao.lojaId = lojaId;
            atribuicao.codigo = avaliacao.codigo;
            atribuicao.clienteKey = avaliacao.clienteKeys[0];
            atribuicao.usos = 0;
          }
          atribuicao.usos += 1;
          await this.cupomClienteRepo.save(atribuicao);
        }
      } else if (body.cupomCodigo) {
        throw new BadRequestException(avaliacao.mensagem);
      }
    }

    const total = Math.max(0, Number((totalBruto - desconto).toFixed(2)));
    const totalRestante = total;
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
