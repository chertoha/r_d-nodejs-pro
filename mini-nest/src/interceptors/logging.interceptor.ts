import { IncomingMessage } from "node:http"

import { Interceptor, NextFunction } from "../interfaces/interceptor.interface.js"

export class LoggingInterceptor implements Interceptor {
  async intercept(req: IncomingMessage, next: NextFunction): Promise<unknown> {
    const start = performance.now()

    const result = await next()

    const duration = performance.now() - start

    console.log(`${req.method} ${req.url} — ${duration.toFixed(1)} ms`)

    return result
  }
}
