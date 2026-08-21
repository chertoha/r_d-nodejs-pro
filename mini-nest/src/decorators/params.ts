import { PARAMS_TOKEN } from "../tokens.js"
import { ParamMetadata, ParamType } from "../types/common.types.js"

const buildParamDecorator =
  (type: ParamType) =>
  (name?: string): ParameterDecorator =>
  (target, propertyKey, parameterIndex) => {
    if (propertyKey === undefined) return
    const paramsMap: ParamMetadata =
      Reflect.getOwnMetadata(PARAMS_TOKEN, target, propertyKey) ?? new Map()

    paramsMap.set(parameterIndex, { type, ...(name !== undefined && { name }) })

    Reflect.defineMetadata(PARAMS_TOKEN, paramsMap, target, propertyKey)
  }

export const Body = buildParamDecorator(ParamType.BODY)
export const Query = buildParamDecorator(ParamType.QUERY)
export const Param = buildParamDecorator(ParamType.PARAM)
