import Set from 'core-js-pure/actual/set'
import flattenDeep from 'lodash/flattenDeep'
import zip from 'lodash/zip'
import semver from 'semver'

import {
  SchemaAttribute,
  SchemaEntries,
  SchemaEntryManager,
  SchemaProperty,
  SchemaTag,
  SchemaUnit,
  SchemaUnitClass,
  SchemaUnitModifier,
  SchemaValueClass,
  SchemaValueTag,
} from './entries'
import { IssueError } from '../issues/issues'

import classRegex from '../data/json/classRegex.json'

const lc = (str) => str.toLowerCase()

export default class SchemaParser {
  /**
   * The root XML element.
   * @type {Object}
   */
  rootElement

  /**
   * @type {Map<string, SchemaProperty>}
   */
  properties

  /**
   * @type {Map<string, SchemaAttribute>}
   */
  attributes

  /**
   * The schema's value classes.
   * @type {SchemaEntryManager<SchemaValueClass>}
   */
  valueClasses

  /**
   * The schema's unit classes.
   * @type {SchemaEntryManager<SchemaUnitClass>}
   */
  unitClasses

  /**
   * The schema's unit modifiers.
   * @type {SchemaEntryManager<SchemaUnitModifier>}
   */
  unitModifiers

  /**
   * The schema's tags.
   * @type {SchemaEntryManager<SchemaTag>}
   */
  tags

  /**
   * Constructor.
   *
   * @param {Object} rootElement The root XML element.
   */
  constructor(rootElement) {
    this.rootElement = rootElement
    this._versionDefinitions = {
      typeProperties: new Set(['boolProperty']),
      categoryProperties: new Set([
        'elementProperty',
        'nodeProperty',
        'schemaAttributeProperty',
        'unitProperty',
        'unitClassProperty',
        'unitModifierProperty',
        'valueClassProperty',
      ]),
      roleProperties: new Set(['recursiveProperty', 'isInheritedProperty', 'annotationProperty']),
    }
  }

  parse() {
    this.populateDictionaries()
    return new SchemaEntries(this)
  }

  populateDictionaries() {
    this.parseProperties()
    this.parseAttributes()
    this.parseUnitModifiers()
    this.parseUnitClasses()
    this.parseValueClasses()
    this.parseTags()
  }

  getAllChildTags(parentElement, excludeTakeValueTags = true) {
    if (excludeTakeValueTags && SchemaParser.getElementTagName(parentElement) === '#') {
      return []
    }
    const childTags = []
    if (parentElement.$parent) {
      childTags.push(parentElement)
    }
    const tagElementChildren = parentElement.node ?? []
    childTags.push(...flattenDeep(tagElementChildren.map((child) => this.getAllChildTags(child, excludeTakeValueTags))))
    return childTags
  }

  static getParentTagName(tagElement) {
    const parentTagElement = tagElement.$parent
    if (parentTagElement?.$parent) {
      return SchemaParser.getElementTagName(parentTagElement)
    } else {
      return ''
    }
  }

  /**
   * Extract the name of an XML element.
   *
   * @param {Object} element An XML element.
   * @returns {string} The name of the element.
   */
  static getElementTagName(element) {
    return element.name._
  }

  /**
   * Retrieve all the tags in the schema.
   *
   * @returns {Map<Object, string>} The tag names and XML elements.
   */
  getAllTags() {
    const nodeRoot = this.rootElement.schema
    const tagElements = this.getAllChildTags(nodeRoot, false)
    const tags = tagElements.map((element) => SchemaParser.getElementTagName(element))
    return new Map(zip(tagElements, tags))
  }

  parseProperties() {
    const propertyDefinitions = this._getDefinitionElements('property')
    this.properties = new Map()
    for (const definition of propertyDefinitions) {
      const propertyName = SchemaParser.getElementTagName(definition)
      this.properties.set(propertyName, new SchemaProperty(propertyName))
    }
    this._addCustomProperties()
  }

  parseAttributes() {
    const attributeDefinitions = this._getDefinitionElements('schemaAttribute')
    this.attributes = new Map()
    for (const definition of attributeDefinitions) {
      const attributeName = SchemaParser.getElementTagName(definition)
      const propertyElements = definition.property ?? []
      const properties = propertyElements.map((element) => this.properties.get(SchemaParser.getElementTagName(element)))
      this.attributes.set(attributeName, new SchemaAttribute(attributeName, new Set(properties)))
    }
    this._addCustomAttributes()
  }

