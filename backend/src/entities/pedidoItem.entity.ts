import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { LojaEntity } from './loja.entity';
import { PedidoEntity } from './pedido.entity';
import { ProdutoEntity } from './produto.entity';

@Entity({ name: 'pedido_itens' })
export class PedidoItemEntity {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @ManyToOne(() => LojaEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'loja_id' })
  loja!: LojaEntity;

  @Column({ type: 'varchar', length: 100, name: 'loja_id' })
  lojaId!: string;

  @ManyToOne(() => PedidoEntity, p => p.itens, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pedido_id' })
  pedido!: PedidoEntity;

  @Column({ type: 'uuid', name: 'pedido_id' })
  pedidoId!: string;

  @ManyToOne(() => ProdutoEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'produto_id' })
  produto: ProdutoEntity | null = null;

  @Column({ type: 'varchar', length: 100, name: 'produto_id', nullable: true })
  produtoId: string | null = null;

  @Column({ type: 'varchar', length: 255, name: 'nome_produto' })
  nomeProduto!: string;

  @Column({ type: 'int' })
  quantidade!: number;

  @Column({ type: 'numeric', precision: 10, scale: 2, name: 'preco_unitario' })
  precoUnitario!: string;

  @Column({ type: 'numeric', precision: 10, scale: 2, name: 'preco_promocional', nullable: true })
  precoPromocional: string | null = null;
}
