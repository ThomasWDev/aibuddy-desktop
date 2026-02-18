/**
 * Workspace-specific storage for AIBuddy
 * 
 * Stores project-specific data in ~/.aibuddy/workspaces/{workspace-hash}/
 * - rules.md: Project-specific rules to prevent regressions
 * - test-patterns.md: Learned test patterns for this project
 * - fixes-log.md: Record of bugs fixed (don't repeat!)
 * - data.json: Generic key-value data
 */

import { ipcMain } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'fs'
import { createHash } from 'crypto'
import { homedir } from 'os'

// Base path for all workspace storage
const AIBUDDY_BASE = join(homedir(), '.aibuddy', 'workspaces')

/**
 * Generate a consistent hash for a workspace path.
 * Exported for direct testing — tests MUST import this, not duplicate it.
 */
export function getWorkspaceHash(workspacePath: string): string {
  return createHash('sha256')
    .update(workspacePath.toLowerCase())
    .digest('hex')
    .substring(0, 16)
}

/**
 * Get the storage directory for a workspace
 */
function getWorkspaceDir(workspacePath: string): string {
  const hash = getWorkspaceHash(workspacePath)
  const dir = join(AIBUDDY_BASE, hash)
  
  // Ensure directory exists
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
    
    // Create a metadata file with the original path
    const metadataPath = join(dir, '.metadata.json')
    writeFileSync(metadataPath, JSON.stringify({
      originalPath: workspacePath,
      createdAt: new Date().toISOString()
    }, null, 2))
  }
  
  return dir
}

/**
 * Read a markdown file from workspace storage
 */
function readMarkdownFile(workspacePath: string, filename: string): string {
  const dir = getWorkspaceDir(workspacePath)
  const filePath = join(dir, filename)
  
  if (existsSync(filePath)) {
    return readFileSync(filePath, 'utf-8')
  }
  
  return ''
}

/**
 * Write a markdown file to workspace storage
 */
function writeMarkdownFile(workspacePath: string, filename: string, content: string): boolean {
  try {
    const dir = getWorkspaceDir(workspacePath)
    const filePath = join(dir, filename)
    writeFileSync(filePath, content, 'utf-8')
    return true
  } catch (e) {
    console.error(`[Workspace] Failed to write ${filename}:`, e)
    return false
  }
}

/**
 * Append to a markdown file in workspace storage
 */
function appendMarkdownFile(workspacePath: string, filename: string, content: string): boolean {
  try {
    const dir = getWorkspaceDir(workspacePath)
    const filePath = join(dir, filename)
    
    const timestamp = new Date().toISOString()
    const entry = `\n---\n_Added: ${timestamp}_\n\n${content}\n`
    
    appendFileSync(filePath, entry, 'utf-8')
    return true
  } catch (e) {
    console.error(`[Workspace] Failed to append to ${filename}:`, e)
    return false
  }
}

/**
 * Read JSON data from workspace storage
 */
function readJsonData(workspacePath: string, key: string): unknown {
  const dir = getWorkspaceDir(workspacePath)
  const filePath = join(dir, 'data.json')
  
  try {
    if (existsSync(filePath)) {
      const data = JSON.parse(readFileSync(filePath, 'utf-8'))
      return data[key]
    }
  } catch (e) {
    console.error(`[Workspace] Failed to read data.json:`, e)
  }
  
  return null
}

/**
 * Write JSON data to workspace storage
 */
function writeJsonData(workspacePath: string, key: string, value: unknown): boolean {
  try {
    const dir = getWorkspaceDir(workspacePath)
    const filePath = join(dir, 'data.json')
    
    let data: Record<string, unknown> = {}
    if (existsSync(filePath)) {
      try {
        data = JSON.parse(readFileSync(filePath, 'utf-8'))
      } catch { /* ignore */ }
    }
    
    data[key] = value
    data._lastModified = new Date().toISOString()
    
    writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
    return true
  } catch (e) {
    console.error(`[Workspace] Failed to write data.json:`, e)
    return false
  }
}

/**
 * Initialize workspace IPC handlers
 */
export function initWorkspaceHandlers(): void {
  // Remove any previously registered handlers to prevent "second handler" errors on dev reload
  const channels = [
    'workspace:getPath', 'workspace:getRules', 'workspace:setRules', 'workspace:appendRule',
    'workspace:getTestPatterns', 'workspace:setTestPatterns', 'workspace:appendTestPattern',
    'workspace:getFixesLog', 'workspace:appendFix', 'workspace:getData', 'workspace:setData',
  ] as const
  for (const ch of channels) { ipcMain.removeHandler(ch) }
  // Get workspace storage path
  ipcMain.handle('workspace:getPath', async (_event, workspacePath: string) => {
    return getWorkspaceDir(workspacePath)
  })
  
  // Rules management
  ipcMain.handle('workspace:getRules', async (_event, workspacePath: string) => {
    return readMarkdownFile(workspacePath, 'rules.md')
  })
  
  ipcMain.handle('workspace:setRules', async (_event, workspacePath: string, rules: string) => {
    return writeMarkdownFile(workspacePath, 'rules.md', rules)
  })
  
  ipcMain.handle('workspace:appendRule', async (_event, workspacePath: string, rule: string) => {
    return appendMarkdownFile(workspacePath, 'rules.md', rule)
  })
  
  // Test patterns management
  ipcMain.handle('workspace:getTestPatterns', async (_event, workspacePath: string) => {
    return readMarkdownFile(workspacePath, 'test-patterns.md')
  })
  
  ipcMain.handle('workspace:setTestPatterns', async (_event, workspacePath: string, patterns: string) => {
    return writeMarkdownFile(workspacePath, 'test-patterns.md', patterns)
  })
  
  ipcMain.handle('workspace:appendTestPattern', async (_event, workspacePath: string, pattern: string) => {
    return appendMarkdownFile(workspacePath, 'test-patterns.md', pattern)
  })
  
  // Fixes log management
  ipcMain.handle('workspace:getFixesLog', async (_event, workspacePath: string) => {
    return readMarkdownFile(workspacePath, 'fixes-log.md')
  })
  
  ipcMain.handle('workspace:appendFix', async (_event, workspacePath: string, fix: string) => {
    return appendMarkdownFile(workspacePath, 'fixes-log.md', fix)
  })
  
  // Generic data management
  ipcMain.handle('workspace:getData', async (_event, workspacePath: string, key: string) => {
    return readJsonData(workspacePath, key)
  })
  
  ipcMain.handle('workspace:setData', async (_event, workspacePath: string, key: string, value: unknown) => {
    return writeJsonData(workspacePath, key, value)
  })
  
  console.log('[Workspace] IPC handlers initialized')
}

/**
 * Cleanup workspace IPC handlers
 */
export function cleanupWorkspaceHandlers(): void {
  ipcMain.removeHandler('workspace:getPath')
  ipcMain.removeHandler('workspace:getRules')
  ipcMain.removeHandler('workspace:setRules')
  ipcMain.removeHandler('workspace:appendRule')
  ipcMain.removeHandler('workspace:getTestPatterns')
  ipcMain.removeHandler('workspace:setTestPatterns')
  ipcMain.removeHandler('workspace:appendTestPattern')
  ipcMain.removeHandler('workspace:getFixesLog')
  ipcMain.removeHandler('workspace:appendFix')
  ipcMain.removeHandler('workspace:getData')
  ipcMain.removeHandler('workspace:setData')
  
  console.log('[Workspace] IPC handlers cleaned up')
}
