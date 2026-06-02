import { Body, Controller, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { RequireAuth } from '../../auth/require-auth.guard';
import { AtualizarEntregadorDto, CriarEntregadorDto } from './entregadores.dto';
import { EntregadoresService } from './entregadores.service';

@Controller('admin/entregadores')
@UseGuards(RequireAuth('admin'))
export class EntregadoresController {
  constructor(private readonly entregadoresService: EntregadoresService) {}

  @Get()
  listar(@Req() req: any) {
    return this.entregadoresService.listar(req);
  }

  @Post()
  criar(@Req() req: any, @Body() body: CriarEntregadorDto) {
    return this.entregadoresService.criar(req, body);
  }

  @Put(':id')
  atualizar(@Req() req: any, @Param('id') id: string, @Body() body: AtualizarEntregadorDto) {
    return this.entregadoresService.atualizar(req, id, body);
  }

  @Get('estatisticas')
  estatisticas(@Req() req: any) {
    return this.entregadoresService.estatisticas(req);
  }
}
