import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn
} from 'typeorm';
import { ClienteEntity } from './cliente.entity';
import { LojaEntity } from './loja.entity';
import { PedidoItemEntity } from './pedidoItem.entity';

@Entity({ name: 'pedidos' })
export class PedidoEntity {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @ManyToOne(() => LojaEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'loja_id' })
  loja!: LojaEntity;

  @Column({ type: 'varchar', length: 100, name: 'loja_id' })
  lojaId!: string;

  @ManyToOne(() => ClienteEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'cliente_id' })
  cliente: ClienteEntity | null = null;

  @Column({ type: 'uuid', name: 'cliente_id', nullable: true })
  clienteId: string | null = null;

  @Column({ type: 'varchar', length: 30, name: 'cliente_telefone', nullable: true })
  clienteTelefone: string | null = null;

  @Column({ type: 'varchar', length: 255, name: 'cliente_nome', nullable: true })
  clienteNome: string | null = null;

  @Column({ type: 'varchar', length: 255, name: 'cliente_endereco', nullable: true })
  clienteEndereco: string | null = null;

  @Column({ type: 'varchar', length: 40 })
  status!: string;

  @Column({ type: 'varchar', length: 20, name: 'tipo_entrega' })
  tipoEntrega!: string;

  @Column({ type: 'varchar', length: 20, name: 'forma_pagamento' })
  formaPagamento!: string;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  total!: string;

  @Column({ type: 'numeric', precision: 10, scale: 2, name: 'troco_para', nullable: true })
  trocoPara: string | null = null;

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  troco: string | null = null;

  @Column({ type: 'text', name: 'pix_payload', nullable: true })
  pixPayload: string | null = null;

  @Column({ type: 'text', name: 'motivo_recusa', nullable: true })
  motivoRecusa: string | null = null;

  @Column({ type: 'uuid', name: 'entregador_id', nullable: true })
  entregadorId: string | null = null;

  @Column({ type: 'varchar', length: 255, name: 'entregador_nome', nullable: true })
  entregadorNome: string | null = null;

  @OneToMany(() => PedidoItemEntity, (it: PedidoItemEntity) => it.pedido, { cascade: false })
  itens: PedidoItemEntity[] = [];

  @CreateDateColumn({ type: 'timestamptz', name: 'criado_em' })
  criadoEm!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'atualizado_em' })
  atualizadoEm!: Date;
}
