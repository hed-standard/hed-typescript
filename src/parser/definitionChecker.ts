/** This module holds the definition checker class.
 * @module parser/definitionChecker
 */

import type ParsedHedGroup from './parsedHedGroup'
import type ParsedHedString from './parsedHedString'
import type ParsedHedTag from './parsedHedTag'
import { getTagListString } from './parseUtils'
import { generateIssue, type Issue } from '../issues/issues'

const DEFINITION_TAGS = new Set(['Definition', 'Def', 'Def-expand'])

const DEF_GROUP_TAGS = new Set(['Definition', 'Def-expand'])

export class DefinitionChecker {
  /**
   * The HED string being checked for definitions.
   */
  private readonly hedString: ParsedHedString

  /**
   * The list of Definition tags.
   */
  private readonly definitionTags: ParsedHedTag[]

  /**
   * The list of definition group tags.
   */
  private readonly defs: ParsedHedTag[]

  /**
   * Check Def-expand or Definition syntax for compatible tags and number of groups.
   *
   * @param hedString - A group to check for Def-expand syntax.
   */
  public constructor(hedString: ParsedHedString) {
    this.hedString = hedString
    this.definitionTags = this.hedString.tags.filter((tag) => tag.schemaTag.name === 'Definition')
    this.defs = this.hedString.tags.filter((tag) => DEF_GROUP_TAGS.has(tag.schemaTag.name))
  }

  /**
   * Do syntactical checks on Definition and Def-expand (without relying on presence of the definitions).
   *
   * @param allowDefinitions - If False, definitions aren't allowed here at all.
   * @returns List of issues when
   */
  public check(allowDefinitions: boolean): Issue[] {
    // Definition checks are not relevant
    if (this.defs.length === 0) {
      return []
    }

    const definitionIssues = this._checkDefinitionContext(allowDefinitions)
    if (definitionIssues.length > 0) {
      return definitionIssues
    }

    return this._checkDefinitionStructure()
  }

  /**
   * Check that the definitions appear where they are allowed and without anything else.
   *
   * @param allowDefinitions - Whether definitions are allowed in this context.
   * @returns Any issues found.
   */
  private _checkDefinitionContext(allowDefinitions: boolean): Issue[] {
    // Definitions in a place where no definitions are allowed
    if (!allowDefinitions && this.definitionTags.length > 0) {
      return [
        generateIssue('illegalDefinitionContext', {
          definition: getTagListString(this.definitionTags),
          string: this.hedString.hedString,
        }),
      ]
    }
    // If this HED string has definitions, it cannot have column splices
    if (this.definitionTags.length > 0 && this.hedString.columnSplices.length > 0)
      return [
        generateIssue('curlyBracesInDefinition', {
          definition: getTagListString(this.definitionTags),
          sidecarKey: this.hedString.columnSplices[0].originalTag,
        }),
      ]
    // If any Def-expand or Definition tags are at the top level of the HED string
    const badDefTags = this.hedString.topLevelTags.filter((tag) => DEF_GROUP_TAGS.has(tag.schemaTag.name))
    if (badDefTags.length > 0) {
      return [
        generateIssue('missingTagGroup', {
          tag: badDefTags[0],
          string: this.hedString.hedString,
        }),
      ]
    }
    // Extra tags in a HED string with definitions.
    if (this.hedString.topLevelTags.length > 0 && this.definitionTags.length > 0) {
      return [
        generateIssue('illegalInExclusiveContext', {
          tag: this.definitionTags[0],
          string: this.hedString.hedString,
        }),
      ]
    }
    // Non-definition groups in a HED string with definitions
    let numberDefinitionGroups = 0
    for (const group of this.hedString.tagGroups) {
      if (group.isDefinitionGroup) {
        numberDefinitionGroups += 1
      }
    }
    if (numberDefinitionGroups > 0 && numberDefinitionGroups !== this.hedString.tagGroups.length) {
      return [
        generateIssue('illegalInExclusiveContext', {
          tag: this.definitionTags[0],
          string: this.hedString.hedString,
        }),
      ]
    }
    // Context okay.
    return []
  }

  /**
   * Check that the structure of the Definition and Def-expand groups are correct.
   *
   * @returns Any issues found.
   */
  private _checkDefinitionStructure(): Issue[] {
    for (const topGroup of this.hedString.tagGroups) {
      // This group has no definition group tags so go on.
      if (!topGroup.allTags.some((tag) => !DEF_GROUP_TAGS.has(tag.schemaTag.name))) {
        continue
      }
      let isTopGroup = true
      for (const group of topGroup.subParsedGroupIterator()) {
        const issues = this._checkGroupSyntax(group, isTopGroup)
        if (issues.length > 0) {
          return issues
        }
        isTopGroup = false
      }
    }
    return []
  }

  /**
   * Check the group syntax for definition and def-expand requirements.
   *
   * @param group - The group to be checked.
   * @param isTopGroup - True if this is a top group.
   * @returns Any issues found in the group structure.
   */
  private _checkGroupSyntax(group: ParsedHedGroup, isTopGroup: boolean): Issue[] {
    // If there are no definition or def-expand tags, no checks are needed.
    if (group.defExpandTags.length + group.definitionTags.length === 0) {
      return []
    }

    // Determine the base tag for error messages.
    const errorTag = group.definitionTags.length > 0 ? group.definitionTags[0] : group.defExpandTags[0]

    // Check if the Definition tag is in a top group.
    if (errorTag.schemaTag.name === 'Definition' && !isTopGroup) {
      return [generateIssue('invalidTopLevelTagGroupTag', { tag: errorTag, string: this.hedString.hedString })]
    }

    // Validate group structure: ensure one top tag and at most one top group.
    if (group.topTags.length > 1 || group.topGroups.length > 1) {
      return [generateIssue('invalidDefinitionGroupStructure', { tag: errorTag, tagGroup: group })]
    }

    // Definition or Def-expand groups can not have any Def, Definition, or Def-expand tags in subgroups.
    const forbiddenTags = group.allTags.filter((tag) => tag !== errorTag && DEFINITION_TAGS.has(tag.schemaTag.name))
    if (forbiddenTags.length > 0) {
      return [generateIssue('invalidDefinitionForbidden', { tag: errorTag, tagGroup: group })]
    }

    // Def-expand group cannot have any column splices. (Definition tags have already been checked.)
    if (group.defExpandTags.length > 0) {
      const columnSplices = [...group.columnSpliceIterator()]
      if (columnSplices.length > 0) {
        return [
          generateIssue('curlyBracesInDefinition', {
            definition: getTagListString(group.defExpandTags),
            sidecarKey: columnSplices[0].originalTag,
          }),
        ]
      }
    }
    return []
  }
}
