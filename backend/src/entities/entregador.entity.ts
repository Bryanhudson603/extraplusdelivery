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

@Entity({ name: 'entregadores' })
export class EntregadorEntity {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @ManyToOne(() => LojaEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'loja_id' })
  loja!: LojaEntity;

  @Column({ type: 'varchar', length: 100, name: 'loja_id' })
  lojaId!: string;

  @Column({ type: 'varchar', length: 255 })
  nome!: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  telefone: string | null = null;

  @Column({ type: 'boolean', default: true })
  ativo!: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'criado_em' })
  criadoEm!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'atualizado_em' })
  atualizadoEm!: Date;
}

