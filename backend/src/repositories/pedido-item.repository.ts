import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PedidoItemEntity } from '../entities/pedidoItem.entity';

@Injectable()
export class PedidoItemRepository {
  constructor(
    @InjectRepository(PedidoItemEntity)
    private readonly repo: Repository<PedidoItemEntity>
  ) {}

  saveMany(items: PedidoItemEntity[]): Promise<PedidoItemEntity[]> {
    return this.repo.save(items);
  }
}
