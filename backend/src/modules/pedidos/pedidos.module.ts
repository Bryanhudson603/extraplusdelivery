import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriaEntity } from '../../entities/categoria.entity';
import { ClienteEntity } from '../../entities/cliente.entity';
import { CupomClienteEntity } from '../../entities/cupomCliente.entity';
import { CupomEntity } from '../../entities/cupom.entity';
import { EntregadorEntity } from '../../entities/entregador.entity';
import { LojaEntity } from '../../entities/loja.entity';
import { PedidoItemEntity } from '../../entities/pedidoItem.entity';
import { PedidoEntity } from '../../entities/pedido.entity';
import { ProdutoEntity } from '../../entities/produto.entity';
import { ClienteRepository } from '../../repositories/cliente.repository';
import { CupomClienteRepository } from '../../repositories/cupom-cliente.repository';
import { CupomRepository } from '../../repositories/cupom.repository';
import { EntregadorRepository } from '../../repositories/entregador.repository';
import { LojaRepository } from '../../repositories/loja.repository';
import { PedidoItemRepository } from '../../repositories/pedido-item.repository';
import { PedidoRepository } from '../../repositories/pedido.repository';
import { ProdutoRepository } from '../../repositories/produto.repository';
import { PedidosController } from './pedidos.controller';
import { PedidosService } from './pedidos.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LojaEntity,
      CategoriaEntity,
      ClienteEntity,
      PedidoEntity,
      PedidoItemEntity,
      ProdutoEntity,
      EntregadorEntity,
      CupomEntity,
      CupomClienteEntity
    ])
  ],
  controllers: [PedidosController],
  providers: [
    PedidosService,
    LojaRepository,
    ClienteRepository,
    PedidoRepository,
    PedidoItemRepository,
    ProdutoRepository,
    EntregadorRepository,
    CupomRepository,
    CupomClienteRepository
  ]
})
export class PedidosModule {}
