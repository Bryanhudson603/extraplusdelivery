import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import { RequireAuth } from '../../auth/require-auth.guard';
import { AtualizarClienteAdminDto } from './admin.dto';
import { AdminService } from './admin.service';

@Controller('clientes')
export class ClientSelfController {
  constructor(private readonly adminService: AdminService) {}

  @Get('me')
  @UseGuards(RequireAuth('cliente'))
  obterPerfil(@Req() req: any) {
    return this.adminService.obterClienteAutenticado(req);
  }

  @Put('me')
  @UseGuards(RequireAuth('cliente'))
  atualizarPerfil(@Req() req: any, @Body() body: AtualizarClienteAdminDto) {
    return this.adminService.atualizarPerfilClienteAutenticado(req, body);
  }

  @Get('me/cupons')
  @UseGuards(RequireAuth('cliente'))
  listarCupons(@Req() req: any) {
    return this.adminService.listarCuponsClienteAutenticado(req);
  }
}
