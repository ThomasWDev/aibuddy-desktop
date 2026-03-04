/**
 * KAN-182 TDD: File picker must allow code files, not just images
 *
 * Root causes:
 * 1. dialog:openFile handler didn't pass mainWindow to showOpenDialog
 *    (macOS requires it for proper sheet behavior and filter rendering)
 * 2. Missing multiSelections — users couldn't attach multiple files
 * 3. Returned single path instead of array — broke multi-file flow
 * 4. Legacy handleImageSelect fallback rejects all non-image files
 * 5. Missing common file extensions (gradle, kts, toml, properties, tf, hcl)
 *
 * Affects: Desktop Mac version only (Extension uses VS Code's native dialog)
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, it, expect } from 'vitest'

const ROOT = resolve(__dirname, '../..')
const read = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf-8')

describe('KAN-182 — File picker must support code files', () => {
  const mainTs = read('electron/main.ts')
  const appTsx = read('renderer/src/App.tsx')
  const preloadTs = read('electron/preload.ts')

  // Helper: extract the actual ipcMain.handle('dialog:openFile', ...) handler block
  function getDialogHandler(): string {
    const marker = "ipcMain.handle('dialog:openFile'"
    const start = mainTs.indexOf(marker)
    expect(start).toBeGreaterThan(-1)
    return mainTs.slice(start, start + 600)
  }

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

    it('must include lock files and log files', () => {
      expect(appTsx).toContain("'lock':")
      expect(appTsx).toContain("'log':")
    })

    it('must include core language extensions (c, cpp, py, java, go, rs, swift, kt)', () => {
      for (const ext of ['c', 'cpp', 'py', 'java', 'go', 'rs', 'swift', 'kt']) {
        expect(appTsx).toContain(`'${ext}':`)
      }
    })

    it('must include web extensions (html, css, scss, json, yaml, xml)', () => {
      for (const ext of ['html', 'css', 'json', 'yaml', 'xml']) {
        expect(appTsx).toContain(`'${ext}':`)
      }
    })
  })

  describe('dialog:openFile IPC handler', () => {
    it('must pass mainWindow to showOpenDialog for proper macOS sheet behavior', () => {
      const handler = getDialogHandler()
      expect(handler).toContain('mainWindow')
      expect(handler).toContain('showOpenDialog(mainWindow')
    })

    it('must include multiSelections property for multi-file attach', () => {
      const handler = getDialogHandler()
      expect(handler).toContain('multiSelections')
    })

    it('must return result.filePaths (array) not result.filePaths[0] (single)', () => {
      const handler = getDialogHandler()
      // Must return the full filePaths array for multi-select support
      expect(handler).toContain('result.filePaths')
      // Must NOT return single element (that's the old behavior)
      expect(handler).not.toMatch(/result\.filePaths\[0\]/)
    })

    it('must accept optional filters parameter', () => {
      const handler = getDialogHandler()
      expect(handler).toContain('filters')
    })
  })

  describe('Preload type safety', () => {
    it('openFile must return Promise<string[] | null> (not string | null)', () => {
      expect(preloadTs).toMatch(/openFile.*Promise<string\[\]\s*\|\s*null>/)
    })
  })

  describe('Unified attachment handler', () => {
    function getAttachHandler(): string {
      const start = appTsx.indexOf('const handleAttachFileWithElectron')
      // Full handler is ~8KB — includes image branch + code file branch + error handling
      return appTsx.slice(start, start + 9000)
    }

    it('must include All Files filter with wildcard extension', () => {
      const fn = getAttachHandler()
      expect(fn).toContain("'All Files'")
      expect(fn).toContain("extensions: ['*']")
    })

    it('must include Code Files filter', () => {
      const fn = getAttachHandler()
      expect(fn).toContain("'Code Files'")
    })

    it('must include Images filter', () => {
      const fn = getAttachHandler()
      expect(fn).toContain("'Images'")
    })

    it('must include All Supported Files filter combining images and code', () => {
      const fn = getAttachHandler()
      expect(fn).toContain("'All Supported Files'")
      expect(fn).toContain('...imageExts')
      expect(fn).toContain('...codeExts')
    })

    it('must handle multi-file return (iterate over paths)', () => {
      const fn = getAttachHandler()
      // Must iterate over filePaths for multi-select support
      expect(fn).toMatch(/for\s*\(.*filePath.*of.*paths|for\s*\(.*path.*of.*filePaths/)
    })

    it('must route images to attachedImages and code files to attachedFiles', () => {
      const fn = getAttachHandler()
      expect(fn).toContain('setAttachedImages')
      expect(fn).toContain('setAttachedFiles')
    })

    it('must detect file type by extension (isImage check)', () => {
      const fn = getAttachHandler()
      expect(fn).toContain('isImage')
      expect(fn).toContain('imageExts.includes')
    })

    it('must read code files as text', () => {
      const fn = getAttachHandler()
      expect(fn).toContain('readFileAsText')
    })

    it('must have size limits for both images and code files', () => {
      const fn = getAttachHandler()
      expect(fn).toContain('10 * 1024 * 1024')
      expect(fn).toContain('1 * 1024 * 1024')
    })
  })

  describe('Legacy handleImageSelect web fallback', () => {
    function getImageSelectHandler(): string {
      const start = appTsx.indexOf('const handleImageSelect = async')
      return appTsx.slice(start, start + 1500)
    }

    it('must handle code files in the web fallback path (not reject non-images)', () => {
      const fn = getImageSelectHandler()
      // Should either route code files to attachedFiles or have a code file path
      // Must NOT unconditionally reject non-images
      expect(fn).toMatch(/attachedFiles|readAsText|CODE_FILE_EXTENSIONS|!isImage/)
    })
  })

  describe('Hidden file input accepts both images and code', () => {
    it('hidden file input must accept code file extensions', () => {
      expect(appTsx).toContain('accept="image/*,.ts,.tsx,.js,.jsx,.py')
    })
  })
})
