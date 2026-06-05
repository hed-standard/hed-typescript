import flattenDeep from 'lodash/flattenDeep'
import zip from 'lodash/zip'

import {
  type SchemaAttribute,
  type SchemaEntryManager,
  SchemaTag,
  type SchemaUnitClass,
  type SchemaValueClass,
  SchemaValueTag,
} from '../entries'
import { getElementTagName, type HedSchemaXMLCollection, type HedSchemaXMLObject, type NodeElement } from '../xmlType'
import { SchemaEntryWithAttributesParser } from './schemaEntryParser'
import { IssueError } from '../../issues/issues'

const lc = (str: string) => str.toLowerCase()

export default class TagParser extends SchemaEntryWithAttributesParser<SchemaTag> {
  private readonly unitClasses: SchemaEntryManager<SchemaUnitClass>
  private readonly valueClasses: SchemaEntryManager<SchemaValueClass>

  public constructor(
    xmlCollection: HedSchemaXMLCollection,
    attributes: SchemaEntryManager<SchemaAttribute>,
    unitClasses: SchemaEntryManager<SchemaUnitClass>,
    valueClasses: SchemaEntryManager<SchemaValueClass>,
  ) {
    super(xmlCollection, attributes)
    this.unitClasses = unitClasses
    this.valueClasses = valueClasses
  }

  private getAllChildTags(parentElement: NodeElement, excludeTakeValueTags = true): NodeElement[] {
    if (excludeTakeValueTags && getElementTagName(parentElement) === '#') {
      return []
    }
    const childTags = [parentElement]
    const tagElementChildren = parentElement.node ?? []
    return childTags.concat(
      flattenDeep(tagElementChildren.map((child) => this.getAllChildTags(child, excludeTakeValueTags))),
    )
  }

  /**
   * Retrieve all the tags in the schema.
   *
   * @returns The tag names and XML elements.
   */
  private getAllTags(schemaXml: HedSchemaXMLObject): Map<NodeElement, string> {
    const nodeRoot = schemaXml.HED.schema
    const tagElements = []
    const tagElementChildren = nodeRoot.node
    tagElements.push(...flattenDeep(tagElementChildren.map((child) => this.getAllChildTags(child, false))))
    const tags = tagElements.map((element) => getElementTagName(element))
    return new Map(zip(tagElements, tags) as [NodeElement, string][])
  }

  /**
   * Parse the schema's tags.
   */
  protected override _parseSchema(schemaXml: HedSchemaXMLObject): void {
    const tags = this.getAllTags(schemaXml)
    const shortTags = this._getShortTags(tags)
    const parentMap = this._generateParentMap(shortTags)
    const [booleanAttributeDefinitions, valueAttributeDefinitions] = this._parseAttributeElements(
      tags.keys(),
      (element: NodeElement) => shortTags.get(element) ?? '',
    )

    const tagUnitClassDefinitions = this._processTagUnitClasses(shortTags, valueAttributeDefinitions)
    const tagValueClassDefinitions = this._processTagValueClasses(shortTags, valueAttributeDefinitions)
    this._processRecursiveAttributes(shortTags, booleanAttributeDefinitions)

    this._createSchemaTags(
      booleanAttributeDefinitions,
      valueAttributeDefinitions,
      tagUnitClassDefinitions,
      tagValueClassDefinitions,
      parentMap,
    )
  }

  /**
   * Generate the map from tag elements to shortened tag names.
   *
   * @param tags - The map from tag elements to tag strings.
   * @returns The map from tag elements to shortened tag names.
   */
  private _getShortTags(tags: Map<NodeElement, string>): Map<NodeElement, string> {
    const shortTags = new Map<NodeElement, string>()
    for (const tagElement of tags.keys()) {
      const shortKey =
        getElementTagName(tagElement) === '#' ? getParentTagName(tagElement) + '-#' : getElementTagName(tagElement)
      shortTags.set(tagElement, shortKey)
    }
    return shortTags
  }

