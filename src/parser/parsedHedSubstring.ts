/**
 * A parsed HED substring.
 * @module parser/parsedHedSubstring
 */
export abstract class ParsedHedSubstring {
  /**
   * The original pre-parsed version of the HED tag.
   */
  originalTag: string
  /**
   * The bounds of the HED tag in the original HED string.
   */
  originalBounds: number[]

  /**
   * Constructor.
   *
   * @param originalTag The original HED tag.
   * @param originalBounds The bounds of the HED tag in the original HED string.
   */
  protected constructor(originalTag: string, originalBounds: number[]) {
    this.originalTag = originalTag
    this.originalBounds = originalBounds
  }

  /**
   * Nicely format this substring.
   *
   * @param long Whether the tags should be in long form.
   * @returns A nicely formatted version of this substring.
   * @abstract
   */
  public abstract format(long: boolean): string

  /**
   * Get the normalized version of the object.
   *
   * @returns The normalized version of this substring.
   */
  public get normalized(): string {
    return ''
  }

  /**
   * Determine if this substring is equivalent to another.
   *
   * @param other The other substring.
   * @returns Whether the two substrings are equivalent.
   */
  public abstract equivalent(other: unknown): boolean

  /**
   * Override of {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/toString Object.prototype.toString}.
   *
   * @returns The original form of this HED substring.
   */
  public toString(): string {
    return this.originalTag
  }
}

export default ParsedHedSubstring
