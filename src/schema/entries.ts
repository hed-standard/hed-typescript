/**
 * This module holds the schema entity classes.
 * @module schema/entries
 */

import { isEqual, isEqualWith } from 'lodash'
import pluralize from 'pluralize'
pluralize.addUncountableRule('hertz')

import { IssueError } from '../issues/issues'
import type SchemaParser from './parser/schemaParser'

/**
 * SchemaEntries class
 */
export class SchemaEntries {
  /**
   * The schema's properties.
   */
  readonly properties: SchemaEntryManager<SchemaProperty>

  /**
   * The schema's attributes.
   */
  readonly attributes: SchemaEntryManager<SchemaAttribute>

  /**
   * The schema's value classes.
   */
  readonly valueClasses: SchemaEntryManager<SchemaValueClass>

  /**
   * The schema's unit classes.
   */
  readonly unitClasses: SchemaEntryManager<SchemaUnitClass>

  /**
   * The schema's unit modifiers.
   */
  readonly unitModifiers: SchemaEntryManager<SchemaUnitModifier>

  /**
   * The schema's tags.
   */
  tags: SchemaEntryManager<SchemaTag>

  /**
   * Constructor.
   *
   * @param schemaParser - A constructed schema parser.
   */
  constructor(schemaParser: SchemaParser) {
    this.properties = schemaParser.properties
    this.attributes = schemaParser.attributes
    this.valueClasses = schemaParser.valueClasses
    this.unitClasses = schemaParser.unitClasses
    this.unitModifiers = schemaParser.unitModifiers
    this.tags = schemaParser.tags
  }
}

/**
 * A manager of {@link SchemaEntry} objects.
 */
export class SchemaEntryManager<T extends SchemaEntry> {
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

/**
 * SchemaEntry class
 */
export class SchemaEntry {
  /**
   * The name of this schema entry.
   */
  private readonly _name: string

  constructor(name: string) {
    this._name = name
  }

  /**
   * The name of this schema entry.
   */
  public get name(): string {
    return this._name
  }

  /**
   * Determine if this schema entry is equivalent to another schema entry.
   *
   * @remarks
   *
   * Schema entries are deemed equivalent if they have the same name.
   *
   * @param other - A schema entry to compare with this one.
   * @returns Whether the other entry is equivalent to this schema entry.
   */
  public equivalent(other: unknown): boolean {
    if (!(other instanceof SchemaEntry)) {
      return false
    }
    return this.name === other.name
  }

  /**
   * Whether this schema entry has this attribute (by name).
   *
   * This method is a stub to be overridden in {@link SchemaEntryWithAttributes}.
   *
   * @param attributeName - The attribute to check for.
   * @returns Whether this schema entry has this attribute.
   */

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public hasBooleanAttribute(attributeName: string): boolean {
    return false
  }
}

/**
 * A schema property.
 */
export class SchemaProperty extends SchemaEntry {
  /**
   * Determine if this schema property is equivalent to another schema property.
   *
   * @remarks
   *
   * Schema properties are deemed equivalent if they have the same name and equivalent attributes.
   *
   * @param other - A schema property to compare with this one.
   * @returns Whether the other property is equivalent to this schema property.
   */
  public override equivalent(other: unknown): boolean {
    if (!(other instanceof SchemaProperty)) {
      return false
    }
    return super.equivalent(other)
  }
}

/**
 * A schema attribute.
 */
export class SchemaAttribute extends SchemaEntry {
  /**
   * The set of all attribute names which are always recursive.
   */
  static readonly ALWAYS_RECURSIVE: Set<string> = new Set(['extensionAllowed'])

  /**
   * The properties assigned to this schema attribute.
   */
  readonly _properties: Set<SchemaProperty>

  /**
   * Whether this attribute is recursive.
   */
  readonly _recursive: boolean

  /**
   * Constructor.
   *
   * @param name - The name of the schema attribute.
   * @param properties - The properties assigned to this schema attribute.
   * @param recursive - Whether this attribute is recursive.
   */
  constructor(name: string, properties: Set<SchemaProperty>, recursive: boolean) {
    super(name)
    this._properties = properties
    this._recursive = recursive || SchemaAttribute.ALWAYS_RECURSIVE.has(name)
  }

