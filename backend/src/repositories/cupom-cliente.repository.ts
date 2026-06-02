import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CupomClienteEntity } from '../entities/cupomCliente.entity';

@Injectable()
export class CupomClienteRepository {
  constructor(
    @InjectRepository(CupomClienteEntity)
    private readonly repo: Repository<CupomClienteEntity>
  ) {}

  async findByClienteKey(lojaId: string, codigo: string, clienteKey: string): Promise<CupomClienteEntity | null> {
    const c = await this.repo.findOne({ where: { lojaId, codigo, clienteKey } });
    return c || null;
  }

  async findByAnyClienteKey(
    lojaId: string,
    codigo: string,
    clienteKeys: string[]
  ): Promise<CupomClienteEntity | null> {
    const keys = (clienteKeys || []).map(String).filter(Boolean);
    if (keys.length === 0) return null;
    const c = await this.repo.findOne({ where: { lojaId, codigo, clienteKey: In(keys) } });
    return c || null;
  }

  listByClienteKey(lojaId: string, clienteKey: string): Promise<CupomClienteEntity[]> {
    return this.repo.find({ where: { lojaId, clienteKey } });
  }

  async existsByClienteKey(lojaId: string, clienteKey: string): Promise<boolean> {
    const count = await this.repo.count({ where: { lojaId, clienteKey } });
    return count > 0;
  }

  save(entity: CupomClienteEntity): Promise<CupomClienteEntity> {
    return this.repo.save(entity);
  }

  saveMany(entities: CupomClienteEntity[]): Promise<CupomClienteEntity[]> {
    return this.repo.save(entities);
  }
}
