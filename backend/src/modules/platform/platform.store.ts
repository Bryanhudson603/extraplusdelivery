export type Loja = {
  id: string;
  nome: string;
  slug: string;
  ativo: boolean;
  criadoEm: string;
};

export type AdminUser = {
  id: string;
  username: string;
  senha: string;
  lojaId: string;
  ativo: boolean;
};

export type ClienteUser = {
  id: string;
  nome: string;
  telefone: string;
  senha: string;
  endereco: string;
  lojaId: string;
  ativo: boolean;
};

export type PlatformAdminUser = {
  id: string;
  username: string;
  senha: string;
  ativo: boolean;
};

export const lojasStore: Loja[] = [];

export const adminsStore: AdminUser[] = [];

export const clientesStore: ClienteUser[] = [];

export const platformAdminsStore: PlatformAdminUser[] = [
  {
    id: 'platform-1',
    username: 'bhnsilva',
    senha: 'Brasill1',
    ativo: true
  }
];
