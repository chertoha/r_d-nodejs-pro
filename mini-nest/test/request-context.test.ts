import "reflect-metadata"

import assert from "node:assert"
import { after, before, test } from "node:test"

import { Controller } from "../src/decorators/controller.js"
import { RequestService } from "../src/services/request.service.js"
import { Get } from "../src/decorators/methods.js"
import { createApp } from "../src/create-app.js"

@Controller("request-context")
class RequestContextController {
  constructor(private readonly requestService: RequestService) {}

  @Get()
  async getRequestContext() {
    return {
      requestId: await this.requestService.getRequestId(),
    }
  }
}

const TEST_PORT = 3003
const BASE_URL = `http://localhost:${TEST_PORT}`

const app = createApp([RequestContextController])

before(async () => {
  await app.listen(TEST_PORT)
})

after(async () => {
  await app.close()
})

test("preserves client X-Request-Id through service and repository", async () => {
  const requestId = "test-request-id"

  const response = await fetch(`${BASE_URL}/request-context`, {
    headers: {
      authorization: "Bearer test",
      "X-Request-Id": requestId,
    },
  })

  const body = (await response.json()) as {
    requestId: string
  }

  assert.equal(response.headers.get("X-Request-Id"), requestId)
  assert.equal(body.requestId, requestId)
})

test("generates X-Request-Id when client does not provide one", async () => {
  const response = await fetch(`${BASE_URL}/request-context`, {
    headers: {
      authorization: "Bearer test",
    },
  })

  const body = (await response.json()) as {
    requestId: string
  }

  const responseRequestId = response.headers.get("X-Request-Id")

  assert.ok(responseRequestId)
  assert.equal(body.requestId, responseRequestId)
})

test("keeps request context isolated for concurrent requests", async () => {
  const requestIds = Array.from({ length: 10 }, (_, index) => `request-${index}`)

  const responses = await Promise.all(
    requestIds.map((requestId) =>
      fetch(`${BASE_URL}/request-context`, {
        headers: {
          authorization: "Bearer test",
          "X-Request-Id": requestId,
        },
      }),
    ),
  )

  const results = await Promise.all(
    responses.map(async (response) => ({
      headerRequestId: response.headers.get("X-Request-Id"),
      body: (await response.json()) as {
        requestId: string
      },
    })),
  )

  results.forEach((result, index) => {
    assert.equal(result.headerRequestId, requestIds[index])
    assert.equal(result.body.requestId, requestIds[index])
  })
})
