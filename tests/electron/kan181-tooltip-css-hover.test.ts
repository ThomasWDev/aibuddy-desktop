import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

/**
 * KAN-181 v2: Tooltip still flickers on hover despite v1 fix
 *
 * Previous fix: Removed hover:scale-105, added disabled prop, changed
 * inline-block to inline-flex. But the Tooltip still uses React state
 * (useState + onMouseEnter/onMouseLeave), which causes re-renders on
 * every hover. When the tooltip appears below the button with
 * pointer-events: none, the browser fires mouseLeave on the wrapper
 * when the cursor enters the pointer-events-none child area, causing
 * rapid show/hide cycling (classic hover flicker).
 *
 * Fix: Convert Tooltip to CSS-only hover (group + group-hover:opacity-100).
 * Eliminates React state, re-renders, and the pointer-events-none flicker.
 * Uses opacity transition instead of mount/unmount for smooth animation.
 */

const APP_SOURCE = fs.readFileSync(
  path.resolve(__dirname, '../../renderer/src/App.tsx'),
  'utf-8'
)

function getTooltipBlock(): string {
  const start = APP_SOURCE.indexOf('function Tooltip(')
  // Slice a generous block that covers the entire Tooltip function
  // (it's ~40 lines, well within 2000 chars)
  return APP_SOURCE.slice(start, start + 2000)
}

describe('KAN-181 v2: CSS-only Tooltip to eliminate hover flicker', () => {

  // ==========================================================================
  // 1. Tooltip must NOT use React state for hover
  // ==========================================================================
  describe('Tooltip — no React state for hover', () => {
    it('must NOT use useState for show/hide toggle', () => {
      const block = getTooltipBlock()
      expect(block).not.toMatch(/useState.*show|const \[show/)
    })

    it('must NOT use onMouseEnter/onMouseLeave handlers', () => {
      const block = getTooltipBlock()
      expect(block).not.toContain('onMouseEnter')
      expect(block).not.toContain('onMouseLeave')
    })
  })

  // ==========================================================================
  // 2. Tooltip must use CSS group-hover
  // ==========================================================================
  describe('Tooltip — CSS-only hover via group/group-hover', () => {
    it('wrapper must have the "group" class', () => {
      const block = getTooltipBlock()
      expect(block).toMatch(/className.*group\b/)
    })

    it('tooltip element must use group-hover for visibility', () => {
      const block = getTooltipBlock()
      expect(block).toContain('group-hover:opacity-100')
    })

    it('tooltip must start invisible with opacity-0', () => {
      const block = getTooltipBlock()
      expect(block).toContain('opacity-0')
    })

    it('must have a CSS transition for smooth appearance', () => {
      const block = getTooltipBlock()
      expect(block).toMatch(/transition-opacity|transition-all/)
    })
  })

  // ==========================================================================
  // 3. Existing functionality must be preserved
  // ==========================================================================
  describe('Preserved functionality', () => {
    it('disabled prop must still suppress tooltip', () => {
      const block = getTooltipBlock()
      expect(block).toContain('disabled')
    })

    it('must still use pointer-events-none on tooltip content', () => {
      const block = getTooltipBlock()
      expect(block).toContain('pointer-events-none')
    })

    it('must still support position variants (top/bottom/left/right)', () => {
      const block = getTooltipBlock()
      expect(block).toContain('top:')
      expect(block).toContain('bottom:')
    })

    it('wrapper must still use inline-flex', () => {
      const block = getTooltipBlock()
      expect(block).toContain('inline-flex')
    })

    it('tooltip z-index must be present', () => {
      const block = getTooltipBlock()
      expect(block).toMatch(/z-\[60\]|z-50|z-60/)
    })
  })

  // ==========================================================================
  // 4. More Actions button specific checks
  // ==========================================================================
  describe('More Actions button — no hover flicker', () => {
    it('More Actions button must NOT use hover:scale', () => {
      const anchor = APP_SOURCE.indexOf('header.moreActions') !== -1
        ? APP_SOURCE.indexOf('header.moreActions')
        : APP_SOURCE.indexOf('More actions')
      const block = APP_SOURCE.slice(anchor, anchor + 400)
      expect(block).not.toContain('hover:scale')
    })

    it('More Actions Tooltip must pass disabled={showMoreMenu}', () => {
      const anchor = APP_SOURCE.indexOf('header.moreActions') !== -1
        ? APP_SOURCE.indexOf('header.moreActions')
        : APP_SOURCE.indexOf('"More actions"')
      const block = APP_SOURCE.slice(Math.max(0, anchor - 60), anchor + 200)
      expect(block).toContain('disabled={showMoreMenu}')
    })
  })

  // ==========================================================================
  // 5. Regression: other header buttons
  // ==========================================================================
  describe('Regression — header buttons still no hover:scale', () => {
    it('Home button must not use hover:scale', () => {
      const block = APP_SOURCE.slice(
        APP_SOURCE.indexOf('Home — switch project'),
        APP_SOURCE.indexOf('Home — switch project') + 400
      )
      expect(block).not.toContain('hover:scale')
    })

    it('New Chat button must not use hover:scale', () => {
      const block = APP_SOURCE.slice(
        APP_SOURCE.indexOf('New chat ('),
        APP_SOURCE.indexOf('New chat (') + 400
      )
      expect(block).not.toContain('hover:scale')
    })
  })
})
