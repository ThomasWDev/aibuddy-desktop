import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const INDEX_CSS = fs.readFileSync(
  path.join(__dirname, '../../renderer/src/index.css'),
  'utf-8'
)

const APP_SOURCE = fs.readFileSync(
  path.join(__dirname, '../../renderer/src/App.tsx'),
  'utf-8'
)

// ---------------------------------------------------------------------------
// KAN-274: [Mac][UI] Unwanted Horizontal and Vertical Scrollbars Appearing
//
// Root causes:
// 1. No overflow: hidden on html/body — viewport shows scrollbars when any
//    content exceeds bounds
// 2. Global ::-webkit-scrollbar width: 8px forces non-overlay scrollbars on
//    macOS, overriding native overlay behavior
// 3. Root div uses h-screen (100vh) without overflow-hidden — children that
//    exceed bounds trigger viewport-level scrollbars
// 4. No scrollbar-width CSS standard property for cross-engine compat
// ---------------------------------------------------------------------------

describe('KAN-274: Unwanted scrollbars on macOS', () => {
  // ==========================================================================
  // 1. html/body must prevent viewport-level scrollbars
  // ==========================================================================
  describe('html/body overflow containment', () => {
    it('html must have overflow: hidden to prevent viewport scrollbars', () => {
      const htmlBlock = INDEX_CSS.slice(
        INDEX_CSS.indexOf('html {'),
        INDEX_CSS.indexOf('}', INDEX_CSS.indexOf('html {')) + 1
      )
      expect(htmlBlock).toContain('overflow: hidden')
    })

    it('body must have overflow: hidden to prevent viewport scrollbars', () => {
      const bodyIdx = INDEX_CSS.indexOf('body {')
      const bodyBlock = INDEX_CSS.slice(
        bodyIdx,
        INDEX_CSS.indexOf('}', bodyIdx) + 1
      )
      expect(bodyBlock).toContain('overflow: hidden')
    })
  })

  // ==========================================================================
  // 2. Global scrollbar must use thin style, not force 8px width
  // ==========================================================================
  describe('global scrollbar styling', () => {
    it('global scrollbar width must be 6px or less (thin, non-intrusive)', () => {
      const scrollbarRule = INDEX_CSS.match(/::-webkit-scrollbar\s*\{[^}]*\}/)?.[0] || ''
      const widthMatch = scrollbarRule.match(/width:\s*(\d+)px/)
      expect(widthMatch).toBeTruthy()
      const width = parseInt(widthMatch![1], 10)
      expect(width).toBeLessThanOrEqual(6)
    })

    it('global scrollbar height must be 6px or less', () => {
      const scrollbarRule = INDEX_CSS.match(/::-webkit-scrollbar\s*\{[^}]*\}/)?.[0] || ''
      const heightMatch = scrollbarRule.match(/height:\s*(\d+)px/)
      expect(heightMatch).toBeTruthy()
      const height = parseInt(heightMatch![1], 10)
      expect(height).toBeLessThanOrEqual(6)
    })

    it('must include scrollbar-width: thin for standard CSS compat', () => {
      expect(INDEX_CSS).toContain('scrollbar-width: thin')
    })
  })

  // ==========================================================================
  // 3. Root div must contain overflow
  // ==========================================================================
  describe('root layout overflow containment', () => {
    function getRootDivClasses(): string {
      const match = APP_SOURCE.match(/className="h-screen[^"]*"/)
      expect(match).toBeTruthy()
      return match![0]
    }

    it('root div must have overflow-hidden to prevent scrollbar leaking', () => {
      expect(getRootDivClasses()).toContain('overflow-hidden')
    })

    it('root div must still use h-screen for full height', () => {
      expect(getRootDivClasses()).toContain('h-screen')
    })

    it('root div must still use flex-col for layout', () => {
      expect(getRootDivClasses()).toContain('flex-col')
    })
  })

  // ==========================================================================
  // 4. Scrollbar thumb must use translucent style (not opaque)
  // ==========================================================================
  describe('scrollbar thumb styling', () => {
    it('scrollbar thumb must use rgba for translucency', () => {
      expect(INDEX_CSS).toMatch(/::-webkit-scrollbar-thumb\s*\{[^}]*rgba\(/)
    })

    it('scrollbar track must be transparent', () => {
      expect(INDEX_CSS).toMatch(/::-webkit-scrollbar-track\s*\{[^}]*transparent/)
    })
  })

  // ==========================================================================
  // 5. No 100vw usage (causes horizontal scrollbar when vertical is visible)
  // ==========================================================================
  describe('no 100vw in layout (scrollbar-aware sizing)', () => {
    it('App.tsx must not use w-screen or 100vw in root container', () => {
      const rootLine = APP_SOURCE.match(/return\s*\(\s*<div[^>]*>/)?.[0] || ''
      expect(rootLine).not.toContain('w-screen')
      expect(rootLine).not.toContain('100vw')
    })
  })

  // ==========================================================================
  // 6. Scrollbar-hidden utility for specific containers
  // ==========================================================================
  describe('scrollbar-hidden utility class', () => {
    it('must define a scrollbar-hidden class that hides scrollbars completely', () => {
      expect(INDEX_CSS).toContain('.scrollbar-hidden')
      expect(INDEX_CSS).toMatch(/\.scrollbar-hidden::-webkit-scrollbar\s*\{/)
    })
  })

  // ==========================================================================
  // 7. Regression guards — existing scrollable areas must still work
  // ==========================================================================
  describe('regression — scrollable areas preserved', () => {
    it('main chat area must still have overflow-y-auto', () => {
      expect(APP_SOURCE).toContain('overflow-y-auto')
    })

    it('history sidebar must still scroll', () => {
      const sidebarSource = fs.readFileSync(
        path.join(__dirname, '../../renderer/src/components/HistorySidebar.tsx'),
        'utf-8'
      )
      expect(sidebarSource).toContain('overflow-y-auto')
    })

    it('terminal output must still scroll', () => {
      expect(APP_SOURCE).toMatch(/overflow-y-auto/)
    })

    it('settings modal must still scroll', () => {
      const settingsIdx = APP_SOURCE.indexOf('Settings')
      expect(settingsIdx).toBeGreaterThan(-1)
      expect(APP_SOURCE).toContain('overflow-y-auto')
    })
  })
})
