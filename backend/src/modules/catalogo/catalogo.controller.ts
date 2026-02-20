import { Controller, Get } from '@nestjs/common';
import { listarProdutos } from './catalogo.store';

type Categoria = {
  id: string;
  nome: string;
  slug: string;
};

const categorias: Categoria[] = [
  { id: '1', nome: 'Cervejas', slug: 'cervejas' },
  { id: '2', nome: 'Refrigerantes', slug: 'refrigerantes' },
  { id: '3', nome: 'Energéticos', slug: 'energeticos' },
  { id: '4', nome: 'Destilados', slug: 'destilados' },
  { id: '5', nome: 'Combos', slug: 'combos' },
  { id: '6', nome: 'Outros', slug: 'outros' }
];

type ProdutoCliente = {
  id: string;
  name: string;
  image: string;
  price: number;
  promoPrice?: number;
  tags?: string[];
  categoryId?: string;
  packQuantity?: number;
  packPrice?: number;
};

@Controller('catalogo')
export class CatalogoController {
  @Get('categorias')
  listarCategorias() {
    return categorias;
  }

  @Get('produtos-mais-pedidos')
  listarProdutosMaisPedidos() {
    const todos = listarProdutos('pc-bebidas');
    const filtrados = todos.filter(p => p.active);
    const destaque = filtrados.filter(p => (p.tags || []).includes('mais_vendido'));
    const top = (destaque.length ? destaque : filtrados).slice(0, 4);
    const resposta: ProdutoCliente[] = top.map(p => ({
      id: p.id,
      name: p.name,
      image: p.imageUrl || '/placeholder.svg',
      price: p.price,
      promoPrice: p.promoPrice,
      tags: p.tags,
      categoryId: 'c6',
      packQuantity: p.packQuantity,
      packPrice: p.packPrice
    }));
    return resposta;
  }

  @Get('produtos')
  listarTodosProdutos(): ProdutoCliente[] {
    const todos = listarProdutos('pc-bebidas').filter(p => p.active);
    return todos.map(p => ({
      id: p.id,
      name: p.name,
      image: p.imageUrl || '/placeholder.svg',
      price: p.price,
      promoPrice: p.promoPrice,
      tags: p.tags,
      categoryId: 'c6',
      packQuantity: p.packQuantity,
      packPrice: p.packPrice
    }));
  }
}
