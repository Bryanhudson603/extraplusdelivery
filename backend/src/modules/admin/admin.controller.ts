import { Body, Controller, Delete, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { RequireAuth } from '../../auth/require-auth.guard';
import {
  AdicionarSaldoCarteiraDto,
  AtualizarClienteAdminDto,
  AtualizarProdutoDto,
  CriarCupomDto,
  CriarOuAtualizarProdutoDto,
  EnviarCupomDto
} from './admin.dto';

@Controller('admin')
@UseGuards(RequireAuth('admin'))
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  dashboard(@Req() req: any) {
    return this.adminService.dashboard(req);
  }

  @Get('relatorios/dias')
  relatorioDias(@Req() req: any) {
    return this.adminService.relatorioDias(req);
  }

  @Get('clientes')
  listarClientes(@Req() req: any) {
    return this.adminService.listarClientes(req);
  }

  @Get('clientes/:id')
  obterCliente(@Req() req: any, @Param('id') id: string) {
    return this.adminService.obterCliente(req, id);
  }

  @Put('clientes/:id')
  atualizarCliente(@Req() req: any, @Param('id') id: string, @Body() body: AtualizarClienteAdminDto) {
    return this.adminService.atualizarCliente(req, id, body);
  }

  @Post('clientes/:id/carteira')
  adicionarSaldoCarteira(@Req() req: any, @Param('id') id: string, @Body() body: AdicionarSaldoCarteiraDto) {
    return this.adminService.adicionarSaldoCarteira(req, id, body);
  }

  @Get('clientes/:id/pedidos')
  listarPedidosCliente(@Req() req: any, @Param('id') id: string) {
    return this.adminService.listarPedidosCliente(req, id);
  }

  @Get('produtos')
  listarProdutos(@Req() req: any) {
    return this.adminService.listarProdutos(req);
  }

  @Get('cupons')
  listarCupons(@Req() req: any) {
    return this.adminService.listarCupons(req);
  }

  @Post('cupons')
  criarCupom(@Req() req: any, @Body() body: CriarCupomDto) {
    return this.adminService.criarCupom(req, body);
  }

  @Post('cupons/:codigo/enviar')
  enviarCupomParaClientes(@Req() req: any, @Param('codigo') codigo: string, @Body() body: EnviarCupomDto) {
    return this.adminService.enviarCupomParaClientes(req, codigo, body);
  }

  @Get('clientes/:id/cupons')
  listarCuponsDoCliente(@Req() req: any, @Param('id') id: string) {
    return this.adminService.listarCuponsDoCliente(req, id);
  }

  @Post('produtos')
  criarOuAtualizarProduto(@Req() req: any, @Body() body: CriarOuAtualizarProdutoDto) {
    return this.adminService.criarOuAtualizarProduto(req, body);
  }

  @Put('produtos/:id')
  atualizarProduto(@Req() req: any, @Param('id') id: string, @Body() body: AtualizarProdutoDto) {
    return this.adminService.atualizarProduto(req, id, body);
  }

  @Delete('produtos/:id')
  removerProduto(@Req() req: any, @Param('id') id: string) {
    return this.adminService.removerProduto(req, id);
  }
}
