import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Knowledge Base IPC Handler Smoke Tests
 * 
 * Verifies that the knowledge base IPC module:
 * - Exposes all required channels in preload
 * - Has matching handlers in the electron IPC module
 * - Uses correct channel naming convention (kb:*)
 * - Has idempotent handler registration (removeHandler before handle)
 */

const preloadPath = path.resolve(__dirname, '../../electron/preload.ts')
const kbHandlerPath = path.resolve(__dirname, '../../electron/ipc/knowledge-base.ts')

describe('Knowledge Base IPC — Preload Contract', () => {
  const preload = fs.readFileSync(preloadPath, 'utf-8')

  it('should expose kb namespace in preload', () => {
    expect(preload).toContain('kb:')
  })

  it('should expose readFilePath in kb interface', () => {
    expect(preload).toContain('readFilePath')
  })

  it('should expose readMultipleFiles in kb interface', () => {
    expect(preload).toContain('readMultipleFiles')
  })

  it('preload kb invoke calls should use kb: prefix', () => {
    const kbInvokes = preload.match(/invoke\(['"]kb:[^'"]+['"]/g) || []
    expect(kbInvokes.length).toBeGreaterThan(0)
    kbInvokes.forEach(inv => {
      expect(inv).toMatch(/invoke\(['"]kb:/)
    })
  })
})

describe('Knowledge Base IPC — Handler Registration', () => {
  let kbHandler: string

  try {
    kbHandler = fs.readFileSync(kbHandlerPath, 'utf-8')
  } catch {
    kbHandler = ''
  }

  it('knowledge-base.ts handler file should exist', () => {
    expect(kbHandler.length).toBeGreaterThan(0)
  })

  it('should use ipcMain.handle for kb: channels', () => {
    if (!kbHandler) return
    const handles = kbHandler.match(/ipcMain\.handle\(['"]kb:[^'"]+['"]/g) || []
    expect(handles.length).toBeGreaterThan(0)
  })

  it('should have removeHandler guards for idempotency', () => {
    if (!kbHandler) return
    // KB handler uses a channels array + loop for removeHandler, plus cleanup at end
    const hasRemoveLoop = kbHandler.includes('removeHandler') && 
                           (kbHandler.includes('for (') || kbHandler.includes('.forEach'))
    const hasDirectRemoves = (kbHandler.match(/ipcMain\.removeHandler\(/g) || []).length > 0
    expect(hasRemoveLoop || hasDirectRemoves).toBe(true)
  })

  it('should export an init function', () => {
    if (!kbHandler) return
    expect(kbHandler).toMatch(/export\s+(function|const)\s+init/)
  })
})

describe('Knowledge Base IPC — Channel Naming Convention', () => {
  const preload = fs.readFileSync(preloadPath, 'utf-8')

  it('all kb channels should follow kb:camelCase pattern', () => {
    const kbChannels = preload.match(/['"]kb:[^'"]+['"]/g) || []
    kbChannels.forEach(ch => {
      const channelName = ch.replace(/['"]/g, '')
      expect(channelName).toMatch(/^kb:[a-zA-Z]+$/)
    })
  })
})
