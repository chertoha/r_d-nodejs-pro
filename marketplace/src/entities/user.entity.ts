import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm"

import { Order } from "./order.entity"
import { Product } from "./product.entity"

export type UserRole = "buyer" | "seller"

@Entity({ name: "users" })
@Check(`"role" IN ('buyer', 'seller')`)
export class User {
  @PrimaryGeneratedColumn("identity", { generatedIdentity: "ALWAYS" })
  id: number

  @Column({ unique: true })
  email: string

  @Column({ name: "full_name" })
  fullName: string

  @Column({ type: "text" })
  role: UserRole

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date

  @OneToMany(() => Product, (product) => product.seller)
  products: Product[]

  @OneToMany(() => Order, (order) => order.user)
  orders: Order[]
}
