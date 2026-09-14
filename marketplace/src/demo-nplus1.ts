import "reflect-metadata"
import { DataSource, Logger } from "typeorm"

import { buildDataSourceOptions } from "./data-source"
import { Order } from "./entities/order.entity"
import { OrderItem } from "./entities/order-item.entity"
import { Product } from "./entities/product.entity"

class QueryCountLogger implements Logger {
  count = 0

  logQuery(): void {
    this.count++
  }

  logQueryError(): void {}
  logQuerySlow(): void {}
  logSchemaBuild(): void {}
  logMigration(): void {}
  log(): void {}
}

async function main() {
  const logger = new QueryCountLogger()
  const dataSource = new DataSource(
    buildDataSourceOptions({ logging: ["query"], logger }),
  )
  await dataSource.initialize()

  const orderRepo = dataSource.getRepository(Order)
  const orderItemRepo = dataSource.getRepository(OrderItem)
  const productRepo = dataSource.getRepository(Product)

  logger.count = 0
  const orders = await orderRepo.find()
  for (const order of orders) {
    const items = await orderItemRepo.find({ where: { order: { id: order.id } } })
    for (const item of items) {
      await productRepo.findOneBy({ id: item.productId })
    }
  }
  const naiveCount = logger.count
  console.log(`naive (query in a loop):        ${naiveCount} queries for ${orders.length} orders`)

  logger.count = 0
  await orderRepo.find({ relations: { items: { product: true } } })
  const fixedCount = logger.count
  console.log(`fixed (relations / leftJoinAndSelect): ${fixedCount} query`)

  await dataSource.destroy()

  if (fixedCount >= naiveCount) {
    console.error("fixed path did not reduce the query count -- check the demo")
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
