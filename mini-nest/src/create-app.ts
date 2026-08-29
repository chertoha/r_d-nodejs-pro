import { createServer } from "node:http"
import { Container } from "./container.js"
import { Dispatcher } from "./dispatcher.js"
import { Router } from "./router.js"
import { Constructor } from "./types/common.types.js"
import { Guard } from "./interfaces/guard.interface.js"
import { AuthGuard } from "./guards/auth.guard.js"
import { Interceptor } from "./interfaces/interceptor.interface.js"
import { LoggingInterceptor } from "./interceptors/logging.interceptor.js"
import { ExceptionFilter } from "./filters/exception.filter.js"
import { Middleware } from "./interfaces/middleware.interface.js"

interface AppOptions {
  middlewares?: Middleware[]
  guards?: Guard[]
  interceptors?: Interceptor[]
}

export function createApp(controllers: Constructor[], options: AppOptions = {}) {
  const container = new Container()
  const router = new Router(controllers)
  // const validationPipe = new ValidationPipe()

  const middlewares = options.middlewares ?? []
  const guards = options.guards ?? [new AuthGuard()]
  const interceptors = options.interceptors ?? [new LoggingInterceptor()]

  const exceptionFilter = new ExceptionFilter()

  const dispatcher = new Dispatcher(
    router,
    container,
    middlewares,
    guards,
    interceptors,
    exceptionFilter,
  )

  const server = createServer((req, res) => {
    dispatcher.dispatch(req, res)
  })

  const listen = (port: number, callback?: () => void): Promise<void> => {
    return new Promise((resolve) => {
      server.listen(port, () => {
        callback?.()
        resolve()
      })
    })
  }

  const close = (): Promise<void> => {
    return new Promise((resolve) => {
      server.close(() => resolve())
    })
  }

  return {
    listen,
    close,
  }
}

export type Application = ReturnType<typeof createApp>
