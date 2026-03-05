import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

// ---------------------------------------------------------------------------
// KAN-275: [Mac][UI] "Update API Key" Button Design Looks Inconsistent
//          and Visually Unpolished
//
// Root cause: The API Key save/update button in Settings uses a bright green
// gradient (#22c55e → #16a34a) with a heavy green glow, clashing with the
// app's blue/purple/cyan gradient theme. Other primary buttons use
// blue-to-cyan gradients.
//
// Fix: Replace the green gradient with the app's primary gradient style
// (blue/cyan) to match the design system. Remove the excessive green glow.
// ---------------------------------------------------------------------------

const APP_SOURCE = fs.readFileSync(
  path.join(__dirname, '../../renderer/src/App.tsx'),
  'utf-8'
)

function getApiKeyButtonSection(): string {
  const start = APP_SOURCE.indexOf('{/* Save Button')
  const end = APP_SOURCE.indexOf('</Tooltip>', start)
  return APP_SOURCE.slice(start, end + 10)
}

describe('KAN-275: API Key button must match app design system', () => {

  // ==========================================================================
  // 1. Button must NOT use green gradient
  // ==========================================================================
  describe('no green gradient on active state', () => {
    it('must NOT use #22c55e (green-500)', () => {
      const section = getApiKeyButtonSection()
      expect(section).not.toContain('#22c55e')
    })

    it('must NOT use #16a34a (green-600)', () => {
      const section = getApiKeyButtonSection()
      expect(section).not.toContain('#16a34a')
    })

    it('must NOT have green glow shadow (rgba 34,197,94)', () => {
      const section = getApiKeyButtonSection()
      expect(section).not.toContain('34, 197, 94')
    })
  })

  // ==========================================================================
  // 2. Button must use the app's primary gradient (blue/cyan/purple)
  // ==========================================================================
  describe('uses app primary gradient', () => {
    it('must use a blue/cyan gradient for active state', () => {
      const section = getApiKeyButtonSection()
      expect(section).toMatch(/#06b6d4|#0ea5e9|#3b82f6|#8b5cf6|#48dbfb|#0abde3/)
    })
  })

  // ==========================================================================
  // 3. Regression guards
  // ==========================================================================
  describe('regression guards', () => {
    it('save button must still exist', () => {
      expect(APP_SOURCE).toContain('{/* Save Button')
    })

    it('must still call handleSaveApiKey', () => {
      const section = getApiKeyButtonSection()
      expect(section).toContain('handleSaveApiKey')
    })

    it('must still show Update API Key text when key exists', () => {
      const section = getApiKeyButtonSection()
      expect(section).toContain('Update API Key')
    })

    it('must still be disabled when input is empty', () => {
      const section = getApiKeyButtonSection()
      expect(section).toContain('disabled')
    })
  })
})
