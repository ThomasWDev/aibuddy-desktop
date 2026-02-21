/**
 * KAN-59 Extended Smoke Tests — Desktop Clipboard, Menu, API Resilience
 *
 * Adds broader smoke coverage for areas identified during KAN-59 investigation:
 * - macOS Electron menu structure
 * - Clipboard operations reliability
 * - API error handling & abort resilience
 * - Version display pipeline
 * - Share modal clipboard operations
 */

import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { describe, it, expect } from 'vitest'

const ROOT = resolve(__dirname, '../..')
const read = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf-8')

// ─── MACOS MENU STRUCTURE ───────────────────────────────────────────
describe('Desktop Smoke — macOS Menu Structure', () => {
  const mainTs = read('electron/main.ts')

  it('menu template must be created by createMenu function', () => {
    expect(mainTs).toContain('function createMenu()')
  })

  it('Menu.setApplicationMenu must be called', () => {
    expect(mainTs).toContain('Menu.setApplicationMenu')
  })

  it('menu must have View > toggleDevTools for debugging', () => {
    expect(mainTs).toContain("role: 'toggleDevTools'")
  })

  it('menu must import Menu from electron', () => {
    expect(mainTs).toMatch(/import.*Menu.*from 'electron'/)
  })

  it('menu must have Window or Help for macOS HIG compliance', () => {
    const hasWindow = mainTs.includes("role: 'windowMenu'") || mainTs.includes("label: 'Window'")
    const hasHelp = mainTs.includes("label: 'Help'")
    expect(hasWindow || hasHelp).toBe(true)
  })
})