  _getValueClassChars(name) {
    let classChars
    if (Array.isArray(classRegex.class_chars[name]) && classRegex.class_chars[name].length > 0) {
      classChars =
        '^(?:' + classRegex.class_chars[name].map((charClass) => classRegex.char_regex[charClass]).join('|') + ')+$'
    } else {
      classChars = '^.+$' // Any non-empty line or string.
    }
    return new RegExp(classChars)
  }

  parseValueClasses() {
    const valueClasses = new Map()
    const [booleanAttributeDefinitions, valueAttributeDefinitions] = this._parseDefinitions('valueClass')
    for (const [name, valueAttributes] of valueAttributeDefinitions) {
      const booleanAttributes = booleanAttributeDefinitions.get(name)
      //valueClasses.set(name, new SchemaValueClass(name, booleanAttributes, valueAttributes))
      const charRegex = this._getValueClassChars(name)
      const wordRegex = new RegExp(classRegex.class_words[name] ?? '^.+$')
      valueClasses.set(name, new SchemaValueClass(name, booleanAttributes, valueAttributes, charRegex, wordRegex))
    }
    this.valueClasses = new SchemaEntryManager(valueClasses)
  }

  parseUnitModifiers() {
    const unitModifiers = new Map()
    const [booleanAttributeDefinitions, valueAttributeDefinitions] = this._parseDefinitions('unitModifier')
    for (const [name, valueAttributes] of valueAttributeDefinitions) {
      const booleanAttributes = booleanAttributeDefinitions.get(name)
      unitModifiers.set(name, new SchemaUnitModifier(name, booleanAttributes, valueAttributes))
    }
    this.unitModifiers = new SchemaEntryManager(unitModifiers)
  }

  parseUnitClasses() {
    const unitClasses = new Map()
    const [booleanAttributeDefinitions, valueAttributeDefinitions] = this._parseDefinitions('unitClass')
    const unitClassUnits = this.parseUnits()

    for (const [name, valueAttributes] of valueAttributeDefinitions) {
      const booleanAttributes = booleanAttributeDefinitions.get(name)
      unitClasses.set(name, new SchemaUnitClass(name, booleanAttributes, valueAttributes, unitClassUnits.get(name)))
    }
    this.unitClasses = new SchemaEntryManager(unitClasses)
  }

  parseUnits() {
    const unitClassUnits = new Map()
    const unitClassElements = this._getDefinitionElements('unitClass')
    const unitModifiers = this.unitModifiers
    for (const element of unitClassElements) {
      const elementName = SchemaParser.getElementTagName(element)
      const units = new Map()
      unitClassUnits.set(elementName, units)
      if (element.unit === undefined) {
        continue
      }
      const [unitBooleanAttributeDefinitions, unitValueAttributeDefinitions] = this._parseAttributeElements(
        element.unit,
        SchemaParser.getElementTagName,
      )
      for (const [name, valueAttributes] of unitValueAttributeDefinitions) {
        const booleanAttributes = unitBooleanAttributeDefinitions.get(name)
        units.set(name, new SchemaUnit(name, booleanAttributes, valueAttributes, unitModifiers))
      }
    }
    return unitClassUnits
  }

  // Tag parsing

  /**
   * Parse the schema's tags.
   */
  parseTags() {
    const tags = this.getAllTags()
    const shortTags = this._getShortTags(tags)
    const [booleanAttributeDefinitions, valueAttributeDefinitions] = this._parseAttributeElements(
      tags.keys(),
      (element) => shortTags.get(element),
    )

    const tagUnitClassDefinitions = this._processTagUnitClasses(shortTags, valueAttributeDefinitions)
    this._processRecursiveAttributes(shortTags, booleanAttributeDefinitions)

    const tagEntries = this._createSchemaTags(
      booleanAttributeDefinitions,
      valueAttributeDefinitions,
      tagUnitClassDefinitions,
    )

    this._injectTagFields(tags, shortTags, tagEntries)

    this.tags = new SchemaEntryManager(tagEntries)
  }