  /**
   * The collection of properties for this schema attribute.
   */
  public get properties(): Set<SchemaProperty> {
    return new Set(this._properties)
  }

  /**
   * Whether this attribute is recursive.
   */
  public get recursive(): boolean {
    return this._recursive
  }

  /**
   * Determine if this schema attribute is equivalent to another schema attribute.
   *
   * @remarks
   *
   * Schema attributes are deemed equivalent if they have the same name and properties.
   *
   * @param other - A schema attribute to compare with this one.
   * @returns Whether the other attribute is equivalent to this schema attribute.
   */
  public override equivalent(other: unknown): boolean {
    if (!(other instanceof SchemaAttribute)) {
      return false
    }
    if (!super.equivalent(other)) {
      return false
    }
    return this.properties.symmetricDifference(other.properties).size === 0
  }
}

/**
 * SchemaEntryWithAttributes class
 */
export class SchemaEntryWithAttributes extends SchemaEntry {
  /**
   * The set of boolean attributes this schema entry has.
   */
  readonly booleanAttributes: Set<SchemaAttribute>

  /**
   * The collection of value attributes this schema entry has.
   */
  readonly valueAttributes: Map<SchemaAttribute, string[]>

  /**
   * The set of boolean attribute names this schema entry has.
   */
  readonly booleanAttributeNames: Set<string>

  /**
   * The collection of value attribute names this schema entry has.
   */
  readonly valueAttributeNames: Map<string, string[]>

  constructor(name: string, booleanAttributes: Set<SchemaAttribute>, valueAttributes: Map<SchemaAttribute, string[]>) {
    super(name)
    this.booleanAttributes = booleanAttributes
    this.valueAttributes = valueAttributes
    this.booleanAttributeNames = new Set()
    for (const attribute of this.booleanAttributes) {
      this.booleanAttributeNames.add(attribute.name)
    }
    this.valueAttributeNames = new Map()
    for (const [attributeName, value] of this.valueAttributes) {
      this.valueAttributeNames.set(attributeName.name, value)
    }
  }

  /**
   * Determine if this schema entry is equivalent to another schema entry.
   *
   * @remarks
   *
   * Schema entries with attributes are deemed equivalent if they have the same name and equivalent attributes.
   *
   * @param other - A schema entry to compare with this one.
   * @returns Whether the other entry is equivalent to this schema entry.
   */
  public override equivalent(other: unknown): boolean {
    if (!(other instanceof SchemaEntryWithAttributes)) {
      return false
    }
    if (!super.equivalent(other)) {
      return false
    }
    if (this.booleanAttributes.symmetricDifference(other.booleanAttributes).size > 0) {
      return false
    }
    if (this.valueAttributes.size !== other.valueAttributes.size) {
      return false
    }
    const otherKeys = Array.from(other.valueAttributes.keys())
    for (const [key, value] of this.valueAttributes) {
      const otherKey = otherKeys.find((otherKey) => key.equivalent(otherKey))
      if (!otherKey || !isEqual(value.toSorted(), other.valueAttributes.get(otherKey)!.toSorted())) {
        return false
      }
    }
    return true
  }

  /**
   * Whether this schema entry has this attribute (by name).
   *
   * @param attributeName - The attribute to check for.
   * @returns Whether this schema entry has this attribute.
   */
  public hasAttribute(attributeName: string): boolean {
    return this.booleanAttributeNames.has(attributeName) || this.valueAttributeNames.has(attributeName)
  }

  /**
   * Whether this schema entry has this boolean attribute (by name).
   *
   * @param attributeName - The attribute to check for.
   * @returns Whether this schema entry has this attribute.
   */
  public override hasBooleanAttribute(attributeName: string): boolean {
    return this.booleanAttributeNames.has(attributeName)
  }

