import { IncomingMessage } from "node:http"
import { Guard } from "../interfaces/guard.interface.js"

export class AuthGuard implements Guard {
  canActivate(req: IncomingMessage): boolean {
    return req.headers.authorization !== undefined
  }
}
