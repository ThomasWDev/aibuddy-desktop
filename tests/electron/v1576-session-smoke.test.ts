/**
 * v1.5.76 Session Smoke Tests
 *
 * Cross-feature regression guards covering all fixes from the Feb 20-21, 2026 session:
 *   KAN-45: File creation verification
 *   KAN-53: Landing page on launch
 *   KAN-54: Cost control
 *   KAN-59: Copy text on Mac
 *   KAN-62: Microphone permission
 *   KAN-63: Smart Context count (extension-side)
 */

import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { describe, it, expect } from 'vitest'

const ROOT = resolve(__dirname, '../..')
const EXTENSION_ROOT = resolve(ROOT, '../extension')
const read = (rel: string, base = ROOT) => readFileSync(resolve(base, rel), 'utf-8')
const exists = (rel: string, base = ROOT) => existsSync(resolve(base, rel))

// ─── 1. FILE CREATION PIPELINE (KAN-45) ────────────────────────────
describe('v1.5.76 Smoke — File creation pipeline', () => {
  const agentAdapter = read('src/core/agent-adapter.ts')
  const ipcFs = read('electron/ipc/file-system.ts')

  it('writeFile verifies existence post-write', () => {
    expect(agentAdapter).toMatch(/exists/)
    const writeSection = agentAdapter.slice(
      agentAdapter.indexOf('private async writeFile'),
      agentAdapter.indexOf('private async listFiles')
    )
    expect(writeSection).toContain('enforceWorkspaceBoundary')
  })

  it('IPC writeFile verifies with fs.access', () => {
    const handler = ipcFs.slice(
      ipcFs.indexOf("ipcMain.handle('fs:writeFile'"),
      ipcFs.indexOf("ipcMain.handle('fs:readDir'")
    )
    expect(handler).toMatch(/fs\.access/)
  })

  it('resolvePath uses path.join', () => {
    expect(agentAdapter).toMatch(/path\.join\(this\.workspacePath/)
  })

  it('workspace boundary enforcement exists', () => {
    expect(agentAdapter).toContain('enforceWorkspaceBoundary')
    expect(agentAdapter).toMatch(/outside.*workspace/i)
  })
})

// ─── 2. LANDING PAGE (KAN-53) ──────────────────────────────────────
describe('v1.5.76 Smoke — Landing page', () => {
  const appTsx = read('renderer/src/App.tsx')

  it('WelcomeScreen is imported', () => {
    expect(appTsx).toMatch(/import.*WelcomeScreen/)
  })

  it('WelcomeScreen is conditionally rendered', () => {
    expect(appTsx).toMatch(/<WelcomeScreen/)
    expect(appTsx).toMatch(/!workspacePath/)
  })

  it('WelcomeScreen component file exists', () => {
    expect(exists('renderer/src/components/welcome/WelcomeScreen.tsx')).toBe(true)
  })
})

// ─── 3. COST CONTROL (KAN-54) ──────────────────────────────────────
describe('v1.5.76 Smoke — Cost control', () => {
  const appTsx = read('renderer/src/App.tsx')
  const agentAdapter = read('src/core/agent-adapter.ts')

  it('MAX_CONTEXT_TOKENS is defined', () => {
    expect(appTsx).toMatch(/MAX_CONTEXT_TOKENS\s*=\s*40[_,]?000/)
  })

  it('estimateTokenCount function exists', () => {
    expect(appTsx).toMatch(/function estimateTokenCount/)
  })

  it('handoff doc is only sent on first message', () => {
    expect(appTsx).toMatch(/handoffSentRef/)
  })

  it('agent adapter has sliding window', () => {
    expect(agentAdapter).toMatch(/MAX_AGENT_CONTEXT_TOKENS/)
  })

  it('AWS API cost guardrails exist', () => {
    const handler = read('src/handler.js', resolve(ROOT, '../aws-api'))
    expect(handler).toContain('MAX_COST_PER_REQUEST')
    expect(handler).toContain('MAX_TOKENS_HARD_LIMIT')
  })
})

// ─── 4. CLIPBOARD/COPY (KAN-59) ────────────────────────────────────
describe('v1.5.76 Smoke — Clipboard', () => {
  const mainTs = read('electron/main.ts')
  const preload = read('electron/preload.ts')
  const css = read('renderer/src/index.css')

  it('Electron main imports clipboard', () => {
    expect(mainTs).toMatch(/clipboard/)
  })

  it('preload exposes clipboard API', () => {
    expect(preload).toMatch(/clipboard.*writeText/)
  })

  it('CSS enables text selection on prose', () => {
    expect(css).toMatch(/user-select:\s*text/)
  })
})

// ─── 5. MICROPHONE PERMISSION (KAN-62) ─────────────────────────────
describe('v1.5.76 Smoke — Microphone permission', () => {
  const mainTs = read('electron/main.ts')
  const preload = read('electron/preload.ts')

  it('main process requests mic access', () => {
    expect(mainTs).toMatch(/askForMediaAccess.*microphone|microphone.*askForMediaAccess/)
  })

  it('preload exposes microphone IPC', () => {
    expect(preload).toMatch(/microphone/)
  })
})

// ─── 6. ENTITLEMENTS ────────────────────────────────────────────────
describe('v1.5.76 Smoke — macOS entitlements', () => {
  it('mac.plist has user-selected read-write', () => {
    const plist = read('build/entitlements.mac.plist')
    expect(plist).toContain('com.apple.security.files.user-selected.read-write')
  })

  it('mas.plist has downloads read-write', () => {
    const plist = read('build/entitlements.mas.plist')
    expect(plist).toContain('com.apple.security.files.downloads.read-write')
  })

  it('mas.plist has audio-input', () => {
    const plist = read('build/entitlements.mas.plist')
    expect(plist).toContain('com.apple.security.device.audio-input')
  })
})

// ─── 7. SYSTEM PROMPT GUARDS ────────────────────────────────────────
describe('v1.5.76 Smoke — System prompt', () => {
  const agentAdapter = read('src/core/agent-adapter.ts')

  it('system prompt mentions workspace boundaries', () => {
    expect(agentAdapter).toMatch(/Workspace.*Boundaries|IMPORTANT.*Workspace/i)
  })

  it('system prompt includes available tools', () => {
    expect(agentAdapter).toMatch(/read_file|write_to_file|list_files/)
  })
})

// ─── 8. VERSION CONSISTENCY ─────────────────────────────────────────
describe('v1.5.76 Smoke — Version consistency', () => {
  it('package.json has a valid version', () => {
    const pkg = JSON.parse(read('package.json'))
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+$/)
  })

  it('app.getVersion is used in main process', () => {
    const mainTs = read('electron/main.ts')
    expect(mainTs).toMatch(/app\.getVersion/)
  })

  it('renderer fetches version from Electron IPC', () => {
    const appTsx = read('renderer/src/App.tsx')
    expect(appTsx).toMatch(/electronAPI.*getVersion/)
  })
})

