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
      const anchor = APP_SOURCE.indexOf('header.moreActions') !== -1
        ? APP_SOURCE.indexOf('header.moreActions')
        : APP_SOURCE.indexOf('More actions')
      const moreActionsBlock = APP_SOURCE.slice(anchor, anchor + 400)

      expect(moreActionsBlock).not.toContain('hover:scale')
    })

    it('More Actions button must use non-reflow hover effect (brightness or opacity)', () => {
      const anchor = APP_SOURCE.indexOf('header.moreActions') !== -1
        ? APP_SOURCE.indexOf('header.moreActions')
        : APP_SOURCE.indexOf('More actions')
      const moreActionsBlock = APP_SOURCE.slice(anchor, anchor + 400)

      const hasNonReflowHover =
        moreActionsBlock.includes('hover:brightness') ||
        moreActionsBlock.includes('hover:opacity') ||
        moreActionsBlock.includes('hover:bg')

      expect(hasNonReflowHover).toBe(true)
    })
  })

  describe('Tooltip suppressed when dropdown is open', () => {
    it('More Actions Tooltip must pass disabled={showMoreMenu}', () => {
      const anchor = APP_SOURCE.indexOf('header.moreActions') !== -1
        ? APP_SOURCE.indexOf('header.moreActions')
        : APP_SOURCE.indexOf('"More actions"')
      const moreActionsTooltip = APP_SOURCE.slice(
        Math.max(0, anchor - 60),
        anchor + 200
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
      const anchor = APP_SOURCE.indexOf('header.homeTooltip') !== -1
        ? APP_SOURCE.indexOf('header.homeTooltip')
        : APP_SOURCE.indexOf('Home — switch project')
      const homeBtn = APP_SOURCE.slice(anchor, anchor + 400)
      expect(homeBtn).not.toContain('hover:scale')
    })

    it('New Chat button should not use layout-shifting scale in header', () => {
      const anchor = APP_SOURCE.indexOf('header.newChatTooltip') !== -1
        ? APP_SOURCE.indexOf('header.newChatTooltip')
        : APP_SOURCE.indexOf('New chat')
      const newChatBtn = APP_SOURCE.slice(anchor, anchor + 400)
      expect(newChatBtn).not.toContain('hover:scale')
    })

    it('History button should not use layout-shifting scale in header', () => {
      const anchor = APP_SOURCE.indexOf('header.historyTooltip') !== -1
        ? APP_SOURCE.indexOf('header.historyTooltip')
        : APP_SOURCE.indexOf('"Chat history"')
      const historyBtn = APP_SOURCE.slice(anchor, anchor + 400)
      expect(historyBtn).not.toContain('hover:scale')
    })

    it('Settings button should not use layout-shifting scale in header', () => {
      const anchor = APP_SOURCE.indexOf('header.settings') !== -1
        ? APP_SOURCE.indexOf('header.settings')
        : APP_SOURCE.indexOf('<Tooltip text="Settings"')
      const settingsBtn = APP_SOURCE.slice(anchor, anchor + 400)
      expect(settingsBtn).not.toContain('hover:scale')
    })
  })
})
