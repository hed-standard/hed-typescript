/** This module holds classes to encapsulate and manage HED definitions.
 * @module parser/definitionManager
 */
import { generateIssue } from '../issues/issues'
import { parseHedString } from './parser'
import { filterByTagName } from './parseUtils'

export class Definition {
  /**
   * The name of the definition.
   * @type {string}
   */
  name

  /**
   * The name of the definition.
   * @type {ParsedHedTag}
   */
  defTag

  /**
   * The parsed HED group representing the definition
   * @type {ParsedHedGroup}
   */
  defGroup

  /**
   * The definition contents group
   * @type {ParsedHedGroup}
   */
  defContents

  /**
   * If definition, this is the second value, otherwise empty string.
   * @type {string}
   */
  placeholder

  /**
   * A single definition
   *
   * @param {ParsedHedGroup} definitionGroup - the parsedHedGroup representing the definition.
   * @param {boolean} _isPrivateConstruction - Internal parameter to prevent direct construction
   * @private
   */
  constructor(definitionGroup, _isPrivateConstruction = false) {
    if (!_isPrivateConstruction) {
      throw new Error(
        'Definition instances must be created using Definition.createDefinition() or Definition.createDefinitionFromGroup() static methods',
      )
    }
    this.defGroup = definitionGroup
  }

  /**
   * Return the evaluated definition contents and any issues.
   * @param {ParsedHedTag} tag - The parsed HED tag whose details should be checked.
   * @param {HedSchemas} hedSchema - The HED schemas used to validate against.
   * @param {boolean} placeholderAllowed - If true then placeholder is allowed in the def tag.
   * @returns {Array} - Returns [string, Issue[], Issue[]] containing the evaluated normalized definition string and any issues in the evaluation,
   */
  evaluateDefinition(tag, hedSchema, placeholderAllowed) {
    // Check that the level of the value of tag agrees with the definition
    if (!!this.defTag._splitValue !== !!tag._splitValue) {
      const errorType = tag.schemaTag.name === 'Def' ? 'missingDefinitionForDef' : 'missingDefinitionForDefExpand'
      return [null, [generateIssue(errorType, { definition: tag._value })], []]
    }
    // Check that the evaluated definition contents okay (if two-level value)
    if (!this.defContents) {
      return ['', [], []]
    }
    if (!this.defTag._splitValue || (placeholderAllowed && tag._splitValue === '#')) {
      return [this.defContents.normalized, [], []]
    }
    const evalString = this.defContents.originalTag.replace('#', tag._splitValue)
    const [normalizedValue, errorIssues, warningIssues] = parseHedString(evalString, hedSchema, false, false, true)
    if (errorIssues.length > 0) {
      return [null, errorIssues, warningIssues]
    }
    return [normalizedValue.normalized, [], []]
  }

  /**
   * Return true if this definition is the same as the other.
   * @param {Definition} other - Another definition to compare with this one.
   * @returns {boolean} - True if the definitions are equivalent
   */
  equivalent(other) {
    if (this.name !== other.name || this.defTag._splitValue !== other.defTag._splitValue) {
      return false
    } else if (this.defContents?.normalized !== other.defContents?.normalized) {
      return false
    }
    return true
  }

  /**
   * Verify that the placeholder count is correct in the definition.
   * @returns {string} - The empty string if the placeholder count is correct, otherwise an error message.
   * @private
   */
  _checkDefinitionPlaceholderCount() {
    const placeholderCount = this.defContents ? this.defContents.originalTag.split('#').length - 1 : 0
    if (this.placeholder && placeholderCount !== 1) {
      return `The definition should have 1 placeholder but has ${placeholderCount} #s.`
    } else if (!this.placeholder && placeholderCount !== 0) {
      return `The definition should have no placeholders but has ${placeholderCount} #s.`
    }
    return ''
  }