  /**
   * Process unit classes in tags.
   *
   * @param shortTags - The map from tag elements to shortened tag names.
   * @param valueAttributeDefinitions - The map from shortened tag names to their value schema attributes.
   * @returns The map from shortened tag names to their unit classes.
   */
  private _processTagUnitClasses(
    shortTags: Map<NodeElement, string>,
    valueAttributeDefinitions: Map<string, Map<SchemaAttribute, string[]>>,
  ): Map<string, SchemaUnitClass[]> {
    const tagUnitClassAttribute = this.attributes.getEntry('unitClass')
    const tagUnitClassDefinitions = new Map<string, SchemaUnitClass[]>()
    if (!tagUnitClassAttribute) {
      return tagUnitClassDefinitions
    }

    for (const tagName of shortTags.values()) {
      const valueAttributes = valueAttributeDefinitions.get(tagName)
      if (valueAttributes?.has(tagUnitClassAttribute)) {
        const tagUnitClasses =
          valueAttributes
            ?.get(tagUnitClassAttribute)
            ?.map((unitClassName) => {
              return this.unitClasses.getEntry(unitClassName)
            })
            .filter((unitClass) => unitClass !== undefined) ?? []
        tagUnitClassDefinitions.set(tagName, tagUnitClasses)
        valueAttributes.delete(tagUnitClassAttribute)
      }
    }

    return tagUnitClassDefinitions
  }

  /**
   * Process value classes in tags.
   *
   * @param shortTags - The map from tag elements to shortened tag names.
   * @param valueAttributeDefinitions - The map from shortened tag names to their value schema attributes.
   * @returns The map from shortened tag names to their value classes.
   */
  private _processTagValueClasses(
    shortTags: Map<NodeElement, string>,
    valueAttributeDefinitions: Map<string, Map<SchemaAttribute, string[]>>,
  ): Map<string, SchemaValueClass[]> {
    const tagValueClassAttribute = this.attributes.getEntry('valueClass')
    const tagValueClassDefinitions = new Map<string, SchemaValueClass[]>()
    if (!tagValueClassAttribute) {
      return tagValueClassDefinitions
    }

    for (const tagName of shortTags.values()) {
      const valueAttributes = valueAttributeDefinitions.get(tagName)
      if (valueAttributes?.has(tagValueClassAttribute)) {
        const tagValueClasses =
          valueAttributes
            ?.get(tagValueClassAttribute)
            ?.map((valueClassName) => {
              return this.valueClasses.getEntry(valueClassName)
            })
            .filter((valueClass) => valueClass !== undefined) ?? []
        tagValueClassDefinitions.set(tagName, tagValueClasses)
        // TODO: Uncomment once value validation uses value classes.
        // valueAttributes.delete(tagValueClassAttribute)
      }
    }

    return tagValueClassDefinitions
  }

  /**
   * Process recursive schema attributes.
   *
   * @param shortTags - The map from tag elements to shortened tag names.
   * @param booleanAttributeDefinitions - The map from shortened tag names to their boolean schema attributes. Passed by reference.
   */
  private _processRecursiveAttributes(
    shortTags: Map<NodeElement, string>,
    booleanAttributeDefinitions: Map<string, Set<SchemaAttribute>>,
  ): void {
    const recursiveAttributeMap = this._generateRecursiveAttributeMap(shortTags, booleanAttributeDefinitions)

    for (const [tagElement, recursiveAttributes] of recursiveAttributeMap) {
      for (const childTag of this.getAllChildTags(tagElement)) {
        const childTagName = getElementTagName(childTag)
        const newBooleanAttributes =
          booleanAttributeDefinitions.get(childTagName)?.union(recursiveAttributes) ?? new Set<SchemaAttribute>()
        booleanAttributeDefinitions.set(childTagName, newBooleanAttributes)
      }
    }
  }

  /**
   * Generate a map from tags to their recursive attributes.
   *
   * @param shortTags - The map from tag elements to shortened tag names.
   * @param booleanAttributeDefinitions - The map from shortened tag names to their boolean schema attributes. Passed by reference.
   */
  private _generateRecursiveAttributeMap(
    shortTags: Map<NodeElement, string>,
    booleanAttributeDefinitions: Map<string, Set<SchemaAttribute>>,
  ): Map<NodeElement, Set<SchemaAttribute>> {
    const recursiveAttributes = new Set(this.attributes.filter(([, attribute]) => attribute.recursive).values())
    const recursiveAttributeMap = new Map<NodeElement, Set<SchemaAttribute>>()

    for (const [tagElement, tagName] of shortTags) {
      recursiveAttributeMap.set(
        tagElement,
        booleanAttributeDefinitions.get(tagName)?.intersection(recursiveAttributes) ?? new Set<SchemaAttribute>(),
      )
    }

    return recursiveAttributeMap
  }

