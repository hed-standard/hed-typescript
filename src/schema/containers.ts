/**
 * This module holds the schema container classes.
 * @module schema/containers
 */

import lt from 'semver/functions/lt'

import { IssueError } from '../issues/issues'
import { type SchemaEntries } from './entries'
import { type HedSchemaXMLObject } from './xmlType'

export class HedSchema {
  /**
   * The collection of schema entries.
   */
  readonly entries: SchemaEntries

  /**
   * This schema's prefix in the active schema set.
   */
  readonly prefix: string

  /**
   * Constructor.
   *
   * @param xmlData - The schema XML data.
   * @param entries - A collection of schema entries.
   * @param prefix - This schema's prefix in the active schema set.
   */
  constructor(xmlData: HedSchemaXMLObject, entries: SchemaEntries, prefix: string) {
    this.entries = entries
    this.prefix = prefix

    const rootElement = xmlData.HED
    const library = rootElement.$.library ?? ''
    const version = rootElement.$.version

    if (!library && version && lt(version, '8.0.0')) {
      IssueError.generateAndThrow('deprecatedStandardSchemaVersion', {
        version,
      })
    }
  }
}

/**
 * The collection of active HED schemas.
 */
export class HedSchemas {
  /**
   * The imported HED schemas.
   *
   * @remarks
   * The empty string key ("") corresponds to the schema with no prefix,
   * while other keys correspond to the respective prefixes.
   */
  readonly schemas: Map<string, HedSchema>

  /**
   * Constructor.
   *
   * @param schemas - The imported HED schemas.
   */
  constructor(schemas: Map<string, HedSchema> | HedSchema) {
    if (schemas instanceof Map) {
      this.schemas = schemas
    } else {
      this.schemas = new Map([['', schemas]])
    }
  }

  /**
   * Return the schema with the given prefix.
   *
   * @param schemaName - A prefix in the schema set.
   * @returns The schema object corresponding to that prefix.
   */
  public getSchema(schemaName: string): HedSchema | undefined {
    return this.schemas?.get(schemaName)
  }

  /**
   * The base schema, i.e. the schema with no prefix, if one is defined.
   */
  public get baseSchema(): HedSchema | undefined {
    return this.getSchema('')
  }
}
