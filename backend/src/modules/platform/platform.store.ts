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

export const lojasStore: Loja[] = [
  {
    id: 'dilbebidas',
    nome: 'Dilbebidas',
    slug: 'dilbebidas',
    ativo: true,
    criadoEm: new Date().toISOString()
  }
];

export const adminsStore: AdminUser[] = [
  {
    id: 'admin-1',
    username: 'bhnsilva',
    senha: 'Brasill1',
    lojaId: 'dilbebidas',
    ativo: true
  }
];

export const clientesStore: ClienteUser[] = [
  {
    id: 'cliente-1',
    nome: 'Cliente Exemplo',
    telefone: '82993107309',
    senha: '123456',
    endereco: 'Rua das Bebidas, 123',
    lojaId: 'dilbebidas',
    ativo: true
  }
];

export const platformAdminsStore: PlatformAdminUser[] = [
  {
    id: 'platform-1',
    username: 'master',
    senha: 'master123',
    ativo: true
  }
];
