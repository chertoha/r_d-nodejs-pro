import { CONTROLLER_TOKEN, PARAMS_TOKEN, ROUTE_TOKEN } from "./tokens.js"
import {
  Constructor,
  ControllerMetadata,
  ParamMetadata,
  RouteMetadata,
} from "./types/common.types.js"
import { HttpMethod } from "./types/http.types.js"
import { resolvePath } from "./utils/resolvePath.js"

export interface Route {
  method: HttpMethod
  path: string
  controller: Constructor
  handlerName: string
  params: ParamMetadata
}

export interface RouteMatch {
  route: Route
  pathParams: Record<string, string>
}

export class Router {
  private routes: Route[] = []

  constructor(controllers: Constructor[]) {
    this.register(controllers)
  }

  private register(controllers: Constructor[]) {
    for (const controller of controllers) {
      const controllerMetadata = Reflect.getMetadata(
        CONTROLLER_TOKEN,
        controller,
      ) as ControllerMetadata

      if (!controllerMetadata) throw new Error(`${controller} is not a decorated Controller `)

      const controllerFields = Object.getOwnPropertyNames(controller.prototype)

      for (const field of controllerFields) {
        if (field === "constructor") continue

        const fieldMetadata = Reflect.getMetadata(
          ROUTE_TOKEN,
          controller.prototype,
          field,
        ) as RouteMetadata

        if (!fieldMetadata) continue

        const paramsMetadata = Reflect.getMetadata(
          PARAMS_TOKEN,
          controller.prototype,
          field,
        ) as ParamMetadata

        const { prefix } = controllerMetadata
        const { method, path } = fieldMetadata
        const params = paramsMetadata ?? new Map()

        this.routes.push({
          path: resolvePath(prefix, path),
          method,
          controller,
          handlerName: field,
          params,
        })
      }
    }
  }

  find(method: HttpMethod, requestPath: string): RouteMatch | undefined {
    for (const route of this.routes) {
      if (route.method !== method) continue

      const pathParams = this.matchPath(requestPath, route.path)

      if (pathParams === null) continue

      return {
        route,
        pathParams,
      }
    }
  }

  private matchPath(requestPath: string, routePath: string) {
    const routeParts = routePath.split("/").filter(Boolean)
    const requestParts = requestPath.split("/").filter(Boolean)

    if (routeParts.length !== requestParts.length) {
      return null
    }

    const pathParams: Record<string, string> = {}

    for (let i = 0; i < routeParts.length; i++) {
      const requestPart = requestParts[i]
      const routePart = routeParts[i]

      if (routePart.startsWith(":")) {
        const paramName = routePart.slice(1)
        pathParams[paramName] = requestPart
        continue
      }

      if (requestPart !== routePart) return null
    }

    return pathParams
  }
}
