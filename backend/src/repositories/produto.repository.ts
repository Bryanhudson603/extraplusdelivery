import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProdutoEntity } from '../entities/produto.entity';

@Injectable()
export class ProdutoRepository {
  constructor(
    @InjectRepository(ProdutoEntity)
    private readonly repo: Repository<ProdutoEntity>
  ) {}

  listAtivosByLoja(lojaId: string): Promise<ProdutoEntity[]> {
    return this.repo.find({ where: { lojaId, ativo: true }, order: { atualizadoEm: 'DESC' } });
  }

  listAllByLoja(lojaId: string): Promise<ProdutoEntity[]> {
    return this.repo.find({ where: { lojaId }, order: { atualizadoEm: 'DESC' } });
  }

  async findById(id: string): Promise<ProdutoEntity | null> {
    const produto = await this.repo.findOne({ where: { id } });
    return produto || null;
  }

  async findByNomeELoja(lojaId: string, nome: string): Promise<ProdutoEntity | null> {
    const produto = await this.repo
      .createQueryBuilder('produto')
      .where('produto.loja_id = :lojaId', { lojaId })
      .andWhere('LOWER(produto.nome) = LOWER(:nome)', { nome })
      .getOne();
    return produto || null;
  }

  save(produto: ProdutoEntity): Promise<ProdutoEntity> {
    return this.repo.save(produto);
  }

  async removeById(id: string): Promise<void> {
    await this.repo.delete({ id });
  }
}

