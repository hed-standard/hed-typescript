import type SchemaEntry from './schemaEntry'

/**
 * A manager of {@link SchemaEntry} objects.
 */
export default class SchemaEntryManager<T extends SchemaEntry> {
  /**
   * The definitions managed by this entry manager.
   */
  private readonly _definitions: Map<string, T>

  /**
   * Constructor.
   *
   * @param definitions - A map of schema entry definitions.
   */
  constructor(definitions: Map<string, T>) {
    this._definitions = definitions
  }

  /**
   * Return a copy of the managed definition map.
   */
  public get definitions(): Map<string, T> {
    return new Map(this._definitions)
  }

  /**
   * Iterator over the entry manager's entries.
   */
  public [Symbol.iterator](): MapIterator<[string, T]> {
    return this._definitions.entries()
  }

  /**
   * Iterator over the entry manager's keys.
   */
  public keys(): MapIterator<string> {
    return this._definitions.keys()
  }

  /**
   * Iterator over the entry manager's keys.
   */
  public values(): MapIterator<T> {
    return this._definitions.values()
  }

  /**
   * Determine whether the entry with the given name exists.
   *
   * @param name - The name of the entry.
   * @return Whether the entry exists.
   */
  public hasEntry(name: string): boolean {
    return this._definitions.has(name)
  }

  /**
   * Get the entry with the given name.
   *
   * @param name - The name of the entry to retrieve.
   * @returns The entry with that name.
   */
  public getEntry(name: string): T | undefined {
    return this._definitions.get(name)
  }

  /**
   * Get a collection of entries with the given boolean attribute.
   *
   * @param booleanAttributeName - The name of boolean attribute to filter on.
   * @returns A subset of the managed collection with the given boolean attribute.
   */
  public getEntriesWithBooleanAttribute(booleanAttributeName: string): Map<string, T> {
    return this.filter(([, v]) => {
      return v.hasBooleanAttribute(booleanAttributeName)
    })
  }

  /**
   * Filter the map underlying this manager.
   *
   * @param fn - The filtering function.
   * @returns A subset of the managed collection satisfying the filter.
   */
  public filter(fn: (entry: [string, T]) => boolean): Map<string, T> {
    const pairArray = Array.from(this._definitions.entries())
    return new Map(pairArray.filter((entry) => fn(entry)))
  }

  /**
   * The number of entries in this collection.
   *
   * @returns The number of entries in this collection.
   */
  public get length(): number {
    return this._definitions.size
  }
}
