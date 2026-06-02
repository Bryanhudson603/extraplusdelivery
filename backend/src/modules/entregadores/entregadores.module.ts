import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EntregadorEntity } from '../../entities/entregador.entity';
import { LojaEntity } from '../../entities/loja.entity';
import { PedidoEntity } from '../../entities/pedido.entity';
import { EntregadorRepository } from '../../repositories/entregador.repository';
import { LojaRepository } from '../../repositories/loja.repository';
import { PedidoRepository } from '../../repositories/pedido.repository';
import { EntregadoresController } from './entregadores.controller';
import { EntregadoresService } from './entregadores.service';

@Module({
  imports: [TypeOrmModule.forFeature([LojaEntity, PedidoEntity, EntregadorEntity])],
  controllers: [EntregadoresController],
  providers: [EntregadoresService, LojaRepository, PedidoRepository, EntregadorRepository]
})
export class EntregadoresModule {}
