/**
 * Skills IPC Handlers — KAN-284, KAN-286
 *
 * Bridges the SkillsStorageManager (main process) to the renderer via IPC.
 * KAN-286: Added getForPrompt channel for execution pipeline.
 */

import { ipcMain } from 'electron'
import { SkillsStorageManager } from '../../src/skills/skills-manager'
import type { SkillScope, SkillVisibility, SkillExecutionMode } from '../../src/skills/types'

export function initSkillsHandlers(): void {
  const channels = [
    'skills:getAll', 'skills:getActive', 'skills:getForPrompt', 'skills:getById',
    'skills:create', 'skills:update', 'skills:delete', 'skills:toggle',
    'skills:migrateLegacy',
  ] as const
  for (const ch of channels) { ipcMain.removeHandler(ch) }

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
  }) => {
    return SkillsStorageManager.getInstance().updateSkill(id, updates) ?? null
  })

  ipcMain.handle('skills:delete', async (_event, id: string) => {
    return SkillsStorageManager.getInstance().deleteSkill(id)
  })

  ipcMain.handle('skills:toggle', async (_event, id: string) => {
    return SkillsStorageManager.getInstance().toggleSkill(id) ?? null
  })

  ipcMain.handle('skills:migrateLegacy', async (_event, workspacePath: string) => {
    return SkillsStorageManager.getInstance().migrateLegacyRules(workspacePath)
  })

  console.log('[Skills] IPC handlers initialized')
}

export function cleanupSkillsHandlers(): void {
  const channels = [
    'skills:getAll', 'skills:getActive', 'skills:getForPrompt', 'skills:getById',
    'skills:create', 'skills:update', 'skills:delete', 'skills:toggle',
    'skills:migrateLegacy',
  ] as const
  for (const ch of channels) { ipcMain.removeHandler(ch) }

  SkillsStorageManager.getInstance().flushSave()
  console.log('[Skills] IPC handlers cleaned up')
}
