/**
 * Skills IPC Handlers — KAN-284, KAN-286, KAN-287, KAN-288, KAN-289, KAN-290, KAN-292
 *
 * Bridges the SkillsStorageManager (main process) to the renderer via IPC.
 * KAN-286: Added getForPrompt channel for execution pipeline.
 * KAN-287: Added reorder channel for priority management + tags support.
 * KAN-288: Added getCatalog, install, isInstalled for marketplace.
 * KAN-289: Added executeTool for tool-enabled skills.
 * KAN-290: Added permission system + audit log.
 * KAN-292: Added REST API support for remote skill management.
 */

import { ipcMain } from 'electron'
import { SkillsStorageManager } from '../../src/skills/skills-manager'
import { getCatalog, getCatalogSkill, getCatalogFromApi } from '../../src/skills/skill-catalog'
import type { SkillScope, SkillVisibility, SkillExecutionMode, SkillToolPermission, PermissionLevel, PermissionDecision, SkillExecutionRecord, SkillsApiSettings } from '../../src/skills/types'
import { executeToolRequest, checkStoredPermission } from '../../src/skills/skill-tool-runner'
import { createSkillsApiClient, validateSkillsApiUrl, SkillsApiError } from '../../src/skills/skills-api-client'
import type { ApiSkillPayload } from '../../src/skills/skills-api-client'

