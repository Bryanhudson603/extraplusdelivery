import { Module } from '@nestjs/common';
import { PedidosController } from './pedidos.controller';

@Module({
  controllers: [PedidosController]
})
export class PedidosModule {}

