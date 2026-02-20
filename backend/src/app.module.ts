import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthModule } from './modules/health/health.module';
import { CatalogoModule } from './modules/catalogo/catalogo.module';
import { AdminModule } from './modules/admin/admin.module';
import { PedidosModule } from './modules/pedidos/pedidos.module';
import { AuthModule } from './modules/auth/auth.module';
import { EntregadoresModule } from './modules/entregadores/entregadores.module';

function createDatabaseModule() {
  if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_NAME) {
    return [];
  }

  return [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 5432),
      username: process.env.DB_USER,
      password: process.env.DB_PASS || '',
      database: process.env.DB_NAME,
      autoLoadEntities: true,
      synchronize: false
    })
  ];
}

@Module({
  imports: [
    ...createDatabaseModule(),
    HealthModule,
    CatalogoModule,
    AdminModule,
    PedidosModule,
    AuthModule,
    EntregadoresModule
  ]
})
export class AppModule {}
