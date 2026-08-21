import { HttpMethod } from "./http.types.js"

export type Constructor<T extends object = object> = new (...args: any[]) => T

export interface ControllerMetadata {
  prefix: string
}

export interface RouteMetadata {
  method: HttpMethod
  path: string
}

export enum ParamType {
  BODY = "body",
  QUERY = "query",
  PARAM = "param",
}

export interface Paramdata {
  type: ParamType
  name?: string
}

export type ParamMetadata = Map<number, Paramdata>

export type ControllerInstance = Record<string, (...args: unknown[]) => unknown>
