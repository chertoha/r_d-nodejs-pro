import { IncomingMessage } from "node:http"

export interface Guard {
  canActivate(req: IncomingMessage): boolean | Promise<boolean>
}
