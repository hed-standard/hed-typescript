/** This module holds the column splice class.
 * @module parser/parsedHedColumnSplice
 */

import ParsedHedSubstring from './parsedHedSubstring'

/**
 * A template for an inline column splice in a HED string.
 *
 * @see {@link ParsedHedString}
 * @see {@link ParsedHedGroup}
 */
export default class ParsedHedColumnSplice extends ParsedHedSubstring {
  /**
   * The normalized string representation of this column splice.
   */
  private readonly _normalized: string

  /**
   * Constructor.
   *
   * @param columnName The name of the referenced column.
   * @param bounds The bounds of the column splice.
   */
  public constructor(columnName: string, bounds: [number, number]) {
    super(columnName, bounds) // Sets originalTag and originalBounds
    this._normalized = this.format(false) // Sets various forms of the tag.
  }

  /**
   * Get the normalized version of the object.
   */
  public get normalized(): string {
    return this._normalized
  }

  /**
   * Nicely format this column splice template.
   *
   * @param long Whether the tags should be in long form.
   * @returns The formatted column splice template.
   */
  // eslint-disable-next-line no-unused-vars
  public format(long: boolean = true): string {
    return '{' + this.originalTag + '}'
  }

  /**
   * Determine if this column splice is equivalent to another.
   *
   * @param other The other column splice.
   * @returns Whether the two column splices are equivalent.
   */
  public equivalent(other: unknown): boolean {
    return other instanceof ParsedHedColumnSplice && this.originalTag === other.originalTag
  }
}
