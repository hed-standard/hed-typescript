/** This module holds the class representing a HED string.
 * @module parser/parsedHedString
 */
import ParsedHedTag from './parsedHedTag'
import ParsedHedGroup from './parsedHedGroup'
import ParsedHedColumnSplice from './parsedHedColumnSplice'
import { filterByClass, getDuplicates } from './parseUtils'
import { IssueError } from '../issues/issues'

/**
 * A parsed HED string.
 */
export class ParsedHedString {
  /**
   * The original HED string.
   * @type {string}
   */
  hedString

  /**
   * The parsed substring data in unfiltered form.
   * @type {import('./parsedHedSubstring.js').default[]}
   */
  parseTree

  /**
   * The tag groups in the string (top-level).
   * @type {ParsedHedGroup[]}
   */
  tagGroups

  /**
   * All the top-level tags in the string.
   * @type {ParsedHedTag[]}
   */
  topLevelTags

  /**
   * All the tags in the string at all levels
   * @type {ParsedHedTag[]}
   */
  tags

  /**
   * All the column splices in the string at all levels.
   * @type {ParsedHedColumnSplice[]}
   */
  columnSplices

  /**
   * The tags in the top-level tag groups in the string, split into arrays.
   * @type {ParsedHedTag[][]}
   */
  topLevelGroupTags

  /**
   * The top-level definition tag groups in the string.
   * @type {import('./parsedHedGroup.js').default[]}
   */
  definitions

  /**
   * Constructor.
   * @param {string} hedString The original HED string.
   * @param {import('./parsedHedSubstring.js').default[]} parsedTags The nested list of parsed HED tags, groups, and column splices.
   */
  constructor(hedString, parsedTags) {
    this.hedString = hedString
    this.parseTree = parsedTags
    this.tagGroups = filterByClass(parsedTags, ParsedHedGroup)
    this.topLevelTags = filterByClass(parsedTags, ParsedHedTag)

    const subgroupTags = this.tagGroups.flatMap((tagGroup) => Array.from(tagGroup.tagIterator()))
    this.tags = this.topLevelTags.concat(subgroupTags)

    const topLevelColumnSplices = filterByClass(parsedTags, ParsedHedColumnSplice)
    const subgroupColumnSplices = this.tagGroups.flatMap((tagGroup) => Array.from(tagGroup.columnSpliceIterator()))
    this.columnSplices = topLevelColumnSplices.concat(subgroupColumnSplices)

    //this.topLevelGroupTags = this.tagGroups.map((tagGroup) => filterByClass(tagGroup.tags, ParsedHedTag))
    this.topLevelGroupTags = this.tagGroups.flatMap((tagGroup) => filterByClass(tagGroup.tags, ParsedHedTag))
    this.definitions = this.tagGroups.filter((group) => group.isDefinitionGroup)
    this.normalized = this._getNormalized()
  }

  /**
   * Nicely format this HED string. (Doesn't allow column splices).
   *
   * @param {boolean} long Whether the tags should be in long form.
   * @returns {string} The formatted HED string.
   */
  format(long = true) {
    return this.parseTree.map((substring) => substring.format(long)).join(', ')
  }

  /**
   * Return a normalized string representation.
   *
   * @returns {string} The normalized HED string.
   * @private
   */
  _getNormalized() {
    // This is an implicit recursion as the items have the same call.
    const normalizedItems = this.parseTree.map((item) => item.normalized)

    // Sort normalized items to ensure order independence
    const sortedNormalizedItems = normalizedItems.sort()
    const duplicates = getDuplicates(sortedNormalizedItems)
    if (duplicates.length > 0) {
      IssueError.generateAndThrow('duplicateTag', { tags: '[' + duplicates.join('],[') + ']', string: this.hedString })
    }
    // Return the normalized group as a string
    return `${sortedNormalizedItems.join(',')}` // Using curly braces to indicate unordered group
  }

  /**
   * Override of {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/toString | Object.prototype.toString}.
   *
   * @returns {string} The original HED string.
   */
  toString() {
    return this.hedString
  }
}

export default ParsedHedString
