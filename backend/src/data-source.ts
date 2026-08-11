import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { CategoriaEntity } from './entities/categoria.entity';
import { ClienteCarteiraEntity } from './entities/clienteCarteira.entity';
import { ClienteEntity } from './entities/cliente.entity';
import { CupomClienteEntity } from './entities/cupomCliente.entity';
import { CupomEntity } from './entities/cupom.entity';
import { EntregadorEntity } from './entities/entregador.entity';
import { LojaEntity } from './entities/loja.entity';
import { PedidoItemEntity } from './entities/pedidoItem.entity';
import { PedidoEntity } from './entities/pedido.entity';
import { ProdutoEntity } from './entities/produto.entity';
import { SocialAccountEntity } from './entities/socialAccount.entity';
import { UsuarioEntity } from './entities/usuario.entity';
import { createDatabaseOptions } from './config/database.config';

const databaseOptions = createDatabaseOptions();

export const AppDataSource = new DataSource({
  ...databaseOptions,
  entities: [
    LojaEntity,
    UsuarioEntity,
    ClienteEntity,
    CategoriaEntity,
    ProdutoEntity,
    PedidoEntity,
    PedidoItemEntity,
    EntregadorEntity,
    CupomEntity,
    CupomClienteEntity,
    ClienteCarteiraEntity,
    SocialAccountEntity
  ],
  synchronize: false
});
