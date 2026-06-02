import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PedidoEntity } from '../entities/pedido.entity';

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
    const count = await this.repo.count({
      where: [
        { lojaId, clienteId: key as any },
        { lojaId, clienteTelefone: key }
      ]
    });
    return count > 0;
  }

  save(pedido: PedidoEntity): Promise<PedidoEntity> {
    return this.repo.save(pedido);
  }
}
