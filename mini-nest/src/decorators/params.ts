import { Pipe } from "../interfaces/pipe.interface.js"
import { PARAMS_TOKEN } from "../tokens.js"
import { Paramdata, ParamMetadata, ParamType } from "../types/common.types.js"

// const buildParamDecorator =
//   (type: ParamType) =>
//   (name?: string): ParameterDecorator =>
//   (target, propertyKey, parameterIndex) => {
//     if (propertyKey === undefined) return
//     const paramsMap: ParamMetadata =
//       Reflect.getOwnMetadata(PARAMS_TOKEN, target, propertyKey) ?? new Map()

//     paramsMap.set(parameterIndex, { type, ...(name !== undefined && { name }) })

//     Reflect.defineMetadata(PARAMS_TOKEN, paramsMap, target, propertyKey)
//   }

// export const Body = buildParamDecorator(ParamType.BODY)
// export const Query = buildParamDecorator(ParamType.QUERY)
// export const Param = buildParamDecorator(ParamType.PARAM)

function setParamMetadata(
  target: object,
  propertyKey: string | symbol,
  parameterIndex: number,
  metadata: Paramdata,
) {
  const paramsMap: ParamMetadata =
    Reflect.getOwnMetadata(PARAMS_TOKEN, target, propertyKey) ?? new Map()

  paramsMap.set(parameterIndex, metadata)

  Reflect.defineMetadata(PARAMS_TOKEN, paramsMap, target, propertyKey)
}

export const Body =
  (pipe?: Pipe): ParameterDecorator =>
  (target, propertyKey, parameterIndex) => {
    if (propertyKey === undefined) return

    setParamMetadata(target, propertyKey, parameterIndex, {
      type: ParamType.BODY,
      pipe,
    })
  }

export const Query =
  (name?: string, pipe?: Pipe): ParameterDecorator =>
  (target, propertyKey, parameterIndex) => {
    if (propertyKey === undefined) return

    setParamMetadata(target, propertyKey, parameterIndex, {
      type: ParamType.QUERY,
      name,
      pipe,
    })
  }

export const Param =
  (name?: string, pipe?: Pipe): ParameterDecorator =>
  (target, propertyKey, parameterIndex) => {
    if (propertyKey === undefined) return

    setParamMetadata(target, propertyKey, parameterIndex, {
      type: ParamType.PARAM,
      name,
      pipe,
    })
  }
