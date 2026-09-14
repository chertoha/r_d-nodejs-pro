import { AppDataSource } from "./data-source"
import { OrderItem } from "./entities/order-item.entity"
import { Order, OrderStatus } from "./entities/order.entity"
import { Product } from "./entities/product.entity"
import { User, UserRole } from "./entities/user.entity"

const USERS: { email: string; fullName: string; role: UserRole }[] = [
  { email: "alice@example.com", fullName: "Alice Novak", role: "seller" },
  { email: "bob@example.com", fullName: "Bob Kravets", role: "seller" },
  { email: "carol@example.com", fullName: "Carol Petrenko", role: "buyer" },
  { email: "dave@example.com", fullName: "Dave Ivanov", role: "buyer" },
  { email: "erin@example.com", fullName: "Erin Bondar", role: "buyer" },
  { email: "frank@example.com", fullName: "Frank Melnyk", role: "buyer" },
]

const PRODUCTS: {
  name: string
  description: string
  priceCents: number
  stock: number
  category: string
  sellerEmail: string
}[] = [
  { name: "Aurora Leather Backpack", description: "Handmade leather backpack with laptop sleeve.", priceCents: 8999, stock: 25, category: "bags", sellerEmail: "alice@example.com" },
  { name: "Trailhead Running Sneakers", description: "Lightweight running sneakers with mesh upper.", priceCents: 6499, stock: 60, category: "footwear", sellerEmail: "alice@example.com" },
  { name: "Nordic Wool Sweater", description: "Warm merino wool sweater for winter.", priceCents: 5499, stock: 30, category: "clothing", sellerEmail: "alice@example.com" },
  { name: "Solstice Desk Lamp", description: "Adjustable LED desk lamp with USB charging port.", priceCents: 3299, stock: 45, category: "home", sellerEmail: "bob@example.com" },
  { name: "Vector Wireless Mouse", description: "Ergonomic wireless mouse with silent clicks.", priceCents: 2499, stock: 80, category: "electronics", sellerEmail: "bob@example.com" },
  { name: "Cascade Water Bottle", description: "Insulated stainless steel water bottle, 1L.", priceCents: 1899, stock: 100, category: "outdoor", sellerEmail: "bob@example.com" },
  { name: "Meridian Office Chair", description: "Mesh-back office chair with lumbar support.", priceCents: 15999, stock: 15, category: "furniture", sellerEmail: "bob@example.com" },
  { name: "Ember Ceramic Mug Set", description: "Set of two hand-glazed ceramic mugs.", priceCents: 2299, stock: 50, category: "home", sellerEmail: "alice@example.com" },
]

const ORDER_STATUSES: OrderStatus[] = [
  "delivered",
  "delivered",
  "shipped",
  "paid",
  "pending",
  "cancelled",
]

async function main() {
  await AppDataSource.initialize()

  const userRepo = AppDataSource.getRepository(User)
  const productRepo = AppDataSource.getRepository(Product)
  const orderRepo = AppDataSource.getRepository(Order)
  const orderItemRepo = AppDataSource.getRepository(OrderItem)

  await userRepo.upsert(USERS, ["email"])
  const users = await userRepo.find()
  const userByEmail = new Map(users.map((u) => [u.email, u]))

  const existingProducts = await productRepo.count()
  if (existingProducts > 0) {
    console.log(`products already seeded (${existingProducts} rows) -- skipping`)
  } else {
    await productRepo.save(
      PRODUCTS.map(({ sellerEmail, ...rest }) =>
        productRepo.create({
          ...rest,
          seller: { id: userByEmail.get(sellerEmail)!.id },
        }),
      ),
    )
  }
  const products = await productRepo.find({ order: { id: "ASC" } })

  const existingOrders = await orderRepo.count()
  if (existingOrders > 0) {
    console.log(`orders already seeded (${existingOrders} rows) -- skipping`)
  } else {
    const buyers = users.filter((u) => u.role === "buyer")

    const savedOrders = await orderRepo.save(
      buyers.flatMap((buyer, i) => {
        const status = ORDER_STATUSES[i % ORDER_STATUSES.length]
        return [
          orderRepo.create({
            user: { id: buyer.id },
            status,
            totalCents: 0,
          }),
        ]
      }),
    )

    const items: OrderItem[] = []
    savedOrders.forEach((order, i) => {
      const product1 = products[i % products.length]
      const product2 = products[(i + 3) % products.length]

      items.push(
        orderItemRepo.create({
          order: { id: order.id },
          product: { id: product1.id },
          quantity: 1 + (i % 2),
          unitPriceCents: product1.priceCents,
        }),
        orderItemRepo.create({
          order: { id: order.id },
          product: { id: product2.id },
          quantity: 1,
          unitPriceCents: product2.priceCents,
        }),
      )
    })

    await orderItemRepo.save(items)

    for (const order of savedOrders) {
      const total = items
        .filter((item) => item.order.id === order.id)
        .reduce((sum, item) => sum + item.quantity * item.unitPriceCents, 0)
      await orderRepo.update(order.id, { totalCents: total })
    }

    console.log(`seeded ${savedOrders.length} orders, ${items.length} order items`)
  }

  console.log(`users: ${users.length}, products: ${products.length}`)

  await AppDataSource.destroy()
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
