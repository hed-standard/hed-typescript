/**
 * This module holds the classes for initializing and building schemas.
 * @module schema/init
 */

import type { HedSchemas } from './containers'
import HedSchemaLoader from './loader'
import type { SchemasSpec } from './specs'

/**
 * Build a schema collection object from a schema specification.
 *
 * @deprecated In version 5.0.1. Use {@link HedSchemaLoader.buildSchemas}.
 *
 * @param schemaSpecs - The description of which schemas to use.
 * @returns The schema container object and any issues found.
 */
export async function buildSchemas(schemaSpecs: SchemasSpec): Promise<HedSchemas> {
  return new HedSchemaLoader().buildSchemas(schemaSpecs)
}

/**
 * Build HED schemas from a version specification string.
 *
 * @deprecated In version 5.0.1. Use {@link HedSchemaLoader.buildSchemasFromVersion}.
 *
 * @param hedVersionString - The HED version specification string (can contain comma-separated versions).
 * @returns A Promise that resolves to the built schemas.
 * @throws {IssueError} If the schema specification is invalid or schemas cannot be built.
 */
export async function buildSchemasFromVersion(hedVersionString?: string): Promise<HedSchemas> {
  return new HedSchemaLoader().buildSchemasFromVersion(hedVersionString)
}
