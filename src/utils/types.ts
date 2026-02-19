/**
 * General utility types.
 * @module utils/types
 */

import type { Issue } from '../issues/issues'

/**
 * A generic constructor type.
 */
export type Constructor<Type> = {
  new (...args: any[]): Type
}

/**
 * Determine whether an object is an instance of a given constructor.
 *
 * @param object - An object.
 * @param constructor - A constructor.
 * @returns Whether the object is an instance of the constructor.
 */
export function instanceOfConstructor<Type>(object: unknown, constructor: Constructor<Type>): object is Type {
  return object instanceof constructor
}

/**
 * A generic recursive array type.
 */
export type RecursiveArray<Type> = Array<Type | RecursiveArray<Type>>

/**
 * A value returned alongside an Issue array.
 */
export type ReturnTupleWithIssues<Type> = [Type, Issue[]]

/**
 * A value returned alongside Issue arrays representing separated errors and warnings.
 */
export type ReturnTupleWithErrorsAndWarnings<Type> = [Type, Issue[], Issue[]]

/**
 * A pair of numbers used as substring bounds.
 */
export type Bounds = [number, number]
