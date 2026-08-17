import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { PlatformService } from './platform.service';
import { RequireAuth } from '../../auth/require-auth.guard';
import {
  ApagarPedidosDto,
  AtualizarAdminDto,
  AtualizarClienteDto,
  AtualizarLojaDto,
  CriarAdminDto,
  CriarClienteDto,
  CriarLojaDto
} from './platform.dto';

@Controller('platform')
@UseGuards(RequireAuth('plataforma'))
export class PlatformController {
  constructor(private readonly platformService: PlatformService) {}

  @Get('lojas')
  listarLojas() {
    return this.platformService.listarLojas();
  }

  @Post('lojas')
  criarLoja(@Body() body: CriarLojaDto) {
    return this.platformService.criarLoja(body);
  }

  @Put('lojas/:id')
  atualizarLoja(@Param('id') id: string, @Body() body: AtualizarLojaDto) {
    return this.platformService.atualizarLoja(id, body);
  }

  @Get('usuarios')
  listarUsuarios() {
    return this.platformService.listarUsuarios();
  }

  @Post('usuarios/admin')
  criarAdmin(@Body() body: CriarAdminDto) {
    return this.platformService.criarAdmin(body);
  }

  @Post('usuarios/cliente')
  criarCliente(@Body() body: CriarClienteDto) {
    return this.platformService.criarCliente(body);
  }

  @Put('usuarios/admin/:id')
  atualizarAdmin(@Param('id') id: string, @Body() body: AtualizarAdminDto) {
    return this.platformService.atualizarAdmin(id, body);
  }

  @Put('usuarios/cliente/:id')
  atualizarCliente(@Param('id') id: string, @Body() body: AtualizarClienteDto) {
    return this.platformService.atualizarCliente(id, body);
  }

  @Delete('usuarios/cliente/:id/pedidos')
  apagarHistoricoPedidosCliente(@Param('id') id: string) {
    return this.platformService.apagarHistoricoPedidosCliente(id);
  }

  @Delete('usuarios/cliente/:id')
  excluirCliente(@Param('id') id: string) {
    return this.platformService.excluirCliente(id);
  }

  @Get('pedidos')
  listarPedidos() {
    return this.platformService.listarPedidos();
  }

  @Post('pedidos/apagar')
  apagarPedidos(@Body() body: ApagarPedidosDto) {
    return this.platformService.apagarPedidos(body.ids);
  }
}
