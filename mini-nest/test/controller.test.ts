import "reflect-metadata"

import { describe, it, before, after } from "node:test"
import assert from "node:assert/strict"

import { Injectable } from "../src/decorators/injectable.js"
import { Controller } from "../src/decorators/controller.js"
import { CreateUserDto } from "../src/dto/create-user.dto.js"
import { Get, Post } from "../src/decorators/methods.js"
import { Body, Param, Query } from "../src/decorators/params.js"
import { Application, createApp } from "../src/create-app.js"

const TEST_PORT = 3001
const BASE_URL = `http://localhost:${TEST_PORT}`

let receivedBody: unknown
let firstService: TestUserService | undefined
let secondService: TestUserService | undefined

@Injectable()
class TestUserService {
  getName() {
    return "service works"
  }
}

@Controller("users")
class TestUserController {
  lastBody?: CreateUserDto

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
  createUser(@Body() body: CreateUserDto) {
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

describe("Controller, dispatcher, router", () => {
  let app: Application

  before(async () => {
    app = createApp([TestUserController, TestServiceController])
    await app.listen(TEST_PORT)
  })

  after(async () => {
    await app.close()
  })

  it("finds route", async () => {
    const response = await fetch(`${BASE_URL}/users`)

    assert.equal(response.status, 200)
  })

  it("injects @Param value", async () => {
    const response = await fetch(`${BASE_URL}/users/42`)

    const body = (await response.json()) as {
      id: string
    }

    assert.equal(response.status, 200)
    assert.equal(body.id, "42")
  })

  it("injects @Query value", async () => {
    const response = await fetch(`${BASE_URL}/users?limit=5`)

    const body = (await response.json()) as {
      limit: string
    }

    assert.equal(response.status, 200)
    assert.equal(body.limit, "5")
  })

  it("injects @Param and @Query into correct arguments", async () => {
    const response = await fetch(`${BASE_URL}/users/42?page=5`)

    const body = (await response.json()) as {
      id: string
      page: string
    }

    assert.equal(response.status, 200)
    assert.equal(body.id, "42")
    assert.equal(body.page, "5")
  })

  it("returns 400 with validation details for invalid DTO", async () => {
    const response = await fetch(`${BASE_URL}/users`, {
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

  it("passes valid body as CreateUserDto instance", async () => {
    const response = await fetch(`${BASE_URL}/users`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: "Anton",
        email: "anton@test.com",
      }),
    })

    assert.equal(response.status, 201)
    assert.ok(receivedBody instanceof CreateUserDto)
  })

  it("injects the same singleton service into controllers", async () => {
    firstService = undefined
    secondService = undefined

    await fetch(`${BASE_URL}/users`)
    await fetch(`${BASE_URL}/service-check`)

    assert.ok(firstService)
    assert.ok(secondService)

    assert.strictEqual(firstService, secondService)
  })
})
