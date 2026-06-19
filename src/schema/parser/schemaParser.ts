import type { HedSchemaXMLCollection } from '../xmlType'

import AttributeParser from './attribute'
import PropertyParser from './property'
import TagParser from './tag'
import UnitClassParser from './unitClass'
import UnitModifierParser from './unitModifier'
import ValueClassParser from './valueClass'

import type SchemaProperty from '../entries/property'
import type SchemaAttribute from '../entries/attribute'
import type SchemaValueClass from '../entries/valueClass'
import type SchemaUnitClass from '../entries/unitClass'
import type SchemaUnitModifier from '../entries/unitModifier'
import type SchemaTag from '../entries/tag'

import type SchemaEntryManager from '../entries/schemaEntryManager'
import SchemaEntries from '../entries/schemaEntries'

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
