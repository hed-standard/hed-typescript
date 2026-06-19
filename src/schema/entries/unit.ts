import pluralize from 'pluralize'
pluralize.addUncountableRule('hertz')

import SchemaEntryWithAttributes from './schemaEntryWithAttributes'
import type SchemaAttribute from './attribute'
import type SchemaUnitModifier from './unitModifier'
import type SchemaEntryManager from './schemaEntryManager'

/**
 * A schema unit.
 */
export default class SchemaUnit extends SchemaEntryWithAttributes {
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
