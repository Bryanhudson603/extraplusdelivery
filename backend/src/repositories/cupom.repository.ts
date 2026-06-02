import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CupomEntity } from '../entities/cupom.entity';

@Injectable()
export class CupomRepository {
  constructor(
    @InjectRepository(CupomEntity)
    private readonly repo: Repository<CupomEntity>
  ) {}

  listByLoja(lojaId: string): Promise<CupomEntity[]> {
    return this.repo.find({ where: { lojaId }, order: { criadoEm: 'DESC' } });
  }

  async findById(id: string): Promise<CupomEntity | null> {
    const c = await this.repo.findOne({ where: { id } });
    return c || null;
  }

  async findByCodigo(lojaId: string, codigo: string): Promise<CupomEntity | null> {
    const c = await this.repo.findOne({ where: { lojaId, codigo } });
    return c || null;
  }

  async findAtivoByCodigo(lojaId: string, codigo: string): Promise<CupomEntity | null> {
    const c = await this.repo.findOne({ where: { lojaId, codigo, ativo: true } });
    return c || null;
  }

  save(cupom: CupomEntity): Promise<CupomEntity> {
    return this.repo.save(cupom);
  }
}