  /**
   * Generate the map from tag elements to shortened tag names.
   *
   * @param {Map<Object, string>} tags The map from tag elements to tag strings.
   * @returns {Map<Object, string>} The map from tag elements to shortened tag names.
   * @private
   */
  _getShortTags(tags) {
    const shortTags = new Map()
    for (const tagElement of tags.keys()) {
      const shortKey =
        SchemaParser.getElementTagName(tagElement) === '#'
          ? SchemaParser.getParentTagName(tagElement) + '-#'
          : SchemaParser.getElementTagName(tagElement)
      shortTags.set(tagElement, shortKey)
    }
    return shortTags
  }

  /**
   * Process unit classes in tags.
   *
   * @param {Map<Object, string>} shortTags The map from tag elements to shortened tag names.
   * @param {Map<string, Map<SchemaAttribute, *>>} valueAttributeDefinitions The map from shortened tag names to their value schema attributes.
   * @returns {Map<string, SchemaUnitClass[]>} The map from shortened tag names to their unit classes.
   * @private
   */
  _processTagUnitClasses(shortTags, valueAttributeDefinitions) {
    const tagUnitClassAttribute = this.attributes.get('unitClass')
    const tagUnitClassDefinitions = new Map()

    for (const tagName of shortTags.values()) {
      const valueAttributes = valueAttributeDefinitions.get(tagName)
      if (valueAttributes.has(tagUnitClassAttribute)) {
        tagUnitClassDefinitions.set(
          tagName,
          valueAttributes.get(tagUnitClassAttribute).map((unitClassName) => {
            return this.unitClasses.getEntry(unitClassName)
          }),
        )
        valueAttributes.delete(tagUnitClassAttribute)
      }
    }

    return tagUnitClassDefinitions
  }

  /**
   * Process recursive schema attributes.
   *
   * @param {Map<Object, string>} shortTags The map from tag elements to shortened tag names.
   * @param {Map<string, Set<SchemaAttribute>>} booleanAttributeDefinitions The map from shortened tag names to their boolean schema attributes. Passed by reference.
   * @private
   */
  _processRecursiveAttributes(shortTags, booleanAttributeDefinitions) {
    const recursiveAttributeMap = this._generateRecursiveAttributeMap(shortTags, booleanAttributeDefinitions)

    for (const [tagElement, recursiveAttributes] of recursiveAttributeMap) {
      for (const childTag of this.getAllChildTags(tagElement)) {
        const childTagName = SchemaParser.getElementTagName(childTag)
        const newBooleanAttributes = booleanAttributeDefinitions.get(childTagName)?.union(recursiveAttributes)
        booleanAttributeDefinitions.set(childTagName, newBooleanAttributes)
      }
    }
  }

  /**
   * Generate a map from tags to their recursive attributes.
   *
   * @param {Map<Object, string>} shortTags The map from tag elements to shortened tag names.
   * @param {Map<string, Set<SchemaAttribute>>} booleanAttributeDefinitions The map from shortened tag names to their boolean schema attributes. Passed by reference.
   * @private
   */
  _generateRecursiveAttributeMap(shortTags, booleanAttributeDefinitions) {
    const recursiveAttributes = this._getRecursiveAttributes()
    const recursiveAttributeMap = new Map()

    for (const [tagElement, tagName] of shortTags) {
      recursiveAttributeMap.set(tagElement, booleanAttributeDefinitions.get(tagName)?.intersection(recursiveAttributes))
    }

    return recursiveAttributeMap
  }

  _getRecursiveAttributes() {
    const attributeArray = Array.from(this.attributes.values())
    let filteredAttributeArray

    if (semver.lt(this.rootElement.$.version, '8.3.0')) {
      filteredAttributeArray = attributeArray.filter((attribute) =>
        attribute.properties.has(this.properties.get('isInheritedProperty')),
      )
    } else {
      filteredAttributeArray = attributeArray.filter(
        (attribute) => !attribute.properties.has(this.properties.get('annotationProperty')),
      )
    }

    return new Set(filteredAttributeArray)
  }

