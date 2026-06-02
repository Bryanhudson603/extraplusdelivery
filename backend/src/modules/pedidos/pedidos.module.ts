import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClienteCarteiraEntity } from '../../entities/clienteCarteira.entity';
import { CupomClienteEntity } from '../../entities/cupomCliente.entity';
import { CupomEntity } from '../../entities/cupom.entity';
import { EntregadorEntity } from '../../entities/entregador.entity';
import { LojaEntity } from '../../entities/loja.entity';
import { PedidoItemEntity } from '../../entities/pedidoItem.entity';
import { PedidoEntity } from '../../entities/pedido.entity';
import { ProdutoEntity } from '../../entities/produto.entity';
import { ClienteCarteiraRepository } from '../../repositories/cliente-carteira.repository';
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
      PedidoEntity,
      PedidoItemEntity,
      ProdutoEntity,
      EntregadorEntity,
      CupomEntity,
      CupomClienteEntity,
      ClienteCarteiraEntity
    ])
  ],
  controllers: [PedidosController],
  providers: [
    PedidosService,
    LojaRepository,
    PedidoRepository,
    PedidoItemRepository,
    ProdutoRepository,
    EntregadorRepository,
    CupomRepository,
    CupomClienteRepository,
    ClienteCarteiraRepository
  ]
})
export class PedidosModule {}
