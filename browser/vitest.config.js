import { defineConfig } from 'vitest/config'
import fs from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

// The validator's source imports its bundled schemas as text, as esbuild (esbuild.mjs) and jest (jest.config.js) do.
const xmlAsText = {
  name: 'xml-as-text',
  enforce: 'pre',
  load(id) {
    if (id.endsWith('.xml')) {
      return `export default ${JSON.stringify(fs.readFileSync(id, 'utf8'))}`
    }
  },
}

export default defineConfig({
  plugins: [xmlAsText],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.spec.js'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  define: {
    // Define the Vite environment variable that the config.js file checks for
    __VITE_ENV__: 'true',
  },
})
