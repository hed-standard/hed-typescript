import { isEqual } from 'lodash'

import SchemaEntryWithAttributes from './schemaEntryWithAttributes'
import type SchemaAttribute from './attribute'

/**
 * A schema value class.
 */
export default class SchemaValueClass extends SchemaEntryWithAttributes {
  /**
   * The character class-based regular expression.
   */
  private readonly _charClassRegex: RegExp
  /**
   * The "word form"-based regular expression.
   */
  private readonly _wordRegex: RegExp

  /**
   * Constructor.
   *
   * @param name - The name of this value class.
   * @param booleanAttributes - The boolean attributes for this value class.
   * @param valueAttributes - The value attributes for this value class.
   * @param charClassRegex - The character class-based regular expression for this value class.
   * @param wordRegex - The "word form"-based regular expression for this value class.
   */

  constructor(
    name: string,
    booleanAttributes: Set<SchemaAttribute>,
    valueAttributes: Map<SchemaAttribute, string[]>,
    charClassRegex: RegExp,
    wordRegex: RegExp,
  ) {
    super(name, booleanAttributes, valueAttributes)
    this._charClassRegex = charClassRegex
    this._wordRegex = wordRegex
  }

  /**
   * Determine if a value is valid according to this value class.
   *
   * @param value - A HED value.
   * @returns Whether the value conforms to this value class.
   */
  public validateValue(value: string): boolean {
    return this._wordRegex.test(value) && this._charClassRegex.test(value)
  }

  /**
   * Determine if this schema value class is equivalent to another schema value class.
   *
   * @remarks
   *
   * Schema value classes are deemed equivalent if they have the same name and equivalent regular expressions.
   *
   * @param other - A schema value class to compare with this one.
   * @returns Whether the other value class is equivalent to this schema value class.
   */
  public override equivalent(other: unknown): boolean {
    if (!(other instanceof SchemaValueClass)) {
      return false
    }
    if (!super.equivalent(other)) {
      return false
    }
    return isEqual(this._charClassRegex, other._charClassRegex) && isEqual(this._wordRegex, other._wordRegex)
  }
}
