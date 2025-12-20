/**
 * General utility types
 * @module utils/types
 */

/**
 * A generic constructor type.
 */
export type Constructor<Type> = {
  new (...args: any[]): Type
}
