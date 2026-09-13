import "reflect-metadata"
import { join } from "node:path"
import { DataSource, DataSourceOptions } from "typeorm"

import { Order } from "./entities/order.entity"
import { OrderItem } from "./entities/order-item.entity"
import { Product } from "./entities/product.entity"
import { User } from "./entities/user.entity"

export function buildDataSourceOptions(
  overrides: Partial<DataSourceOptions> = {},
): DataSourceOptions {
  return {
    type: "postgres",
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: [User, Product, Order, OrderItem],
    migrations: [join(__dirname, "migrations", "*.js")],
    synchronize: false,
    ...overrides,
  } as DataSourceOptions
}

export const AppDataSource = new DataSource(buildDataSourceOptions())
