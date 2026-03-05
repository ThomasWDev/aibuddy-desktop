import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

// ---------------------------------------------------------------------------
// KAN-280: [Mac][UX] Replace "Last Cost" Tooltip with "Total Cost Used"
//          Indicator in Header
//
// Root cause: Header only shows the last single-request cost, which gives
// users no visibility into cumulative spending.
//
// Fix: Add a `totalSessionCost` state that accumulates every API response
// cost. Display in the header as "Total Used: $X.XX". Tooltip shows breakdown:
// Total Used, Last Request cost, and Model. Persisted to electron store
// so it survives app restarts within the same day.
// ---------------------------------------------------------------------------

const APP_SOURCE = fs.readFileSync(
  path.join(__dirname, '../../renderer/src/App.tsx'),
  'utf-8'
)

function getCostDisplaySection(): string {
  const start = APP_SOURCE.indexOf('{/* KAN-280')
  if (start === -1) {
    const fallback = APP_SOURCE.indexOf('{/* KAN-27 FIX: Last Cost')
    const end = APP_SOURCE.indexOf('</Tooltip>', fallback)
    return APP_SOURCE.slice(fallback, end + 10)
  }
  const end = APP_SOURCE.indexOf('</Tooltip>', start)
  return APP_SOURCE.slice(start, end + 10)
}

describe('KAN-280: Total Cost Used indicator in header', () => {

  // ==========================================================================
  // 1. State must exist for total session cost
  // ==========================================================================
  describe('totalSessionCost state', () => {
    it('must declare totalSessionCost state variable', () => {
      expect(APP_SOURCE).toMatch(/totalSessionCost/)
    })

    it('must initialize totalSessionCost to 0', () => {
      expect(APP_SOURCE).toMatch(/useState\s*<number>\s*\(\s*0\s*\)/)
    })
  })

  // ==========================================================================
  // 2. Cost accumulation
  // ==========================================================================
  describe('cost accumulation logic', () => {
    it('must accumulate cost with setTotalSessionCost using prev + new', () => {
      expect(APP_SOURCE).toMatch(/setTotalSessionCost\s*\(\s*prev\s*=>\s*prev\s*\+/)
    })

    it('must persist totalSessionCost to electron store', () => {
      expect(APP_SOURCE).toMatch(/store\??\.set\(['"]totalSessionCost['"]/)
    })

    it('must load totalSessionCost from store on init', () => {
      expect(APP_SOURCE).toMatch(/store\.get\(['"]totalSessionCost['"]/)
    })
  })

  // ==========================================================================
  // 3. Header display
  // ==========================================================================
  describe('header display', () => {
    it('must show total cost in the header area', () => {
      const section = getCostDisplaySection()
      expect(section).toContain('totalSessionCost')
    })

    it('must format total cost with .toFixed', () => {
      const section = getCostDisplaySection()
      expect(section).toMatch(/totalSessionCost\.toFixed/)
    })
  })

  // ==========================================================================
  // 4. Tooltip content
  // ==========================================================================
  describe('tooltip breakdown', () => {
    it('tooltip must include Total Used label', () => {
      const section = getCostDisplaySection()
      expect(section).toMatch(/Total/)
    })

    it('tooltip must include Last Request cost', () => {
      const section = getCostDisplaySection()
      expect(section).toMatch(/Last|lastCost/)
    })
  })

  // ==========================================================================
  // 5. Regression guards
  // ==========================================================================
  describe('regression guards', () => {
    it('must still track lastCost for individual requests', () => {
      expect(APP_SOURCE).toContain('setLastCost')
    })

    it('must still track lastModel', () => {
      expect(APP_SOURCE).toContain('setLastModel')
    })
  })
})
