import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { resolveLojaId } from '../../common/resolve-loja-id';
import { EntregadorEntity } from '../../entities/entregador.entity';
import { EntregadorRepository } from '../../repositories/entregador.repository';
import { LojaRepository } from '../../repositories/loja.repository';
import { PedidoRepository } from '../../repositories/pedido.repository';

type CriarEntregadorDto = {
  nome: string;
  telefone?: string;
};

type AtualizarEntregadorDto = {
  nome?: string;
  telefone?: string;
  ativo?: boolean;
};

export type EntregadorDto = {
  id: string;
  nome: string;
  telefone?: string;
  ativo: boolean;
};

@Injectable()
export class EntregadoresService {
  constructor(
    private readonly lojaRepo: LojaRepository,
    private readonly entregadorRepo: EntregadorRepository,
    private readonly pedidoRepo: PedidoRepository
  ) {}

  private toDto(e: EntregadorEntity): EntregadorDto {
    return {
      id: e.id,
      nome: e.nome,
      telefone: e.telefone || undefined,
      ativo: e.ativo !== false
    };
  }

  async listar(req: { headers?: Record<string, unknown> }): Promise<EntregadorDto[]> {
    const lojaId = await resolveLojaId(req, this.lojaRepo);
    if (!lojaId) return [];
    const lista = await this.entregadorRepo.listByLoja(lojaId);
    return lista.map(e => this.toDto(e));
  }

  async criar(req: { headers?: Record<string, unknown> }, body: CriarEntregadorDto): Promise<EntregadorDto> {
    const lojaId = await resolveLojaId(req, this.lojaRepo);
    if (!lojaId) {
      throw new BadRequestException('Nenhuma loja ativa disponível.');
    }
    const nome = String(body.nome || '').trim() || 'Entregador';
    const telefone = body.telefone && String(body.telefone).trim() ? String(body.telefone).trim() : null;
    const novo = new EntregadorEntity();
    novo.id = randomUUID();
    novo.lojaId = lojaId;
    novo.nome = nome;
    novo.telefone = telefone;
    novo.ativo = true;
    const salvo = await this.entregadorRepo.save(novo);
    return this.toDto(salvo);
  }

  async atualizar(
    req: { headers?: Record<string, unknown> },
    id: string,
    body: AtualizarEntregadorDto
  ): Promise<EntregadorDto | null> {
    const lojaId = await resolveLojaId(req, this.lojaRepo);
    if (!lojaId) return null;
    const existente = await this.entregadorRepo.findById(id);
    if (!existente) return null;
    if (existente.lojaId !== lojaId) {
      // MULTI TENANT SECURITY CHECK
      throw new ForbiddenException();
    }

    if (body.nome !== undefined) {
      existente.nome = String(body.nome || '').trim() || existente.nome;
    }
    if (body.telefone !== undefined) {
      const texto = String(body.telefone || '').trim();
      existente.telefone = texto || null;
    }
    if (body.ativo !== undefined) {
      existente.ativo = !!body.ativo;
    }

    const salvo = await this.entregadorRepo.save(existente);
    return this.toDto(salvo);
  }

  async estatisticas(req: { headers?: Record<string, unknown> }): Promise<Array<{ entregadorId: string; nome: string; entregas: number }>> {
    const lojaId = await resolveLojaId(req, this.lojaRepo);
    if (!lojaId) return [];
    const [pedidos, entregadores] = await Promise.all([
      this.pedidoRepo.listByLoja(lojaId),
      this.entregadorRepo.listByLoja(lojaId)
    ]);
    const entregadorPorId: Record<string, string> = {};
    for (const e of entregadores) {
      entregadorPorId[e.id] = e.nome;
    }
    const mapa: Record<string, { entregadorId: string; nome: string; entregas: number }> = {};
    for (const pedido of pedidos) {
      const id = pedido.entregadorId || undefined;
      if (!id) continue;
      if (!mapa[id]) {
        mapa[id] = {
          entregadorId: id,
          nome: entregadorPorId[id] || pedido.entregadorNome || 'Entregador',
          entregas: 0
        };
      }
      mapa[id].entregas += 1;
    }
    return Object.values(mapa).sort((a, b) => b.entregas - a.entregas);
  }
}
