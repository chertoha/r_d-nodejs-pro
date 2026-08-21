import { INJECTABLE_TOKEN } from "../tokens.js"

type Scope = "singleton" | "transient"

export interface InjectableOptions {
  scope?: Scope
}

export function Injectable(options?: InjectableOptions): ClassDecorator {
  return (target: Function) => {
    Reflect.defineMetadata(INJECTABLE_TOKEN, options ?? { scope: "singleton" }, target)
  }
}
