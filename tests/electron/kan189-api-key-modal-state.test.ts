/**
 * KAN-189 TDD: API Key Modal must show saved key status when reopened
 *
 * Root cause: apiKeyInput is useState('') and never synced from apiKey
 * when showSettings becomes true.
 * Fix: Add useEffect to sync apiKeyInput with masked apiKey on modal open.
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, it, expect } from 'vitest'

const ROOT = resolve(__dirname, '../..')
const read = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf-8')

describe('KAN-189 — API Key modal reflects saved key', () => {
  const appTsx = read('renderer/src/App.tsx')

  it('must have useEffect that syncs apiKeyInput when showSettings changes', () => {
    expect(appTsx).toMatch(/useEffect\s*\(\s*\(\)\s*=>\s*\{[\s\S]*?apiKey[\s\S]*?apiKeyInput[\s\S]*?\[.*showSettings/)
  })

  it('must mask the API key in the input (not show full key)', () => {
    expect(appTsx).toMatch(/mask|••••|\*\*\*\*|\.slice\(.*-4\)|\.slice\(-/)
  })

  it('modal title must change based on whether key exists', () => {
    expect(appTsx).toMatch(/apiKey\s*\?[\s\S]*?Manage|Update|Settings[\s\S]*?:[\s\S]*?Add/)
  })

  it('save button must say Update when key exists', () => {
    expect(appTsx).toMatch(/apiKey[\s\S]*?Update|Replace/)
  })
})
