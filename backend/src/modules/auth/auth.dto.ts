import { IsString, Length } from 'class-validator';

export class AdminLoginDto {
  @IsString()
  @Length(1, 100)
  username!: string;

  @IsString()
  @Length(1, 200)
  password!: string;
}

export class ClienteLoginDto {
  @IsString()
  @Length(3, 30)
  telefone!: string;

  @IsString()
  @Length(1, 200)
  senha!: string;
}

export class RegistrarClienteDto {
  @IsString()
  @Length(1, 255)
  nome!: string;

  @IsString()
  @Length(3, 30)
  telefone!: string;

  @IsString()
  @Length(4, 200)
  senha!: string;

  @IsString()
  @Length(1, 255)
  endereco!: string;
}

export class PlatformLoginDto {
  @IsString()
  @Length(1, 100)
  username!: string;

  @IsString()
  @Length(1, 200)
  password!: string;
}

export type LojaDto = {
  id: string;
  nome: string;
  slug: string;
  ativo: boolean;
  criadoEm: string;
};

export type AdminLoginResponse = {
  tipo: 'admin';
  adminId: string;
  username: string;
  loja: LojaDto;
};

export type ClienteLoginResponse = {
  tipo: 'cliente';
  clienteId: string;
  telefone: string;
  nome: string;
  endereco: string;
  loja: LojaDto;
};

export type PlatformLoginResponse = {
  tipo: 'plataforma';
  adminId: string;
  username: string;
};
