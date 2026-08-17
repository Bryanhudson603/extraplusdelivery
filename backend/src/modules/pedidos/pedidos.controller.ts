import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { RequireAuth } from '../../auth/require-auth.guard';
import { PedidosService } from './pedidos.service';
import {
  AtualizarEntregadorPedidoDto,
  AtualizarStatusPedidoDto,
  CriarPedidoDto,
  ValidarCupomDto
} from './pedidos.dto';

@Controller('pedidos')
export class PedidosController {
  constructor(private readonly pedidosService: PedidosService) {}

  @Get()
  listar(@Req() req: any) {
    return this.pedidosService.listar(req);
  }

  @Get('meus')
  @UseGuards(RequireAuth('cliente'))
  listarMeus(@Req() req: any) {
    return this.pedidosService.listarMeus(req);
  }

  @Get('debug-meus')
  @UseGuards(RequireAuth('cliente'))
  debugMeus(@Req() req: any) {
    return this.pedidosService.debugMeus(req);
  }

  @Post()
  @Throttle({ default: { limit: 5, ttl: 60 } })
  criar(@Req() req: any, @Body() body: CriarPedidoDto) {
    return this.pedidosService.criar(req, body);
  }

  @Post('validar-cupom')
  validarCupom(@Req() req: any, @Body() body: ValidarCupomDto) {
    return this.pedidosService.validarCupom(req, body);
  }

  @Post(':id/entregador')
  @UseGuards(RequireAuth('admin'))
  atualizarEntregador(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: AtualizarEntregadorPedidoDto
  ) {
    return this.pedidosService.atualizarEntregador(req, id, body);
  }

  @Post(':id/status')
  @UseGuards(RequireAuth('admin'))
  atualizarStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: AtualizarStatusPedidoDto
  ) {
    return this.pedidosService.atualizarStatus(req, id, body);
  }
}
