import express from "express"
import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const createTablesPath = path.join(__dirname, "sql", "create-tables.sql")
const seedPath = path.join(__dirname, "sql", "seeds.sql")
const selectUsersPath = path.join(__dirname, "sql", "select-users.sql")

import pg from "pg"

const pool = new pg.Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
})

const createTablesSql = await fs.readFile(createTablesPath, "utf8")
const seedSql = await fs.readFile(seedPath, "utf8")
const selectUsersSql = await fs.readFile(selectUsersPath, "utf8")

await pool.query(createTablesSql)

const app = express()

app.get("/", (req, res) => {
  res.send("Hello World!")
})

app.get("/health", (req, res) => {
  res.status(200).send("OK")
})

app.post("/seed", async (_req, res) => {
  await pool.query(seedSql)

  res.status(201).json({
    message: "Database seeded successfully",
  })
})

app.get("/users", async (_req, res) => {
  const users = await pool.query(selectUsersSql)
  res.json(users.rows)
})

app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err)
  }

  res.status(500).json({
    error: err.message,
  })
})

app.listen(3000, () => {
  console.log("Server is running on port 3000")
})
