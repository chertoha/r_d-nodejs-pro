import { IncomingMessage } from "node:http"

export type NextFunction = () => Promise<unknown>

export interface Interceptor {
  intercept(req: IncomingMessage, next: NextFunction): Promise<unknown>
}
