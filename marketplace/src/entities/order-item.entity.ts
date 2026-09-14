import {
  Check,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
} from "typeorm"

import { Order } from "./order.entity"
import { Product } from "./product.entity"

@Entity({ name: "order_items" })
@Check(`"quantity" > 0`)
@Check(`"unit_price_cents" >= 0`)
export class OrderItem {
  @PrimaryGeneratedColumn("identity", { generatedIdentity: "ALWAYS" })
  id: number

  @ManyToOne(() => Order, (order) => order.items, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "order_id" })
  order: Order

  @ManyToOne(() => Product, (product) => product.orderItems, {
    nullable: false,
    onDelete: "RESTRICT",
  })
  @JoinColumn({ name: "product_id" })
  product: Product

  @RelationId((item: OrderItem) => item.product)
  productId: number

  @Column({ type: "integer" })
  quantity: number

  @Column({ name: "unit_price_cents", type: "integer" })
  unitPriceCents: number
}
