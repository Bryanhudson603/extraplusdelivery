import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClienteCarteiraEntity } from '../entities/clienteCarteira.entity';

@Injectable()
export class ClienteCarteiraRepository {
  constructor(
    @InjectRepository(ClienteCarteiraEntity)
    private readonly repo: Repository<ClienteCarteiraEntity>
  ) {}

  async findByKey(lojaId: string, clienteKey: string): Promise<ClienteCarteiraEntity | null> {
    const c = await this.repo.findOne({ where: { lojaId, clienteKey } });
    return c || null;
  }

  listByLoja(lojaId: string): Promise<ClienteCarteiraEntity[]> {
    return this.repo.find({ where: { lojaId } });
  }

  save(entity: ClienteCarteiraEntity): Promise<ClienteCarteiraEntity> {
    return this.repo.save(entity);
  }
}
