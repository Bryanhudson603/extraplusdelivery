import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PedidoEntity } from '../entities/pedido.entity';

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

@Injectable()
export class PedidoRepository {
  constructor(
    @InjectRepository(PedidoEntity)
    private readonly repo: Repository<PedidoEntity>
  ) {}

  listByLoja(lojaId: string): Promise<PedidoEntity[]> {
    return this.repo.find({
      where: { lojaId },
      relations: { itens: true },
      order: { criadoEm: 'DESC' }
    });
  }

  async findById(id: string): Promise<PedidoEntity | null> {
    const pedido = await this.repo.findOne({
      where: { id },
      relations: { itens: true }
    });
    return pedido || null;
  }

  async findByIdAndLoja(id: string, lojaId: string): Promise<PedidoEntity | null> {
    const pedido = await this.repo.findOne({
      where: { id, lojaId },
      relations: { itens: true }
    });
    return pedido || null;
  }

  async listByCliente(lojaId: string, clienteId: string, telefone?: string): Promise<PedidoEntity[]> {
    const where: Array<{ lojaId: string; clienteId?: string; clienteTelefone?: string }> = [
      { lojaId, clienteId }
    ];
    if (telefone) {
      where.push({ lojaId, clienteTelefone: telefone });
    }

    return this.repo.find({
      where,
      relations: { itens: true },
      order: { criadoEm: 'DESC' }
    });
  }

  async existsClienteKeyInLoja(lojaId: string, clienteKey: string): Promise<boolean> {
    const key = String(clienteKey || '').trim();
    if (!key) return false;
    const where: Array<{ lojaId: string; clienteId?: string; clienteTelefone?: string }> = [
      { lojaId, clienteTelefone: key }
    ];

    if (isUuid(key)) {
      where.push({ lojaId, clienteId: key });
    }

    const count = await this.repo.count({ where });
    return count > 0;
  }

  save(pedido: PedidoEntity): Promise<PedidoEntity> {
    return this.repo.save(pedido);
  }

  listarTodos(): Promise<PedidoEntity[]> {
    return this.repo.find({ order: { criadoEm: 'DESC' } });
  }

  async removerPorIds(ids: string[]): Promise<number> {
    if (!ids || ids.length === 0) return 0;
    const result = await this.repo.createQueryBuilder().delete().from(PedidoEntity).whereInIds(ids).execute();
    return result.affected || 0;
  }

  async removerHistoricoDoCliente(lojaId: string, clienteId: string, telefone?: string): Promise<number> {
    let qb = this.repo.createQueryBuilder().delete().from(PedidoEntity).where('loja_id = :lojaId', { lojaId });

    qb = telefone
      ? qb.andWhere('(cliente_id = :clienteId OR cliente_telefone = :telefone)', { clienteId, telefone })
      : qb.andWhere('cliente_id = :clienteId', { clienteId });

    const result = await qb.execute();
    return result.affected || 0;
  }
}
