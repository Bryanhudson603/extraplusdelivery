import { Transform, Type } from 'class-transformer';
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

export class DefinirPedidosPausadosDto {
  @IsBoolean()
  pausado!: boolean;
}

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
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value.map(String);
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return [];
      if (trimmed.startsWith('[')) {
        try {
          const parsed = JSON.parse(trimmed);
          return Array.isArray(parsed) ? parsed.map(String) : [String(trimmed)];
        } catch {
          return trimmed
            .split(',')
            .map(item => item.trim())
            .filter(Boolean);
        }
      }
      return trimmed
        .split(',')
        .map(item => item.trim())
        .filter(Boolean);
    }
    return value;
  })
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @Transform(({ value }) => {
    if (value === true || value === 'true' || value === 1 || value === '1') return true;
    if (value === false || value === 'false' || value === 0 || value === '0') return false;
    return value;
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  imageUrl?: string;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  imagePath?: string;

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
