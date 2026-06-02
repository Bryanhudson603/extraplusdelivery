import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

export class CriarEntregadorDto {
  @IsString()
  @Length(1, 255)
  nome!: string;

  @IsOptional()
  @IsString()
  @Length(3, 30)
  telefone?: string;
}

export class AtualizarEntregadorDto {
  @IsOptional()
  @IsString()
  @Length(1, 255)
  nome?: string;

  @IsOptional()
  @IsString()
  @Length(0, 30)
  telefone?: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}

