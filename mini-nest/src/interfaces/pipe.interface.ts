export interface Pipe {
  transform(value: unknown): unknown | Promise<unknown>
}
