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
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync, readdirSync, unlinkSync } from 'fs'
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
    'workspace:getProjectRules', 'workspace:saveProjectRule', 'workspace:deleteProjectRule',
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
  
  // Project-level rules (.aibuddy/rules/ in the project directory)
  ipcMain.handle('workspace:getProjectRules', async (_event, workspacePath: string) => {
    return getProjectRules(workspacePath)
  })

  ipcMain.handle('workspace:saveProjectRule', async (_event, workspacePath: string, filename: string, content: string) => {
    return saveProjectRule(workspacePath, filename, content)
  })

  ipcMain.handle('workspace:deleteProjectRule', async (_event, workspacePath: string, filename: string) => {
    return deleteProjectRule(workspacePath, filename)
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
  ipcMain.removeHandler('workspace:getProjectRules')
  ipcMain.removeHandler('workspace:saveProjectRule')
  ipcMain.removeHandler('workspace:deleteProjectRule')
  
  console.log('[Workspace] IPC handlers cleaned up')
}

// --------------- Project-level rules (.aibuddy/rules/) ---------------

export interface ProjectRuleDTO {
  filename: string
  description?: string
  alwaysApply?: boolean
  content: string
  builtin?: boolean
}

const BUILTIN_SENIOR_ENGINEERING = `# Senior Engineering Standards

Do a full investigation before writing code. Use the best approach as if you are
a Microsoft, Apple and Google Senior Engineer with over 20 years experience.

Follow test driven development like you are the best TDD Developer in the world.
Fix root causes not do any work arounds.

- Check Sentry admin API for breadcrumbs on client side apps and API
- Check SSH docs for server errors
- Check Firebase Admin SDK if any issues in Firebase data
- Check for any queue tasks before building
- Check all issues found before building
- Always run test coverage before building
- Check to fix and prevent regressions`

const BUILTIN_TDD = `# TDD and Documentation

## Document Everything
- Every fix gets a smoke test
- Every new feature gets tests written FIRST (Red-Green-Refactor)
- Update relevant docs (KNOWN_ISSUES.md, CHANGELOG, E2E_TESTING_KIT.md) after changes
- Add lessons learned for non-obvious fixes

## Testing Rules
- NEVER duplicate code in tests — ALWAYS import real functions from source files
- NEVER copy function code into test files — test the real implementation
- Each test must be fast (< 100ms), have no network calls, and no side effects
- Every fixed bug must get a regression test to prevent recurrence

## Before Every Build
1. Run full test suite — zero failures required
2. Run TypeScript compilation — zero errors required
3. Check Sentry for new unresolved errors
4. Verify no hardcoded secrets, versions, or environment-specific values`

const BUILTIN_CODE_QUALITY = `# Code Quality Standards

- Read existing code and docs before writing new code
- Prefer editing existing files over creating new ones
- No comments that just narrate what the code does
- Fix linter errors you introduce
- Guard all entry points (check workspace state, null inputs, missing config)
- Resolve promises gracefully — never reject with errors for expected abort paths
- Use sentinel values instead of thrown errors for expected control flow`

const DESKTOP_BUILTIN_RULES: ProjectRuleDTO[] = [
  { filename: '_builtin_senior_engineering', description: 'Senior engineering standards', alwaysApply: true, content: BUILTIN_SENIOR_ENGINEERING, builtin: true },
  { filename: '_builtin_tdd_and_documentation', description: 'TDD and documentation', alwaysApply: true, content: BUILTIN_TDD, builtin: true },
  { filename: '_builtin_code_quality', description: 'Code quality standards', alwaysApply: true, content: BUILTIN_CODE_QUALITY, builtin: true },
]

function parseFrontmatter(raw: string): { description?: string; alwaysApply?: boolean; content: string } {
  const fmRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/
  const match = raw.match(fmRegex)
  if (!match) return { content: raw.trim() }

  const yaml = match[1]
  const content = match[2].trim()
  let description: string | undefined
  let alwaysApply: boolean | undefined

  for (const line of yaml.split('\n')) {
    const trimmed = line.trim()
    if (trimmed.startsWith('description:'))
      description = trimmed.slice('description:'.length).trim().replace(/^["']|["']$/g, '')
    if (trimmed.startsWith('alwaysApply:'))
      alwaysApply = trimmed.slice('alwaysApply:'.length).trim().toLowerCase() === 'true'
  }
  return { description, alwaysApply, content }
}

function getProjectRules(workspacePath: string): ProjectRuleDTO[] {
  const builtins = [...DESKTOP_BUILTIN_RULES]
  if (!workspacePath) return builtins

  const rulesDir = join(workspacePath, '.aibuddy', 'rules')
  if (!existsSync(rulesDir)) return builtins

  let files: string[]
  try {
    files = readdirSync(rulesDir).filter(f => f.endsWith('.md')).sort()
  } catch { return builtins }

  const userRules: ProjectRuleDTO[] = []
  for (const file of files) {
    try {
      const raw = readFileSync(join(rulesDir, file), 'utf-8')
      if (!raw.trim()) continue
      const { description, alwaysApply, content } = parseFrontmatter(raw)
      userRules.push({ filename: file, description, alwaysApply, content })
    } catch { /* skip */ }
  }

  return [...builtins, ...userRules]
}

function saveProjectRule(workspacePath: string, filename: string, content: string): boolean {
  if (!workspacePath || !filename) return false
  try {
    const rulesDir = join(workspacePath, '.aibuddy', 'rules')
    mkdirSync(rulesDir, { recursive: true })
    writeFileSync(join(rulesDir, filename), content, 'utf-8')
    return true
  } catch (e) {
    console.error('[Workspace] Failed to save project rule:', e)
    return false
  }
}

function deleteProjectRule(workspacePath: string, filename: string): boolean {
  if (!workspacePath || !filename) return false
  try {
    const filePath = join(workspacePath, '.aibuddy', 'rules', filename)
    if (existsSync(filePath)) unlinkSync(filePath)
    return true
  } catch (e) {
    console.error('[Workspace] Failed to delete project rule:', e)
    return false
  }
}
