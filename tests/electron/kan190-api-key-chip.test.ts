/**
 * KAN-190 TDD: "API Key Set" chip — originally made interactive, then
 * KAN-276 superseded it: the chip is now a non-interactive status indicator
 * to avoid duplicate modal entry points (Settings button is the sole trigger).
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, it, expect } from 'vitest'

const ROOT = resolve(__dirname, '../..')
const read = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf-8')

describe('KAN-190 → KAN-276: API Key chip is a non-interactive status indicator', () => {
  const welcome = read('renderer/src/components/welcome/WelcomeScreen.tsx')

  it('API Key status must be a span indicator, not a button', () => {
    const apiKeySection = welcome.slice(
      welcome.indexOf('{/* API Key Status'),
      welcome.indexOf('{/* Settings Button')
    )
    expect(apiKeySection).toContain('<span')
    expect(apiKeySection).not.toMatch(/<button[\s>]/)
  })

  it('API Key chip must NOT have onClick (Settings is the sole entry point)', () => {
    const apiKeySection = welcome.slice(
      welcome.indexOf('{/* API Key Status'),
      welcome.indexOf('{/* Settings Button')
    )
    expect(apiKeySection).not.toContain('onClick')
  })

  it('API Key chip must show key status via hasApiKey', () => {
    const apiKeySection = welcome.slice(
      welcome.indexOf('{/* API Key Status'),
      welcome.indexOf('{/* Settings Button')
    )
    expect(apiKeySection).toContain('hasApiKey')
  })
})

describe('KAN-190 — WelcomeScreen header consistency', () => {
  const welcome = read('renderer/src/components/welcome/WelcomeScreen.tsx')

  it('Settings button must still exist', () => {
    expect(welcome).toContain('handleOpenSettings')
  })

  it('Buy Credits button must still exist', () => {
    expect(welcome).toContain("t('header.buyCredits')")
  })
})
