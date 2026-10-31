/**
 * This module holds the specification classes for HED schemas.
 * @module schema/specs
 */

import castArray from 'lodash/castArray'
import semver from 'semver'

import { IssueError } from '../issues/issues'

/**
 * A schema version specification.
 */
export class SchemaSpec {
  /**
   * The prefix of this schema.
   */
  readonly prefix: string

  /**
   * The version of this schema.
   */
  readonly version: string

  /**
   * The library name of this schema.
   */
  readonly library: string

  /**
   * The local path for this schema.
   */
  readonly localPath: string

  /**
   * Constructor.
   *
   * @param prefix - The prefix of this schema.
   * @param version - The version of this schema.
   * @param library - The library name of this schema.
   * @param localPath - The local path for this schema.
   */
  constructor(prefix: string, version: string, library = '', localPath = '') {
    this.prefix = prefix
    this.version = version
    this.library = library
    this.localPath = localPath
  }

  /**
   * Compute the name for the bundled copy of this schema.
   */
  public get localName(): string {
    if (!this.library) {
      return 'HED' + this.version
    } else {
      return 'HED_' + this.library + '_' + this.version
    }
  }

  /**
   * Compute the canonical form of this specification.
   */
  public toString(): string {
    if (!this.library) {
      return this.version
    } else {
      return this.library + '_' + this.version
    }
  }

  /**
   * Determine if this schema specification is equivalent to another schema specification.
   *
   * @remarks
   *
   * Schema specifications are deemed equivalent if either of the following is true:
   * - They have the same `localPath`
   * - They have the same `prefix`, `version`, and `library`.
   *
   * @param other - A schema specification to compare with this one.
   * @returns Whether the other schema specification is equivalent to this one.
   */
  public equivalent(other: unknown): boolean {
    if (!(other instanceof SchemaSpec)) {
      return false
    }
    if (this.localPath && this.localPath === other.localPath) {
      return true
    }
    return this.prefix === other.prefix && this.version === other.version && this.library === other.library
  }

  /**
   * Parse a single schema specification string into a SchemaSpec object.
   *
   * @param versionSpec - A schema version specification string (e.g., "nickname:library_version").
   * @returns A schema specification object with parsed nickname, library, and version.
   * @throws {IssueError} If the schema specification format is invalid.
   */
  public static parseVersionSpec(versionSpec: string): SchemaSpec {
    const [nickname, schema] = SchemaSpec._splitPrefixAndSchema(versionSpec)
    const [library, version] = SchemaSpec._splitLibraryAndVersion(schema, versionSpec)
    return new SchemaSpec(nickname, version, library)
  }

  /**
   * Split a schema version string into prefix (nickname) and schema parts using colon delimiter.
   *
   * @param prefixSchemaSpec - The schema version string to split.
   * @returns An array with [nickname, schema] where nickname may be empty string.
   * @throws {IssueError} If the schema specification format is invalid.
   */
  private static _splitPrefixAndSchema(prefixSchemaSpec: string): [string, string] {
    return SchemaSpec._splitVersionSegments(prefixSchemaSpec, prefixSchemaSpec, ':')
  }

  /**
   * Split a schema string into library and version parts using underscore delimiter.
   *
   * @param libraryVersionSpec - The schema string to split (library_version format).
   * @param originalVersion - The original version string for error reporting.
   * @returns An array with [library, version] where library may be empty string.
   * @throws {IssueError} If the schema specification format is invalid or version is not valid semver.
   */
  private static _splitLibraryAndVersion(libraryVersionSpec: string, originalVersion: string): [string, string] {
    const [library, version] = SchemaSpec._splitVersionSegments(libraryVersionSpec, originalVersion, '_')
    if (!semver.valid(version)) {
      IssueError.generateAndThrow('invalidSchemaSpecification', { spec: originalVersion })
    }
    return [library, version]
  }

