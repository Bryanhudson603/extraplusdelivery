create type tipo_usuario as enum ('cliente', 'admin', 'entregador');
create type status_usuario as enum ('ativo', 'bloqueado');
create type status_pedido as enum ('recebido', 'confirmado', 'em_separacao', 'saiu_para_entrega', 'finalizado', 'cancelado', 'aguardando_pagamento');
create type tipo_entrega as enum ('delivery', 'retirada');
create type forma_pagamento as enum ('pix', 'cartao_entrega', 'dinheiro', 'carteira');
create type status_pagamento as enum ('pendente', 'confirmado', 'cancelado', 'falhou');
create type tipo_promocao as enum ('happy_hour', 'dia_semana', 'estoque_alto', 'produto', 'combo');
create type tipo_desconto as enum ('percentual', 'valor', 'frete_gratis');
create type tipo_movimento_carteira as enum ('credito_cashback', 'debito_pagamento');
create type status_entrega as enum ('pendente', 'em_rota', 'entregue');
create type tag_destaque as enum ('promocao', 'mais_vendido', 'nenhum');

create table depositos (
  id uuid primary key default gen_random_uuid(),
  nome varchar(255) not null,
  slug varchar(100) not null unique,
  cnpj varchar(18),
  telefone varchar(20),
  endereco_texto varchar(255),
  horario_abertura time not null,
  horario_fechamento time not null,
  tempo_medio_entrega_minutos integer not null default 40,
  raio_entrega_km numeric(5,2) not null default 5,
  taxa_entrega_base numeric(10,2) not null default 0,
  cashback_percentual numeric(5,2) not null default 0,
  criado_em timestamp with time zone default now(),
  atualizado_em timestamp with time zone default now()
);

create table usuarios (
  id uuid primary key default gen_random_uuid(),
  deposito_id uuid references depositos(id),
  nome varchar(255) not null,
  email varchar(255) not null,
  telefone varchar(20),
  senha_hash varchar(255) not null,
  tipo tipo_usuario not null,
  status status_usuario not null default 'ativo',
  criado_em timestamp with time zone default now(),
  atualizado_em timestamp with time zone default now(),
  unique (deposito_id, email)
);

create table enderecos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references usuarios(id),
  deposito_id uuid references depositos(id),
  apelido varchar(100),
  rua varchar(255) not null,
  numero varchar(20) not null,
  complemento varchar(255),
  bairro varchar(100) not null,
  cidade varchar(100) not null,
  uf char(2) not null,
  cep varchar(10) not null,
  latitude numeric(9,6),
  longitude numeric(9,6),
  ativo boolean not null default true,
  criado_em timestamp with time zone default now()
);

create table categorias (
  id uuid primary key default gen_random_uuid(),
  deposito_id uuid not null references depositos(id),
  nome varchar(100) not null,
  slug varchar(100) not null,
  ordem integer not null default 0,
  criado_em timestamp with time zone default now(),
  unique (deposito_id, slug)
);

create table produtos (
  id uuid primary key default gen_random_uuid(),
  deposito_id uuid not null references depositos(id),
  categoria_id uuid not null references categorias(id),
  nome varchar(255) not null,
  descricao text,
  volume_ml integer not null,
  preco numeric(10,2) not null,
  preco_promocional numeric(10,2),
  preco_por_fardo numeric(10,2),
  quantidade_por_fardo integer,
  estoque_atual integer not null default 0,
  estoque_minimo integer not null default 0,
  ativo boolean not null default true,
  tag tag_destaque not null default 'nenhum',
  horario_inicio_venda time,
  horario_fim_venda time,
  criado_em timestamp with time zone default now(),
  atualizado_em timestamp with time zone default now()
);

create table promocoes (
  id uuid primary key default gen_random_uuid(),
  deposito_id uuid not null references depositos(id),
  nome varchar(255) not null,
  tipo tipo_promocao not null,
  regra jsonb not null,
  ativo boolean not null default true,
  vigencia_inicio timestamp with time zone,
  vigencia_fim timestamp with time zone,
  criado_em timestamp with time zone default now()
);

