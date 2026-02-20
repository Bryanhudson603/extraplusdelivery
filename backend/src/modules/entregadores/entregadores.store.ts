export type Entregador = {
  id: string;
  nome: string;
  telefone?: string;
  ativo: boolean;
};

export const entregadoresStore: Entregador[] = [];