const ALL_CHANNELS = [
  'skills:getAll', 'skills:getActive', 'skills:getForPrompt', 'skills:getById',
  'skills:create', 'skills:update', 'skills:delete', 'skills:toggle',
  'skills:reorder', 'skills:migrateLegacy',
  'skills:getCatalog', 'skills:install', 'skills:getInstalledCatalogIds',
  'skills:executeTool',
  'skills:getPermission', 'skills:setPermission', 'skills:getAllPermissions',
  'skills:resetPermission',
  'skills:getAuditLog', 'skills:getAuditLogForSkill', 'skills:clearAuditLog',
  'skills:requestToolExecution',
  'skills:addExecutionRecord', 'skills:getExecutionHistory', 'skills:clearExecutionHistory',
  'skills:apiGetSettings', 'skills:apiSetSettings', 'skills:apiValidateUrl',
  'skills:apiList', 'skills:apiGet', 'skills:apiCreate', 'skills:apiUpdate', 'skills:apiDelete',
  'skills:apiSync', 'skills:apiGetCatalog',
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

  // KAN-290: Permission system
  ipcMain.handle('skills:getPermission', async (_event, skillId: string, tool: SkillToolPermission) => {
    return SkillsStorageManager.getInstance().getPermission(skillId, tool)
  })

  ipcMain.handle('skills:setPermission', async (_event, skillId: string, tool: SkillToolPermission, level: PermissionLevel) => {
    SkillsStorageManager.getInstance().setPermission(skillId, tool, level)
    return true
  })

  ipcMain.handle('skills:getAllPermissions', async () => {
    return SkillsStorageManager.getInstance().getAllPermissions()
  })

  ipcMain.handle('skills:resetPermission', async (_event, skillId: string, tool: SkillToolPermission) => {
    SkillsStorageManager.getInstance().resetPermission(skillId, tool)
    return true
  })

  // KAN-290: Audit log
  ipcMain.handle('skills:getAuditLog', async (_event, limit?: number) => {
    return SkillsStorageManager.getInstance().getAuditLog(limit)
  })

  ipcMain.handle('skills:getAuditLogForSkill', async (_event, skillId: string) => {
    return SkillsStorageManager.getInstance().getAuditLogForSkill(skillId)
  })

  ipcMain.handle('skills:clearAuditLog', async () => {
    SkillsStorageManager.getInstance().clearAuditLog()
    return true
  })

  // KAN-290: Permission-aware tool execution — checks stored preferences, returns
  // 'needs_confirmation' when user must decide, or executes directly for auto-allowed
  ipcMain.handle('skills:requestToolExecution', async (_event, request: {
    skillId: string
    tool: SkillToolPermission
    action: string
    params: Record<string, string>
    workspacePath: string
    decision?: PermissionDecision
  }) => {
    const mgr = SkillsStorageManager.getInstance()
    const skill = mgr.getSkillById(request.skillId)
    if (!skill) {
      return { status: 'denied', error: 'Skill not found' }
    }

    const storedLevel = mgr.getPermission(request.skillId, request.tool)
    const permCheck = checkStoredPermission(storedLevel)

    if (!request.decision) {
      if (permCheck.action === 'allow') {
        const result = executeToolRequest(
          { skillId: request.skillId, tool: request.tool, action: request.action, params: request.params },
          skill.allowed_tools,
          request.workspacePath
        )
        mgr.addAuditLogEntry({
          timestamp: Date.now(),
          skillId: request.skillId,
          skillName: skill.name,
          tool: request.tool,
          action: request.action,
          params: request.params,
          decision: 'auto_allowed',
          success: result.success,
          error: result.error,
          durationMs: result.durationMs,
        })
        return { status: 'executed', result }
      }
      if (permCheck.action === 'deny') {
        mgr.addAuditLogEntry({
          timestamp: Date.now(),
          skillId: request.skillId,
          skillName: skill.name,
          tool: request.tool,
          action: request.action,
          params: request.params,
          decision: 'auto_denied',
        })
        return { status: 'denied', error: 'Auto-denied by stored preference' }
      }
      return { status: 'needs_confirmation', skillName: skill.name }
    }

    if (request.decision === 'always_allow') {
      mgr.setPermission(request.skillId, request.tool, 'always_allow')
    } else if (request.decision === 'always_deny') {
      mgr.setPermission(request.skillId, request.tool, 'always_deny')
    }

    if (request.decision === 'deny' || request.decision === 'always_deny') {
      mgr.addAuditLogEntry({
        timestamp: Date.now(),
        skillId: request.skillId,
        skillName: skill.name,
        tool: request.tool,
        action: request.action,
        params: request.params,
        decision: request.decision,
      })
      return { status: 'denied', error: 'Denied by user' }
    }

    const result = executeToolRequest(
      { skillId: request.skillId, tool: request.tool, action: request.action, params: request.params },
      skill.allowed_tools,
      request.workspacePath
    )
    mgr.addAuditLogEntry({
      timestamp: Date.now(),
      skillId: request.skillId,
      skillName: skill.name,
      tool: request.tool,
      action: request.action,
      params: request.params,
      decision: request.decision,
      success: result.success,
      error: result.error,
      durationMs: result.durationMs,
    })
    return { status: 'executed', result }
  })

  // KAN-291: Skill Execution Logs
  ipcMain.handle('skills:addExecutionRecord', async (_event, record: SkillExecutionRecord) => {
    SkillsStorageManager.getInstance().addExecutionRecord(record)
    return true
  })

  ipcMain.handle('skills:getExecutionHistory', async (_event, limit?: number) => {
    return SkillsStorageManager.getInstance().getExecutionHistory(limit)
  })

  ipcMain.handle('skills:clearExecutionHistory', async () => {
    SkillsStorageManager.getInstance().clearExecutionHistory()
    return true
  })

  // KAN-292: Skills API handlers
  ipcMain.handle('skills:apiGetSettings', async () => {
    return SkillsStorageManager.getInstance().getApiSettings()
  })

  ipcMain.handle('skills:apiSetSettings', async (_event, settings: SkillsApiSettings) => {
    SkillsStorageManager.getInstance().setApiSettings(settings)
    return true
  })

  ipcMain.handle('skills:apiValidateUrl', async (_event, url: string) => {
    return validateSkillsApiUrl(url)
  })

  ipcMain.handle('skills:apiList', async () => {
    const settings = SkillsStorageManager.getInstance().getApiSettings()
    const client = createSkillsApiClient(settings.baseUrl, settings.apiKey)
    if (!client) return { success: false, error: 'API not configured' }
    try {
      const result = await client.listSkills()
      return { success: true, data: result.data, total: result.total }
    } catch (error) {
      return { success: false, error: error instanceof SkillsApiError ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle('skills:apiGet', async (_event, id: string) => {
    const settings = SkillsStorageManager.getInstance().getApiSettings()
    const client = createSkillsApiClient(settings.baseUrl, settings.apiKey)
    if (!client) return { success: false, error: 'API not configured' }
    try {
      const skill = await client.getSkill(id)
      return { success: true, data: skill }
    } catch (error) {
      return { success: false, error: error instanceof SkillsApiError ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle('skills:apiCreate', async (_event, payload: ApiSkillPayload) => {
    const settings = SkillsStorageManager.getInstance().getApiSettings()
    const client = createSkillsApiClient(settings.baseUrl, settings.apiKey)
    if (!client) return { success: false, error: 'API not configured' }
    try {
      const skill = await client.createSkill(payload)
      return { success: true, data: skill }
    } catch (error) {
      return { success: false, error: error instanceof SkillsApiError ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle('skills:apiUpdate', async (_event, id: string, payload: Partial<ApiSkillPayload>) => {
    const settings = SkillsStorageManager.getInstance().getApiSettings()
    const client = createSkillsApiClient(settings.baseUrl, settings.apiKey)
    if (!client) return { success: false, error: 'API not configured' }
    try {
      const skill = await client.updateSkill(id, payload)
      return { success: true, data: skill }
    } catch (error) {
      return { success: false, error: error instanceof SkillsApiError ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle('skills:apiDelete', async (_event, id: string) => {
    const settings = SkillsStorageManager.getInstance().getApiSettings()
    const client = createSkillsApiClient(settings.baseUrl, settings.apiKey)
    if (!client) return { success: false, error: 'API not configured' }
    try {
      await client.deleteSkill(id)
      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof SkillsApiError ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle('skills:apiSync', async () => {
    const mgr = SkillsStorageManager.getInstance()
    const settings = mgr.getApiSettings()
    const client = createSkillsApiClient(settings.baseUrl, settings.apiKey)
    if (!client) return { success: false, error: 'API not configured' }
    try {
      const result = await client.listSkills()
      const { added, updated } = mgr.mergeRemoteSkills(result.data)
      mgr.updateLastSync()
      return { success: true, added, updated, total: result.total }
    } catch (error) {
      return { success: false, error: error instanceof SkillsApiError ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle('skills:apiGetCatalog', async () => {
    const settings = SkillsStorageManager.getInstance().getApiSettings()
    return getCatalogFromApi(settings.baseUrl, settings.apiKey)
  })

  console.log('[Skills] IPC handlers initialized')
}

export function cleanupSkillsHandlers(): void {
  for (const ch of ALL_CHANNELS) { ipcMain.removeHandler(ch) }

  SkillsStorageManager.getInstance().flushSave()
  console.log('[Skills] IPC handlers cleaned up')
}