  /**
   * Retrieve a single value of a value attribute (by name) on this schema entry, throwing an error if more than one value exists.
   *
   * @param attributeName - The attribute whose value should be returned.
   * @returns The value of the attribute.
   * @throws {IssueError} If the attribute has more than one value.
   */
  public getSingleAttributeValue(attributeName: string): string | undefined {
    const attributeValues = this.valueAttributeNames.get(attributeName)
    if (attributeValues === undefined) {
      return undefined
    } else if (attributeValues.length > 1) {
      IssueError.generateAndThrowInternalError(
        `More than one value exists for attribute ${attributeName}, when only one value was expected.`,
      )
    }
    return attributeValues[0]
  }

  /**
   * Retrieve all values of a value attribute (by name) on this schema entry.
   *
   * @param attributeName - The attribute whose value should be returned.
   * @returns The values of the attribute.
   */
  public getAttributeValues(attributeName: string): string[] | undefined {
    return this.valueAttributeNames.get(attributeName)
  }
}

/**
 * SchemaUnit class
 */
export class SchemaUnit extends SchemaEntryWithAttributes {
  /**
   * The legal derivatives of this unit.
   */
  private readonly _derivativeUnits: string[]

  /**
   * Constructor.
   *
   * @param name - The name of the unit.
   * @param booleanAttributes - This unit's boolean attributes.
   * @param valueAttributes - This unit's key-value attributes.
   * @param unitModifiers - The collection of unit modifiers.
   */
  constructor(
    name: string,
    booleanAttributes: Set<SchemaAttribute>,
    valueAttributes: Map<SchemaAttribute, string[]>,
    unitModifiers: SchemaEntryManager<SchemaUnitModifier>,
  ) {
    super(name, booleanAttributes, valueAttributes)

    this._derivativeUnits = [name]
    if (!this.isSIUnit) {
      this._pushPluralUnit()
      return
    }
    if (this.isUnitSymbol) {
      const SIUnitSymbolModifiers = unitModifiers.getEntriesWithBooleanAttribute('SIUnitSymbolModifier')
      for (const modifierName of SIUnitSymbolModifiers.keys()) {
        this._derivativeUnits.push(modifierName + name)
      }
    } else {
      const SIUnitModifiers = unitModifiers.getEntriesWithBooleanAttribute('SIUnitModifier')
      const pluralUnit = this._pushPluralUnit()
      for (const modifierName of SIUnitModifiers.keys()) {
        this._derivativeUnits.push(modifierName + name, modifierName + pluralUnit)
      }
    }
  }

  private _pushPluralUnit(): string | null {
    if (!this.isUnitSymbol) {
      const pluralUnit = pluralize.plural(this.name)
      this._derivativeUnits.push(pluralUnit)
      return pluralUnit
    }
    return null
  }

  public *derivativeUnits(): Generator<string, void, void> {
    for (const unit of this._derivativeUnits) {
      yield unit
    }
  }

  public get isPrefixUnit(): boolean {
    return this.hasAttribute('unitPrefix')
  }

  public get isSIUnit(): boolean {
    return this.hasAttribute('SIUnit')
  }

  public get isUnitSymbol(): boolean {
    return this.hasAttribute('unitSymbol')
  }

  /**
   * Determine if this schema unit is equivalent to another schema unit.
   *
   * @remarks
   *
   * Schema units are deemed equivalent if they have the same name and equivalent attributes.
   *
   * @param other - A schema unit to compare with this one.
   * @returns Whether the other unit is equivalent to this schema unit.
   */
  public override equivalent(other: unknown): boolean {
    if (!(other instanceof SchemaUnit)) {
      return false
    }
    return super.equivalent(other)
  }

  /**
   * Determine if a value has this unit.
   *
   * @param value - Either the whole value or the part after a blank (if not a prefix unit)
   * @returns Whether the value has these units.
   */
  public validateUnit(value: string): boolean {
    if (value == null || value === '') {
      return false
    }
    if (this.isPrefixUnit) {
      return value.startsWith(this.name)
    }

    for (const dUnit of this.derivativeUnits()) {
      if (value === dUnit) {
        return true
      }
    }
    return false
  }
}

/**
 * SchemaUnitClass class
 */
export class SchemaUnitClass extends SchemaEntryWithAttributes {
  /**
   * The units for this unit class.
   */
  private readonly _units: Map<string, SchemaUnit>

