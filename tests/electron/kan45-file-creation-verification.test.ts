/**
 * KAN-45 TDD Tests: File reported as created but not actually created
 *
 * Root cause:
 *   1. ToolExecutor.writeFile() returns success without verifying file exists
 *   2. resolvePath() uses string concatenation, not path.join()
 *   3. workspacePath can be empty string, producing invalid paths
 *   4. IPC handler fs:writeFile has no post-write verification
 *
 * Fix:
 *   1. writeFile() — verify with electronAPI.fs.exists() after write
 *   2. resolvePath() — use path.join(), reject empty workspacePath
 *   3. IPC handler — verify file exists after write, return boolean
 *   4. Error messages — clearly prefix with [ERROR] for AI recognition
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, it, expect } from 'vitest'

const ROOT = resolve(__dirname, '../..')
const read = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf-8')

// ─── 1. POST-WRITE VERIFICATION ────────────────────────────────────
describe('KAN-45 — Post-write file verification', () => {
  const agentAdapter = read('src/core/agent-adapter.ts')

  it('writeFile must verify file exists after writing', () => {
    const writeMethod = agentAdapter.slice(
      agentAdapter.indexOf('private async writeFile'),
      agentAdapter.indexOf('private async listFiles')
    )
    expect(writeMethod).toMatch(/exists|access|stat/)
  })

  it('writeFile must throw or return error when verification fails', () => {
    const writeMethod = agentAdapter.slice(
      agentAdapter.indexOf('private async writeFile'),
      agentAdapter.indexOf('private async listFiles')
    )
    expect(writeMethod).toMatch(/not.*exist|verification.*fail|failed to verify/i)
  })
})

// ─── 2. PATH RESOLUTION ────────────────────────────────────────────
describe('KAN-45 — Path resolution', () => {
  const agentAdapter = read('src/core/agent-adapter.ts')

  it('resolvePath must use path.join or path.resolve, not string concatenation', () => {
    const resolveMethod = agentAdapter.slice(
      agentAdapter.indexOf('private resolvePath'),
      agentAdapter.indexOf('private resolvePath') + 500
    )
    expect(resolveMethod).toMatch(/path\.join|path\.resolve/)
  })

  it('resolvePath must reject empty workspacePath', () => {
    const resolveMethod = agentAdapter.slice(
      agentAdapter.indexOf('private resolvePath'),
      agentAdapter.indexOf('private resolvePath') + 500
    )
    expect(resolveMethod).toMatch(/!this\.workspacePath|workspacePath.*empty|workspacePath.*not.*set/i)
  })
})

// ─── 3. IPC HANDLER VERIFICATION ────────────────────────────────────
describe('KAN-45 — IPC fs:writeFile verification', () => {
  const ipcFs = read('electron/ipc/file-system.ts')

  it('fs:writeFile handler must verify file exists after write', () => {
    const handlerStart = ipcFs.indexOf("ipcMain.handle('fs:writeFile'")
    const handlerEnd = ipcFs.indexOf("ipcMain.handle('fs:readDir'")
    const writeHandler = ipcFs.slice(handlerStart, handlerEnd > handlerStart ? handlerEnd : handlerStart + 500)
    expect(writeHandler).toMatch(/fs\.access|fs\.exists|fs\.stat/)
  })
})

// ─── 4. ERROR MESSAGES ─────────────────────────────────────────────
describe('KAN-45 — Clear error messages', () => {
  const agentAdapter = read('src/core/agent-adapter.ts')

  it('error handler must clearly mark errors for AI recognition', () => {
    expect(agentAdapter).toMatch(/\[ERROR\]|❌|Error:/)
  })
})

// ─── 5. WORKSPACE BOUNDARY ENFORCEMENT ──────────────────────────────
describe('KAN-45 — Workspace boundary enforcement', () => {
  const agentAdapter = read('src/core/agent-adapter.ts')

  it('enforceWorkspaceBoundary method must exist', () => {
    expect(agentAdapter).toContain('enforceWorkspaceBoundary')
  })

  it('readFile must call enforceWorkspaceBoundary', () => {
    const readMethod = agentAdapter.slice(
      agentAdapter.indexOf('private async readFile'),
      agentAdapter.indexOf('private async writeFile')
    )
    expect(readMethod).toContain('enforceWorkspaceBoundary')
  })

  it('writeFile must call enforceWorkspaceBoundary', () => {
    const writeMethod = agentAdapter.slice(
      agentAdapter.indexOf('private async writeFile'),
      agentAdapter.indexOf('private async listFiles')
    )
    expect(writeMethod).toContain('enforceWorkspaceBoundary')
  })

  it('system prompt must explain workspace boundaries to the AI', () => {
    expect(agentAdapter).toMatch(/outside.*workspace|workspace.*boundar/i)
  })

  it('boundary error must tell user to open the correct folder', () => {
    expect(agentAdapter).toMatch(/Open Folder/i)
  })
})

// ─── 6. ENTITLEMENTS ────────────────────────────────────────────────
describe('KAN-45 — macOS file access entitlements', () => {
  it('mac entitlements must include user-selected read-write', () => {
    const plist = read('build/entitlements.mac.plist')
    expect(plist).toContain('com.apple.security.files.user-selected.read-write')
  })

  it('MAS entitlements must include user-selected read-write', () => {
    const plist = read('build/entitlements.mas.plist')
    expect(plist).toContain('com.apple.security.files.user-selected.read-write')
  })

  it('MAS entitlements must include downloads read-write', () => {
    const plist = read('build/entitlements.mas.plist')
    expect(plist).toContain('com.apple.security.files.downloads.read-write')
  })
})

// ─── 6. REGRESSION GUARDS ──────────────────────────────────────────
describe('KAN-45 — Regression guards', () => {
  it('IPC handler must still create directories recursively', () => {
    const ipcFs = read('electron/ipc/file-system.ts')
    expect(ipcFs).toMatch(/mkdir.*recursive.*true/)
  })

  it('ToolExecutor constructor must receive workspacePath', () => {
    const agentAdapter = read('src/core/agent-adapter.ts')
    expect(agentAdapter).toContain('new ToolExecutor')
    expect(agentAdapter).toContain('workspacePath')
  })

  it('preload must expose fs.exists for verification', () => {
    const preload = read('electron/preload.ts')
    expect(preload).toMatch(/exists.*fs:exists/)
  })
})
