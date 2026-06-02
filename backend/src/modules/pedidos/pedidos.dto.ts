import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Min,
  ValidateNested
} from 'class-validator';

export type FormaPagamento = 'pix' | 'cartao_entrega' | 'dinheiro' | 'carteira';
export type TipoEntrega = 'delivery' | 'retirada';

export class PedidoItemDto {
  @IsString()
  @Length(1, 100)
  productId!: string;

  @IsString()
  @Length(1, 255)
  name!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  quantity!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice!: number;
}

export class CriarPedidoDto {
  @IsString()
  @IsIn(['delivery', 'retirada'])
  tipoEntrega!: TipoEntrega;

  @IsString()
  @IsIn(['pix', 'cartao_entrega', 'dinheiro', 'carteira'])
  formaPagamento!: FormaPagamento;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PedidoItemDto)
  itens!: PedidoItemDto[];

  @IsOptional()
  @IsString()
  @Length(0, 500)
  observacaoCliente?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  trocoPara?: number;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  clienteId?: string;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  clienteNome?: string;

  @IsOptional()
  @IsString()
  @Length(1, 30)
  clienteTelefone?: string;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  clienteEndereco?: string;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  cupomCodigo?: string;

  @IsOptional()
  @IsBoolean()
  usarCarteira?: boolean;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  entregadorId?: string;
}

export class AtualizarEntregadorPedidoDto {
  @IsString()
  @Length(1, 50)
  entregadorId!: string;
}

export class AtualizarStatusPedidoDto {
  @IsString()
  @Length(1, 40)
  status!: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  motivoRecusa?: string;
}

export type PedidoResponse = {
  id: string;
  status: string;
  tipoEntrega: TipoEntrega;
  formaPagamento: FormaPagamento;
  total: number;
  createdAt: string;
  items: { name: string; quantity: number }[];
  trocoPara?: number;
  troco?: number;
  pix?: { qrCodePayload: string };
  motivoRecusa?: string;
  clienteId?: string;
  clienteNome?: string;
  clienteTelefone?: string;
  clienteEndereco?: string;
  entregadorId?: string;
  entregadorNome?: string;
};
