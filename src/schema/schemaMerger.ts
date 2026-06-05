/**
 * This module holds the classes for merging partnered schemas.
 * @module schema/schemaMerger
 */

import { IssueError } from '../issues/issues'
import { type SchemaAttribute, type SchemaEntries, SchemaEntryManager, SchemaTag, SchemaValueTag } from './entries'
import { type HedSchema } from './containers'
import { type HedSchemaXMLObject } from './xmlType'
import SchemaParser from './parser/schemaParser'

export default class HedSchemaMerger {
  /**
   * The sources of data to be merged.
   */
  sourceXmls: HedSchemaXMLObject[]

  /**
   * The current source of data to be merged.
   */
  currentSource: HedSchemaXMLObject

  /**
   * The destination of data to be merged.
   */
  destination: HedSchema

  /**
   * The tag definitions of the partnered schema
   */
  destinationTagDefinitions: Map<string, SchemaTag>

  /**
   * Constructor.
   *
   * @param destinationSchema - The destination schema.
   * @param sourceXmls - The sources of data to be merged.
   */
  constructor(destinationSchema: HedSchema, sourceXmls: HedSchemaXMLObject[]) {
    this.destination = destinationSchema
    this.sourceXmls = sourceXmls
    this.destinationTagDefinitions = this.destination.entries.tags.definitions
  }

  /**
   * Merge the lazy partnered schemas.
   *
   * @returns The merged partnered schema.
   */
  public mergeSchemas(): HedSchema {
    for (const additionalSchema of this.sourceXmls) {
      this.currentSource = additionalSchema
      if (!additionalSchema.HED.$.unmerged) {
        const sourceEntries = new SchemaParser(additionalSchema.HED).parse()
        this._mergeMergedSchemaData(sourceEntries)
      }
    }
    return this.destination
  }

  /**
   * Merge two pre-merged partnered schemas.
   *
   * @param entries - The source schema's entries.
   */
  private _mergeMergedSchemaData(entries: SchemaEntries): void {
    this._mergeTags(entries.tags)
  }

  /**
   * Merge the tags from two pre-merged partnered schemas.
   *
   * @param sourceTags - The source schema's tags.
   */
  private _mergeTags(sourceTags: SchemaEntryManager<SchemaTag>): void {
    for (const tag of sourceTags.values()) {
      this._mergeTag(tag)
    }
    this.destination.entries.tags = new SchemaEntryManager(this.destinationTagDefinitions)
  }

  /**
   * Merge a tag from one schema to another.
   *
   * @param tag - The tag to copy.
   */
  private _mergeTag(tag: SchemaTag): void {
    if (!tag.getAttributeValues('inLibrary')) {
      return
    }

    const shortName = tag.name
    if (this.destinationTagDefinitions.has(shortName.toLowerCase())) {
      IssueError.generateAndThrow('lazyPartneredSchemasShareTag', { tag: shortName })
    }

    const rootedTagShortName = tag.getSingleAttributeValue('rooted')
    if (rootedTagShortName) {
      const parentTag = tag.parent
      if (parentTag?.name?.toLowerCase() !== rootedTagShortName.toLowerCase()) {
        IssueError.generateAndThrowInternalError(`Node ${shortName} is improperly rooted.`)
      }
    }

    this._copyTagToSchema(tag)
  }

  /**
   * Copy a tag from one schema to another.
   *
   * @param tag - The tag to copy.
   */
  private _copyTagToSchema(tag: SchemaTag): void {
    const booleanAttributes = new Set<SchemaAttribute>()
    const valueAttributes = new Map<SchemaAttribute, string[]>()

    for (const attribute of tag.booleanAttributes) {
      booleanAttributes.add(this.destination.entries.attributes.getEntry(attribute.name) ?? attribute)
    }
    for (const [key, value] of tag.valueAttributes) {
      valueAttributes.set(this.destination.entries.attributes.getEntry(key.name) ?? key, value)
    }

    const unitClasses = tag.unitClasses.map(
      (unitClass) => this.destination.entries.unitClasses.getEntry(unitClass.name) ?? unitClass,
    )
    const valueClasses = tag.valueClasses.map(
      (valueClass) => this.destination.entries.valueClasses.getEntry(valueClass.name) ?? valueClass,
    )

    let newTag
    if (tag instanceof SchemaValueTag) {
      newTag = new SchemaValueTag(tag.name, booleanAttributes, valueAttributes, unitClasses, valueClasses)
    } else {
      newTag = new SchemaTag(tag.name, booleanAttributes, valueAttributes, unitClasses, valueClasses)
    }
    const destinationParentTag = this.destinationTagDefinitions.get(tag.parent?.name?.toLowerCase())
    if (destinationParentTag) {
      newTag.parent = destinationParentTag
      if (newTag instanceof SchemaValueTag) {
        newTag.parent.valueTag = newTag
      }
    }

    this.destinationTagDefinitions.set(newTag.name.toLowerCase(), newTag)
  }
}
