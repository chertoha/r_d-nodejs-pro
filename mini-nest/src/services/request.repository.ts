import { Injectable } from "../decorators/injectable.js"
import { requestContext } from "../context/request-context.js"

@Injectable()
export class RequestRepository {
  async getRequestId(): Promise<string | undefined> {
    await new Promise((resolve) => setTimeout(resolve, 10))
    return requestContext.requestId()
  }
}
