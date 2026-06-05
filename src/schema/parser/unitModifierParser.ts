import { type SchemaAttribute, type SchemaEntryManager, SchemaUnitModifier } from '../entries'
import type { DefinitionElement, HedSchemaXMLCollection, HedSchemaXMLObject } from '../xmlType'
import { SchemaDefinitionEntryParser } from './schemaEntryParser'

export default class UnitModifierParser extends SchemaDefinitionEntryParser<SchemaUnitModifier> {
  public constructor(xmlCollection: HedSchemaXMLCollection, attributes: SchemaEntryManager<SchemaAttribute>) {
    super(xmlCollection, attributes)
  }

  protected override _getDefinitions(schemaXml: HedSchemaXMLObject): Iterable<DefinitionElement> | undefined {
    return schemaXml.HED.unitModifierDefinitions.unitModifierDefinition
  }

  protected override _buildEntry(
    name: string,
    booleanAttributes: Set<SchemaAttribute>,
    valueAttributes: Map<SchemaAttribute, string[]>,
  ): SchemaUnitModifier {
    return new SchemaUnitModifier(name, booleanAttributes, valueAttributes)
  }
}
