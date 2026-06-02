import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

export class CriarLojaDto {
  @IsString()
  @Length(1, 255)
  nome!: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  slug?: string;
}

export class AtualizarLojaDto {
  @IsOptional()
  @IsString()
  @Length(1, 255)
  nome?: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}

export class CriarAdminDto {
  @IsString()
  @Length(1, 100)
  username!: string;

  @IsString()
  @Length(4, 200)
  senha!: string;

  @IsString()
  @Length(1, 100)
  lojaId!: string;
}

export class CriarClienteDto {
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

  @IsString()
  @Length(1, 100)
  lojaId!: string;
}

export class AtualizarAdminDto {
  @IsOptional()
  @IsString()
  @Length(4, 200)
  senha?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  lojaId?: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}

export class AtualizarClienteDto {
  @IsOptional()
  @IsString()
  @Length(4, 200)
  senha?: string;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  endereco?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  lojaId?: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}

