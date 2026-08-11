import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LojaEntity } from '../entities/loja.entity';

@Injectable()
export class LojaRepository {
  constructor(
    @InjectRepository(LojaEntity)
    private readonly repo: Repository<LojaEntity>
  ) {}

  listarAtivas(): Promise<LojaEntity[]> {
    return this.repo.find({
      where: { ativo: true },
      order: { criadoEm: 'DESC' }
    });
  }

  listarTodas(): Promise<LojaEntity[]> {
    return this.repo.find({ order: { criadoEm: 'DESC' } });
  }

  async obterPrimeiraAtiva(): Promise<LojaEntity | null> {
    const loja = await this.repo.findOne({
      where: { ativo: true },
      order: { criadoEm: 'DESC' }
    });
    return loja || null;
  }

  obterPorId(id: string): Promise<LojaEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  obterPorSlug(slug: string): Promise<LojaEntity | null> {
    return this.repo.findOne({ where: { slug } });
  }

  criar(loja: LojaEntity): Promise<LojaEntity> {
    return this.repo.save(loja);
  }

  salvar(loja: LojaEntity): Promise<LojaEntity> {
    return this.repo.save(loja);
  }

  async definirPedidosPausados(id: string, pausado: boolean): Promise<LojaEntity | null> {
    const loja = await this.obterPorId(id);
    if (!loja) return null;
    loja.pedidosPausados = pausado;
    return this.repo.save(loja);
  }
}

