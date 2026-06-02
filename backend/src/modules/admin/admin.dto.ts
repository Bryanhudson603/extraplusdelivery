import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min
} from 'class-validator';

export class AtualizarClienteAdminDto {
  @IsOptional()
  @IsString()
  @Length(1, 255)
  nome?: string;

  @IsOptional()
  @IsString()
  @Length(3, 30)
  telefone?: string;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  endereco?: string;
}

export class AdicionarSaldoCarteiraDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  valor!: number;
}

export class CriarCupomDto {
  @IsString()
  @Length(1, 255)
  nome!: string;

  @IsString()
  @Length(1, 50)
  codigo!: string;

  @IsOptional()
  @IsString()
  @Length(1, 40)
  validoDe?: string;

  @IsOptional()
  @IsString()
  @Length(1, 40)
  validoAte?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  usosPorCliente?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  quantidadeTotal?: number;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  descontoPercentual?: number;
}

export class EnviarCupomDto {
  @IsArray()
  @IsString({ each: true })
  clientes!: string[];
}

export class CriarOuAtualizarProdutoDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  id?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  promoPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  imageUrl?: string;

  @IsOptional()
  @IsString()
  @Length(0, 100)
  category?: string;

  @IsOptional()
  @IsString()
  @Length(0, 50)
  volume?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  packQuantity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  packPrice?: number;
}

export class AtualizarProdutoDto extends CriarOuAtualizarProdutoDto {}

