import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriaEntity } from '../../entities/categoria.entity';
import { ClienteEntity } from '../../entities/cliente.entity';
import { ClienteCarteiraEntity } from '../../entities/clienteCarteira.entity';
import { CupomClienteEntity } from '../../entities/cupomCliente.entity';
import { CupomEntity } from '../../entities/cupom.entity';
import { LojaEntity } from '../../entities/loja.entity';
import { PedidoItemEntity } from '../../entities/pedidoItem.entity';
import { PedidoEntity } from '../../entities/pedido.entity';
import { ProdutoEntity } from '../../entities/produto.entity';
import { ClienteRepository } from '../../repositories/cliente.repository';
import { ClienteCarteiraRepository } from '../../repositories/cliente-carteira.repository';
import { CupomClienteRepository } from '../../repositories/cupom-cliente.repository';
import { CupomRepository } from '../../repositories/cupom.repository';
import { LojaRepository } from '../../repositories/loja.repository';
import { PedidoRepository } from '../../repositories/pedido.repository';
import { ProdutoRepository } from '../../repositories/produto.repository';
import { StorageModule } from '../../storage/storage.module';
import { AdminController } from './admin.controller';
import { ClientSelfController } from './client-self.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LojaEntity,
      CategoriaEntity,
      ClienteEntity,
      PedidoEntity,
      PedidoItemEntity,
      ProdutoEntity,
      CupomEntity,
      CupomClienteEntity,
      ClienteCarteiraEntity
    ]),
    StorageModule
  ],
  controllers: [AdminController, ClientSelfController],
  providers: [
    AdminService,
    LojaRepository,
    ClienteRepository,
    PedidoRepository,
    ProdutoRepository,
    CupomRepository,
    CupomClienteRepository,
    ClienteCarteiraRepository
  ]
})
export class AdminModule {}
