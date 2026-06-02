import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOperational20260602000100 implements MigrationInterface {
  name = 'AddOperational20260602000100';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      create table if not exists entregadores (
        id uuid primary key,
        loja_id varchar(100) not null references lojas(id) on delete cascade,
        nome varchar(255) not null,
        telefone varchar(30),
        ativo boolean not null default true,
        criado_em timestamptz not null default now(),
        atualizado_em timestamptz not null default now()
      );
    `);

    await queryRunner.query(`
      create table if not exists clientes_carteira (
        loja_id varchar(100) not null references lojas(id) on delete cascade,
        cliente_key varchar(100) not null,
        saldo numeric(10,2) not null default 0,
        criado_em timestamptz not null default now(),
        atualizado_em timestamptz not null default now(),
        primary key (loja_id, cliente_key)
      );
    `);

    await queryRunner.query(`
      create table if not exists cupons (
        id varchar(100) primary key,
        loja_id varchar(100) not null references lojas(id) on delete cascade,
        nome varchar(255) not null,
        codigo varchar(50) not null,
        valido_de timestamptz,
        valido_ate timestamptz,
        usos_por_cliente int,
        quantidade_total int,
        quantidade_restante int,
        ativo boolean not null default true,
        desconto_percentual numeric(5,2),
        criado_em timestamptz not null default now(),
        atualizado_em timestamptz not null default now(),
        unique (loja_id, codigo)
      );
    `);

    await queryRunner.query(`
      create table if not exists cupons_clientes (
        id uuid primary key,
        loja_id varchar(100) not null references lojas(id) on delete cascade,
        codigo varchar(50) not null,
        cliente_key varchar(100) not null,
        usos int not null default 0,
        unique (loja_id, codigo, cliente_key),
        foreign key (loja_id, codigo) references cupons(loja_id, codigo) on delete cascade
      );
    `);

    await queryRunner.query(`
      alter table pedido_itens
      add column if not exists loja_id varchar(100);
    `);

    await queryRunner.query(`
      update pedido_itens pi
      set loja_id = p.loja_id
      from pedidos p
      where pi.pedido_id = p.id
        and pi.loja_id is null;
    `);

    await queryRunner.query(`
      alter table pedido_itens
      alter column loja_id set not null;
    `);

    await queryRunner.query(`
      do $$
      begin
        if not exists (
          select 1
          from pg_constraint
          where conname = 'fk_pedido_itens_loja'
        ) then
          alter table pedido_itens
          add constraint fk_pedido_itens_loja
          foreign key (loja_id) references lojas(id) on delete cascade;
        end if;
      end
      $$;
    `);

    await queryRunner.query(`create index if not exists idx_entregadores_loja on entregadores(loja_id);`);
    await queryRunner.query(`create index if not exists idx_clientes_carteira_loja on clientes_carteira(loja_id);`);
    await queryRunner.query(`create index if not exists idx_cupons_loja on cupons(loja_id);`);
    await queryRunner.query(`create index if not exists idx_cupons_clientes_loja on cupons_clientes(loja_id);`);
    await queryRunner.query(`create index if not exists idx_pedido_itens_loja on pedido_itens(loja_id);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`alter table if exists pedido_itens drop constraint if exists fk_pedido_itens_loja;`);
    await queryRunner.query(`alter table if exists pedido_itens drop column if exists loja_id;`);
    await queryRunner.query(`drop table if exists cupons_clientes;`);
    await queryRunner.query(`drop table if exists cupons;`);
    await queryRunner.query(`drop table if exists clientes_carteira;`);
    await queryRunner.query(`drop table if exists entregadores;`);
  }
}
