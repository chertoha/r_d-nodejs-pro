import { ROUTE_TOKEN } from "../tokens.js"
import { RouteMetadata } from "../types/common.types.js"
import { HttpMethod } from "../types/http.types.js"

const buildRoute =
  (method: HttpMethod) =>
  (path: string = "/"): MethodDecorator => {
    const metadata: RouteMetadata = {
      method,
      path,
    }

    return (target, propertyKey) => {
      Reflect.defineMetadata(ROUTE_TOKEN, metadata, target, propertyKey)
    }
  }

export const Get = buildRoute(HttpMethod.GET)
export const Post = buildRoute(HttpMethod.POST)
