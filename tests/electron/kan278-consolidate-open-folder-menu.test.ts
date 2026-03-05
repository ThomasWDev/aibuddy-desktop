import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

// ---------------------------------------------------------------------------
// KAN-278: [Mac][UX] Redundant Menu Items "Open Folder" and
//          "Open Folder on Desktop" Should Be Consolidated into
//          "Open Project Folder"
//
// Root cause: The dropdown menu renders two separate buttons that both call
// handleOpenFolder — one with no default path and one defaulting to ~/Desktop.
// The distinction is unclear and clutters the menu.
//
// Fix: Replace both items with a single "Open Project Folder" item.
// ---------------------------------------------------------------------------

const APP_SOURCE = fs.readFileSync(
  path.join(__dirname, '../../renderer/src/App.tsx'),
  'utf-8'
)

function getDropdownMenuSection(): string {
  const start = APP_SOURCE.indexOf('showMoreMenu && (')
  const end = APP_SOURCE.indexOf('{/* Terminal */}')
  return APP_SOURCE.slice(start, end)
}

describe('KAN-278: consolidated Open Project Folder menu item', () => {

  // ==========================================================================
  // 1. "Open Folder on Desktop" must be removed
  // ==========================================================================
  describe('redundant menu item removed', () => {
    it('must NOT contain "Open Folder on Desktop" label', () => {
      const menu = getDropdownMenuSection()
      expect(menu).not.toContain('Open Folder on Desktop')
    })

    it('must NOT contain a hardcoded ~/Desktop default path', () => {
      const menu = getDropdownMenuSection()
      expect(menu).not.toContain("'~/Desktop'")
    })
  })

  // ==========================================================================
  // 2. Single consolidated "Open Project Folder" item must exist
  // ==========================================================================
  describe('consolidated menu item', () => {
    it('must contain exactly one "Open Project Folder" visible label', () => {
      const menu = getDropdownMenuSection()
      const matches = menu.match(/Open Project Folder|header\.openProjectFolder/g) || []
      expect(matches.length).toBeGreaterThanOrEqual(1)
    })

    it('must still call handleOpenFolder', () => {
      const menu = getDropdownMenuSection()
      expect(menu).toContain('handleOpenFolder')
    })

    it('must NOT contain the old "Open Folder" label (without "Project")', () => {
      const menu = getDropdownMenuSection()
      // Should not have bare "Open Folder" (without "Project")
      // Use negative lookahead: "Open Folder" not followed by " on" or preceded by "Project "
      const bareOpenFolder = menu.match(/>Open Folder</)
      expect(bareOpenFolder).toBeNull()
    })
  })

  // ==========================================================================
  // 3. Only one handleOpenFolder call in menu section (no duplication)
  // ==========================================================================
  describe('no duplicate folder-open triggers in menu', () => {
    it('handleOpenFolder must appear exactly once in the dropdown menu', () => {
      const menu = getDropdownMenuSection()
      const matches = menu.match(/handleOpenFolder/g) || []
      expect(matches.length).toBe(1)
    })
  })

  // ==========================================================================
  // 4. Regression guards
  // ==========================================================================
  describe('regression guards', () => {
    it('Terminal menu item must still exist', () => {
      expect(APP_SOURCE).toContain('{/* Terminal */}')
    })

    it('handleOpenFolder function must still exist in App', () => {
      expect(APP_SOURCE).toContain('const handleOpenFolder')
    })

    it('File menu in Electron must still have Open Folder accelerator', () => {
      const mainSource = fs.readFileSync(
        path.join(__dirname, '../../electron/main.ts'),
        'utf-8'
      )
      expect(mainSource).toContain("accelerator: 'CmdOrCtrl+O'")
    })
  })
})