  /**
   * Create the {@link SchemaTag} objects.
   *
   * @param booleanAttributeDefinitions - The map from shortened tag names to their boolean schema attributes.
   * @param valueAttributeDefinitions - The map from shortened tag names to their value schema attributes.
   * @param tagUnitClassDefinitions - The map from shortened tag names to their unit classes.
   * @param tagValueClassDefinitions - The map from shortened tag names to their value classes.
   * @param parentMap - The map from each tag name to its parent tag name.
   * @returns The map from lowercase shortened tag names to their tag objects.
   */
  private _createSchemaTags(
    booleanAttributeDefinitions: Map<string, Set<SchemaAttribute>>,
    valueAttributeDefinitions: Map<string, Map<SchemaAttribute, string[]>>,
    tagUnitClassDefinitions: Map<string, SchemaUnitClass[]>,
    tagValueClassDefinitions: Map<string, SchemaValueClass[]>,
    parentMap: Map<string, string>,
  ): void {
    const tagTakesValueAttribute = this.attributes.getEntry('takesValue')
    if (!tagTakesValueAttribute) {
      IssueError.generateAndThrow('invalidSchema', { error: 'The required takesValue attribute was not found' })
    }

    for (const [name, valueAttributes] of valueAttributeDefinitions) {
      const booleanAttributes = booleanAttributeDefinitions.get(name) ?? new Set<SchemaAttribute>()
      const unitClasses = tagUnitClassDefinitions.get(name) ?? []
      const valueClasses = tagValueClassDefinitions.get(name) ?? []
      const parentTagName = parentMap.get(lc(name))
      const parentTag = parentTagName ? this.entryTypeMap.get(parentTagName) : undefined

      if (booleanAttributes.has(tagTakesValueAttribute)) {
        this.addEntry(
          name,
          new SchemaValueTag(name, parentTag, booleanAttributes, valueAttributes, unitClasses, valueClasses),
        )
      } else {
        this.addEntry(
          name,
          new SchemaTag(name, parentTag, booleanAttributes, valueAttributes, unitClasses, valueClasses),
        )
      }
    }
  }

  /**
   * Add a new tag while checking for duplicates.
   *
   * Override of {@link SchemaEntryParser.addEntry} to change the issue message.
   *
   * @param shortTagName - The short tag name.
   * @param newTag - The new tag object to add.
   */
  protected override addEntry(shortTagName: string, newTag: SchemaTag): void {
    const lowercaseName = lc(shortTagName)
    if (this.entryTypeMap.has(lowercaseName)) {
      if (!newTag.equivalent(this.entryTypeMap.get(lowercaseName))) {
        IssueError.generateAndThrow('lazyPartneredSchemasShareTag', { tag: shortTagName })
      }
    } else {
      this.entryTypeMap.set(lowercaseName, newTag)
    }
  }

  /**
   * Generate a map from each tag name to its parent tag name.
   *
   * @param shortTags - The map from tag elements to shortened tag names.
   * @returns A map from each tag name to its parent tag name.
   */
  private _generateParentMap(shortTags: Map<NodeElement, string>): Map<string, string> {
    const parentMap = new Map<string, string>()
    for (const tagElement of shortTags.keys()) {
      if (!tagElement.$parent) {
        continue
      }

      const tagName = lc(shortTags.get(tagElement) ?? '')
      const parentTagName = lc(shortTags.get(tagElement.$parent) ?? '')
      parentMap.set(tagName, parentTagName)
    }
    return parentMap
  }
}

export function getParentTagName(tagElement: NodeElement): string {
  const parentTagElement = tagElement.$parent
  if (parentTagElement?.$parent) {
    return getElementTagName(parentTagElement)
  } else {
    return ''
  }
}
