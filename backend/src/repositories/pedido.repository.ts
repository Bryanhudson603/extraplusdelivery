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
}
