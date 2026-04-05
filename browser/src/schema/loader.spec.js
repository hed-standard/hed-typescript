import { describe, it, expect, vi } from 'vitest'
import { loadSchema } from './loader'
import { SchemaSpec } from '../../../src/schema/specs.ts'

vi.mock(import('./vite-importer.js'), () => {
  return {
    schemaData: {
      '../../../src/data/schemas/HED_HED8.0.0_8.0.0.xml': () =>
        Promise.resolve('<?xml version="1.0" ?>\n<HED><schema></schema></HED>\n'),
    },
  }
})

describe('Browser Schema Loader', () => {
  it('should return a parsed XML object when loading a dummy bundled schema in test environment', async () => {
    // Create a spec with localName to trigger bundled schema loading
    const spec = new SchemaSpec('', '8.0.0', 'HED8.0.0', '')
    const schema = await loadSchema(spec)
    expect(schema).toHaveProperty('HED')
  })

  it('should throw an error for local file loading', async () => {
    const spec = new SchemaSpec('', '', '', 'path/to/local.xml')
    await expect(loadSchema(spec)).rejects.toThrow('Local schema loading is not supported in the browser.')
  })
})
