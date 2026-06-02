import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, UpdateDateColumn, CreateDateColumn } from 'typeorm';
import { LojaEntity } from './loja.entity';

@Entity({ name: 'clientes_carteira' })
export class ClienteCarteiraEntity {
  @ManyToOne(() => LojaEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'loja_id' })
  loja!: LojaEntity;

  @PrimaryColumn({ type: 'varchar', length: 100, name: 'loja_id' })
  lojaId!: string;

  @PrimaryColumn({ type: 'varchar', length: 100, name: 'cliente_key' })
  clienteKey!: string;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 })
  saldo!: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'criado_em' })
  criadoEm!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'atualizado_em' })
  atualizadoEm!: Date;
}

