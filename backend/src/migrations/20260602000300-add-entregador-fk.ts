import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEntregadorFk20260602000300 implements MigrationInterface {
  name = 'AddEntregadorFk20260602000300';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      update pedidos p
      set entregador_id = null
      where p.entregador_id is not null
        and not exists (select 1 from entregadores e where e.id = p.entregador_id);
    `);

    await queryRunner.query(`
      do $$
      begin
        if not exists (
          select 1
          from pg_constraint
          where conname = 'fk_pedidos_entregador'
        ) then
          alter table pedidos
          add constraint fk_pedidos_entregador
          foreign key (entregador_id) references entregadores(id) on delete set null;
        end if;
      end
      $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`alter table if exists pedidos drop constraint if exists fk_pedidos_entregador;`);
  }
}

