import { createServer } from "node:http"
import { Container } from "./container.js"
import { Dispatcher } from "./dispatcher.js"
import { ValidationPipe } from "./pipes/validation.pipe.js"
import { Router } from "./router.js"
import { Constructor } from "./types/common.types.js"

export function createApp(controllers: Constructor[]) {
  const container = new Container()
  const router = new Router(controllers)
  const validationPipe = new ValidationPipe()
  const dispatcher = new Dispatcher(router, container, validationPipe)

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
