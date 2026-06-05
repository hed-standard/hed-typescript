import { type SchemaAttribute, type SchemaEntryManager, SchemaValueClass } from '../entries'
import { SchemaDefinitionEntryParser } from './schemaEntryParser'
import type { DefinitionElement, HedSchemaXMLCollection, HedSchemaXMLObject } from '../xmlType'

interface ClassRegex {
  char_regex: {
    [key: string]: string
  }
  class_chars: {
    [key: string]: string[]
  }
  class_words: {
    [key: string]: string
  }
}

import * as _classRegex from '../../data/json/classRegex.json'
const classRegex: ClassRegex = _classRegex

export default class ValueClassParser extends SchemaDefinitionEntryParser<SchemaValueClass> {
  public constructor(xmlCollection: HedSchemaXMLCollection, attributes: SchemaEntryManager<SchemaAttribute>) {
    super(xmlCollection, attributes)
  }

  protected override _getDefinitions(schemaXml: HedSchemaXMLObject): Iterable<DefinitionElement> | undefined {
    return schemaXml.HED.valueClassDefinitions.valueClassDefinition
  }

  protected override _buildEntry(
    name: string,
    booleanAttributes: Set<SchemaAttribute>,
    valueAttributes: Map<SchemaAttribute, string[]>,
  ): SchemaValueClass {
    const charRegex = this._getValueClassChars(name)
    const wordRegex = new RegExp(classRegex.class_words[name] ?? '^.+$')
    return new SchemaValueClass(name, booleanAttributes, valueAttributes, charRegex, wordRegex)
  }

  private _getValueClassChars(name: string): RegExp {
    let classChars
    if (Array.isArray(classRegex.class_chars[name]) && classRegex.class_chars[name].length > 0) {
      classChars =
        '^(?:' + classRegex.class_chars[name].map((charClass) => classRegex.char_regex[charClass]).join('|') + ')+$'
    } else {
      classChars = '^.+$' // Any non-empty line or string.
    }
    return new RegExp(classChars)
  }
}
