export type ProdutoLoja = {
  id: string;
  name: string;
  price: number;
  promoPrice?: number;
  stock: number;
  tags?: string[];
  active: boolean;
  imageUrl?: string;
  category?: string;
  volume?: string;
  packQuantity?: number;
  packPrice?: number;
};

export const produtosPorLoja: Record<string, ProdutoLoja[]> = {
  'pc-bebidas': []
};

export function listarProdutos(lojaId: string): ProdutoLoja[] {
  return produtosPorLoja[lojaId] || [];
}

export function salvarProduto(lojaId: string, produto: ProdutoLoja): ProdutoLoja {
  const lista = produtosPorLoja[lojaId] || (produtosPorLoja[lojaId] = []);
  const idx = lista.findIndex(p => p.id === produto.id);
  if (idx >= 0) {
    lista[idx] = produto;
  } else {
    lista.unshift(produto);
  }
  return produto;
}

export function excluirProduto(lojaId: string, id: string): void {
  const lista = produtosPorLoja[lojaId] || (produtosPorLoja[lojaId] = []);
  produtosPorLoja[lojaId] = lista.filter(p => p.id !== id);
}
