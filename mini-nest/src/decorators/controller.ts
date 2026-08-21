import { CONTROLLER_TOKEN, INJECTABLE_TOKEN } from "../tokens.js"
import { ControllerMetadata } from "../types/common.types.js"
import { Injectable } from "./injectable.js"

export function Controller(prefix: string = "/"): ClassDecorator {
  return (target: Function) => {
    const metadata: ControllerMetadata = {
      prefix,
    }
    Reflect.defineMetadata(CONTROLLER_TOKEN, metadata, target)
    Injectable()(target)
  }
}
