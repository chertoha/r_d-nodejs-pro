import { IncomingMessage, ServerResponse } from "node:http"
import { Container } from "./container.js"
import { RouteMatch, Router } from "./router.js"
import { allowedMethods, HttpMethod } from "./types/http.types.js"
import { HttpStatus } from "./constants/http-status.enum.js"
import { ControllerInstance, ParamType } from "./types/common.types.js"
import { randomUUID } from "node:crypto"
import { requestContext } from "./context/request-context.js"
import { Guard } from "./interfaces/guard.interface.js"
import { Interceptor } from "./interfaces/interceptor.interface.js"
import { ExceptionFilter } from "./filters/exception.filter.js"
import { Middleware } from "./interfaces/middleware.interface.js"
import { NotFoundError } from "./errors/not-found.error.js"
import { BadRequestError } from "./errors/bad-request.error.js"

interface ResolvedRequest {
  method: HttpMethod
  url: URL
  match: RouteMatch
}

export class Dispatcher {
  constructor(
    private readonly router: Router,
    private readonly container: Container,
    private readonly middlewares: Middleware[],
    // private readonly validationPipe: ValidationPipe,
    private readonly guards: Guard[],
    private readonly interceptors: Interceptor[],
    private readonly exceptionFilter: ExceptionFilter,
  ) {}

  async dispatch(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const requestId =
      typeof req.headers["x-request-id"] === "string" ? req.headers["x-request-id"] : randomUUID()

    res.setHeader("X-Request-Id", requestId)

    await requestContext.run(requestId, async () => {
      try {
        await this.handleRequest(req, res)
      } catch (error) {
        this.exceptionFilter.catch(error, res)
      }
    })
  }

  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const request = this.resolveRequest(req, res)
    if (!request) return

    await this.runMiddlewares(req, res, async () => {
      const canActivate = await this.runGuards(req)

      if (!canActivate) {
        res.statusCode = HttpStatus.FORBIDDEN
        res.end("Forbidden")
        return
      }

      const result = await this.runInterceptors(req, async () => {
        const args = await this.resolveArguments(req, request)
        return this.runHandler(request, args)
      })

      this.sendResponse(res, request.method, result)
    })
  }

  private resolveRequest(req: IncomingMessage, res: ServerResponse): ResolvedRequest | undefined {
    const method = req.method

    if (!this.isValidMethod(method)) {
      res.statusCode = HttpStatus.METHOD_NOT_ALLOWED
      res.end("Method Not Allowed")
      return
    }

    const url = new URL(req.url ?? "/", "http://localhost")
    const match = this.router.find(method, url.pathname)

    if (match === undefined) {
      throw new NotFoundError("Route not found")
    }

    return {
      method,
      url,
      match,
    }
  }

  private async runGuards(req: IncomingMessage): Promise<boolean> {
    for (const guard of this.guards) {
      const canActivate = await guard.canActivate(req)

      if (!canActivate) {
        return false
      }
    }

    return true
  }

  // ClassValidator version
  // private async resolveArguments(
  //   req: IncomingMessage,
  //   request: ResolvedRequest,
  // ): Promise<unknown[]> {
  //   const { url, match } = request
  //   const { controller, handlerName, params } = match.route

  //   const paramTypes: Constructor[] =
  //     Reflect.getMetadata("design:paramtypes", controller.prototype, handlerName) ?? []

  //   const hasBodyParam = [...params.values()].some(({ type }) => type === ParamType.BODY)

  //   const body = hasBodyParam ? await this.readBody(req) : undefined

  //   const args: unknown[] = []

  //   for (const [index, { type, name }] of params) {
  //     if (type === ParamType.PARAM) {
  //       args[index] = name ? match.pathParams[name] : undefined
  //     }

  //     if (type === ParamType.QUERY) {
  //       args[index] = name ? url.searchParams.get(name) : undefined
  //     }

  //     if (type === ParamType.BODY) {
  //       const dtoClass = paramTypes[index]

  //       args[index] = await this.validationPipe.transform(body, dtoClass)
  //     }
  //   }

  //   return args
  // }

  private async resolveArguments(
    req: IncomingMessage,
    request: ResolvedRequest,
  ): Promise<unknown[]> {
    const { url, match } = request
    const { params } = match.route

    const hasBodyParam = [...params.values()].some(({ type }) => type === ParamType.BODY)

    const body = hasBodyParam ? await this.readBody(req) : undefined
    const args: unknown[] = []

    for (const [index, { type, name, pipe }] of params) {
      let value: unknown

      if (type === ParamType.PARAM) {
        value = name ? match.pathParams[name] : match.pathParams
      }

      if (type === ParamType.QUERY) {
        value = name ? url.searchParams.get(name) : Object.fromEntries(url.searchParams)
      }

      if (type === ParamType.BODY) {
        value = body
      }

      args[index] = pipe ? await pipe.transform(value) : value
    }

    return args
  }

  private async runHandler(request: ResolvedRequest, args: unknown[]): Promise<unknown> {
    const { controller, handlerName } = request.match.route

    const controllerInstance = this.container.resolve(controller) as ControllerInstance
    const handler = controllerInstance[handlerName]
    return handler.call(controllerInstance, ...args)
  }

  private sendResponse(res: ServerResponse, method: HttpMethod, result: unknown): void {
    res.statusCode = method === HttpMethod.POST ? HttpStatus.CREATED : HttpStatus.OK
    res.setHeader("content-type", "application/json")
    res.end(JSON.stringify(result))
  }

  private async runMiddlewares(
    req: IncomingMessage,
    res: ServerResponse,
    continueRequest: () => Promise<void>,
  ): Promise<void> {
    let next = continueRequest

    for (const middleware of [...this.middlewares].reverse()) {
      const nextMiddleware = next

      next = async () => {
        await middleware.use(req, res, nextMiddleware)
      }
    }

    await next()
  }
  private async runInterceptors(
    req: IncomingMessage,
    handler: () => Promise<unknown>,
  ): Promise<unknown> {
    let next = handler

    for (const interceptor of [...this.interceptors].reverse()) {
      const currentNext = next

      next = () => interceptor.intercept(req, currentNext)
    }

    return next()
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
          resolve(this.parseJson(body))
        } catch (error) {
          reject(error)
        }
      })

      req.on("error", reject)
    })
  }

  private parseJson(json: string): unknown {
    try {
      return JSON.parse(json)
    } catch {
      throw new BadRequestError("Invalid JSON")
    }
  }

  // private handleError(error: unknown, res: ServerResponse): void {
  //   if (error instanceof ValidationException) {
  //     res.statusCode = HttpStatus.BAD_REQUEST
  //     res.setHeader("content-type", "application/json")

  //     res.end(
  //       JSON.stringify({
  //         errors: error.errors,
  //       }),
  //     )

  //     return
  //   }

  //   console.error(error)

  //   res.statusCode = HttpStatus.INTERNAL_SERVER_ERROR
  //   res.end("Internal Server Error")
  // }
}
