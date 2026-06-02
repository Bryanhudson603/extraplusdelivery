import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn
} from 'typeorm';
import { CategoriaEntity } from './categoria.entity';
import { LojaEntity } from './loja.entity';

@Entity({ name: 'produtos' })
export class ProdutoEntity {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  id!: string;

  @ManyToOne(() => LojaEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'loja_id' })
  loja!: LojaEntity;

  @Column({ type: 'varchar', length: 100, name: 'loja_id' })
  lojaId!: string;

  @ManyToOne(() => CategoriaEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'categoria_id' })
  categoria: CategoriaEntity | null = null;

  @Column({ type: 'varchar', length: 100, name: 'categoria_id', nullable: true })
  categoriaId: string | null = null;

  @Column({ type: 'varchar', length: 255 })
  nome!: string;

  @Column({ type: 'varchar', length: 100, name: 'categoria_nome', nullable: true })
  categoriaNome: string | null = null;

  @Column({ type: 'text', nullable: true })
  descricao: string | null = null;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  preco!: string;

  @Column({ type: 'numeric', precision: 10, scale: 2, name: 'preco_promocional', nullable: true })
  precoPromocional: string | null = null;

  @Column({ type: 'int', name: 'estoque_atual', default: 0 })
  estoqueAtual!: number;

  @Column({ type: 'text', array: true, default: () => "'{}'" })
  tags: string[] = [];

  @Column({ type: 'boolean', default: true })
  ativo!: boolean;

  @Column({ type: 'text', name: 'image_url', nullable: true })
  imageUrl: string | null = null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  volume: string | null = null;

  @Column({ type: 'int', name: 'pack_quantity', nullable: true })
  packQuantity: number | null = null;

  @Column({ type: 'numeric', precision: 10, scale: 2, name: 'pack_price', nullable: true })
  packPrice: string | null = null;

  @CreateDateColumn({ type: 'timestamptz', name: 'criado_em' })
  criadoEm!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'atualizado_em' })
  atualizadoEm!: Date;
}
