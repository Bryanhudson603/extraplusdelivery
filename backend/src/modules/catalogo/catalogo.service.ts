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
  category?: string;
  packQuantity?: number;
  packPrice?: number;
};

const categoriasFallback: Categoria[] = [
  { id: '1', nome: 'Cervejas', slug: 'cervejas' },
  { id: '2', nome: 'Refrigerantes', slug: 'refrigerantes' },
  { id: '3', nome: 'Gelos', slug: 'gelos' },
  { id: '4', nome: 'Energéticos', slug: 'energeticos' },
  { id: '5', nome: 'Vinhos', slug: 'vinhos' },
  { id: '6', nome: 'Destilados', slug: 'destilados' },
  { id: '7', nome: 'Combos', slug: 'combos' },
  { id: '8', nome: 'Outros', slug: 'outros' }
];

// IDs alinhados com as categorias fixas usadas no app do cliente (frontend/src/lib/data.ts)
const CATEGORY_ID_POR_NOME: Record<string, string> = {
  cervejas: 'c1',
  refrigerantes: 'c2',
  gelos: 'c3',
  energeticos: 'c4',
  vinhos: 'c5',
  destilados: 'c6',
  combos: 'c7',
  outros: 'c8'
};

function normalizarNomeCategoria(valor: string): string {
  return valor
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function resolverCategoryId(categoriaNome: unknown): string {
  const nome = typeof categoriaNome === 'string' ? normalizarNomeCategoria(categoriaNome) : '';
  return CATEGORY_ID_POR_NOME[nome] || 'c8';
}

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
      categoryId: resolverCategoryId(p.categoriaNome),
      category: p.categoriaNome || undefined,
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
