import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn
} from 'typeorm';
import { ClienteEntity } from './cliente.entity';

@Entity({ name: 'social_accounts' })
export class SocialAccountEntity {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @ManyToOne(() => ClienteEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cliente_id' })
  cliente!: ClienteEntity;

  @Column({ type: 'uuid', name: 'cliente_id' })
  clienteId!: string;

  @Column({ type: 'varchar', length: 30 })
  provider!: string;

  @Column({ type: 'varchar', length: 255, name: 'provider_user_id' })
  providerUserId!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null = null;

  @CreateDateColumn({ type: 'timestamptz', name: 'criado_em' })
  criadoEm!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'atualizado_em' })
  atualizadoEm!: Date;
}
