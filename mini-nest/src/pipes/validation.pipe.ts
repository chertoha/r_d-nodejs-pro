import { plainToInstance } from "class-transformer"
import { validate } from "class-validator"
import { Constructor } from "../types/common.types.js"

export interface ValidationError {
  field: string
  constraints: Record<string, string>
}

export class ValidationException extends Error {
  constructor(public readonly errors: ValidationError[]) {
    super("Validation failed")
  }
}

export class ValidationPipe {
  async transform<T extends object>(value: unknown, dtoClass: Constructor<T>): Promise<T> {
    const instance = plainToInstance(dtoClass, value)

    const errors = await validate(instance)

    if (errors.length > 0) {
      const validationErrors = errors.map((error) => ({
        field: error.property,
        constraints: error.constraints ?? {},
      }))

      throw new ValidationException(validationErrors)
    }

    return instance
  }
}
