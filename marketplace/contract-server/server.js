import path from "node:path"
import express from "express"
import OpenApiValidator from "express-openapi-validator"

const app = express()
const PORT = 3000

const apiSpec = path.resolve("openapi/openapi.yaml")

app.use(express.json())

app.use(
  OpenApiValidator.middleware({
    apiSpec,
    validateRequests: true,
    validateResponses: true,
  }),
)

const products = [
  {
    id: "prod-1",
    name: "Mechanical Keyboard",
    price_cents: 8900,
  },
]

const orders = []

/**
 * ROUTES
 */

app.post("/products", (req, res) => {
  const product = {
    id: `prod-${products.length + 1}`,
    ...req.body,
  }

  products.push(product)

  res.status(201).json(product)
})

app.get("/products", (_req, res) => {
  res.json({
    items: products,
    next_cursor: null,
  })
})

app.get("/products/:id", (req, res) => {
  const product = products.find((product) => product.id === req.params.id)

  if (!product) {
    return sendProblem(res, {
      status: 404,
      type: "https://example.com/problems/product-not-found",
      title: "Product not found",
      detail: `Product ${req.params.id} was not found.`,
      instance: req.originalUrl,
    })
  }

  res.json(product)
})

app.post("/orders", (req, res) => {
  const { items } = req.body

  const totalCents = items.reduce((total, item) => {
    const product = products.find((product) => product.id === item.product_id)

    return total + (product?.price_cents ?? 0) * item.quantity
  }, 0)

  const order = {
    id: `order-${orders.length + 1}`,
    items,
    total_cents: totalCents,
    status: "created",
  }

  orders.push(order)

  res.status(201).json(order)
})

app.get("/orders/:id", (req, res) => {
  const order = orders.find((order) => order.id === req.params.id)

  if (!order) {
    return sendProblem(res, {
      status: 404,
      type: "https://example.com/problems/product-not-found",
      title: "Product not found",
      detail: `Product ${req.params.id} was not found.`,
      instance: req.originalUrl,
    })
  }

  res.json(order)
})

/**
 * OPEN API VALIDATION ERRORS
 */

app.use((err, req, res, _next) => {
  const status = err.status ?? 500

  return sendProblem(res, {
    status,
    type: "https://example.com/problems/validation-error",
    title: "Request validation failed",
    detail: err.message,
    instance: req.originalUrl,
  })
})

/**
 * START SERVER
 */
app.listen(PORT, () => {
  console.log(`Contract server is running on http://localhost:${PORT}`)
})

/**
 * HELPERS
 */

function sendProblem(res, { status, title, detail, instance, type }) {
  return res.status(status).type("application/problem+json").json({
    type,
    title,
    status,
    detail,
    instance,
  })
}
