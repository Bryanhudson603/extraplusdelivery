import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn
} from 'typeorm';
import { LojaEntity } from './loja.entity';

@Entity({ name: 'cupons' })
export class CupomEntity {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  id!: string;

  @ManyToOne(() => LojaEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'loja_id' })
  loja!: LojaEntity;

  @Column({ type: 'varchar', length: 100, name: 'loja_id' })
  lojaId!: string;

  @Column({ type: 'varchar', length: 255 })
  nome!: string;

  @Column({ type: 'varchar', length: 50 })
  codigo!: string;

  @Column({ type: 'timestamptz', name: 'valido_de', nullable: true })
  validoDe: Date | null = null;

  @Column({ type: 'timestamptz', name: 'valido_ate', nullable: true })
  validoAte: Date | null = null;

  @Column({ type: 'int', name: 'usos_por_cliente', nullable: true })
  usosPorCliente: number | null = null;

  @Column({ type: 'int', name: 'quantidade_total', nullable: true })
  quantidadeTotal: number | null = null;

  @Column({ type: 'int', name: 'quantidade_restante', nullable: true })
  quantidadeRestante: number | null = null;

  @Column({ type: 'boolean', default: true })
  ativo!: boolean;

  @Column({ type: 'numeric', precision: 5, scale: 2, name: 'desconto_percentual', nullable: true })
  descontoPercentual: string | null = null;

  @CreateDateColumn({ type: 'timestamptz', name: 'criado_em' })
  criadoEm!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'atualizado_em' })
  atualizadoEm!: Date;
}

