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

@Entity({ name: 'clientes' })
export class ClienteEntity {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  nome!: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  telefone: string | null = null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null = null;

  @Column({ type: 'varchar', length: 255, name: 'senha_hash' })
  senhaHash!: string;

  @Column({ type: 'varchar', length: 255 })
  endereco!: string;

  @Column({ type: 'boolean', default: true })
  ativo!: boolean;

  @ManyToOne(() => LojaEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'loja_id' })
  loja!: LojaEntity;

  @Column({ type: 'varchar', length: 100, name: 'loja_id' })
  lojaId!: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'criado_em' })
  criadoEm!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'atualizado_em' })
  atualizadoEm!: Date;
}
