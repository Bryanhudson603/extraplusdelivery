export type Cupom = {
  id: string;
  nome: string;
  codigo: string;
  validoDe?: string;
  validoAte?: string;
  usosPorCliente?: number;
  quantidadeTotal?: number;
  quantidadeRestante?: number;
  ativo: boolean;
  descontoPercentual?: number;
};

export const cuponsStore: Cupom[] = [];
export const cuponsClientesStore: { codigo: string; clienteId: string; usos: number }[] = [];
