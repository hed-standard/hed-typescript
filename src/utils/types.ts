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
 * A generic recursive array type.
 */
export interface RecursiveArray<Type> extends Array<Type | RecursiveArray<Type>> {}

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
