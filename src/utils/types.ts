/**
 * General utility types
 * @module utils/types
 */

/**
 * A generic constructor type.
 */
export type Constructor = {
  new (...args: any[]): any
}