  /**
   * Constructor.
   *
   * @param name - The name of this unit class.
   * @param booleanAttributes - The boolean attributes for this unit class.
   * @param valueAttributes - The value attributes for this unit class.
   * @param units - The units for this unit class.
   */
  constructor(
    name: string,
    booleanAttributes: Set<SchemaAttribute>,
    valueAttributes: Map<SchemaAttribute, string[]>,
    units: Map<string, SchemaUnit>,
  ) {
    super(name, booleanAttributes, valueAttributes)
    this._units = units
  }

  /**
   * Get the units for this unit class.
   */
  public get units(): Map<string, SchemaUnit> {
    return new Map(this._units)
  }

  /**
   * Get the default unit for this unit class.
   */
  public get defaultUnit(): SchemaUnit | undefined {
    const attributeValue = this.getSingleAttributeValue('defaultUnits')
    if (attributeValue) {
      return this._units.get(attributeValue)
    } else {
      return undefined
    }
  }

  /**
   * Determine if this schema unit class is equivalent to another schema unit class.
   *
   * @remarks
   *
   * Schema unit classes are deemed equivalent if they have the same name and equivalent attributes.
   *
   * @param other - A schema unit class to compare with this one.
   * @returns Whether the other unit class is equivalent to this schema unit class.
   */
  public override equivalent(other: unknown): boolean {
    if (!(other instanceof SchemaUnitClass)) {
      return false
    }
    return super.equivalent(other)
  }

  /**
   * Extract the unit class and remainder.
   *
   * @param value - A value-containing string.
   * @returns A tuple with the unit class, unit string, and value string
   */
  public extractUnit(value: string): [SchemaUnit | null, string | null, string] {
    let actualUnit = null // The Unit class of the value
    let actualValueString = null // The actual value part of the value
    let actualUnitString = null
    let lastPart = null
    let firstPart = null
    const index = value.indexOf(' ')
    if (index !== -1) {
      lastPart = value.slice(index + 1)
      firstPart = value.slice(0, index)
    } else {
      // no blank -- there are no units
      return [null, null, value]
    }
    actualValueString = firstPart
    actualUnitString = lastPart
    for (const unit of this._units.values()) {
      if (!unit.isPrefixUnit && unit.validateUnit(lastPart)) {
        // Checking if it is non-prefixed unit
        actualValueString = firstPart
        actualUnitString = lastPart
        actualUnit = unit
        break
      } else if (!unit.isPrefixUnit) {
        continue
      }
      if (unit.validateUnit(firstPart)) {
        actualUnit = unit
        actualValueString = value.substring(unit.name.length + 1)
        actualUnitString = unit.name
        break
      }
      // If it got here, can only be a prefix Unit
    }
    return [actualUnit, actualUnitString, actualValueString]
  }
}

/**
 * SchemaUnitModifier class
 */
export class SchemaUnitModifier extends SchemaEntryWithAttributes {
  /**
   * Determine if this schema unit modifier is equivalent to another schema unit modifier.
   *
   * @remarks
   *
   * Schema unit modifiers are deemed equivalent if they have the same name and equivalent attributes.
   *
   * @param other - A schema unit modifier to compare with this one.
   * @returns Whether the other unit modifier is equivalent to this schema unit modifier.
   */
  public override equivalent(other: unknown): boolean {
    if (!(other instanceof SchemaUnitModifier)) {
      return false
    }
    return super.equivalent(other)
  }
}

/**
 * SchemaValueClass class
 */
export class SchemaValueClass extends SchemaEntryWithAttributes {
  /**
   * The character class-based regular expression.
   */
  private readonly _charClassRegex: RegExp
  /**
   * The "word form"-based regular expression.
   */
  private readonly _wordRegex: RegExp

