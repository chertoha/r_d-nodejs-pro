import "reflect-metadata"

import { describe, it, before, after } from "node:test"
import assert from "node:assert/strict"

import { Injectable } from "../src/decorators/injectable.js"
import { Controller } from "../src/decorators/controller.js"
import { CreateUserDto, CreateUserSchema } from "../src/dto/create-user.dto.js"
import { Get, Post } from "../src/decorators/methods.js"
import { Body, Param, Query } from "../src/decorators/params.js"
import { Application, createApp } from "../src/create-app.js"
import { ZodValidationPipe } from "../src/pipes/zod-validation.pipe.js"
import { NotFoundError } from "../src/errors/not-found.error.js"

const TEST_PORT = 3001
const BASE_URL = `http://localhost:${TEST_PORT}`

let receivedBody: unknown
let firstService: TestUserService | undefined
let secondService: TestUserService | undefined

async function authorizedFetch(url: string, options?: RequestInit) {
  return fetch(url, {
    ...options,
    headers: {
      ...options?.headers,
      authorization: "Bearer test",
    },
  })
}

@Injectable()
class TestUserService {
  getName() {
    return "service works"
  }
}

@Controller("users")
class TestUserController {
  constructor(readonly userService: TestUserService) {}

  @Get()
  getUsers(@Query("limit") limit: string) {
    firstService = this.userService

    return {
      limit,
    }
  }

  @Get("/:id")
  getUser(@Query("page") page: string, @Param("id") id: string) {
    return {
      id,
      page,
    }
  }

  @Post()
  createUser(@Body(new ZodValidationPipe(CreateUserSchema)) body: CreateUserDto) {
    receivedBody = body

    return {
      data: body,
    }
  }
}

@Controller("service-check")
class TestServiceController {
  constructor(readonly userService: TestUserService) {}

  @Get()
  check() {
    secondService = this.userService

    return { ok: true }
  }
}

let handlerCalls = 0

@Controller("guard-test")
class GuardTestController {
  @Get()
  getData() {
    handlerCalls++

    return { ok: true }
  }
}

@Controller("errors")
class ErrorTestController {
  @Get("/not-found")
  notFound() {
    throw new NotFoundError("User not found")
  }

  @Get("/unexpected")
  unexpected() {
    throw new Error("boom")
  }
}

describe("Controller, dispatcher, router", () => {
  let app: Application

  before(async () => {
    app = createApp([
      TestUserController,
      TestServiceController,
      GuardTestController,
      ErrorTestController,
    ])
    await app.listen(TEST_PORT)
  })

  after(async () => {
    await app.close()
  })

  it("finds route", async () => {
    const response = await authorizedFetch(`${BASE_URL}/users`)

    assert.equal(response.status, 200)
  })

  it("injects @Param value", async () => {
    const response = await authorizedFetch(`${BASE_URL}/users/42`)

    const body = (await response.json()) as {
      id: string
    }

    assert.equal(response.status, 200)
    assert.equal(body.id, "42")
  })

  it("injects @Query value", async () => {
    const response = await authorizedFetch(`${BASE_URL}/users?limit=5`)

    const body = (await response.json()) as {
      limit: string
    }

    assert.equal(response.status, 200)
    assert.equal(body.limit, "5")
  })

  it("injects @Param and @Query into correct arguments", async () => {
    const response = await authorizedFetch(`${BASE_URL}/users/42?page=5`)

    const body = (await response.json()) as {
      id: string
      page: string
    }

    assert.equal(response.status, 200)
    assert.equal(body.id, "42")
    assert.equal(body.page, "5")
  })

  it("returns 400 with validation details for invalid DTO", async () => {
    const response = await authorizedFetch(`${BASE_URL}/users`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: "Anton",
        email: "not-an-email",
      }),
    })

    const body = (await response.json()) as {
      errors: Array<{
        field: string
        constraints: Record<string, string>
      }>
    }

    assert.equal(response.status, 400)

    assert.ok(body.errors.some((error) => error.field === "email"))
  })

  it("passes valid body to handler", async () => {
    const testBody = {
      name: "Anton",
      email: "anton@test.com",
    }

    const response = await authorizedFetch(`${BASE_URL}/users`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(testBody),
    })

    assert.equal(response.status, 201)
    assert.deepEqual(receivedBody, testBody)
  })

  it("injects the same singleton service into controllers", async () => {
    firstService = undefined
    secondService = undefined

    await authorizedFetch(`${BASE_URL}/users`)
    await authorizedFetch(`${BASE_URL}/service-check`)

    assert.ok(firstService)
    assert.ok(secondService)

    assert.strictEqual(firstService, secondService)
  })

  it("blocks request before handler without Authorization", async () => {
    handlerCalls = 0

    const response = await fetch(`${BASE_URL}/guard-test`)

    assert.equal(response.status, 403)
    assert.equal(handlerCalls, 0)
  })

  it("returns 404 for NotFoundError", async () => {
    const response = await authorizedFetch(`${BASE_URL}/errors/not-found`)

    const body = (await response.json()) as {
      message: string
    }

    assert.equal(response.status, 404)
    assert.equal(body.message, "User not found")
  })

  it("returns 500 without exposing error details", async () => {
    const response = await authorizedFetch(`${BASE_URL}/errors/unexpected`)

    const body = (await response.json()) as {
      message: string
    }

    assert.equal(response.status, 500)
    assert.equal(body.message, "Internal Server Error")
    assert.ok(!JSON.stringify(body).includes("boom"))
    assert.ok(!JSON.stringify(body).includes("stack"))
  })

  it("returns 400 when body is missing", async () => {
    const response = await authorizedFetch(`${BASE_URL}/users`, {
      method: "POST",
    })

    assert.equal(response.status, 400)
  })

  it("returns 400 for malformed JSON", async () => {
    const response = await authorizedFetch(`${BASE_URL}/users`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: '{"name":',
    })

    const body = (await response.json()) as {
      message: string
    }

    assert.equal(response.status, 400)
    assert.equal(body.message, "Invalid JSON")
  })
})
