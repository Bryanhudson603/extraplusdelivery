import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CategoriaEntity } from '../entities/categoria.entity';

@Injectable()
export class CategoriaRepository {
  constructor(
    @InjectRepository(CategoriaEntity)
    private readonly repo: Repository<CategoriaEntity>
  ) {}

  listByLoja(lojaId: string): Promise<CategoriaEntity[]> {
    return this.repo.find({ where: { lojaId, ativo: true }, order: { ordem: 'ASC' } });
  }

  async findById(id: string): Promise<CategoriaEntity | null> {
    const categoria = await this.repo.findOne({ where: { id } });
    return categoria || null;
  }

  save(categoria: CategoriaEntity): Promise<CategoriaEntity> {
    return this.repo.save(categoria);
  }
}

