/**
 * Reads a property from API JSON when the backend may use PascalCase (.NET default)
 * or camelCase (e.g. some hosts configure JsonNamingPolicy.CamelCase).
 */
export function jsonProp<T = unknown>(
  obj: Record<string, unknown> | null | undefined,
  ...names: string[]
): T | undefined {
  if (!obj) {
    return undefined;
  }
  for (const n of names) {
    if (Object.prototype.hasOwnProperty.call(obj, n) && obj[n] !== undefined && obj[n] !== null) {
      return obj[n] as T;
    }
  }
  return undefined;
}
