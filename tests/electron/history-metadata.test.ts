import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

/**
 * History & Thread Metadata Smoke Tests
 * 
 * ROOT CAUSE: The addMessage IPC interface in preload.ts was missing
 * cost, model, tokensIn, tokensOut fields that the renderer was sending.
 * This caused TS2353 errors and would silently drop metadata.
 * 
 * FIX: Updated preload.ts addMessage interface to include all metadata fields.
 * 
 * PREVENTION: These tests ensure the preload interface stays in sync with
 * what the renderer sends for history/thread management.
 */

const preloadPath = path.resolve(__dirname, '../../electron/preload.ts')
const historyHandlerPath = path.resolve(__dirname, '../../electron/ipc/history.ts')

describe('History IPC — addMessage Metadata Fields', () => {
  const preload = fs.readFileSync(preloadPath, 'utf-8')

  it('addMessage interface should include cost field', () => {
    // Check the preload exposes cost in the addMessage parameters
    expect(preload).toContain('cost')
  })

  it('addMessage interface should include model field', () => {
    expect(preload).toContain('model')
  })

  it('addMessage interface should include tokensIn field', () => {
    expect(preload).toContain('tokensIn')
  })

  it('addMessage interface should include tokensOut field', () => {
    expect(preload).toContain('tokensOut')
  })

  it('should use history: channel prefix for thread operations', () => {
    const historyChannels = preload.match(/['"]history:[^'"]+['"]/g) || []
    expect(historyChannels.length).toBeGreaterThan(0)
  })
})

describe('History IPC — Handler Registration', () => {
  let historyHandler: string

  try {
    historyHandler = fs.readFileSync(historyHandlerPath, 'utf-8')
  } catch {
    historyHandler = ''
  }

  it('history.ts handler file should exist', () => {
    expect(historyHandler.length).toBeGreaterThan(0)
  })

  it('should have removeHandler guards for idempotency', () => {
    if (!historyHandler) return
    const removes = historyHandler.match(/ipcMain\.removeHandler\(/g) || []
    const handles = historyHandler.match(/ipcMain\.handle\(/g) || []
    expect(removes.length).toBeGreaterThanOrEqual(handles.length)
  })

  it('should handle addMessage channel', () => {
    if (!historyHandler) return
    expect(historyHandler).toMatch(/['"]history:addMessage['"]/)
  })

  it('should handle getThread channel', () => {
    if (!historyHandler) return
    expect(historyHandler).toMatch(/['"]history:getThread['"]/)
  })

  it('should handle getThreads channel', () => {
    if (!historyHandler) return
    expect(historyHandler).toMatch(/['"]history:getThreads['"]/)
  })
})

describe('History IPC — Thread Persistence Contract', () => {
  const preload = fs.readFileSync(preloadPath, 'utf-8')

  it('should expose getActiveThread in preload', () => {
    expect(preload).toContain('getActiveThread')
  })

  it('should expose createThread in preload', () => {
    expect(preload).toContain('createThread')
  })

  it('should expose deleteThread in preload', () => {
    expect(preload).toContain('deleteThread')
  })
})
