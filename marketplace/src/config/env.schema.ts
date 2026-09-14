import { z } from "zod"

export const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),

  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().positive().default(5432),
  DB_NAME: z.string().min(1),
  DB_USER: z.string().min(1),

  DB_PASSWORD_FILE: z.string().min(1),
})

export type Env = z.infer<typeof envSchema>

export function validate(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config)

  if (!result.success) {
    const errors = result.error.issues
      .map((issue) => {
        const variable = issue.path.join(".")
        return `${variable}: ${issue.message}`
      })
      .join("\n")

    throw new Error(`Invalid environment variables:\n${errors}`)
  }

  return result.data
}
