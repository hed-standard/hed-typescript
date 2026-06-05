import {
  type SchemaAttribute,
  SchemaEntries,
  type SchemaEntryManager,
  type SchemaProperty,
  type SchemaTag,
  type SchemaUnitClass,
  type SchemaUnitModifier,
  type SchemaValueClass,
} from '../entries'
import type { HedSchemaXMLCollection } from '../xmlType'
import AttributeParser from './attributeParser'
import PropertyParser from './propertyParser'
import TagParser from './tagParser'
import UnitClassParser from './unitClassParser'
import UnitModifierParser from './unitModifierParser'
import ValueClassParser from './valueClassParser'

export default class SchemaParser {
  /**
   * The schema XML collection.
   */
  xmlCollection: HedSchemaXMLCollection

  properties: SchemaEntryManager<SchemaProperty>

  attributes: SchemaEntryManager<SchemaAttribute>

  /**
   * The schema's value classes.
   */
  valueClasses: SchemaEntryManager<SchemaValueClass>

  /**
   * The schema's unit classes.
   */
  unitClasses: SchemaEntryManager<SchemaUnitClass>

  /**
   * The schema's unit modifiers.
   */
  unitModifiers: SchemaEntryManager<SchemaUnitModifier>

  /**
   * The schema's tags.
   */
  tags: SchemaEntryManager<SchemaTag>

  /**
   * Constructor.
   *
   * @param xmlCollection - The schema XML collection.
   */
  public constructor(xmlCollection: HedSchemaXMLCollection) {
    this.xmlCollection = xmlCollection
  }

  public parse(): SchemaEntries {
    this.populateDictionaries()
    return new SchemaEntries(this)
  }

  private populateDictionaries(): void {
    this.properties = new PropertyParser(this.xmlCollection).parse()
    this.attributes = new AttributeParser(this.xmlCollection, this.properties).parse()
    this.unitModifiers = new UnitModifierParser(this.xmlCollection, this.attributes).parse()
    this.unitClasses = new UnitClassParser(this.xmlCollection, this.attributes, this.unitModifiers).parse()
    this.valueClasses = new ValueClassParser(this.xmlCollection, this.attributes).parse()
    this.tags = new TagParser(this.xmlCollection, this.attributes, this.unitClasses, this.valueClasses).parse()
  }
}