  /**
   * Create a list of Definition objects from a list of strings.
   *
   * @param {string} hedString - A string representing a definition.
   * @param {HedSchemas} hedSchemas - The HED schemas to use in creation.
   * @returns {Array} - Returns [Definition, Issue[], Issue[]] with the definition and any issues.
   */
  static createDefinition(hedString, hedSchemas) {
    const [parsedString, errorIssues, warningIssues] = parseHedString(hedString, hedSchemas, true, true, true)
    if (errorIssues.length > 0) {
      return [null, errorIssues, warningIssues]
    }
    if (parsedString.topLevelTags.length !== 0) {
      return [
        null,
        [
          generateIssue('invalidDefinition', {
            definition: hedString,
            msg: `There are extra tags outside the definition's defining group`,
          }),
        ],
        warningIssues,
      ]
    } else if (parsedString.tagGroups.length !== 1 && parsedString.tagGroups.length !== 0) {
      return [
        null,
        [
          generateIssue('invalidDefinition', {
            definition: hedString,
            msg: `There are too many tag groups inside the definition.`,
          }),
        ],
        warningIssues,
      ]
    }
    const [def, defIssues, defWarnings] = Definition.createDefinitionFromGroup(parsedString.tagGroups[0])
    return [def, defIssues, [...defWarnings, ...warningIssues]]
  }

  /**
   * Create a definition from a ParsedHedGroup.
   * @param {ParsedHedGroup} group - The group to create a definition from.
   * @returns {Array} - Returns [Definition, Issue[], Issue[]] with the definition and any issues. (The definition will be null if issues.)
   */
  static createDefinitionFromGroup(group) {
    const def = new Definition(group, true)
    if (group.topTags.length !== 1 || group.topTags[0].schemaTag.name !== 'Definition') {
      return [
        null,
        [generateIssue('invalidDefinition', { definition: group.originalTag, msg: `There was no Definition tag.` })],
        [],
      ]
    }
    def.defTag = group.topTags[0]
    def.name = def.defTag._value
    def.placeholder = def.defTag._splitValue
    def.defContents = group.topGroups.length > 0 ? group.topGroups[0] : null
    const countErrorMsg = def._checkDefinitionPlaceholderCount()
    if (countErrorMsg.length === 0) {
      return [def, [], []]
    }
    return [
      null,
      [generateIssue('invalidPlaceholderInDefinition', { definition: def.defGroup.originalTag, msg: countErrorMsg })],
      [],
    ]
  }
}

export class DefinitionManager {
  /**
   * Definitions for this manager (string --> Definition).
   * @type {Map}
   */
  definitions

  constructor() {
    this.definitions = new Map()
  }

  /**
   * Add the non-null definitions to this manager.
   * @param {Definition[]} defs - The list of definitions to add to this manager.
   * @returns {Issue[]} - Issues encountered in adding the definition.
   */
  addDefinitions(defs) {
    const issues = []
    for (const def of defs) {
      issues.push(...this.addDefinition(def))
    }
    return issues
  }

  /**
   * Add a Definition object to this manager
   * @param {Definition} definition - The definition to be added.
   * @returns {Issue[]}
   */
  addDefinition(definition) {
    const lowerName = definition.name.toLowerCase()
    const existingDefinition = this.definitions.get(lowerName)
    if (existingDefinition && !existingDefinition.equivalent(definition)) {
      return [
        generateIssue('conflictingDefinitions', {
          definition1: definition.defTag.originalTag,
          definition2: existingDefinition.defGroup.originalTag,
        }),
      ]
    }
    if (!existingDefinition) {
      this.definitions.set(lowerName, definition)
    }
    return []
  }

  /**
   * Check the Def tags in a HED string for missing or incorrectly used Def tags.
   * @param {ParsedHedString} hedString - A parsed HED string to be checked.
   * @param {HedSchemas} hedSchemas - Schemas to validate against.
   * @param {boolean} placeholderAllowed - If true then placeholder is allowed in the def tag.
   * @returns {Issue[]} - If there is no matching definition or definition applied incorrectly.
   */
  validateDefs(hedString, hedSchemas, placeholderAllowed) {
    const defTags = filterByTagName(hedString.tags, 'Def')
    const issues = []
    for (const tag of defTags) {
      const defIssues = this.evaluateTag(tag, hedSchemas, placeholderAllowed)[1]
      if (defIssues.length > 0) {
        issues.push(...defIssues)
      }
    }
    return issues
  }

  /**
   * Check the Def tags in a HED string for missing or incorrectly used Def-expand tags.
   * @param {ParsedHedString} hedString - A parsed HED string to be checked.
   * @param {HedSchemas} hedSchemas - Schemas to validate against.
   * @param {boolean} placeholderAllowed - If true then placeholder is allowed in the def tag.
   * @returns {Issue[]} - If there is no matching definition or definition applied incorrectly.
   */
  validateDefExpands(hedString, hedSchemas, placeholderAllowed) {
    //Def-expand tags should be rare, so don't look if there aren't any Def-expand tags
    const defExpandTags = filterByTagName(hedString.tags, 'Def-expand')
    if (defExpandTags.length === 0) {
      return []
    }
    const issues = []
    for (const topGroup of hedString.tagGroups) {
      issues.push(...this._checkDefExpandGroup(topGroup, hedSchemas, placeholderAllowed))
    }
    return issues
  }

