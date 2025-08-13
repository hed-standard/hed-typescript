import * as fs from 'node:fs'
import path from 'node:path'

import chai from 'chai'
const assert = chai.assert

import { beforeAll, describe, afterAll } from '@jest/globals'
import { BidsHedIssue } from '../src/bids/types/issues'
import { buildSchemas } from '../src/schema/init'
import { SchemaSpec, SchemasSpec } from '../src/schema/specs'
import { HedSchemas } from '../src/schema/containers'
import { BidsSidecar, BidsTsvFile } from '../src/bids'
import { generateIssue, IssueError } from '../src/issues/issues'
import { DefinitionManager } from '../src/parser/definitionManager'
import parseTSV from '../src/bids/tsvParser'
import { shouldRun } from '../tests/testHelpers/testUtilities'

const skipMap = new Map()
const runAll = true
//const runMap = new Map([['DEF_EXPAND_INVALID', ['def-expand-invalid-missing-placeholder']]])
//const runMap = new Map([['TAG_GROUP_ERROR', ['tag-group-error-missing']]])
const runMap = new Map([['TAG_GROUP_ERROR', ['tag-group-error-deferred-in-splice']]])
//const runOnly = new Set(["eventsPass"])
const runOnly = new Set()
const skippedErrors = {}
const readFileSync = fs.readFileSync
const test_file_name = 'javascriptTests.json'
// const test_file_name = 'temp6.json'

function toMatchIssue(receivedError, expectedCode, expectedParams = {}) {
  const expectedIssue = generateIssue(expectedCode, expectedParams)

  const passType = receivedError instanceof IssueError
  const passMessage = receivedError.message === expectedIssue.message

  if (passType && passMessage) {
    return {
      pass: true,
      message: () => `Expected error not to match IssueError with message "${expectedIssue.message}", but it did.`,
    }
  } else {
    return {
      pass: false,
      message: () => {
        let msg = ''
        if (!passType) {
          msg += `Expected error to be instance of IssueError but got ${receivedError.constructor.name}\n`
        }
        if (!passMessage) {
          msg += `Expected message:\n  "${expectedIssue.message}"\nReceived:\n  "${receivedError.message}"`
        }
        return msg
      },
    }
  }
}

function comboListToStrings(items) {
  const comboItems = []
  if (items === undefined || items.length === 0) {
    return comboItems
  }
  for (const item of items) {
    const nextItem = [JSON.stringify(item.sidecar), tsvToString(item.events)]
    comboItems.push(nextItem)
  }
  return comboItems
}

function loadTestData() {
  const testFile = path.join(__dirname, test_file_name)
  return JSON.parse(readFileSync(testFile, 'utf8'))
}

const testInfo = loadTestData()

function stringifyList(items) {
  const stringItems = []
  if (items === undefined || items.length === 0) {
    return stringItems
  }
  for (const item of items) {
    stringItems.push(JSON.stringify(item))
  }
  return stringItems
}

function tsvListToStrings(eventList) {
  const eventStrings = []
  if (eventList === undefined || eventList.length === 0) {
    return eventStrings
  }
  for (const item of eventList) {
    eventStrings.push(tsvToString(item))
  }
  return eventStrings
}

function tsvToString(events) {
  return events.map((row) => row.join('\t')).join('\n')
}

expect.extend({
  toMatchIssue(receivedError, expectedCode, expectedParams) {
    return toMatchIssue(receivedError, expectedCode, expectedParams)
  },
})

