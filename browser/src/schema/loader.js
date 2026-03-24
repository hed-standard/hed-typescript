/** HED schema loading functions. */

/* Imports */
import { schemaData } from './vite-importer'
import { IssueError } from '../../../src/issues/issues'
import AbstractHedSchemaLoader from '../../../src/schema/abstractLoader.js'

export default class HedSchemaLoader extends AbstractHedSchemaLoader {
  /**
   * Load schema XML data from a local file.
   *
   * @param {string} path - The path to the schema XML data.
   * @returns {Promise<never>} The schema XML data.
   * @throws {IssueError} If the schema could not be loaded.
   * @override
   */
  async loadLocalSchema(path) {
    IssueError.generateAndThrow('localSchemaLoadFailed', {
      path,
      error: 'Local schema loading is not supported in the browser.',
    })
  }

  /**
   * Determine whether this validator bundles a particular schema.
   *
   * @param {SchemaSpec} schemaDef - The description of which schema to use.
   * @returns {boolean} Whether this validator bundles a particular schema.
   * @override
   */
  hasBundledSchema(schemaDef) {
    const localPath = `../../../src/data/schemas/${schemaDef.localName}.xml`
    return localPath in schemaData
  }

  /**
   * Retrieve the contents of a bundled schema.
   *
   * @param {SchemaSpec} schemaDef - The description of which schema to use.
   * @returns {Promise<string>} The raw schema XML data.
   * @throws {IssueError} If the schema could not be loaded.
   * @override
   */
  async getBundledSchema(schemaDef) {
    const localPath = `../../../src/data/schemas/${schemaDef.localName}.xml`
    const schemaLoader = schemaData[localPath]
    if (!schemaLoader) {
      // We've already verified this exists, so this is a consistency error.
      IssueError.generateAndThrowInternalError('Schema loader has disappeared after already being checked.')
    }
    return await schemaLoader()
  }
}

/**
 * Load schema XML data from a schema version or path description.
 *
 * @deprecated
 *
 * @param {SchemaSpec} schemaDef The description of which schema to use.
 * @returns {Promise<object>} The schema XML data.
 * @throws {IssueError} If the schema could not be loaded.
 */
export async function loadSchema(schemaDef = null) {
  return new HedSchemaLoader().loadSchema(schemaDef)
}
