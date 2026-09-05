import { INJECT_TOKENS } from "../tokens.js"

export type InjectionToken = string | symbol

export function Inject(token: InjectionToken): ParameterDecorator {
  return (target, _propertyKey, parameterIndex) => {
    const existingTokens: Map<number, InjectionToken> =
      Reflect.getOwnMetadata(INJECT_TOKENS, target) ?? new Map()

    existingTokens.set(parameterIndex, token)

    Reflect.defineMetadata(INJECT_TOKENS, existingTokens, target)
  }
}
