import "reflect-metadata"

import { describe, it, beforeEach } from "node:test"
import assert from "node:assert/strict"

import { Container } from "../src/container.js"
import { Injectable } from "../src/decorators/injectable.js"
import { Inject } from "../src/decorators/inject.js"

@Injectable()
class C {}

@Injectable()
class B {
  constructor(public readonly c: C) {}
}

@Injectable()
class A {
  constructor(public readonly b: B) {}
}

@Injectable()
class SingletonService {}

@Injectable({ scope: "transient" })
class TransientService {}

const CONFIG_TOKEN = Symbol.for("CONFIG")

interface AppSettings {
  environment: string
}

@Injectable()
class SettingsConsumer {
  constructor(
    @Inject(CONFIG_TOKEN)
    public readonly settings: AppSettings,
  ) {}
}

@Injectable()
class CircularA {}

@Injectable()
class CircularB {}

describe("Container", () => {
  let container: Container

  beforeEach(() => {
    container = new Container()
  })

  it("resolves dependencies recursively", () => {
    const a = container.resolve(A)

    assert.ok(a.b instanceof B)
    assert.ok(a.b.c instanceof C)
  })

  it("returns the same instance for singleton scope", () => {
    const first = container.resolve(SingletonService)
    const second = container.resolve(SingletonService)

    assert.equal(first, second)
  })

  it("returns different instances for transient scope", () => {
    const first = container.resolve(TransientService)
    const second = container.resolve(TransientService)

    assert.notEqual(first, second)
  })

  it("resolves dependency by explicit injection token", () => {
    const settings: AppSettings = {
      environment: "test",
    }

    container.register(CONFIG_TOKEN, settings)

    const consumer = container.resolve(SettingsConsumer)

    assert.equal(consumer.settings, settings)
  })

  it("throws a meaningful error for circular dependencies", () => {
    Reflect.defineMetadata("design:paramtypes", [CircularB], CircularA)
    Reflect.defineMetadata("design:paramtypes", [CircularA], CircularB)

    assert.throws(
      () => container.resolve(CircularA),
      (error: unknown) => {
        assert.ok(error instanceof Error)
        assert.ok(!(error instanceof RangeError))

        assert.match(error.message, /CircularA -> CircularB -> CircularA/)

        return true
      },
    )
  })
})