  /**
   * Evaluate the definition based on a parsed HED tag.
   * @param {ParsedHedTag} tag - The tag to evaluate against the definitions.
   * @param {HedSchemas} hedSchemas - The schemas to be used to assist in the evaluation.
   * @param {boolean} placeholderAllowed - If true then placeholder is allowed in the def tag.
   * @returns {Array} - Returns [string, Issue[]] with definition contents for this tag and any issues.
   *
   * Note: If the tag is not a Def or Def-expand, this returns null for the string and [] for the issues.
   */
  evaluateTag(tag, hedSchemas, placeholderAllowed) {
    const [definition, missingIssues] = this.findDefinition(tag)
    if (missingIssues.length > 0) {
      return [null, missingIssues]
    } else if (definition) {
      return definition.evaluateDefinition(tag, hedSchemas, placeholderAllowed)
    }
    return [null, []]
  }

  /**
   * Recursively check for Def-expand groups in this group.
   * @param {ParsedHedGroup} topGroup - a top group in a HED string to be evaluated for Def-expand groups.
   * @param {HedSchemas} hedSchemas - The HED schemas to used in the check.
   * @param {boolean} placeholderAllowed - If true then placeholder is allowed in the def tag.
   * @returns {Issue[]}
   * @private
   */
  _checkDefExpandGroup(topGroup, hedSchemas, placeholderAllowed) {
    const issues = []
    for (const group of topGroup.subParsedGroupIterator('Def-expand')) {
      if (group.defExpandTags.length === 0) {
        continue
      }
      // There should be only one Def-expand in this group as reserved requirements have been checked at parsing time.
      const [normalizedValue, normalizedIssues] = this.evaluateTag(
        group.defExpandTags[0],
        hedSchemas,
        placeholderAllowed,
      )
      issues.push(...normalizedIssues)
      if (normalizedIssues.length > 0) {
        continue
      }
      if (group.topGroups.length === 0 && normalizedValue !== '') {
        issues.push(generateIssue('defExpandContentsInvalid', { contents: '', defContents: normalizedValue }))
      } else if (group.topGroups.length > 0 && group.topGroups[0].normalized !== normalizedValue) {
        issues.push(
          generateIssue('defExpandContentsInvalid', {
            contents: group.topGroups[0].normalized,
            defContents: normalizedValue,
          }),
        )
      }
    }
    return issues
  }

  /**
   * Find the definition associated with a tag, if any
   * @param {ParsedHedTag} tag - The parsed HEd tag to be checked.
   * @returns {Array} -Returns [Definition, Issue[]]. If no match is found, the first element is null.
   */
  findDefinition(tag) {
    if (tag.schemaTag._name !== 'Def' && tag.schemaTag.name !== 'Def-expand') {
      return [null, []]
    }
    const name = tag._value.toLowerCase()
    const existingDefinition = this.definitions.get(name)
    const errorType = tag.schemaTag.name === 'Def' ? 'missingDefinitionForDef' : 'missingDefinitionForDefExpand'
    if (!existingDefinition) {
      return [null, [generateIssue(errorType, { definition: name })]]
    }
    if (!!existingDefinition.defTag._splitValue !== !!tag._splitValue) {
      return [null, [generateIssue(errorType, { definition: name })]]
    }
    return [existingDefinition, []]
  }

  /**
   * Create a list of Definition objects from a list of strings.
   *
   * @param {string[]} defStrings - A list of string definitions.
   * @param {HedSchemas} hedSchemas - The HED schemas to use in creation.
   * @returns {Array} - Returns [Definition[], Issue[]] with a definition list and any issues found.
   */
  static createDefinitions(defStrings, hedSchemas) {
    const defList = []
    const issues = []
    for (const defString of defStrings) {
      const [nextDef, defErrors, defWarnings] = Definition.createDefinition(defString, hedSchemas)
      if (nextDef) {
        defList.push(nextDef)
      }
      issues.push(...defErrors)
      issues.push(...defWarnings)
    }
    return [defList, issues]
  }
}
