import { ServerResponse } from "node:http"

import { HttpStatus } from "../constants/http-status.enum.js"
import { NotFoundError } from "../errors/not-found.error.js"
import { ValidationError } from "../errors/validation.error.js"
import { BadRequestError } from "../errors/bad-request.error.js"

export class ExceptionFilter {
  catch(error: unknown, res: ServerResponse): void {
    res.setHeader("Content-Type", "application/json")

    if (error instanceof ValidationError) {
      res.statusCode = HttpStatus.BAD_REQUEST
      res.end(
        JSON.stringify({
          errors: error.errors,
        }),
      )
      return
    }

    if (error instanceof BadRequestError) {
      res.statusCode = HttpStatus.BAD_REQUEST
      res.end(
        JSON.stringify({
          message: error.message,
        }),
      )
      return
    }

    if (error instanceof NotFoundError) {
      res.statusCode = HttpStatus.NOT_FOUND
      res.end(
        JSON.stringify({
          message: error.message,
        }),
      )
      return
    }

    res.statusCode = HttpStatus.INTERNAL_SERVER_ERROR
    res.end(
      JSON.stringify({
        message: "Internal Server Error",
      }),
    )
  }
}
