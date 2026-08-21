import { InjectableOptions } from "./decorators/injectable.js"
import { INJECTABLE_TOKEN, INJECT_TOKENS } from "./tokens.js"

type Constructor<T = unknown> = new (...args: any[]) => T

export class Container {
  private readonly instances = new Map<Constructor, unknown>()
  private readonly providers = new Map<symbol, unknown>()

  register<T>(token: symbol, value: T): void {
    this.providers.set(token, value)
  }

  resolve<T>(target: Constructor<T>, path = new Set<Constructor>()): T {
    if (path.has(target)) {
      const cycle = [...path, target].map((t) => t.name).join(" -> ")
      throw new Error(`Circular dependency detected: ${cycle}`)
    }

    const injectableMetadata: InjectableOptions | undefined = Reflect.getMetadata(
      INJECTABLE_TOKEN,
      target,
    )

    if (!injectableMetadata) {
      throw new Error(`Cannot resolve ${target.name}. It is not marked as injectable.`)
    }

    if (injectableMetadata.scope === "singleton") {
      if (this.instances.has(target)) {
        return this.instances.get(target) as T
      }
    }

    path.add(target)

    const paramTypes: Constructor[] = Reflect.getMetadata("design:paramtypes", target) ?? []
    const injectTokens: Map<number, symbol> =
      Reflect.getMetadata(INJECT_TOKENS, target) ?? new Map()

    const dependencies = paramTypes.map((paramType, index) => {
      const token = injectTokens.get(index)

      if (token !== undefined) {
        if (!this.providers.has(token)) {
          throw new Error(`No provider registered for token ${String(token)}`)
        }

        return this.providers.get(token)
      }

      return this.resolve(paramType, path)
    })

    const instance = new target(...dependencies)

    if (injectableMetadata.scope === "singleton") {
      this.instances.set(target, instance)
    }

    path.delete(target)

    return instance
  }
}
