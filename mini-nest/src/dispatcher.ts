import { IncomingMessage, ServerResponse } from "node:http"
import { Container } from "./container.js"
import { Router } from "./router.js"
import { allowedMethods, HttpMethod } from "./types/http.types.js"
import { HttpStatus } from "./constants/http-status.enum.js"
import { Constructor, ControllerInstance, ParamType } from "./types/common.types.js"
import { ValidationException, ValidationPipe } from "./pipes/validation.pipe.js"

export class Dispatcher {
  constructor(
    private readonly router: Router,
    private readonly container: Container,
    private readonly validationPipe: ValidationPipe,
  ) {}

  async dispatch(req: IncomingMessage, res: ServerResponse) {
    try {
      await this.handleRequest(req, res)
    } catch (error) {
      this.handleError(error, res)
    }
  }

  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const method = req.method

    if (!this.isValidMethod(method)) {
      res.statusCode = HttpStatus.METHOD_NOT_ALLOWED
      res.end("Method Not Allowed")
      return
    }

    const url = new URL(req.url ?? "/", "http://localhost")
    const requestPath = url.pathname

    const match = this.router.find(method, requestPath)

    if (match === undefined) {
      res.statusCode = HttpStatus.NOT_FOUND
      res.end("Route not found")
      return
    }

    const { controller, handlerName, params } = match.route

    const paramTypes = Reflect.getMetadata(
      "design:paramtypes",
      controller.prototype,
      handlerName,
    ) as Constructor[]

    const hasBodyParam = [...params.values()].some(({ type }) => type === ParamType.BODY)
    const body = hasBodyParam ? await this.readBody(req) : undefined

    const args: unknown[] = []

    for (const [index, paramMetadata] of params) {
      const { type, name } = paramMetadata

      if (type === ParamType.PARAM) {
        args[index] = name ? match.pathParams[name] : undefined
      }

      if (type === ParamType.QUERY) {
        args[index] = name ? url.searchParams.get(name) : undefined
      }

      if (type === ParamType.BODY) {
        const dtoClass = paramTypes[index]
        args[index] = await this.validationPipe.transform(body, dtoClass)
      }
    }

    const controllerInstance = this.container.resolve(controller) as ControllerInstance
    const handler = controllerInstance[handlerName]

    const result = await handler.call(controllerInstance, ...args)

    res.statusCode = method === HttpMethod.POST ? HttpStatus.CREATED : HttpStatus.OK

    res.setHeader("content-type", "application/json")
    res.end(JSON.stringify(result))
  }

  private isValidMethod(method: string | undefined): method is HttpMethod {
    return method !== undefined && allowedMethods.includes(method)
  }

  private readBody(req: IncomingMessage): Promise<unknown> {
    return new Promise((resolve, reject) => {
      let body = ""

      req.on("data", (chunk) => {
        body += chunk.toString()
      })

      req.on("end", () => {
        if (!body) {
          return resolve(undefined)
        }

        try {
          resolve(JSON.parse(body))
        } catch (error) {
          reject(error)
        }
      })

      req.on("error", reject)
    })
  }

  private handleError(error: unknown, res: ServerResponse): void {
    if (error instanceof ValidationException) {
      res.statusCode = HttpStatus.BAD_REQUEST
      res.setHeader("content-type", "application/json")

      res.end(
        JSON.stringify({
          errors: error.errors,
        }),
      )

      return
    }

    console.error(error)

    res.statusCode = HttpStatus.INTERNAL_SERVER_ERROR
    res.end("Internal Server Error")
  }
}