  /**
   * Constructor.
   *
   * @param name - The name of this value class.
   * @param booleanAttributes - The boolean attributes for this value class.
   * @param valueAttributes - The value attributes for this value class.
   * @param charClassRegex - The character class-based regular expression for this value class.
   * @param wordRegex - The "word form"-based regular expression for this value class.
   */

  constructor(
    name: string,
    booleanAttributes: Set<SchemaAttribute>,
    valueAttributes: Map<SchemaAttribute, string[]>,
    charClassRegex: RegExp,
    wordRegex: RegExp,
  ) {
    super(name, booleanAttributes, valueAttributes)
    this._charClassRegex = charClassRegex
    this._wordRegex = wordRegex
  }

  /**
   * Determine if a value is valid according to this value class.
   *
   * @param value - A HED value.
   * @returns Whether the value conforms to this value class.
   */
  public validateValue(value: string): boolean {
    return this._wordRegex.test(value) && this._charClassRegex.test(value)
  }

  /**
   * Determine if this schema value class is equivalent to another schema value class.
   *
   * @remarks
   *
   * Schema value classes are deemed equivalent if they have the same name and equivalent regular expressions.
   *
   * @param other - A schema value class to compare with this one.
   * @returns Whether the other value class is equivalent to this schema value class.
   */
  public override equivalent(other: unknown): boolean {
    if (!(other instanceof SchemaValueClass)) {
      return false
    }
    if (!super.equivalent(other)) {
      return false
    }
    return isEqual(this._charClassRegex, other._charClassRegex) && isEqual(this._wordRegex, other._wordRegex)
  }
}

/**
 * A tag in a HED schema.
 */
export class SchemaTag extends SchemaEntryWithAttributes {
  /**
   * This tag's parent tag.
   */
  protected _parent: SchemaTag | undefined

  /**
   * This tag's unit classes.
   */
  private readonly _unitClasses: SchemaUnitClass[]

  /**
   * This tag's value-classes
   */
  private readonly _valueClasses: SchemaValueClass[]

  /**
   * This tag's value-taking child.
   */
  private _valueTag: WeakRef<SchemaValueTag> | undefined

  /**
   * This tag's ancestor tags.
   */
  #ancestors: SchemaTag[]

  /**
   * Constructor.
   *
   * @param name - The name of this tag.
   * @param parentTag - This tag's parent tag.
   * @param booleanAttributes - The boolean attributes for this tag.
   * @param valueAttributes - The value attributes for this tag.
   * @param unitClasses - The unit classes for this tag.
   * @param valueClasses - The value classes for this tag.
   */
  constructor(
    name: string,
    parentTag: SchemaTag | undefined,
    booleanAttributes: Set<SchemaAttribute>,
    valueAttributes: Map<SchemaAttribute, string[]>,
    unitClasses: SchemaUnitClass[],
    valueClasses: SchemaValueClass[],
  ) {
    super(name, booleanAttributes, valueAttributes)
    this._parent = parentTag
    this._unitClasses = unitClasses ?? []
    this._valueClasses = valueClasses ?? []
  }

  /**
   * This tag's unit classes.
   */
  public get unitClasses(): SchemaUnitClass[] {
    return this._unitClasses.slice() // The slice prevents modification
  }

  /**
   * Whether this tag has any unit classes.
   */
  public get hasUnitClasses(): boolean {
    return this._unitClasses.length !== 0
  }

  /**
   * This tag's value classes.
   */
  public get valueClasses(): SchemaValueClass[] {
    return this._valueClasses.slice()
  }

  /**
   * This tag's value-taking child tag.
   */
  public get valueTag(): SchemaValueTag | undefined {
    return this._valueTag?.deref()
  }

  /**
   * Set the tag's value-taking child tag.
   *
   * @param newValueTag - The new value-taking child tag.
   */
  public set valueTag(newValueTag: SchemaValueTag) {
    if (this._valueTag !== undefined && this._valueTag.deref()?.equivalent(newValueTag) === false) {
      IssueError.generateAndThrowInternalError(
        `Attempted to set value tag for schema tag ${this.longName} when it already has one.`,
      )
    }
    this._valueTag = new WeakRef(newValueTag)
  }

