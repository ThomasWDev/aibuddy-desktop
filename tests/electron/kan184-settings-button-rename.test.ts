/**
 * KAN-184 TDD: Rename "API Key" button to "Settings"
 *
 * Root cause: Header button labeled "API Key ✓" / "Add Key" opens a multi-section
 * settings panel (API Key + Appearance + Language + Usage Limits), misleading users.
 * Modal title also says "Manage API Key" despite containing broader settings.
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, it, expect } from 'vitest'

const ROOT = resolve(__dirname, '../..')
const read = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf-8')

describe('KAN-184 — Rename API Key button to Settings', () => {
  const appTsx = read('renderer/src/App.tsx')

  it('header button must show "Settings" label, not "API Key"', () => {
    const start = appTsx.indexOf('trackButtonClick(\'Settings\'')
    const btnArea = appTsx.slice(start, start + 800)
    expect(btnArea).toMatch(/Settings|header\.settings/)
    expect(btnArea).not.toContain('API Key ✓')
    expect(btnArea).not.toContain('Add Key')
  })

  it('header button must use Settings icon, not Key icon', () => {
    const btnArea = appTsx.slice(
      appTsx.indexOf('trackButtonClick(\'Settings\''),
      appTsx.indexOf('trackButtonClick(\'Settings\'') + 500
    )
    expect(btnArea).toContain('<Settings')
    // Key icon should not be in the button itself (it can exist elsewhere)
    expect(btnArea).not.toMatch(/<Key\s+className/)
  })

  it('header button tooltip must say "Settings"', () => {
    const tooltipIdx = appTsx.lastIndexOf('Tooltip', appTsx.indexOf('trackButtonClick(\'Settings\''))
    const tooltipBlock = appTsx.slice(tooltipIdx, tooltipIdx + 200)
    expect(tooltipBlock).toMatch(/text=.*[Ss]ettings|header\.settings/)
  })

  it('settings modal title must say "Settings", not "API Key"', () => {
    // The modal header h2 near showSettings
    const modalIdx = appTsx.indexOf('maxHeight: \'85vh\'')
    const headerBlock = appTsx.slice(modalIdx, modalIdx + 600)
    expect(headerBlock).toContain('Settings')
    expect(headerBlock).not.toContain('Manage API Key')
    expect(headerBlock).not.toContain('Add API Key')
  })

  it('settings modal must use Settings icon in header', () => {
    const modalIdx = appTsx.indexOf('maxHeight: \'85vh\'')
    const headerBlock = appTsx.slice(modalIdx, modalIdx + 600)
    expect(headerBlock).toContain('<Settings')
  })
})
