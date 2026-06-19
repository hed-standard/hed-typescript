import type SchemaEntry from '../entries/schemaEntry'
import SchemaEntryManager from '../entries/schemaEntryManager'
import type SchemaEntryWithAttributes from '../entries/schemaEntryWithAttributes'
import type SchemaAttribute from '../entries/attribute'
import {
  getElementTagName,
  type DefinitionElement,
  type NamedElement,
  type HedSchemaXMLCollection,
  type HedSchemaXMLObject,
} from '../xmlType'

import { IssueError } from '../../issues/issues'

/**
 * A parser for a specific {@link SchemaEntry} subtype.
 *
 * @typeParam T - The subclass of {@link SchemaEntry} the implementation parses.
 */
export abstract class SchemaEntryParser<T extends SchemaEntry> {
  /**
   * The collection of XML data for a given prefix.
   */
  protected readonly xmlCollection: HedSchemaXMLCollection

  /**
   * The map of names to entry objects for this entry type.
   */
  protected readonly entryTypeMap: Map<string, T>

  /**
   * Constructor.
   *
   * @param xmlCollection - A collection of XML data for a given prefix.
   */
  protected constructor(xmlCollection: HedSchemaXMLCollection) {
    this.xmlCollection = xmlCollection
    this.entryTypeMap = new Map<string, T>()
  }

  /**
   * Parse this entry type across all schemas in the collection.
   *
   * @returns An entry manager for this entry type.
   * @internal
   */
  public parse(): SchemaEntryManager<T> {
    this._parseSchema(this.xmlCollection.baseSchema)
    for (const mergedSchema of this.xmlCollection.mergedSchemas) {
      this._parseSchema(mergedSchema)
    }
    for (const unmergedSchema of this.xmlCollection.unmergedSchemas) {
      this._parseSchema(unmergedSchema)
    }
    this._addCustomEntries()
    return new SchemaEntryManager(this.entryTypeMap)
  }

  /**
   * Add a new entry while checking for duplicates.
   *
   * @param newEntryName - The entry name.
   * @param newEntry - The new entry object to add.
   */
  protected addEntry(newEntryName: string, newEntry: T): void {
    if (this.entryTypeMap.has(newEntryName)) {
      if (!newEntry.equivalent(this.entryTypeMap.get(newEntryName))) {
        IssueError.generateAndThrow('lazyPartneredSchemasShareEntry', { entryName: newEntryName })
      }
    } else {
      this.entryTypeMap.set(newEntryName, newEntry)
    }
  }

  /**
   * Parse this entry type for a specific schema.
   *
   * @param schemaXml - The XML for a specific schema.
   */
  protected abstract _parseSchema(schemaXml: HedSchemaXMLObject): void

  /**
   * Add any custom entries required by the platform to support old versions.
   */
  protected _addCustomEntries(): void {}
}

export abstract class SchemaEntryWithAttributesParser<
  T extends SchemaEntryWithAttributes,
> extends SchemaEntryParser<T> {
  protected readonly attributes: SchemaEntryManager<SchemaAttribute>

  protected constructor(xmlCollection: HedSchemaXMLCollection, attributes: SchemaEntryManager<SchemaAttribute>) {
    super(xmlCollection)
    this.attributes = attributes
  }

  protected _parseDefinitions(
    definitionElements: Iterable<DefinitionElement>,
  ): [Map<string, Set<SchemaAttribute>>, Map<string, Map<SchemaAttribute, string[]>>] {
    return this._parseAttributeElements(definitionElements, getElementTagName)
  }

  protected _parseAttributeElements(
    elements: Iterable<DefinitionElement>,
    namer: (element: NamedElement) => string,
  ): [Map<string, Set<SchemaAttribute>>, Map<string, Map<SchemaAttribute, string[]>>] {
    const booleanAttributeDefinitions = new Map<string, Set<SchemaAttribute>>()
    const valueAttributeDefinitions = new Map<string, Map<SchemaAttribute, string[]>>()

    for (const element of elements) {
      const [booleanAttributes, valueAttributes] = this._parseAttributeElement(element)

      const elementName = namer(element)
      booleanAttributeDefinitions.set(elementName, booleanAttributes)
      valueAttributeDefinitions.set(elementName, valueAttributes)
    }

    return [booleanAttributeDefinitions, valueAttributeDefinitions]
  }

  private _parseAttributeElement(element: DefinitionElement): [Set<SchemaAttribute>, Map<SchemaAttribute, string[]>] {
    const booleanAttributes = new Set<SchemaAttribute>()
    const valueAttributes = new Map<SchemaAttribute, string[]>()

    const tagAttributes = element.attribute ?? []

    for (const tagAttribute of tagAttributes) {
      const attributeName = getElementTagName(tagAttribute)
      const attribute = this.attributes.getEntry(attributeName)
      if (!attribute) {
        IssueError.generateAndThrow('invalidSchema', { error: 'Referenced schema attribute was not found' })
      }
      if (tagAttribute.value === undefined) {
        booleanAttributes.add(attribute)
        continue
      }
      const values = tagAttribute.value.map((value) => value._.toString())
      valueAttributes.set(attribute, values)
    }

    return [booleanAttributes, valueAttributes]
  }
}

export abstract class SchemaDefinitionEntryParser<
  T extends SchemaEntryWithAttributes,
> extends SchemaEntryWithAttributesParser<T> {
  protected override _parseSchema(schemaXml: HedSchemaXMLObject): void {
    this._preprocessSchema(schemaXml)
    const definitions = this._getDefinitions(schemaXml)
    if (!definitions) {
      return
    }
    const [booleanAttributeDefinitions, valueAttributeDefinitions] = this._parseDefinitions(definitions)
    for (const [name, valueAttributes] of valueAttributeDefinitions) {
      const booleanAttributes = booleanAttributeDefinitions.get(name) ?? new Set<SchemaAttribute>()
      this.addEntry(name, this._buildEntry(name, booleanAttributes, valueAttributes))
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected _preprocessSchema(schemaXml: HedSchemaXMLObject): void {}

  protected abstract _getDefinitions(schemaXml: HedSchemaXMLObject): Iterable<DefinitionElement> | undefined

  protected abstract _buildEntry(
    name: string,
    booleanAttributes: Set<SchemaAttribute>,
    valueAttributes: Map<SchemaAttribute, string[]>,
  ): T
}
