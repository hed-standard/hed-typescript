import SchemaEntryWithAttributes from './schemaEntryWithAttributes'
import type SchemaUnit from './unit'
import type SchemaAttribute from './attribute'

/**
 * A schema unit class.
 */
export default class SchemaUnitClass extends SchemaEntryWithAttributes {
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
    let actualValueString // The actual value part of the value
    let actualUnitString
    let lastPart
    let firstPart
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
