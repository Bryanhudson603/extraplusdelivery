import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLojaPedidosPausados20260811120000 implements MigrationInterface {
  name = 'AddLojaPedidosPausados20260811120000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      alter table if exists lojas
      add column if not exists pedidos_pausados boolean not null default false;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`alter table if exists lojas drop column if exists pedidos_pausados;`);
  }
}
