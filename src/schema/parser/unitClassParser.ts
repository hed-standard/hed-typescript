import {
  type SchemaAttribute,
  type SchemaEntryManager,
  SchemaUnit,
  SchemaUnitClass,
  type SchemaUnitModifier,
} from '../entries'
import { getElementTagName, type HedSchemaXMLCollection, type DefinitionElement, HedSchemaXMLObject } from '../xmlType'
import { SchemaDefinitionEntryParser } from './schemaEntryParser'

export default class UnitClassParser extends SchemaDefinitionEntryParser<SchemaUnitClass> {
  private readonly unitModifiers: SchemaEntryManager<SchemaUnitModifier>
  private unitClassUnits: Map<string, Map<string, SchemaUnit>>

  public constructor(
    xmlCollection: HedSchemaXMLCollection,
    attributes: SchemaEntryManager<SchemaAttribute>,
    unitModifiers: SchemaEntryManager<SchemaUnitModifier>,
  ) {
    super(xmlCollection, attributes)
    this.unitModifiers = unitModifiers
  }

  protected override _preprocessSchema(schemaXml: HedSchemaXMLObject) {
    this.parseUnits(schemaXml)
  }

  protected override _getDefinitions(schemaXml: HedSchemaXMLObject): Iterable<DefinitionElement> {
    return schemaXml.HED.unitClassDefinitions.unitClassDefinition
  }

  protected override _buildEntry(
    name: string,
    booleanAttributes: Set<SchemaAttribute>,
    valueAttributes: Map<SchemaAttribute, string[]>,
  ): SchemaUnitClass {
    return new SchemaUnitClass(
      name,
      booleanAttributes,
      valueAttributes,
      this.unitClassUnits.get(name) ?? new Map<string, SchemaUnit>(),
    )
  }

  private parseUnits(schemaXml: HedSchemaXMLObject): void {
    this.unitClassUnits = new Map<string, Map<string, SchemaUnit>>()
    const unitClassElements = schemaXml.HED.unitClassDefinitions.unitClassDefinition
    for (const element of unitClassElements) {
      const elementName = getElementTagName(element)
      const units = new Map<string, SchemaUnit>()
      this.unitClassUnits.set(elementName, units)
      if (element.unit === undefined) {
        continue
      }
      const [unitBooleanAttributeDefinitions, unitValueAttributeDefinitions] = this._parseAttributeElements(
        element.unit,
        getElementTagName,
      )
      for (const [name, valueAttributes] of unitValueAttributeDefinitions) {
        const booleanAttributes = unitBooleanAttributeDefinitions.get(name) ?? new Set<SchemaAttribute>()
        units.set(name, new SchemaUnit(name, booleanAttributes, valueAttributes, this.unitModifiers))
      }
    }
  }
}
