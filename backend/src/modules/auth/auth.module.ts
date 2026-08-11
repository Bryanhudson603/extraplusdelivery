import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClienteEntity } from '../../entities/cliente.entity';
import { LojaEntity } from '../../entities/loja.entity';
import { SocialAccountEntity } from '../../entities/socialAccount.entity';
import { UsuarioEntity } from '../../entities/usuario.entity';
import { ClienteRepository } from '../../repositories/cliente.repository';
import { LojaRepository } from '../../repositories/loja.repository';
import { SocialAccountRepository } from '../../repositories/social-account.repository';
import { UsuarioRepository } from '../../repositories/usuario.repository';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleAuthController } from './google-auth.controller';
import { GoogleAuthService } from './google-auth.service';

@Module({
  imports: [TypeOrmModule.forFeature([LojaEntity, UsuarioEntity, ClienteEntity, SocialAccountEntity])],
  controllers: [AuthController, GoogleAuthController],
  providers: [
    AuthService,
    GoogleAuthService,
    LojaRepository,
    UsuarioRepository,
    ClienteRepository,
    SocialAccountRepository
  ],
  exports: [AuthService]
})
export class AuthModule {}
