/**
 * Skills IPC Handlers — KAN-284, KAN-286, KAN-287, KAN-288
 *
 * Bridges the SkillsStorageManager (main process) to the renderer via IPC.
 * KAN-286: Added getForPrompt channel for execution pipeline.
 * KAN-287: Added reorder channel for priority management + tags support.
 * KAN-288: Added getCatalog, install, isInstalled for marketplace.
 */

import { ipcMain } from 'electron'
import { SkillsStorageManager } from '../../src/skills/skills-manager'
import { getCatalog, getCatalogSkill } from '../../src/skills/skill-catalog'
import type { SkillScope, SkillVisibility, SkillExecutionMode, SkillToolPermission } from '../../src/skills/types'
import { executeToolRequest } from '../../src/skills/skill-tool-runner'

const ALL_CHANNELS = [
  'skills:getAll', 'skills:getActive', 'skills:getForPrompt', 'skills:getById',
  'skills:create', 'skills:update', 'skills:delete', 'skills:toggle',
  'skills:reorder', 'skills:migrateLegacy',
  'skills:getCatalog', 'skills:install', 'skills:getInstalledCatalogIds',
  'skills:executeTool',
] as const

export function initSkillsHandlers(): void {
  for (const ch of ALL_CHANNELS) { ipcMain.removeHandler(ch) }

  ipcMain.handle('skills:getAll', async (_event, scope?: SkillScope, workspacePath?: string) => {
    return SkillsStorageManager.getInstance().getSkills(scope, workspacePath)
  })

  ipcMain.handle('skills:getActive', async (_event, workspacePath?: string) => {
    return SkillsStorageManager.getInstance().getActiveSkills(workspacePath)
  })

  ipcMain.handle('skills:getForPrompt', async (_event, workspacePath?: string) => {
    return SkillsStorageManager.getInstance().getSkillsForPrompt(workspacePath)
  })

  ipcMain.handle('skills:getById', async (_event, id: string) => {
    return SkillsStorageManager.getInstance().getSkillById(id) ?? null
  })

  ipcMain.handle('skills:create', async (_event, params: {
    name: string
    description?: string
    prompt_template: string
    enabled?: boolean
    scope?: SkillScope
    order?: number
    visibility?: SkillVisibility
    execution_mode?: SkillExecutionMode
    tags?: string[]
    allowed_tools?: SkillToolPermission[]
  }) => {
    try {
      return SkillsStorageManager.getInstance().createSkill(params)
    } catch (e: any) {
      console.error('[Skills IPC] Create failed:', e?.message)
      return null
    }
  })

  ipcMain.handle('skills:update', async (_event, id: string, updates: {
    name?: string
    description?: string
    prompt_template?: string
    enabled?: boolean
    scope?: SkillScope
    order?: number
    visibility?: SkillVisibility
    execution_mode?: SkillExecutionMode
    tags?: string[]
    allowed_tools?: SkillToolPermission[]
  }) => {
    return SkillsStorageManager.getInstance().updateSkill(id, updates) ?? null
  })

  ipcMain.handle('skills:delete', async (_event, id: string) => {
    return SkillsStorageManager.getInstance().deleteSkill(id)
  })

  ipcMain.handle('skills:toggle', async (_event, id: string) => {
    return SkillsStorageManager.getInstance().toggleSkill(id) ?? null
  })

  ipcMain.handle('skills:reorder', async (_event, orderedIds: string[]) => {
    SkillsStorageManager.getInstance().reorderSkills(orderedIds)
    return true
  })

  ipcMain.handle('skills:migrateLegacy', async (_event, workspacePath: string) => {
    return SkillsStorageManager.getInstance().migrateLegacyRules(workspacePath)
  })

  // KAN-288: Marketplace
  ipcMain.handle('skills:getCatalog', async () => {
    return getCatalog()
  })

  ipcMain.handle('skills:install', async (_event, catalogId: string) => {
    const catalogSkill = getCatalogSkill(catalogId)
    if (!catalogSkill) return null
    try {
      return SkillsStorageManager.getInstance().installFromCatalog(catalogSkill)
    } catch (e: any) {
      console.error('[Skills IPC] Install failed:', e?.message)
      return null
    }
  })

  ipcMain.handle('skills:getInstalledCatalogIds', async () => {
    return SkillsStorageManager.getInstance().getInstalledCatalogIds()
  })

  // KAN-289: Tool execution on behalf of skills
  ipcMain.handle('skills:executeTool', async (_event, request: {
    skillId: string
    tool: SkillToolPermission
    action: string
    params: Record<string, string>
    workspacePath: string
  }) => {
    const skill = SkillsStorageManager.getInstance().getSkillById(request.skillId)
    if (!skill) return { success: false, output: '', error: 'Skill not found', tool: request.tool, action: request.action, durationMs: 0 }
    return executeToolRequest(
      { skillId: request.skillId, tool: request.tool, action: request.action, params: request.params },
      skill.allowed_tools,
      request.workspacePath
    )
  })

  console.log('[Skills] IPC handlers initialized')
}

export function cleanupSkillsHandlers(): void {
  for (const ch of ALL_CHANNELS) { ipcMain.removeHandler(ch) }

  SkillsStorageManager.getInstance().flushSave()
  console.log('[Skills] IPC handlers cleaned up')
}
