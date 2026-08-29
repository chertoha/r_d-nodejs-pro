export function resolvePath(prefix: string, path: string): string {
  const parts = [prefix, path].flatMap((part) => part.split("/")).filter(Boolean)
  return `/${parts.join("/")}`
}
