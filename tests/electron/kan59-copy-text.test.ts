/**
 * KAN-59 TDD Tests: Copy Text Not Working on Mac
 *
 * Root cause:
 *   1. Missing macOS app menu — first menu template item becomes the app
 *      menu on macOS, shifting Edit menu out of proper position
 *   2. No error handling on clipboard write operations (silent failure)
 *   3. No Electron clipboard IPC fallback — only navigator.clipboard used
 *
 * Fix layers:
 *   1. macOS app menu — add `role: 'appMenu'` on darwin
 *   2. Preload — expose clipboard.writeText IPC
 *   3. App.tsx — try/catch + Electron clipboard fallback on all copy ops
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, it, expect } from 'vitest'

const ROOT = resolve(__dirname, '../..')
const read = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf-8')

// ─── 1. macOS APP MENU ─────────────────────────────────────────────
describe('KAN-59 — macOS application menu', () => {
  const mainTs = read('electron/main.ts')

  it('menu template must include appMenu role for macOS', () => {
    expect(mainTs).toMatch(/role.*appMenu|label.*app\.name|label.*app\.getName/)
  })

  it('Edit menu must have role: copy', () => {
    expect(mainTs).toContain("role: 'copy'")
  })

  it('Edit menu must have role: paste', () => {
    expect(mainTs).toContain("role: 'paste'")
  })

  it('Edit menu must have role: cut', () => {
    expect(mainTs).toContain("role: 'cut'")
  })

  it('Edit menu must have role: selectAll', () => {
    expect(mainTs).toContain("role: 'selectAll'")
  })

  it('macOS app menu must appear before File menu', () => {
    const appMenuIdx = mainTs.search(/role.*appMenu|label.*app\.name/)
    const fileMenuIdx = mainTs.indexOf("label: 'File'")
    expect(appMenuIdx).toBeGreaterThan(-1)
    expect(appMenuIdx).toBeLessThan(fileMenuIdx)
  })
})

// ─── 2. PRELOAD CLIPBOARD IPC ───────────────────────────────────────
describe('KAN-59 — Preload clipboard IPC', () => {
  const preload = read('electron/preload.ts')

  it('preload must expose clipboard.writeText via IPC', () => {
    expect(preload).toMatch(/clipboard[\s\S]*writeText/)
  })

  it('preload must expose clipboard.readText via IPC', () => {
    expect(preload).toMatch(/clipboard[\s\S]*readText/)
  })
})

// ─── 3. MAIN PROCESS CLIPBOARD IPC HANDLER ──────────────────────────
describe('KAN-59 — Main process clipboard IPC handler', () => {
  const mainTs = read('electron/main.ts')

  it('main process must register clipboard IPC handlers', () => {
    expect(mainTs).toMatch(/clipboard:writeText|clipboard:write/)
  })
})

// ─── 4. RENDERER CLIPBOARD FALLBACK ─────────────────────────────────
describe('KAN-59 — App.tsx clipboard error handling + fallback', () => {
  const appTsx = read('renderer/src/App.tsx')

  it('copyToClipboard must have try/catch', () => {
    const fnBody = appTsx.slice(
      appTsx.indexOf('const copyToClipboard'),
      appTsx.indexOf('const copyToClipboard') + 500
    )
    expect(fnBody).toContain('try')
    expect(fnBody).toContain('catch')
  })

  it('copyResponse must have try/catch', () => {
    const fnBody = appTsx.slice(
      appTsx.indexOf('const copyResponse'),
      appTsx.indexOf('const copyResponse') + 500
    )
    expect(fnBody).toContain('try')
    expect(fnBody).toContain('catch')
  })

  it('clipboard functions must fallback to electronAPI clipboard', () => {
    expect(appTsx).toMatch(/electronAPI[\s\S]*clipboard/)
  })
})

// ─── 5. TEXT SELECTION CSS ──────────────────────────────────────────
describe('KAN-59 — Chat message text must be selectable', () => {
  const css = read('renderer/src/index.css')

  it('index.css must have user-select: text for message content', () => {
    expect(css).toMatch(/user-select:\s*text/)
  })

  it('prose class content must be selectable (no select-none on chat)', () => {
    const appTsx = read('renderer/src/App.tsx')
    const proseSection = appTsx.slice(
      appTsx.indexOf('prose prose-invert'),
      appTsx.indexOf('prose prose-invert') + 200
    )
    expect(proseSection).not.toContain('select-none')
  })
})

// ─── 6. REGRESSION GUARDS ───────────────────────────────────────────
describe('KAN-59 — Regression guards', () => {
  it('terminal output must still have user-select: text', () => {
    const css = read('renderer/src/index.css')
    expect(css).toContain('user-select: text !important')
  })

  it('Share modal must still have copy handlers', () => {
    const shareModal = read('renderer/src/components/ShareModal.tsx')
    expect(shareModal).toContain('handleCopyText')
    expect(shareModal).toContain('handleCopyMarkdown')
  })

  it('keyboard handler must NOT intercept Cmd+C', () => {
    const appTsx = read('renderer/src/App.tsx')
    const keyHandler = appTsx.slice(
      appTsx.indexOf('const handleKeyDown'),
      appTsx.indexOf('window.addEventListener(\'keydown\'')
    )
    expect(keyHandler).not.toMatch(/case\s+['"]c['"]/i)
  })
})
