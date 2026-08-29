import { ZodType } from "zod"

import { Pipe } from "../interfaces/pipe.interface.js"
import { ValidationError } from "../errors/validation.error.js"

export class ZodValidationPipe implements Pipe {
  constructor(private readonly schema: ZodType) {}

  transform(value: unknown): unknown {
    const result = this.schema.safeParse(value)

    if (!result.success) {
      throw new ValidationError(
        result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      )
    }

    return result.data
  }
}
