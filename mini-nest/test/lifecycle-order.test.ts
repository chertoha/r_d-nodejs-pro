import "reflect-metadata"
import assert from "node:assert"
import { after, before, test } from "node:test"
import { IncomingMessage, ServerResponse } from "node:http"

import { Controller } from "../src/decorators/controller.js"
import { Body } from "../src/decorators/params.js"
import {
  Middleware,
  NextFunction as MiddlewareNext,
} from "../src/interfaces/middleware.interface.js"
import { Guard } from "../src/interfaces/guard.interface.js"
import {
  Interceptor,
  NextFunction as InterceptorNext,
} from "../src/interfaces/interceptor.interface.js"
import { Pipe } from "../src/interfaces/pipe.interface.js"
import { Post } from "../src/decorators/methods.js"
import { createApp } from "../src/create-app.js"

const TEST_PORT = 3002
const BASE_URL = `http://localhost:${TEST_PORT}`

const order: string[] = []

class TestMiddleware implements Middleware {
  async use(_req: IncomingMessage, _res: ServerResponse, next: MiddlewareNext): Promise<void> {
    order.push("middleware")
    await next()
  }
}

class TestGuard implements Guard {
  canActivate(): boolean {
    order.push("guard")
    return true
  }
}

class TestInterceptor implements Interceptor {
  async intercept(_req: IncomingMessage, next: InterceptorNext): Promise<unknown> {
    order.push("interceptor:before")

    const result = await next()

    order.push("interceptor:after")

    return result
  }
}

class TestPipe implements Pipe {
  transform(value: unknown): unknown {
    order.push("pipe")
    return value
  }
}

@Controller("lifecycle")
class LifecycleController {
  @Post()
  handle(@Body(new TestPipe()) body: unknown) {
    order.push("handler")

    return body
  }
}

const app = createApp([LifecycleController], {
  middlewares: [new TestMiddleware()],
  guards: [new TestGuard()],
  interceptors: [new TestInterceptor()],
})

before(async () => {
  await app.listen(TEST_PORT)
})

after(async () => {
  await app.close()
})

test("executes lifecycle in correct order", async () => {
  order.length = 0

  const response = await fetch(`${BASE_URL}/lifecycle`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      name: "test",
    }),
  })

  assert.equal(response.status, 201)

  assert.deepEqual(order, [
    "middleware",
    "guard",
    "interceptor:before",
    "pipe",
    "handler",
    "interceptor:after",
  ])
})
