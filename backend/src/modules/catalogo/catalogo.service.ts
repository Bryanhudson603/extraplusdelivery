import { Injectable } from '@nestjs/common';
import { resolveLojaId } from '../../common/resolve-loja-id';
import { LojaRepository } from '../../repositories/loja.repository';
import { ProdutoRepository } from '../../repositories/produto.repository';

type Categoria = {
  id: string;
  nome: string;
  slug: string;
};

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

const categoriasFallback: Categoria[] = [
  { id: '1', nome: 'Cervejas', slug: 'cervejas' },
  { id: '2', nome: 'Refrigerantes', slug: 'refrigerantes' },
  { id: '3', nome: 'Energéticos', slug: 'energeticos' },
  { id: '4', nome: 'Destilados', slug: 'destilados' },
  { id: '5', nome: 'Combos', slug: 'combos' },
  { id: '6', nome: 'Outros', slug: 'outros' }
];

@Injectable()
export class CatalogoService {
  constructor(
    private readonly lojaRepo: LojaRepository,
    private readonly produtoRepo: ProdutoRepository
  ) {}

  listarCategorias(): Categoria[] {
    return categoriasFallback;
  }

  private toProdutoCliente(p: any): ProdutoCliente {
    return {
      id: p.id,
      name: p.nome,
      image: p.imageUrl || '/placeholder.svg',
      price: Number(p.preco ?? 0),
      promoPrice: p.precoPromocional != null ? Number(p.precoPromocional) : undefined,
      tags: Array.isArray(p.tags) ? p.tags : [],
      categoryId: 'c6',
      packQuantity: p.packQuantity != null ? Number(p.packQuantity) : undefined,
      packPrice: p.packPrice != null ? Number(p.packPrice) : undefined
    };
  }

  async listarProdutos(req: { headers?: Record<string, unknown> }): Promise<ProdutoCliente[]> {
    const lojaId = await resolveLojaId(req, this.lojaRepo);
    if (!lojaId) return [];
    const lista = await this.produtoRepo.listAtivosByLoja(lojaId);
    return lista.map(p => this.toProdutoCliente(p));
  }

  async listarProdutosMaisPedidos(req: { headers?: Record<string, unknown> }): Promise<ProdutoCliente[]> {
    const lojaId = await resolveLojaId(req, this.lojaRepo);
    if (!lojaId) return [];
    const lista = await this.produtoRepo.listAtivosByLoja(lojaId);
    const destaque = lista.filter(p => (p.tags || []).includes('mais_vendido'));
    const top = (destaque.length ? destaque : lista).slice(0, 4);
    return top.map(p => this.toProdutoCliente(p));
  }
}
