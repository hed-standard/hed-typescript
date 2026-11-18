import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from '@jest/globals'

import { localSchemaNames } from '../../src/schema/config'

// Checks of the published ESM (browser) build. They need dist/, which "npm run build" writes (npm ci and npm install
// run it through the "prepare" script); without it they are skipped.
const browserDir = path.join(__dirname, '..', '..', 'dist', 'browser')
const browserIndex = path.join(browserDir, 'index.js')
const describeBuild = fs.existsSync(browserIndex) ? describe : describe.skip

describeBuild('Browser build', () => {
  const browserCode = fs.existsSync(browserIndex) ? fs.readFileSync(browserIndex, 'utf8') : ''

  it('imports no Node.js module', () => {
    const chunkFiles = fs.readdirSync(path.join(browserDir, 'schemas')).filter((name) => name.endsWith('.js'))
    for (const code of [
      browserCode,
      ...chunkFiles.map((name) => fs.readFileSync(path.join(browserDir, 'schemas', name), 'utf8')),
    ]) {
      expect(code).not.toMatch(/(?:from|import|require)\s*\(?\s*["'](?:node:)?(?:fs|fs\/promises|path)["']/)
      expect(code).not.toContain('node:')
    }
  })

  it('uses the browser schema loader and the browser directory accessor', () => {
    expect(browserCode).toContain('Local file reading is not supported in browser environment')
    expect(browserCode).toContain('it needs Node.js file system access')
  })

  it('ships one chunk per bundled schema, loaded on demand', () => {
    for (const name of localSchemaNames) {
      expect(fs.existsSync(path.join(browserDir, 'schemas', `${name}.js`))).toBe(true)
      expect(browserCode).toContain(`import("./schemas/${name}.js")`)
    }
    // No schema text is inlined (every schema XML file declares its version on the HED root element).
    expect(browserCode).not.toMatch(/<HED [^>]*version=/)
  })
})
