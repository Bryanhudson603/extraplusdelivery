import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { DiaHorario } from '../common/store-hours';

@Entity({ name: 'lojas' })
export class LojaEntity {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  nome!: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  slug!: string;

  @Column({ type: 'boolean', default: true })
  ativo!: boolean;

  @Column({ type: 'boolean', default: false, name: 'pedidos_pausados' })
  pedidosPausados!: boolean;

  @Column({ type: 'jsonb', nullable: true, name: 'horario_funcionamento' })
  horarioFuncionamento!: DiaHorario[] | null;

  @Column({ type: 'jsonb', nullable: true, name: 'horario_entrega' })
  horarioEntrega!: DiaHorario[] | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'criado_em' })
  criadoEm!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'atualizado_em' })
  atualizadoEm!: Date;
}