  /**
   * Split a version string into two segments using the specified delimiter.
   *
   * @param versionSpec - The version string to split.
   * @param originalVersion - The original version string for error reporting.
   * @param splitCharacter - The character to use as delimiter (':' or '_').
   * @returns An array with [firstSegment, secondSegment] where firstSegment may be empty string.
   * @throws {IssueError} If the schema specification format is invalid or contains non-alphabetic characters in first segment.
   */
  private static _splitVersionSegments(
    versionSpec: string,
    originalVersion: string,
    splitCharacter: string,
  ): [string, string] {
    const alphabeticRegExp = /^[a-zA-Z]+$/
    const versionSplit = versionSpec.split(splitCharacter)
    const secondSegment = versionSplit.pop()
    const firstSegment = versionSplit.pop()
    if (versionSplit.length > 0) {
      IssueError.generateAndThrow('invalidSchemaSpecification', { spec: originalVersion })
    }
    if (secondSegment === undefined) {
      IssueError.generateAndThrow('invalidSchemaSpecification', { spec: originalVersion })
    }
    if (firstSegment !== undefined && !alphabeticRegExp.test(firstSegment)) {
      IssueError.generateAndThrow('invalidSchemaSpecification', { spec: originalVersion })
    }
    return [firstSegment ?? '', secondSegment]
  }
}

/**
 * A specification mapping schema prefixes to SchemaSpec objects.
 */
export class SchemasSpec {
  /**
   * The specification mapping data.
   */
  private readonly _data: Map<string, SchemaSpec[]>

  /**
   * Constructor.
   */
  constructor() {
    this._data = new Map<string, SchemaSpec[]>()
  }

  /**
   * The specification mapping data.
   */
  public get data(): Map<string, SchemaSpec[]> {
    return new Map(this._data)
  }

  /**
   * Iterate over the schema specifications.
   */
  *[Symbol.iterator](): MapIterator<[string, SchemaSpec[]]> {
    yield* this._data.entries()
  }

  /**
   * Add a schema to this specification.
   *
   * @remarks
   * A schema name (a library name, or the standard schema) may appear only once in a merge group, whatever the
   * versions (specification 3.1.2.4). A specification with a local path is not checked here: its name is known only
   * once its file is read, and the loader checks it then.
   *
   * @param schemaSpec - A schema specification.
   * @returns This object.
   * @throws {IssueError} If the schema's name is already listed under its prefix.
   */
  public addSchemaSpec(schemaSpec: SchemaSpec): this {
    if (this._data.has(schemaSpec.prefix)) {
      const existingPrefixSpecs = this._data.get(schemaSpec.prefix) as SchemaSpec[]
      const sameName = (spec: SchemaSpec): boolean =>
        !spec.localPath && !schemaSpec.localPath && spec.library === schemaSpec.library
      if (existingPrefixSpecs.some(sameName)) {
        const schema = schemaSpec.library ? `library "${schemaSpec.library}"` : 'the standard schema'
        IssueError.generateAndThrow('multipleVersionsOfSameLibrarySchema', { schema, prefix: schemaSpec.prefix })
      }
      existingPrefixSpecs.push(schemaSpec)
    } else {
      this._data.set(schemaSpec.prefix, [schemaSpec])
    }
    return this
  }

  /**
   * Parse a HED version specification into a schemas specification object.
   *
   * @param versionSpecs - The HED version specification, can be a single version string or array of version strings.
   * @returns A schemas specification object containing parsed schema specifications.
   * @throws {IssueError} If any schema specification is invalid.
   */
  public static parseVersionSpecs(versionSpecs: unknown): SchemasSpec {
    const schemasSpec = new SchemasSpec()
    let processedVersionSpecs: string[]
    if (typeof versionSpecs === 'string') {
      processedVersionSpecs = castArray(versionSpecs)
    } else if (!Array.isArray(versionSpecs) || !versionSpecs.every((spec) => typeof spec === 'string')) {
      IssueError.generateAndThrow('invalidSchemaSpecification', { spec: versionSpecs })
    } else {
      processedVersionSpecs = versionSpecs
    }
    if (processedVersionSpecs.length === 0) {
      IssueError.generateAndThrow('missingSchemaSpecification')
    }
    for (const schemaVersion of processedVersionSpecs) {
      const schemaSpec = SchemaSpec.parseVersionSpec(schemaVersion)
      schemasSpec.addSchemaSpec(schemaSpec)
    }
    return schemasSpec
  }
}
