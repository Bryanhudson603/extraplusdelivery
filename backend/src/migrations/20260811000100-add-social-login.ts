import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSocialLogin20260811000100 implements MigrationInterface {
  name = 'AddSocialLogin20260811000100';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      alter table if exists clientes
      add column if not exists email varchar(255);
    `);

    await queryRunner.query(`
      alter table if exists clientes
      alter column telefone drop not null;
    `);

    await queryRunner.query(`
      do $$
      begin
        if not exists (
          select 1 from pg_indexes where indexname = 'idx_clientes_email_unique'
        ) then
          create unique index idx_clientes_email_unique on clientes (lower(email)) where email is not null;
        end if;
      end
      $$;
    `);

    await queryRunner.query(`
      create table if not exists social_accounts (
        id uuid primary key,
        cliente_id uuid not null references clientes(id) on delete cascade,
        provider varchar(30) not null,
        provider_user_id varchar(255) not null,
        email varchar(255),
        criado_em timestamptz not null default now(),
        atualizado_em timestamptz not null default now(),
        unique (provider, provider_user_id),
        unique (cliente_id, provider)
      );
    `);

    await queryRunner.query(`create index if not exists idx_social_accounts_cliente on social_accounts(cliente_id);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`drop table if exists social_accounts;`);
    await queryRunner.query(`drop index if exists idx_clientes_email_unique;`);
    await queryRunner.query(`alter table if exists clientes drop column if exists email;`);
    // Nao reverte "telefone drop not null" para nao arriscar quebrar linhas
    // ja existentes sem telefone preenchido apos o deploy desta migration.
  }
}
