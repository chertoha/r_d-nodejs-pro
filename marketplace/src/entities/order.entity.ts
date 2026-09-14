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

export type OrderStatus =
  | "pending"
  | "paid"
  | "shipped"
  | "delivered"
  | "cancelled"

@Entity({ name: "orders" })
@Check(`"status" IN ('pending', 'paid', 'shipped', 'delivered', 'cancelled')`)
@Check(`"total_cents" >= 0`)
@Index("idx_orders_pending_created", ["createdAt"], {
  where: `"status" = 'pending'`,
})
export class Order {
  @PrimaryGeneratedColumn("identity", { generatedIdentity: "ALWAYS" })
  id: number

  @ManyToOne(() => User, (user) => user.orders, {
    nullable: false,
    onDelete: "RESTRICT",
  })
  @JoinColumn({ name: "user_id" })
  user: User

  @Column({ type: "text" })
  status: OrderStatus

  @Column({ name: "total_cents", type: "integer" })
  totalCents: number

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date

  @OneToMany(() => OrderItem, (item) => item.order)
  items: OrderItem[]
}