// ─── 9. TEST SUITE INTEGRITY ────────────────────────────────────────
describe('v1.5.76 Smoke — Test suite integrity', () => {
  const testFiles = [
    'tests/electron/kan45-file-creation-verification.test.ts',
    'tests/electron/kan53-landing-page.test.ts',
    'tests/electron/kan54-cost-control.test.ts',
    'tests/electron/kan59-copy-text.test.ts',
    'tests/electron/kan59-extended-smoke.test.ts',
    'tests/electron/kan62-microphone-permission.test.ts',
  ]

  for (const file of testFiles) {
    it(`${file.split('/').pop()} exists`, () => {
      expect(exists(file)).toBe(true)
    })
  }
})

// ─── 10. EXTENSION-SIDE GUARDS ─────────────────────────────────────
describe('v1.5.76 Smoke — Extension guards', () => {
  it('KAN-63 smart context dedup exists', () => {
    const analyzer = read('src/services/contextual-awareness/context-analyzer.ts', EXTENSION_ROOT)
    expect(analyzer).toMatch(/seen|Set|dedup/i)
  })

  it('KAN-58 active file enforcement exists', () => {
    const toolExec = read('src/agent/v1/tools/tool-executor.ts', EXTENSION_ROOT)
    expect(toolExec).toMatch(/activeFileRestriction/)
  })

  it('KAN-60 OutputCopyButton exists', () => {
    const chatTools = read('webview-ui-vite/src/components/chat-row/chat-tools.tsx', EXTENSION_ROOT)
    expect(chatTools).toMatch(/OutputCopyButton/)
  })
})