  /**
   * Create the {@link SchemaTag} objects.
   *
   * @param {Map<string, Set<SchemaAttribute>>} booleanAttributeDefinitions The map from shortened tag names to their boolean schema attributes.
   * @param {Map<string, Map<SchemaAttribute, *>>} valueAttributeDefinitions The map from shortened tag names to their value schema attributes.
   * @param {Map<string, SchemaUnitClass[]>} tagUnitClassDefinitions The map from shortened tag names to their unit classes.
   * @returns {Map<string, SchemaTag>} The map from lowercase shortened tag names to their tag objects.
   * @private
   */
  _createSchemaTags(booleanAttributeDefinitions, valueAttributeDefinitions, tagUnitClassDefinitions) {
    const tagTakesValueAttribute = this.attributes.get('takesValue')
    const tagEntries = new Map()

    for (const [name, valueAttributes] of valueAttributeDefinitions) {
      if (tagEntries.has(name)) {
        IssueError.generateAndThrow('duplicateTagsInSchema')
      }

      const booleanAttributes = booleanAttributeDefinitions.get(name)
      const unitClasses = tagUnitClassDefinitions.get(name)

      if (booleanAttributes.has(tagTakesValueAttribute)) {
        tagEntries.set(lc(name), new SchemaValueTag(name, booleanAttributes, valueAttributes, unitClasses))
      } else {
        tagEntries.set(lc(name), new SchemaTag(name, booleanAttributes, valueAttributes, unitClasses))
      }
    }

    return tagEntries
  }

  /**
   * Inject special tag fields into the {@link SchemaTag} objects.
   *
   * @param {Map<Object, string>} tags The map from tag elements to tag strings.
   * @param {Map<Object, string>} shortTags The map from tag elements to shortened tag names.
   * @param {Map<string, SchemaTag>} tagEntries The map from shortened tag names to tag objects.
   * @private
   */
  _injectTagFields(tags, shortTags, tagEntries) {
    for (const tagElement of tags.keys()) {
      const tagName = shortTags.get(tagElement)
      const parentTagName = shortTags.get(tagElement.$parent)

      if (parentTagName) {
        tagEntries.get(lc(tagName)).parent = tagEntries.get(lc(parentTagName))
      }

      if (SchemaParser.getElementTagName(tagElement) === '#') {
        tagEntries.get(lc(parentTagName)).valueTag = tagEntries.get(lc(tagName))
      }
    }
  }

  _parseDefinitions(category) {
    const definitionElements = this._getDefinitionElements(category)
    return this._parseAttributeElements(definitionElements, SchemaParser.getElementTagName)
  }

  _getDefinitionElements(category) {
    const categoryTagName = category + 'Definition'
    const categoryParentTagName = categoryTagName + 's'
    return this.rootElement[categoryParentTagName][categoryTagName]
  }

  _parseAttributeElements(elements, namer) {
    const booleanAttributeDefinitions = new Map()
    const valueAttributeDefinitions = new Map()

    for (const element of elements) {
      const [booleanAttributes, valueAttributes] = this._parseAttributeElement(element)

      const elementName = namer(element)
      booleanAttributeDefinitions.set(elementName, booleanAttributes)
      valueAttributeDefinitions.set(elementName, valueAttributes)
    }

    return [booleanAttributeDefinitions, valueAttributeDefinitions]
  }

  _parseAttributeElement(element) {
    const booleanAttributes = new Set()
    const valueAttributes = new Map()

    const tagAttributes = element.attribute ?? []

    for (const tagAttribute of tagAttributes) {
      const attributeName = SchemaParser.getElementTagName(tagAttribute)
      if (tagAttribute.value === undefined) {
        booleanAttributes.add(this.attributes.get(attributeName))
        continue
      }
      const values = tagAttribute.value.map((value) => value._)
      valueAttributes.set(this.attributes.get(attributeName), values)
    }

    return [booleanAttributes, valueAttributes]
  }

  _addCustomAttributes() {
    const isInheritedProperty = this.properties.get('isInheritedProperty')
    const extensionAllowedAttribute = this.attributes.get('extensionAllowed')
    if (this.rootElement.$.library === undefined && semver.lt(this.rootElement.$.version, '8.2.0')) {
      extensionAllowedAttribute._properties.add(isInheritedProperty)
    }
    const inLibraryAttribute = this.attributes.get('inLibrary')
    if (inLibraryAttribute && semver.lt(this.rootElement.$.version, '8.3.0')) {
      inLibraryAttribute._properties.add(isInheritedProperty)
    }
  }

  _addCustomProperties() {
    if (this.rootElement.$.library === undefined && semver.lt(this.rootElement.$.version, '8.2.0')) {
      const recursiveProperty = new SchemaProperty('isInheritedProperty')
      this.properties.set('isInheritedProperty', recursiveProperty)
    }
  }
}
