import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { RequireAuth } from '../../auth/require-auth.guard';
import { AdminService } from './admin.service';

@Controller('clientes')
export class ClientSelfController {
  constructor(private readonly adminService: AdminService) {}

  @Get('me')
  @UseGuards(RequireAuth('cliente'))
  obterPerfil(@Req() req: any) {
    return this.adminService.obterClienteAutenticado(req);
  }

  @Get('me/cupons')
  @UseGuards(RequireAuth('cliente'))
  listarCupons(@Req() req: any) {
    return this.adminService.listarCuponsClienteAutenticado(req);
  }
}
