import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogoModule } from './modules/catalogo/catalogo.module';
import { AdminModule } from './modules/admin/admin.module';
import { PedidosModule } from './modules/pedidos/pedidos.module';
import { AuthModule } from './modules/auth/auth.module';
import { EntregadoresModule } from './modules/entregadores/entregadores.module';
import { PlatformModule } from './modules/platform/platform.module';
import { createDatabaseOptions, hasDatabaseConfig } from './config/database.config';
import { StorageModule } from './storage/storage.module';

function createDatabaseModule() {
  if (hasDatabaseConfig()) {
    return [TypeOrmModule.forRoot(createDatabaseOptions())];
  }

  return [];
}

@Module({
  imports: [
    ...createDatabaseModule(),
    ThrottlerModule.forRoot([{ ttl: 60, limit: 120 }]),
    CatalogoModule,
    AdminModule,
    PedidosModule,
    AuthModule,
    EntregadoresModule,
    PlatformModule,
    StorageModule
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }]
})
export class AppModule {}
