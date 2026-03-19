/**
 * Browser-specific schema initialization.
 *
 * This file is a copy of the original `src/schema/init.js` with the import path for the schema loader modified
 * to point to the browser-specific version.
 */
import HedSchemaLoader from './loader'

/**
 * Build HED schemas from a version specification string.
 *
 * @param {string} hedVersionString The HED version specification string (can contain comma-separated versions).
 * @returns {Promise<HedSchemas>} A Promise that resolves to the built schemas.
 * @throws {IssueError} If the schema specification is invalid or schemas cannot be built.
 */
export async function buildSchemasFromVersion(hedVersionString) {
  return new HedSchemaLoader().buildSchemasFromVersion(hedVersionString)
}
