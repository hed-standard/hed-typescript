/**
 * General utility types.
 * @module utils/types
 */

/**
 * A generic constructor type.
 */
export type Constructor<Type> = {
  new (...args: any[]): Type
}

/**
 * A generic recursive array type.
 */
export interface RecursiveArray<Type> extends Array<Type | RecursiveArray<Type>> {}
