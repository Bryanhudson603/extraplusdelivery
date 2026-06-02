import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EntregadorEntity } from '../entities/entregador.entity';

@Injectable()
export class EntregadorRepository {
  constructor(
    @InjectRepository(EntregadorEntity)
    private readonly repo: Repository<EntregadorEntity>
  ) {}

  listByLoja(lojaId: string): Promise<EntregadorEntity[]> {
    return this.repo.find({ where: { lojaId }, order: { nome: 'ASC' } });
  }

  async findById(id: string): Promise<EntregadorEntity | null> {
    const e = await this.repo.findOne({ where: { id } });
    return e || null;
  }

  async findAtivoById(lojaId: string, id: string): Promise<EntregadorEntity | null> {
    const e = await this.repo.findOne({ where: { lojaId, id, ativo: true } });
    return e || null;
  }

  save(entregador: EntregadorEntity): Promise<EntregadorEntity> {
    return this.repo.save(entregador);
  }
}

