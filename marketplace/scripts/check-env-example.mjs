import { readFileSync } from "node:fs"
import { parse } from "dotenv"

import { envSchema } from "../dist/config/env.schema.js"

const schemaKeys = Object.keys(envSchema.shape).sort()

const fileKeys = Object.keys(
  parse(readFileSync(new URL("../.env.example", import.meta.url))),
).sort()

const missing = schemaKeys.filter((key) => !fileKeys.includes(key))
const extra = fileKeys.filter((key) => !schemaKeys.includes(key))

if (missing.length || extra.length) {
  if (missing.length) {
    console.error(`✗ Missing from .env.example: ${missing.join(", ")}`)
  }

  if (extra.length) {
    console.error(
      `✗ Extra in .env.example (not present in schema): ${extra.join(", ")}`,
    )
  }

  process.exit(1)
}

console.log(
  `✓ .env.example is in sync with schema (${schemaKeys.length} variables)`,
)
