import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

// ---------------------------------------------------------------------------
// KAN-183: [Mac] App Language Change Does Not Fully Apply — Partial
//          Localization Only
//
// Root cause: Hardcoded English strings in WelcomeScreen.tsx and App.tsx
// header bypass the t() translation function. Keys exist in en.json but
// are not wired into components. Russian locale (ru.json) is also missing
// several translation keys.
//
// Fix: (1) Add missing i18n keys to en.json and ru.json. (2) Replace
// hardcoded strings in App.tsx header with t() calls. (3) Ensure all
// locale files have parity on key count.
// ---------------------------------------------------------------------------

const LOCALES_DIR = path.join(__dirname, '../../renderer/src/i18n/locales')
const en = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, 'en.json'), 'utf-8'))
const ru = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, 'ru.json'), 'utf-8'))

const APP_SOURCE = fs.readFileSync(
  path.join(__dirname, '../../renderer/src/App.tsx'),
  'utf-8'
)

function flattenKeys(obj: Record<string, any>, prefix = ''): string[] {
  const keys: string[] = []
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      keys.push(...flattenKeys(v, full))
    } else {
      keys.push(full)
    }
  }
  return keys
}

function getHeaderSection(): string {
  const start = APP_SOURCE.indexOf('{/* Header Bar')
  if (start === -1) {
    const altStart = APP_SOURCE.indexOf('<header')
    if (altStart === -1) return ''
    const end = APP_SOURCE.indexOf('</header>', altStart)
    return APP_SOURCE.slice(altStart, end + 9)
  }
  const end = APP_SOURCE.indexOf('</header>', start)
  return APP_SOURCE.slice(start, end + 9)
}

describe('KAN-183: Full localization coverage', () => {

  // ==========================================================================
  // 1. en.json must have all required header keys
  // ==========================================================================
  describe('en.json header keys', () => {
    it('must have header.appTooltip', () => {
      expect(en.header.appTooltip).toBeDefined()
    })

    it('must have header.home', () => {
      expect(en.header.home).toBeDefined()
    })

    it('must have header.homeTooltip', () => {
      expect(en.header.homeTooltip).toBeDefined()
    })

    it('must have header.newChatTooltip', () => {
      expect(en.header.newChatTooltip).toBeDefined()
    })

    it('must have header.historyTooltip', () => {
      expect(en.header.historyTooltip).toBeDefined()
    })

    it('must have header.interviewTooltip', () => {
      expect(en.header.interviewTooltip).toBeDefined()
    })

    it('must have header.openProjectFolder', () => {
      expect(en.header.openProjectFolder).toBeDefined()
    })

    it('must have header.total (cost label)', () => {
      expect(en.header.total).toBeDefined()
    })
  })

  // ==========================================================================
  // 2. en.json must have API Key modal keys
  // ==========================================================================
  describe('en.json apiKey keys', () => {
    it('must have apiKey.updateTitle', () => {
      expect(en.apiKey.updateTitle).toBeDefined()
    })

    it('must have apiKey.updateDescription', () => {
      expect(en.apiKey.updateDescription).toBeDefined()
    })

    it('must have apiKey.connectedStatus', () => {
      expect(en.apiKey.connectedStatus).toBeDefined()
    })

    it('must have apiKey.updateKey', () => {
      expect(en.apiKey.updateKey).toBeDefined()
    })

    it('must have apiKey.settingsTooltip', () => {
      expect(en.apiKey.settingsTooltip).toBeDefined()
    })

    it('must have apiKey.saveError', () => {
      expect(en.apiKey.saveError).toBeDefined()
    })
  })

  // ==========================================================================
  // 3. ru.json must have ALL the same keys as en.json
  // ==========================================================================
  describe('ru.json key parity with en.json', () => {
    const enKeys = flattenKeys(en).sort()
    const ruKeys = flattenKeys(ru).sort()

    it('ru.json must have at least as many keys as en.json', () => {
      const missing = enKeys.filter(k => !ruKeys.includes(k))
      expect(missing).toEqual([])
    })
  })

  // ==========================================================================
  // 4. App.tsx header must use t() for visible text
  // ==========================================================================
  describe('App.tsx header i18n usage', () => {
    it('must use t() for Settings tooltip', () => {
      expect(APP_SOURCE).toMatch(/t\(['"]header\.settings['"]\)/)
    })

    it('must use t() for history tooltip', () => {
      expect(APP_SOURCE).toMatch(/t\(['"]header\.historyTooltip['"]\)/)
    })

    it('must use t() for interview tooltip', () => {
      expect(APP_SOURCE).toMatch(/t\(['"]header\.interviewTooltip['"]\)/)
    })

    it('must use t() for more actions tooltip', () => {
      expect(APP_SOURCE).toMatch(/t\(['"]header\.moreActions['"]\)/)
    })

    it('must use t() for Home label', () => {
      expect(APP_SOURCE).toMatch(/t\(['"]header\.home['"]\)/)
    })

    it('must use t() for New label', () => {
      expect(APP_SOURCE).toMatch(/t\(['"]header\.new['"]\)/)
    })
  })

  // ==========================================================================
  // 5. ru.json values must NOT be English
  // ==========================================================================
  describe('ru.json translations are actually Russian', () => {
    it('header.settings is translated', () => {
      expect(ru.header.settings).not.toBe(en.header.settings)
    })

    it('header.home is translated', () => {
      expect(ru.header.home).not.toBe(en.header.home)
    })

    it('apiKey.updateTitle is translated', () => {
      expect(ru.apiKey.updateTitle).not.toBe(en.apiKey.updateTitle)
    })

    it('feedback.cancel is translated', () => {
      expect(ru.feedback.cancel).not.toBe(en.feedback.cancel)
    })

    it('historySidebar.deleteAll is translated', () => {
      expect(ru.historySidebar.deleteAll).not.toBe(en.historySidebar.deleteAll)
    })
  })
})
