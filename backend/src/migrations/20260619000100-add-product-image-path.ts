import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductImagePath20260619000100 implements MigrationInterface {
  name = 'AddProductImagePath20260619000100';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      alter table if exists produtos
      add column if not exists image_url text;
    `);

    await queryRunner.query(`
      alter table if exists produtos
      add column if not exists image_path text;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      alter table if exists produtos
      drop column if exists image_path;
    `);
  }
}
