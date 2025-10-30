/**
 * Type guard utilities for safe type checking and null handling
 */

/**
 * Checks if a value is defined (not null or undefined)
 * @param value Value to check
 * @returns Type guard that narrows type to non-nullable
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Checks if an object has a specific property
 * @param obj Object to check
 * @param prop Property name to check for
 * @returns Type guard that narrows type to include the property
 */
export function hasProperty<T, K extends string>(
  obj: T,
  prop: K
): obj is T & Record<K, unknown> {
  return obj !== null && typeof obj === 'object' && prop in obj;
}

/**
 * Checks if a value is a string
 * @param value Value to check
 * @returns True if value is a string
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Checks if a value is a number
 * @param value Value to check
 * @returns True if value is a number
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * Checks if a value is an array
 * @param value Value to check
 * @returns True if value is an array
 */
export function isArray<T>(value: unknown): value is T[] {
  return Array.isArray(value);
}

/**
 * Checks if a value is an object (and not null or array)
 * @param value Value to check
 * @returns True if value is a plain object
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Safely checks if an array has a valid index
 * @param array Array to check
 * @param index Index to validate
 * @returns True if index is valid
 */
export function isValidArrayIndex<T>(array: T[] | null | undefined, index: number): boolean {
  return isDefined(array) && index >= 0 && index < array.length;
}

/**
 * Type guard for error objects
 * @param error Error to check
 * @returns True if error is an Error instance
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Gets error message safely from any error type
 * @param error Error to extract message from
 * @param defaultMessage Default message if extraction fails
 * @returns Error message string
 */
export function getErrorMessage(error: unknown, defaultMessage: string = 'Unknown error'): string {
  if (isError(error)) {
    return error.message;
  }
  if (isString(error)) {
    return error;
  }
  return defaultMessage;
}

