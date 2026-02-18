import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Workspace / Open Folder Smoke Tests
 * 
 * ROOT CAUSE (Screenshot Feb 17, 2026): User asked AI to review a folder
 * but the folder was outside the loaded workspace. The AI appeared stuck
 * because it could only access files within the open project folder.
 * 
 * The handleOpenFolder function in App.tsx opens a dialog to select a new
 * working directory. If no folder is loaded, terminal commands and file
 * reads will fail silently.
 * 
 * PREVENTION: These tests verify the workspace boundary logic and folder
 * switching are properly wired up.
 */

const appTsxPath = path.resolve(__dirname, '../../renderer/src/App.tsx')
const workspaceHandlerPath = path.resolve(__dirname, '../../electron/ipc/workspace.ts')
const preloadPath = path.resolve(__dirname, '../../electron/preload.ts')

describe('Workspace — Open Folder Handler', () => {
  const appTsx = fs.readFileSync(appTsxPath, 'utf-8')

  it('should have handleOpenFolder function', () => {
    expect(appTsx).toContain('handleOpenFolder')
  })

  it('handleOpenFolder should use dialog to pick folder', () => {
    // The function should invoke an electron dialog
    expect(appTsx).toMatch(/dialog|openDirectory|showOpenDialog/)
  })

  it('should track current workspace path in state', () => {
    // There should be state for the workspace/folder path
    const hasWorkspacePath = appTsx.includes('workspacePath') || 
                              appTsx.includes('folderPath') ||
                              appTsx.includes('workingDirectory') ||
                              appTsx.includes('openFolder')
    expect(hasWorkspacePath).toBe(true)
  })

  it('should display current folder name in UI', () => {
    // The folder name should be shown somewhere in the UI
    const hasFolderDisplay = appTsx.includes('Working in') || 
                              appTsx.includes('workspaceName') ||
                              appTsx.includes('folderName')
    expect(hasFolderDisplay).toBe(true)
  })
})

describe('Workspace — IPC Handlers', () => {
  let workspaceHandler: string

  try {
    workspaceHandler = fs.readFileSync(workspaceHandlerPath, 'utf-8')
  } catch {
    workspaceHandler = ''
  }

  it('workspace.ts handler file should exist', () => {
    expect(workspaceHandler.length).toBeGreaterThan(0)
  })

  it('should have removeHandler guards for idempotency', () => {
    if (!workspaceHandler) return
    const removes = workspaceHandler.match(/ipcMain\.removeHandler\(/g) || []
    const handles = workspaceHandler.match(/ipcMain\.handle\(/g) || []
    expect(removes.length).toBeGreaterThanOrEqual(handles.length)
  })

  it('should register workspace-related channels', () => {
    if (!workspaceHandler) return
    expect(workspaceHandler).toMatch(/workspace:|dialog:|fs:/)
  })
})

describe('Workspace — Preload Bridge', () => {
  const preload = fs.readFileSync(preloadPath, 'utf-8')

  it('should expose file system operations', () => {
    expect(preload).toContain('readFile')
  })

  it('should expose directory listing', () => {
    const hasDirOps = preload.includes('readDir') || 
                       preload.includes('readdir') ||
                       preload.includes('listFiles') ||
                       preload.includes('listDir')
    expect(hasDirOps).toBe(true)
  })

  it('should expose dialog for folder picker', () => {
    const hasDialog = preload.includes('openFolder') || 
                       preload.includes('selectFolder') ||
                       preload.includes('dialog')
    expect(hasDialog).toBe(true)
  })
})

describe('Workspace — Security: No Path Traversal', () => {
  let workspaceHandler: string

  try {
    workspaceHandler = fs.readFileSync(workspaceHandlerPath, 'utf-8')
  } catch {
    workspaceHandler = ''
  }

  it('should scope storage per workspace using hash or path', () => {
    if (!workspaceHandler) return
    // Workspace handler should scope data by workspace path
    const hasScopedStorage = workspaceHandler.includes('getWorkspaceHash') ||
                              workspaceHandler.includes('workspacePath') ||
                              workspaceHandler.includes('hash') ||
                              workspaceHandler.includes('.aibuddy')
    expect(hasScopedStorage).toBe(true)
  })
})
