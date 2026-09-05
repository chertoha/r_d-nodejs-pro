import { IncomingMessage, ServerResponse } from "node:http"

export type NextFunction = () => Promise<void>

export interface Middleware {
  use(req: IncomingMessage, res: ServerResponse, next: NextFunction): void | Promise<void>
}
