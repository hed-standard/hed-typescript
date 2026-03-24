/**
 * Array utility functions.
 * @module
 */

import { type RecursiveArray } from './types'

/**
 * Apply a function recursively to an array.
 *
 * @param array - The array to map.
 * @param fn - The function to apply.
 * @returns The mapped array.
 */
export function recursiveMap<T, U>(array: RecursiveArray<T>, fn: (element: T) => U): RecursiveArray<U> {
  const mappedArray: RecursiveArray<U> = []
  for (const element of array) {
    if (Array.isArray(element)) {
      mappedArray.push(recursiveMap(element, fn))
    } else {
      mappedArray.push(fn(element))
    }
  }
  return mappedArray
}

/**
 * Generate an iterator over the pairwise combinations of an array.
 *
 * @param array - The array to combine.
 * @returns A generator which iterates over the list of combinations as tuples.
 */
export function* iteratePairwiseCombinations<T>(array: T[]): Generator<[T, T]> {
  const pairs = array.flatMap((first, index) => array.slice(index + 1).map((second): [T, T] => [first, second]))
  yield* pairs
}