create table cupons (
  id uuid primary key default gen_random_uuid(),
  deposito_id uuid not null references depositos(id),
  codigo varchar(50) not null,
  descricao varchar(255),
  tipo tipo_desconto not null,
  valor_desconto numeric(10,2),
  percentual_desconto numeric(5,2),
  valor_minimo_pedido numeric(10,2),
  max_uso_por_cliente integer,
  total_max_uso integer,
  usos_totais integer not null default 0,
  valido_de timestamp with time zone,
  valido_ate timestamp with time zone,
  gerado_por_inatividade boolean not null default false,
  ativo boolean not null default true,
  criado_em timestamp with time zone default now(),
  unique (deposito_id, codigo)
);

create table cupons_clientes (
  id uuid primary key default gen_random_uuid(),
  cupom_id uuid not null references cupons(id),
  cliente_id uuid not null references usuarios(id),
  usos integer not null default 0,
  criado_em timestamp with time zone default now(),
  unique (cupom_id, cliente_id)
);

create table pedidos (
  id uuid primary key default gen_random_uuid(),
  deposito_id uuid not null references depositos(id),
  cliente_id uuid not null references usuarios(id),
  endereco_entrega_id uuid references enderecos(id),
  entregador_id uuid references usuarios(id),
  status status_pedido not null default 'aguardando_pagamento',
  tipo_entrega tipo_entrega not null,
  forma_pagamento forma_pagamento not null,
  valor_itens numeric(10,2) not null,
  valor_taxa_entrega numeric(10,2) not null default 0,
  valor_desconto numeric(10,2) not null default 0,
  valor_cashback_creditado numeric(10,2) not null default 0,
  valor_total numeric(10,2) not null,
  observacao_cliente text,
  observacao_interna text,
  cupom_id uuid references cupons(id),
  data_agendada timestamp with time zone,
  criado_em timestamp with time zone default now(),
  atualizado_em timestamp with time zone default now()
);

create table itens_pedido (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references pedidos(id) on delete cascade,
  produto_id uuid not null references produtos(id),
  nome_produto varchar(255) not null,
  volume_ml integer not null,
  quantidade integer not null,
  preco_unitario numeric(10,2) not null,
  preco_promocional numeric(10,2),
  observacao text
);

create table pagamentos (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references pedidos(id),
  tipo forma_pagamento not null,
  status status_pagamento not null default 'pendente',
  valor numeric(10,2) not null,
  qr_code_payload text,
  qr_code_imagem_url text,
  pix_txid varchar(255),
  criado_em timestamp with time zone default now(),
  confirmado_em timestamp with time zone
);

create table entregas (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references pedidos(id),
  entregador_id uuid not null references usuarios(id),
  status status_entrega not null default 'pendente',
  distancia_km numeric(6,2),
  tempo_previsto_minutos integer,
  tempo_real_minutos integer,
  saiu_em timestamp with time zone,
  entregue_em timestamp with time zone,
  criado_em timestamp with time zone default now()
);

create table carteiras_clientes (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references usuarios(id),
  saldo numeric(10,2) not null default 0,
  atualizado_em timestamp with time zone default now(),
  unique (cliente_id)
);

create table movimentos_carteira (
  id uuid primary key default gen_random_uuid(),
  carteira_id uuid not null references carteiras_clientes(id),
  pedido_id uuid references pedidos(id),
  tipo tipo_movimento_carteira not null,
  valor numeric(10,2) not null,
  descricao varchar(255),
  criado_em timestamp with time zone default now()
);

create table tokens_push (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references usuarios(id),
  deposito_id uuid references depositos(id),
  fcm_token text not null,
  plataforma varchar(20),
  ativo boolean not null default true,
  criado_em timestamp with time zone default now(),
  unique (usuario_id, fcm_token)
);

create table notificacoes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references usuarios(id),
  tipo varchar(50) not null,
  titulo varchar(255) not null,
  corpo text not null,
  dados jsonb,
  lido boolean not null default false,
  criado_em timestamp with time zone default now(),
  enviado_em timestamp with time zone
);

create table clientes_metricas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references usuarios(id),
  deposito_id uuid not null references depositos(id),
  total_pedidos integer not null default 0,
  valor_total numeric(12,2) not null default 0,
  ultima_compra_em timestamp with time zone,
  inativo_desde timestamp with time zone,
  criado_em timestamp with time zone default now(),
  atualizado_em timestamp with time zone default now(),
  unique (cliente_id, deposito_id)
);

