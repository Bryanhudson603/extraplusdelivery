import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitCore20260601000100 implements MigrationInterface {
  name = 'InitCore20260601000100';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      create table if not exists lojas (
        id varchar(100) primary key,
        nome varchar(255) not null,
        slug varchar(100) not null unique,
        ativo boolean not null default true,
        criado_em timestamptz not null default now(),
        atualizado_em timestamptz not null default now()
      );
    `);

    await queryRunner.query(`
      create table if not exists usuarios (
        id uuid primary key,
        loja_id varchar(100) not null references lojas(id) on delete cascade,
        username varchar(100) not null,
        senha_hash varchar(255) not null,
        ativo boolean not null default true,
        criado_em timestamptz not null default now(),
        atualizado_em timestamptz not null default now(),
        unique (loja_id, username)
      );
    `);

    await queryRunner.query(`
      create table if not exists clientes (
        id uuid primary key,
        loja_id varchar(100) not null references lojas(id) on delete cascade,
        nome varchar(255) not null,
        telefone varchar(30) not null,
        senha_hash varchar(255) not null,
        endereco varchar(255) not null,
        ativo boolean not null default true,
        criado_em timestamptz not null default now(),
        atualizado_em timestamptz not null default now(),
        unique (loja_id, telefone)
      );
    `);

    await queryRunner.query(`
      create table if not exists categorias (
        id varchar(100) primary key,
        loja_id varchar(100) not null references lojas(id) on delete cascade,
        nome varchar(100) not null,
        slug varchar(100) not null,
        ordem int not null default 0,
        ativo boolean not null default true,
        criado_em timestamptz not null default now(),
        atualizado_em timestamptz not null default now(),
        unique (loja_id, slug)
      );
    `);

    await queryRunner.query(`
      create table if not exists produtos (
        id varchar(100) primary key,
        loja_id varchar(100) not null references lojas(id) on delete cascade,
        categoria_id varchar(100) references categorias(id) on delete set null,
        nome varchar(255) not null,
        categoria_nome varchar(100),
        descricao text,
        preco numeric(10,2) not null,
        preco_promocional numeric(10,2),
        estoque_atual int not null default 0,
        tags text[] not null default '{}',
        ativo boolean not null default true,
        image_url text,
        volume varchar(50),
        pack_quantity int,
        pack_price numeric(10,2),
        criado_em timestamptz not null default now(),
        atualizado_em timestamptz not null default now()
      );
    `);

    await queryRunner.query(`
      create table if not exists pedidos (
        id uuid primary key,
        loja_id varchar(100) not null references lojas(id) on delete cascade,
        cliente_id uuid references clientes(id) on delete set null,
        cliente_telefone varchar(30),
        cliente_nome varchar(255),
        cliente_endereco varchar(255),
        status varchar(40) not null,
        tipo_entrega varchar(20) not null,
        forma_pagamento varchar(20) not null,
        total numeric(10,2) not null,
        troco_para numeric(10,2),
        troco numeric(10,2),
        pix_payload text,
        motivo_recusa text,
        entregador_id uuid,
        entregador_nome varchar(255),
        criado_em timestamptz not null default now(),
        atualizado_em timestamptz not null default now()
      );
    `);

    await queryRunner.query(`
      create table if not exists pedido_itens (
        id uuid primary key,
        pedido_id uuid not null references pedidos(id) on delete cascade,
        produto_id varchar(100) references produtos(id) on delete set null,
        nome_produto varchar(255) not null,
        quantidade int not null,
        preco_unitario numeric(10,2) not null,
        preco_promocional numeric(10,2)
      );
    `);

    await queryRunner.query(`create index if not exists idx_produtos_loja on produtos(loja_id);`);
    await queryRunner.query(`create index if not exists idx_pedidos_loja on pedidos(loja_id);`);
    await queryRunner.query(`create index if not exists idx_pedidos_criado_em on pedidos(criado_em);`);
    await queryRunner.query(`create index if not exists idx_pedido_itens_pedido on pedido_itens(pedido_id);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`drop table if exists pedido_itens;`);
    await queryRunner.query(`drop table if exists pedidos;`);
    await queryRunner.query(`drop table if exists produtos;`);
    await queryRunner.query(`drop table if exists categorias;`);
    await queryRunner.query(`drop table if exists clientes;`);
    await queryRunner.query(`drop table if exists usuarios;`);
    await queryRunner.query(`drop table if exists lojas;`);
  }
}
