/**
 * KAN-182 TDD: File picker must allow code files, not just images
 *
 * Root cause: dialog:openFile handler doesn't pass mainWindow to showOpenDialog
 * (unlike dialog:openFolder), causing macOS filter issues. Also missing common
 * file extensions like gradle, kts, toml, properties. Legacy handleImageSelect
 * fallback rejects non-image files.
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, it, expect } from 'vitest'

const ROOT = resolve(__dirname, '../..')
const read = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf-8')

describe('KAN-182 — File picker must support code files', () => {
  const mainTs = read('electron/main.ts')
  const appTsx = read('renderer/src/App.tsx')

  describe('CODE_FILE_EXTENSIONS completeness', () => {
    it('must include gradle and Kotlin script extensions', () => {
      expect(appTsx).toContain("'gradle':")
      expect(appTsx).toContain("'kts':")
    })

    it('must include config file extensions (toml, ini, properties)', () => {
      expect(appTsx).toContain("'toml':")
      expect(appTsx).toContain("'ini':")
      expect(appTsx).toContain("'properties':")
    })

    it('must include common devops/CI extensions', () => {
      expect(appTsx).toContain("'tf':")
      expect(appTsx).toContain("'hcl':")
    })

    it('must include lock files and dotfiles', () => {
      expect(appTsx).toContain("'lock':")
      expect(appTsx).toContain("'log':")
    })
  })

  describe('dialog:openFile IPC handler', () => {
    it('must pass mainWindow to showOpenDialog for proper macOS behavior', () => {
      const handlerStart = mainTs.indexOf("'dialog:openFile'")
      const handlerBlock = mainTs.slice(handlerStart, handlerStart + 500)
      expect(handlerBlock).toContain('mainWindow')
    })

    it('must support multiSelections property', () => {
      const handlerStart = mainTs.indexOf("'dialog:openFile'")
      const handlerBlock = mainTs.slice(handlerStart, handlerStart + 500)
      expect(handlerBlock).toContain('multiSelections')
    })

    it('must return array of file paths (not single path)', () => {
      const handlerStart = mainTs.indexOf("'dialog:openFile'")
      const handlerBlock = mainTs.slice(handlerStart, handlerStart + 500)
      expect(handlerBlock).toContain('filePaths')
    })
  })

  describe('Unified attachment handler', () => {
    it('handleAttachFileWithElectron must include All Files filter', () => {
      const fnStart = appTsx.indexOf('handleAttachFileWithElectron')
      const fnBlock = appTsx.slice(fnStart, fnStart + 1500)
      expect(fnBlock).toContain("'All Files'")
      expect(fnBlock).toContain("extensions: ['*']")
    })

    it('handleAttachFileWithElectron must include Code Files filter', () => {
      const fnStart = appTsx.indexOf('handleAttachFileWithElectron')
      const fnBlock = appTsx.slice(fnStart, fnStart + 1500)
      expect(fnBlock).toContain("'Code Files'")
    })

    it('handleAttachFileWithElectron must include Images filter', () => {
      const fnStart = appTsx.indexOf('handleAttachFileWithElectron')
      const fnBlock = appTsx.slice(fnStart, fnStart + 1500)
      expect(fnBlock).toContain("'Images'")
    })
  })
})
