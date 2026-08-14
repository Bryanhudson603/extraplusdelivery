import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLojaHorarios20260813000100 implements MigrationInterface {
  name = 'AddLojaHorarios20260813000100';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      alter table if exists lojas
      add column if not exists horario_funcionamento jsonb,
      add column if not exists horario_entrega jsonb;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      alter table if exists lojas
      drop column if exists horario_funcionamento,
      drop column if exists horario_entrega;
    `);
  }
}
