import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriaEntity } from '../../entities/categoria.entity';
import { LojaEntity } from '../../entities/loja.entity';
import { ProdutoEntity } from '../../entities/produto.entity';
import { LojaRepository } from '../../repositories/loja.repository';
import { ProdutoRepository } from '../../repositories/produto.repository';
import { CatalogoController } from './catalogo.controller';
import { CatalogoService } from './catalogo.service';

@Module({
  imports: [TypeOrmModule.forFeature([LojaEntity, CategoriaEntity, ProdutoEntity])],
  controllers: [CatalogoController],
  providers: [CatalogoService, LojaRepository, ProdutoRepository]
})
export class CatalogoModule {}
