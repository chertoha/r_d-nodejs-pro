import { AsyncLocalStorage } from "node:async_hooks"

interface RequestStore {
  requestId: string
}

const storage = new AsyncLocalStorage<RequestStore>()

export const requestContext = {
  run<T>(requestId: string, callback: () => T): T {
    return storage.run({ requestId }, callback)
  },

  requestId(): string | undefined {
    return storage.getStore()?.requestId
  },
}