  /**
   * This tag's parent tag.
   */
  public get parent(): SchemaTag | undefined {
    return this._parent
  }

  /**
   * Return all of this tag's ancestors.
   */
  public get ancestors(): SchemaTag[] {
    if (this.#ancestors !== undefined) {
      return this.#ancestors
    }
    this.#ancestors = this.parent ? [this.parent, ...this.parent.ancestors] : []
    return this.#ancestors
  }

  /**
   * This tag's long name.
   */
  public get longName(): string {
    const nameParts = this.ancestors.map((parentTag) => parentTag.name)
    nameParts.reverse()
    nameParts.push(this.name)
    return nameParts.join('/')
  }

  /**
   * Extend this tag's short name.
   *
   * @param extension - The extension.
   * @returns The extended short string.
   */
  public extend(extension: string): string {
    if (extension) {
      return this.name + '/' + extension
    } else {
      return this.name
    }
  }

  /**
   * Extend this tag's long name.
   *
   * @param extension - The extension.
   * @returns The extended long string.
   */
  public longExtend(extension: string): string {
    if (extension) {
      return this.longName + '/' + extension
    } else {
      return this.longName
    }
  }

  /**
   * Determine if this schema tag is equivalent to another schema tag.
   *
   * @remarks
   *
   * Schema tags are deemed equivalent if they have the same name and equivalent attributes, unit and value classes, and parents.
   *
   * @param other - A schema tag to compare with this one.
   * @returns Whether the other tag is equivalent to this schema tag.
   */
  public override equivalent(other: unknown): boolean {
    if (!(other instanceof SchemaTag)) {
      return false
    }
    if (!super.equivalent(other)) {
      return false
    }
    if (this.parent === undefined && other.parent !== undefined) {
      return false
    }
    if (this.parent && !this.parent.equivalent(other.parent)) {
      return false
    }
    if (
      !isEqualWith(this._unitClasses.toSorted(), other._unitClasses.toSorted(), (a, b) =>
        a instanceof SchemaUnitClass ? a.equivalent(b) : undefined,
      )
    ) {
      return false
    }
    return isEqualWith(this._valueClasses.toSorted(), other._valueClasses.toSorted(), (a, b) =>
      a instanceof SchemaValueClass ? a.equivalent(b) : undefined,
    )
  }
}

/**
 * A value-taking tag in a HED schema.
 */
export class SchemaValueTag extends SchemaTag {
  /**
   * Constructor.
   *
   * @param name - The name of this tag.
   * @param parentTag - This tag's parent tag.
   * @param booleanAttributes - The boolean attributes for this tag.
   * @param valueAttributes - The value attributes for this tag.
   * @param unitClasses - The unit classes for this tag.
   * @param valueClasses - The value classes for this tag.
   */
  constructor(
    name: string,
    parentTag: SchemaTag | undefined,
    booleanAttributes: Set<SchemaAttribute>,
    valueAttributes: Map<SchemaAttribute, string[]>,
    unitClasses: SchemaUnitClass[],
    valueClasses: SchemaValueClass[],
  ) {
    super(name, parentTag, booleanAttributes, valueAttributes, unitClasses, valueClasses)
    if (parentTag === undefined) {
      IssueError.generateAndThrowInternalError('Value tag must have parent')
    }
    parentTag.valueTag = this
  }

  /**
   * This tag's long name.
   */
  public override get longName(): string {
    const nameParts = this.ancestors.map((parentTag) => parentTag.name)
    nameParts.reverse()
    nameParts.push('#')
    return nameParts.join('/')
  }

  /**
   * Extend this tag's short name.
   *
   * @param extension - The extension.
   * @returns The extended short string.
   */
  public override extend(extension: string): string {
    return this.parent.extend(extension)
  }

  /**
   * Extend this tag's long name.
   *
   * @param extension - The extension.
   * @returns The extended long string.
   */
  public override longExtend(extension: string): string {
    return this.parent.longExtend(extension)
  }

  /**
   * This tag's parent tag.
   */
  public override get parent(): SchemaTag {
    return this._parent as SchemaTag
  }
}
