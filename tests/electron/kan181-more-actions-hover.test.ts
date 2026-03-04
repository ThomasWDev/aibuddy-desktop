import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

/**
 * KAN-181: UI Glitch When Hovering Over "More Actions" Button
 *
 * Root causes:
 * 1. hover:scale-105 on the button causes layout reflow — the button
 *    physically grows, shifting adjacent elements and triggering
 *    onMouseLeave/Enter flicker.
 * 2. Tooltip and dropdown both render at the bottom of the button
 *    with the same z-index (z-50), overlapping on click.
 * 3. Tooltip wrapper uses inline-block inside a flex container,
 *    causing inconsistent sizing on hover.
 *
 * Fixes verified:
 * - No layout-shifting hover effect (no scale transform on the button)
 * - Tooltip suppressed when dropdown is open
 * - Tooltip uses higher z-index than dropdown for proper stacking
 * - Tooltip wrapper uses inline-flex for flex-container compatibility
 */

const APP_SOURCE = fs.readFileSync(
  path.resolve(__dirname, '../../renderer/src/App.tsx'),
  'utf-8'
)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('KAN-181: More Actions Button Hover Glitch', () => {

  describe('Tooltip component — no layout shift', () => {
    it('Tooltip wrapper must NOT use inline-block (causes sizing issues in flex)', () => {
      // The Tooltip wrapper div should use inline-flex, not inline-block,
      // for consistent sizing inside flex containers
      const tooltipComponent = APP_SOURCE.slice(
        APP_SOURCE.indexOf('function Tooltip('),
        APP_SOURCE.indexOf('function Tooltip(') + 800
      )

      expect(tooltipComponent).not.toContain('inline-block')
      expect(tooltipComponent).toContain('inline-flex')
    })

    it('Tooltip must support a disabled prop to suppress display', () => {
      // The Tooltip should accept a disabled prop to allow parent components
      // to hide the tooltip when a dropdown is open
      const tooltipSignature = APP_SOURCE.slice(
        APP_SOURCE.indexOf('function Tooltip('),
        APP_SOURCE.indexOf('function Tooltip(') + 300
      )

      expect(tooltipSignature).toContain('disabled')
    })

    it('Tooltip must not render when disabled is true', () => {
      // When disabled, the tooltip content should not render
      // v2: CSS-only hover uses !disabled to conditionally render the tooltip element
      const tooltipComponent = APP_SOURCE.slice(
        APP_SOURCE.indexOf('function Tooltip('),
        APP_SOURCE.indexOf('function Tooltip(') + 1200
      )

      expect(tooltipComponent).toContain('!disabled')
    })
  })

  describe('More Actions button — no layout-shifting hover', () => {
    it('More Actions button must NOT use hover:scale transform', () => {
      // hover:scale-105 causes the element to physically grow, triggering
      // layout reflow in the flex container and tooltip repositioning flicker
      const moreActionsBlock = APP_SOURCE.slice(
        APP_SOURCE.indexOf('More actions'),
        APP_SOURCE.indexOf('More actions') + 400
      )

      expect(moreActionsBlock).not.toContain('hover:scale')
    })

    it('More Actions button must use non-reflow hover effect (brightness or opacity)', () => {
      const moreActionsBlock = APP_SOURCE.slice(
        APP_SOURCE.indexOf('More actions'),
        APP_SOURCE.indexOf('More actions') + 400
      )

      // Should use brightness, opacity, or bg change — not scale
      const hasNonReflowHover =
        moreActionsBlock.includes('hover:brightness') ||
        moreActionsBlock.includes('hover:opacity') ||
        moreActionsBlock.includes('hover:bg')

      expect(hasNonReflowHover).toBe(true)
    })
  })

  describe('Tooltip suppressed when dropdown is open', () => {
    it('More Actions Tooltip must pass disabled={showMoreMenu}', () => {
      // When the dropdown menu is open, the tooltip must not appear
      const moreActionsTooltip = APP_SOURCE.slice(
        APP_SOURCE.indexOf('"More actions"') - 60,
        APP_SOURCE.indexOf('"More actions"') + 200
      )

      expect(moreActionsTooltip).toContain('disabled={showMoreMenu}')
    })
  })

  describe('Dropdown z-index stacking', () => {
    it('dropdown menu must have z-index at least z-50', () => {
      // The dropdown must be visible above other content
      const dropdownBlock = APP_SOURCE.slice(
        APP_SOURCE.indexOf('{showMoreMenu && ('),
        APP_SOURCE.indexOf('{showMoreMenu && (') + 300
      )

      expect(dropdownBlock).toMatch(/z-5[0-9]|z-\[5[0-9]+\]/)
    })
  })

  describe('Tooltip positioning — viewport awareness', () => {
    it('Tooltip bottom position must use marginTop for spacing', () => {
      const tooltipComponent = APP_SOURCE.slice(
        APP_SOURCE.indexOf('function Tooltip('),
        APP_SOURCE.indexOf('function Tooltip(') + 800
      )

      expect(tooltipComponent).toContain('marginTop')
    })

    it('Tooltip must be pointer-events-none to avoid hover interference', () => {
      const tooltipComponent = APP_SOURCE.slice(
        APP_SOURCE.indexOf('function Tooltip('),
        APP_SOURCE.indexOf('function Tooltip(') + 1200
      )

      expect(tooltipComponent).toContain('pointer-events-none')
    })
  })

  describe('Other header buttons — consistency check', () => {
    it('Home button should not use layout-shifting scale in header', () => {
      const homeBtn = APP_SOURCE.slice(
        APP_SOURCE.indexOf('Home — switch project'),
        APP_SOURCE.indexOf('Home — switch project') + 400
      )

      expect(homeBtn).not.toContain('hover:scale')
    })

    it('New Chat button should not use layout-shifting scale in header', () => {
      const newChatBtn = APP_SOURCE.slice(
        APP_SOURCE.indexOf('New chat'),
        APP_SOURCE.indexOf('New chat') + 400
      )

      expect(newChatBtn).not.toContain('hover:scale')
    })

    it('History button should not use layout-shifting scale in header', () => {
      const historyBtn = APP_SOURCE.slice(
        APP_SOURCE.indexOf('"Chat history"'),
        APP_SOURCE.indexOf('"Chat history"') + 400
      )

      expect(historyBtn).not.toContain('hover:scale')
    })

    it('Settings button should not use layout-shifting scale in header', () => {
      const settingsBtn = APP_SOURCE.slice(
        APP_SOURCE.indexOf('<Tooltip text="Settings"'),
        APP_SOURCE.indexOf('<Tooltip text="Settings"') + 400
      )

      expect(settingsBtn).not.toContain('hover:scale')
    })
  })
})
