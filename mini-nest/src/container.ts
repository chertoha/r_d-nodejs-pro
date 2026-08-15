import { InjectableOptions } from "./decorators/injectable.js"
import { INJECTABLE_TOKEN } from "./tokens.js"

type Constructor<T = unknown> = new (...args: any[]) => T

export class Container {
  private readonly instances = new Map<Constructor, unknown>()

  resolve<T>(target: Constructor<T>): T {
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

    const paramTypes: Constructor[] = Reflect.getMetadata("design:paramtypes", target) ?? []
    const dependencies = paramTypes.map((paramType) => this.resolve(paramType))
    const instance = new target(...dependencies)

    if (injectableMetadata.scope === "singleton") {
      this.instances.set(target, instance)
    }

    return instance
  }
}
