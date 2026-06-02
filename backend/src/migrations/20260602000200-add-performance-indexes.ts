import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPerformanceIndexes20260602000200 implements MigrationInterface {
  name = 'AddPerformanceIndexes20260602000200';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`create index if not exists idx_usuarios_username on usuarios(username);`);
    await queryRunner.query(`create index if not exists idx_clientes_telefone on clientes(telefone);`);
    await queryRunner.query(`create index if not exists idx_pedidos_status on pedidos(status);`);
    await queryRunner.query(`create index if not exists idx_pedidos_entregador_id on pedidos(entregador_id);`);
    await queryRunner.query(`create index if not exists idx_produtos_loja on produtos(loja_id);`);
    await queryRunner.query(`create index if not exists idx_clientes_loja on clientes(loja_id);`);
    await queryRunner.query(`create index if not exists idx_cupons_loja on cupons(loja_id);`);
    await queryRunner.query(`create index if not exists idx_entregadores_loja on entregadores(loja_id);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`drop index if exists idx_entregadores_loja;`);
    await queryRunner.query(`drop index if exists idx_cupons_loja;`);
    await queryRunner.query(`drop index if exists idx_clientes_loja;`);
    await queryRunner.query(`drop index if exists idx_produtos_loja;`);
    await queryRunner.query(`drop index if exists idx_pedidos_entregador_id;`);
    await queryRunner.query(`drop index if exists idx_pedidos_status;`);
    await queryRunner.query(`drop index if exists idx_clientes_telefone;`);
    await queryRunner.query(`drop index if exists idx_usuarios_username;`);
  }
}

