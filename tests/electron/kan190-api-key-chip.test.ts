/**
 * KAN-190 TDD: "API Key Set" chip must be interactive
 *
 * Root cause: Chip is a <span> with pill styling but no onClick.
 * Fix: Change to <button> with onClick={handleOpenSettings}.
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, it, expect } from 'vitest'

const ROOT = resolve(__dirname, '../..')
const read = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf-8')

describe('KAN-190 — API Key chip must be interactive', () => {
  const welcome = read('renderer/src/components/welcome/WelcomeScreen.tsx')

  it('API Key status must be a button, not a span', () => {
    const apiKeySection = welcome.slice(
      welcome.indexOf('API Key Status'),
      welcome.indexOf('API Key Status') + 500
    )
    expect(apiKeySection).toContain('<button')
  })

  it('API Key chip must call handleOpenSettings on click', () => {
    const apiKeySection = welcome.slice(
      welcome.indexOf('API Key Status'),
      welcome.indexOf('API Key Status') + 500
    )
    expect(apiKeySection).toMatch(/onClick.*handleOpenSettings|handleOpenSettings.*onClick/)
  })

  it('API Key chip must have cursor pointer', () => {
    const apiKeySection = welcome.slice(
      welcome.indexOf('API Key Status'),
      welcome.indexOf('API Key Status') + 500
    )
    expect(apiKeySection).toMatch(/cursor.*pointer/)
  })
})

describe('KAN-190 — WelcomeScreen header consistency', () => {
  const welcome = read('renderer/src/components/welcome/WelcomeScreen.tsx')

  it('Settings button must still exist', () => {
    expect(welcome).toContain('handleOpenSettings')
  })

  it('Get Credits button must still exist', () => {
    expect(welcome).toContain('Get Credits')
  })
})
