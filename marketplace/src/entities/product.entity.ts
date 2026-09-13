import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm"

import { OrderItem } from "./order-item.entity"
import { User } from "./user.entity"

@Entity({ name: "products" })
@Check(`"price_cents" > 0`)
@Check(`"stock" >= 0`)
@Index("idx_products_search_vector", ["searchVector"], { type: "gin" })
export class Product {
  @PrimaryGeneratedColumn("identity", { generatedIdentity: "ALWAYS" })
  id: number

  @ManyToOne(() => User, (user) => user.products, {
    nullable: false,
    onDelete: "RESTRICT",
  })
  @JoinColumn({ name: "seller_id" })
  seller: User

  @Column()
  name: string

  @Column()
  description: string

  @Column({ name: "price_cents", type: "integer" })
  priceCents: number

  @Column({ type: "integer", default: 0 })
  stock: number

  @Column()
  category: string

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date

  @Column({
    type: "tsvector",
    generatedType: "STORED",
    asExpression: `to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(description, ''))`,
    select: false,
    insert: false,
    update: false,
  })
  searchVector: string

  @OneToMany(() => OrderItem, (item) => item.product)
  orderItems: OrderItem[]
}
