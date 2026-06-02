import { Controller, Get, Req } from '@nestjs/common';
import { CatalogoService } from './catalogo.service';

@Controller('catalogo')
export class CatalogoController {
  constructor(private readonly catalogoService: CatalogoService) {}

  @Get('categorias')
  listarCategorias() {
    return this.catalogoService.listarCategorias();
  }

  @Get('produtos-mais-pedidos')
  listarProdutosMaisPedidos(@Req() req: any) {
    return this.catalogoService.listarProdutosMaisPedidos(req);
  }

  @Get('produtos')
  listarTodosProdutos(@Req() req: any) {
    return this.catalogoService.listarProdutos(req);
  }
}
