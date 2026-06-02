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
import { UsuarioEntity } from './entities/usuario.entity';

const url = process.env.DATABASE_URL;

export const AppDataSource = new DataSource({
  type: 'postgres',
  url,
  host: !url ? process.env.DB_HOST : undefined,
  port: !url ? Number(process.env.DB_PORT || 5432) : undefined,
  username: !url ? process.env.DB_USER : undefined,
  password: !url ? process.env.DB_PASS || '' : undefined,
  database: !url ? process.env.DB_NAME : undefined,
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
    ClienteCarteiraEntity
  ],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false
});
