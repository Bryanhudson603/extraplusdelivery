import { Module } from '@nestjs/common';
import { EntregadoresController } from './entregadores.controller';

@Module({
  controllers: [EntregadoresController]
})
export class EntregadoresModule {}

