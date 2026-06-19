import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriaEntity } from '../../entities/categoria.entity';
import { ClienteCarteiraEntity } from '../../entities/clienteCarteira.entity';
import { CupomClienteEntity } from '../../entities/cupomCliente.entity';
import { CupomEntity } from '../../entities/cupom.entity';
import { LojaEntity } from '../../entities/loja.entity';
import { PedidoItemEntity } from '../../entities/pedidoItem.entity';
import { PedidoEntity } from '../../entities/pedido.entity';
import { ProdutoEntity } from '../../entities/produto.entity';
import { ClienteCarteiraRepository } from '../../repositories/cliente-carteira.repository';
import { CupomClienteRepository } from '../../repositories/cupom-cliente.repository';
import { CupomRepository } from '../../repositories/cupom.repository';
import { LojaRepository } from '../../repositories/loja.repository';
import { PedidoRepository } from '../../repositories/pedido.repository';
import { ProdutoRepository } from '../../repositories/produto.repository';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LojaEntity,
      CategoriaEntity,
      PedidoEntity,
      PedidoItemEntity,
      ProdutoEntity,
      CupomEntity,
      CupomClienteEntity,
      ClienteCarteiraEntity
    ])
  ],
  controllers: [AdminController],
  providers: [
    AdminService,
    LojaRepository,
    PedidoRepository,
    ProdutoRepository,
    CupomRepository,
    CupomClienteRepository,
    ClienteCarteiraRepository
  ]
})
export class AdminModule {}
