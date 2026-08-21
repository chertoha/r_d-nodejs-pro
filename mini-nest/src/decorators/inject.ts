import { INJECT_TOKENS } from "../tokens.js"

export function Inject(token: symbol): ParameterDecorator {
  return (target, _propertyKey, parameterIndex) => {
    const existingTokens: Map<number, symbol> =
      Reflect.getOwnMetadata(INJECT_TOKENS, target) ?? new Map()

    existingTokens.set(parameterIndex, token)

    Reflect.defineMetadata(INJECT_TOKENS, existingTokens, target)
  }
}