describe('HED validation using JSON tests', () => {
  const schemaMap = new Map([
    ['8.2.0', undefined],
    ['8.3.0', undefined],
    ['8.4.0', undefined],
  ])

  beforeAll(async () => {
    const spec2 = new SchemaSpec('', '8.2.0', '', path.join(__dirname, '../src/data/schemas/HED8.2.0.xml'))
    const specs2 = new SchemasSpec().addSchemaSpec(spec2)

    const spec3 = new SchemaSpec('', '8.3.0', '', path.join(__dirname, '../src/data/schemas/HED8.3.0.xml'))
    const specs3 = new SchemasSpec().addSchemaSpec(spec3)

    const spec4 = new SchemaSpec('', '8.4.0', '', path.join(__dirname, '../src/data/schemas/HED8.4.0.xml'))
    const specs4 = new SchemasSpec().addSchemaSpec(spec4)

    const spec3Lib = new SchemaSpec('ts', '8.4.0', '', path.join(__dirname, '../src/data/schemas/HED8.4.0.xml'))
    const specs3Lib = new SchemasSpec().addSchemaSpec(spec3Lib)

    const specScore = new SchemaSpec(
      'sc',
      '1.0.0',
      'score',
      path.join(__dirname, '../tests/otherTestData/HED_score_1.0.0.xml'),
    )
    const specsScore = new SchemasSpec().addSchemaSpec(specScore)

    const [schemas2, schemas3, schemas4, schemas3lib, schemaScore] = await Promise.all([
      buildSchemas(specs2),
      buildSchemas(specs3),
      buildSchemas(specs4),
      buildSchemas(specs3Lib),
      buildSchemas(specsScore),
    ])

    schemaMap.set('8.2.0', schemas2)
    schemaMap.set('8.3.0', schemas3)
    schemaMap.set('8.4.0', schemas4)
    schemaMap.set('ts:8.3.0', schemas3lib)
    schemaMap.set('sc:score_1.0.0', schemaScore)
  })

  afterAll(() => {})

  test('should load testInfo and schemas correctly', () => {
    expect(testInfo).toBeDefined()
    expect(schemaMap).toBeDefined()
    const schema2 = schemaMap.get('8.2.0')
    expect(schema2).toBeDefined()
    const schema3 = schemaMap.get('8.3.0')
    expect(schema3).toBeDefined()
    const schema4 = schemaMap.get('8.4.0')
    expect(schema4).toBeDefined()
    const schema3lib = schemaMap.get('ts:8.3.0')
    expect(schema3lib).toBeDefined()
    const schemaScore = schemaMap.get('sc:score_1.0.0')
    expect(schemaScore).toBeDefined()
  })

  describe.each(testInfo)(
    '$error_code $name : $description',
    ({ error_code, alt_codes, name, schema, definitions, warning, tests }) => {
      let hedSchema
      let defList
      let expectedErrors
      let noErrors

      const failedSidecars = stringifyList(tests.sidecar_tests.fails)
      const passedSidecars = stringifyList(tests.sidecar_tests.passes)
      const failedEvents = tsvListToStrings(tests.event_tests.fails)
      const passedEvents = tsvListToStrings(tests.event_tests.passes)
      const failedCombos = comboListToStrings(tests.combo_tests.fails)
      const passedCombos = comboListToStrings(tests.combo_tests.passes)

      /**
       * Separates the error codes and warning codes from the issues
       * @param issues
       * @returns {[Set<string>,Set<string]}
       */
      const extractErrorCodes = function (issues) {
        const errors = new Set()
        const warnings = new Set()
        for (const issue of issues) {
          let code
          let level
          if (issue instanceof BidsHedIssue) {
            code = issue.hedIssue.hedCode
            level = issue.hedIssue.level
          } else {
            code = issue.hedCode
            level = issue.level
          }
          if (level === 'error') {
            errors.add(code)
          } else if (level === 'warning') {
            warnings.add(code)
          }
        }
        return [errors, warnings]
      }

      const assertErrors = function (expectedErrors, issues, header) {
        // Get the set of actual issues that were encountered.
        const [errors, warnings] = extractErrorCodes(issues)
        if (warning) {
          assert.isTrue(errors.size === 0, `${header} expected no errors but received [${[...errors].join(', ')}]`)
          let warningIntersection = [...expectedErrors].some((element) => warnings.has(element))
          if (expectedErrors.size === 0 && warnings.size === 0) {
            warningIntersection = true
          }
          assert.isTrue(
            warningIntersection,
            `${header} expected one of warnings[${[...expectedErrors].join(', ')}] but received [${[...warnings].join(', ')}]`,
          )
          return
        }
        let errorIntersection = [...expectedErrors].some((element) => errors.has(element))
        if (expectedErrors.size === 0 && errors.size === 0) {
          errorIntersection = true
        }
        assert.isTrue(
          errorIntersection,
          `${header} expected one of errors[${[...expectedErrors].join(', ')}] but received [${[...errors].join(', ')}]`,
        )
      }

      const comboValidator = function (side, events, expectedErrors) {
        const status = expectedErrors.size === 0 ? 'Expect pass' : 'Expect fail'
        const header = `\n[${error_code} ${name}](${status})\tCOMBO\t"${side}"\n"${events}"`
        let issues
        try {
          const defManager = new DefinitionManager()
          defManager.addDefinitions(defList)
          const parsedTsv = parseTSV(events)
          assert.instanceOf(parsedTsv, Map, `${events} cannot be parsed`)
          const bidsTsv = new BidsTsvFile(`events`, { path: 'combo test tsv' }, parsedTsv, JSON.parse(side), defManager)
          issues = bidsTsv.validate(hedSchema)
        } catch (e) {
          issues = [convertIssue(e)]
        }
        assertErrors(expectedErrors, issues, header)
      }

      const eventsValidator = function (events, expectedErrors) {
        const status = expectedErrors.size === 0 ? 'Expect pass' : 'Expect fail'
        const header = `\n[${error_code} ${name}](${status})\tEvents:\n"${events}"`
        let eventsIssues
        try {
          const defManager = new DefinitionManager()
          defManager.addDefinitions(defList)
          const parsedTsv = parseTSV(events)
          assert.instanceOf(parsedTsv, Map, `${events} cannot be parsed`)
          const bidsTsv = new BidsTsvFile(`events`, { path: 'events test' }, parsedTsv, {}, defManager)
          eventsIssues = bidsTsv.validate(hedSchema)
        } catch (e) {
          eventsIssues = [convertIssue(e)]
        }
        assertErrors(expectedErrors, eventsIssues, header)
      }

      const sideValidator = function (side, expectedErrors) {
        const status = expectedErrors.size === 0 ? 'Expect pass' : 'Expect fail'
        const header = `\n[${error_code} ${name}](${status})\tSIDECAR "${side}"`
        let issues
        try {
          const defManager = new DefinitionManager()
          defManager.addDefinitions(defList)
          const bidsSide = new BidsSidecar(`sidecar`, { path: 'sidecar test' }, JSON.parse(side), defManager)
          issues = bidsSide.validate(hedSchema)
        } catch (e) {
          issues = [convertIssue(e)]
        }
        assertErrors(expectedErrors, issues, header)
      }

      const stringValidator = function (str, expectedErrors) {
        const status = expectedErrors.size === 0 ? 'Expect pass' : 'Expect fail'
        const header = `\n[${error_code} ${name}](${status})\tSTRING: "${str}"`
        const hTsv = `onset\tHED\n5.4\t${str}\n`
        let stringIssues
        try {
          const defManager = new DefinitionManager()
          defManager.addDefinitions(defList)
          const parsedTsv = parseTSV(hTsv)
          assert.instanceOf(parsedTsv, Map, `${str} cannot be parsed`)
          const bidsTsv = new BidsTsvFile(`string`, { path: 'string test tsv' }, parsedTsv, {}, defManager)
          stringIssues = bidsTsv.validate(hedSchema)
        } catch (e) {
          stringIssues = [convertIssue(e)]
        }
        assertErrors(expectedErrors, stringIssues, header)
      }

      /**
       * Convert an Error into an Issue.
       *
       * @param {Error} issueError A thrown error.
       * @returns {Issue} A HED issue.
       */
      const convertIssue = function (issueError) {
        if (issueError instanceof IssueError) {
          return issueError.issue
        } else {
          return generateIssue('internalError', { message: issueError.message })
        }
      }

      const getSchema = function (schemaVersion) {
        const parts = schemaVersion.split(':', 2)
        const prefix = parts.length === 1 ? '' : parts[0]
        const thisSchema = schemaMap.get(schemaVersion).schemas
        return [prefix, thisSchema.get(prefix)]
      }

      const getSchemas = function (schemaVersion) {
        const hedMap = new Map()
        if (typeof schemaVersion === 'string') {
          const [prefix, schema] = getSchema(schemaVersion)
          hedMap.set(prefix, schema)
        } else {
          for (const version of schemaVersion) {
            const [prefix, schema] = getSchema(version)
            hedMap.set(prefix, schema)
          }
        }
        return new HedSchemas(hedMap)
      }

      beforeAll(async () => {
        hedSchema = getSchemas(schema)
        assert(hedSchema !== undefined, 'HED schemas required should be defined')
        let defIssues
        ;[defList, defIssues] = DefinitionManager.createDefinitions(definitions, hedSchema)
        assert.equal(defIssues.length, 0, `${name}: input definitions "${definitions}" have errors "${defIssues}"`)
        expectedErrors = new Set(alt_codes)
        expectedErrors.add(error_code)
        noErrors = new Set()
      })

      afterAll(() => {})

      // If debugging a single test
      if (!shouldRun(error_code, name, runAll, runMap, skipMap)) {
        // eslint-disable-next-line no-console
        console.log(`----Skipping JSON Spec tests ${error_code} [${name}]}`)
        return
      }
      // Run tests except for the ones explicitly skipped or because they are warnings
      if (error_code in skippedErrors) {
        test.skip(`Skipping tests ${error_code} [${name}] skipped because ${skippedErrors[error_code]}`, () => {})
      } else if (name in skippedErrors) {
        test.skip(`Skipping tests ${error_code} [${name}] skipped because ${skippedErrors[name]}`, () => {})
      } else {
        test('it should have HED schema defined', () => {
          expect(hedSchema).toBeDefined()
        })

        if (tests.string_tests.passes.length > 0 && (runOnly.size === 0 || runOnly.has('stringPass'))) {
          test.each(tests.string_tests.passes)('Valid string: %s', (str) => {
            stringValidator(str, new Set())
          })
        }

        if (tests.string_tests.fails.length > 0 && (runOnly.size === 0 || runOnly.has('stringFail'))) {
          test.each(tests.string_tests.fails)('Invalid string: %s', (str) => {
            stringValidator(str, expectedErrors)
          })
        }

        if (passedSidecars.length > 0 && (runOnly.size === 0 || runOnly.has('sidecarPass'))) {
          test.each(passedSidecars)(`Valid sidecar: %s`, (side) => {
            sideValidator(side, noErrors)
          })
        }

        if (failedSidecars.length > 0 && (runOnly.size === 0 || runOnly.has('sidecarFail'))) {
          test.each(failedSidecars)(`Invalid sidecar: %s`, (side) => {
            sideValidator(side, expectedErrors)
          })
        }

        if (passedEvents.length > 0 && (runOnly.size === 0 || runOnly.has('eventsPass'))) {
          test.each(passedEvents)(`Valid events: %s`, (events) => {
            eventsValidator(events, noErrors)
          })
        }

        if (failedEvents.length > 0 && (runOnly.size === 0 || runOnly.has('eventsFail'))) {
          test.each(failedEvents)(`Invalid events: %s`, (events) => {
            eventsValidator(events, expectedErrors)
          })
        }

        if (passedCombos.length > 0 && (runOnly.size === 0 || runOnly.has('combosPass'))) {
          test.each(passedCombos)(`Valid combo: [%s] [%s]`, (side, events) => {
            comboValidator(side, events, noErrors)
          })
        }

        if (failedCombos.length > 0 && (runOnly.size === 0 || runOnly.has('combosFail'))) {
          test.each(failedCombos)(`Invalid combo: [%s] [%s]`, (side, events) => {
            comboValidator(side, events, expectedErrors)
          })
        }
      }
    },
  )
})
