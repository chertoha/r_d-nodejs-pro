import "reflect-metadata"

import { AppDataSource } from "./data-source"
import { OrderItem } from "./entities/order-item.entity"

interface CategoryRevenueRow {
  category: string
  revenueCents: string
  unitsSold: string
}

async function main() {
  await AppDataSource.initialize()

  const rows = await AppDataSource.getRepository(OrderItem)
    .createQueryBuilder("item")
    .innerJoin("item.product", "product")
    .select("product.category", "category")
    .addSelect("SUM(item.quantity * item.unit_price_cents)", "revenueCents")
    .addSelect("SUM(item.quantity)", "unitsSold")
    .groupBy("product.category")
    .orderBy("revenueCents", "DESC")
    .getRawMany<CategoryRevenueRow>()

  const report = rows.map((row) => ({
    category: row.category,
    revenueCents: Number(row.revenueCents),
    unitsSold: Number(row.unitsSold),
  }))

  console.table(report)

  await AppDataSource.destroy()
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
