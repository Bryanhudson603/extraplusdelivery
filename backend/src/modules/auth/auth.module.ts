import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClienteEntity } from '../../entities/cliente.entity';
import { LojaEntity } from '../../entities/loja.entity';
import { UsuarioEntity } from '../../entities/usuario.entity';
import { ClienteRepository } from '../../repositories/cliente.repository';
import { LojaRepository } from '../../repositories/loja.repository';
import { UsuarioRepository } from '../../repositories/usuario.repository';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [TypeOrmModule.forFeature([LojaEntity, UsuarioEntity, ClienteEntity])],
  controllers: [AuthController],
  providers: [AuthService, LojaRepository, UsuarioRepository, ClienteRepository],
  exports: [AuthService]
})
export class AuthModule {}