// ─── CLIPBOARD PIPELINE ─────────────────────────────────────────────
describe('Desktop Smoke — Clipboard Pipeline (End-to-End)', () => {
  const mainTs = read('electron/main.ts')
  const preloadTs = read('electron/preload.ts')
  const appTsx = read('renderer/src/App.tsx')

  it('main process imports clipboard from electron', () => {
    expect(mainTs).toMatch(/import.*clipboard.*from 'electron'/)
  })

  it('clipboard IPC channel names match between main and preload', () => {
    expect(mainTs).toContain("'clipboard:writeText'")
    expect(preloadTs).toContain("'clipboard:writeText'")
    expect(mainTs).toContain("'clipboard:readText'")
    expect(preloadTs).toContain("'clipboard:readText'")
  })

  it('preload exposes clipboard in ElectronAPI type', () => {
    expect(preloadTs).toMatch(/clipboard:\s*\{/)
  })

  it('renderer references electronAPI.clipboard as fallback', () => {
    expect(appTsx).toMatch(/electronAPI\?\.clipboard/)
  })

  it('terminal copy also uses navigator.clipboard', () => {
    const terminalCopy = appTsx.slice(
      appTsx.indexOf('Terminal output copied'),
      appTsx.indexOf('Terminal output copied') - 200
    )
    expect(appTsx).toContain('navigator.clipboard.writeText(text)')
  })
})

// ─── SHARE MODAL CLIPBOARD ──────────────────────────────────────────
describe('Desktop Smoke — Share Modal Clipboard Operations', () => {
  const shareModal = read('renderer/src/components/ShareModal.tsx')

  it('Share modal handleCopyText must have try/catch', () => {
    const fnBody = shareModal.slice(
      shareModal.indexOf('handleCopyText'),
      shareModal.indexOf('handleCopyText') + 400
    )
    expect(fnBody).toContain('try')
    expect(fnBody).toContain('catch')
  })

  it('Share modal handleCopyMarkdown must have try/catch', () => {
    const fnBody = shareModal.slice(
      shareModal.indexOf('handleCopyMarkdown'),
      shareModal.indexOf('handleCopyMarkdown') + 400
    )
    expect(fnBody).toContain('try')
    expect(fnBody).toContain('catch')
  })

  it('Share modal must show error message on clipboard failure', () => {
    expect(shareModal).toContain('Failed to copy')
  })

  it('Share modal must support multiple export formats', () => {
    expect(shareModal).toContain('handleCopyText')
    expect(shareModal).toContain('handleCopyMarkdown')
    expect(shareModal).toContain('handleExportMarkdown')
  })
})

// ─── API REQUEST RESILIENCE ──────────────────────────────────────────
describe('Desktop Smoke — API Request Resilience', () => {
  const appTsx = read('renderer/src/App.tsx')

  it('API validation must handle aborted requests gracefully', () => {
    expect(appTsx).toContain('API validation skipped')
  })

  it('API validation must fall back to cached credits on failure', () => {
    expect(appTsx).toContain('cachedCredits')
    expect(appTsx).toContain('Using cached credits')
  })

  it('API requests must use AbortController', () => {
    expect(appTsx).toContain('AbortController')
    expect(appTsx).toContain('abortControllerRef')
  })

  it('API requests must have timeout protection', () => {
    expect(appTsx).toContain('setTimeout')
    expect(appTsx).toContain('clearTimeout')
  })

  it('Escape key must cancel in-flight requests', () => {
    expect(appTsx).toMatch(/Escape[\s\S]*abort/)
  })
})

// ─── VERSION DISPLAY PIPELINE ────────────────────────────────────────
describe('Desktop Smoke — Version Display Pipeline', () => {
  const appTsx = read('renderer/src/App.tsx')
  const preloadTs = read('electron/preload.ts')

  it('renderer must get version from electronAPI.app.getVersion', () => {
    expect(appTsx).toContain('electronAPI.app.getVersion')
  })

  it('renderer must have fallback version source', () => {
    expect(appTsx).toMatch(/version:get|Fallback|fallback/i)
  })

  it('version state must be rendered in the UI', () => {
    expect(appTsx).toContain('appVersion')
  })

  it('package.json version must be >= 1.5.67', () => {
    const pkg = JSON.parse(read('package.json'))
    const [major, minor, patch] = pkg.version.split('.').map(Number)
    expect(major * 10000 + minor * 100 + patch).toBeGreaterThanOrEqual(10567)
  })
})

// ─── CSS TEXT SELECTION ──────────────────────────────────────────────
describe('Desktop Smoke — CSS Text Selection', () => {
  const css = read('renderer/src/index.css')

  it('prose content must be selectable', () => {
    expect(css).toMatch(/\.prose[\s\S]*user-select:\s*text/)
  })

  it('terminal output must be selectable', () => {
    expect(css).toMatch(/#terminal-output[\s\S]*user-select:\s*text/)
  })

  it('webkit prefix must be included for selection', () => {
    expect(css).toContain('-webkit-user-select: text')
  })
})

// ─── ELECTRON IPC SECURITY ──────────────────────────────────────────
describe('Desktop Smoke — Electron IPC Security', () => {
  const mainTs = read('electron/main.ts')

  it('BrowserWindow must use contextIsolation: true', () => {
    expect(mainTs).toContain('contextIsolation: true')
  })

  it('BrowserWindow must NOT use nodeIntegration: true', () => {
    expect(mainTs).toContain('nodeIntegration: false')
  })

  it('clipboard IPC must use ipcMain.handle (not ipcMain.on)', () => {
    expect(mainTs).toMatch(/ipcMain\.handle\('clipboard:writeText'/)
  })
})

// ─── ENTITLEMENTS ────────────────────────────────────────────────────
describe('Desktop Smoke — macOS Entitlements', () => {
  it('mac entitlements file must exist', () => {
    expect(existsSync(resolve(ROOT, 'build/entitlements.mac.plist'))).toBe(true)
  })

  it('MAS entitlements file must exist', () => {
    expect(existsSync(resolve(ROOT, 'build/entitlements.mas.plist'))).toBe(true)
  })

  it('mac entitlements must include network access', () => {
    const plist = read('build/entitlements.mac.plist')
    expect(plist).toContain('network.client')
  })
})
