/**
 * KAN-292: Add API Support for Skills — Source-level TDD tests
 *
 * Validates:
 * 1. SkillsApiClient class + methods
 * 2. API types (SkillsApiSettings, SkillsApiConfig, ApiSkillPayload)
 * 3. SkillsStorageManager API settings + merge methods
 * 4. skill-catalog.ts API-backed catalog support
 * 5. IPC handlers for API operations
 * 6. Preload exposure of API methods
 * 7. SkillsPanel API config UI
 * 8. URL validation
 * 9. Regression guards
 */

import * as fs from 'fs'
import * as path from 'path'

const ROOT = path.resolve(__dirname, '../../')

function readFile(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf-8')
}

describe('KAN-292: Add API Support for Skills', () => {
  // ─── 1. SkillsApiClient ────────────────────────────────────────────────

  describe('skills-api-client.ts — Client class', () => {
    let src: string
    beforeAll(() => { src = readFile('src/skills/skills-api-client.ts') })

    it('declares SkillsApiClient class', () => {
      expect(src).toContain('export class SkillsApiClient')
    })

    it('has constructor accepting SkillsApiConfig', () => {
      expect(src).toMatch(/constructor\(\s*config:\s*SkillsApiConfig/)
    })

    it('has listSkills method (GET /skills)', () => {
      expect(src).toContain('async listSkills()')
      expect(src).toMatch(/listSkills[\s\S]*?'GET'[\s\S]*?\/skills/)
    })

    it('has getSkill method (GET /skills/:id)', () => {
      expect(src).toContain('async getSkill(id')
      expect(src).toMatch(/getSkill[\s\S]*?'GET'[\s\S]*?\/skills\//)
    })

    it('has createSkill method (POST /skills)', () => {
      expect(src).toContain('async createSkill(')
      expect(src).toMatch(/createSkill[\s\S]*?'POST'[\s\S]*?\/skills/)
    })

    it('has updateSkill method (PATCH /skills/:id)', () => {
      expect(src).toContain('async updateSkill(')
      expect(src).toMatch(/updateSkill[\s\S]*?'PATCH'[\s\S]*?\/skills\//)
    })

    it('has deleteSkill method (DELETE /skills/:id)', () => {
      expect(src).toContain('async deleteSkill(')
      expect(src).toMatch(/deleteSkill[\s\S]*?'DELETE'[\s\S]*?\/skills\//)
    })

    it('has listCatalog method (GET /skills/catalog)', () => {
      expect(src).toContain('async listCatalog()')
      expect(src).toMatch(/listCatalog[\s\S]*?\/skills\/catalog/)
    })

    it('has healthCheck method', () => {
      expect(src).toContain('async healthCheck()')
    })

    it('has getBaseUrl method', () => {
      expect(src).toContain('getBaseUrl()')
    })

    it('supports Authorization header via apiKey', () => {
      expect(src).toMatch(/Authorization.*Bearer/)
    })

    it('sets Content-Type to application/json', () => {
      expect(src).toContain("'Content-Type': 'application/json'")
    })

    it('handles timeout with AbortController', () => {
      expect(src).toContain('AbortController')
      expect(src).toContain('abort()')
    })

    it('encodes skill IDs in URL paths', () => {
      expect(src).toContain('encodeURIComponent(id)')
    })
  })

  describe('skills-api-client.ts — Error handling', () => {
    let src: string
    beforeAll(() => { src = readFile('src/skills/skills-api-client.ts') })

    it('declares SkillsApiError class', () => {
      expect(src).toContain('export class SkillsApiError extends Error')
    })

    it('SkillsApiError has statusCode', () => {
      expect(src).toMatch(/statusCode:\s*number/)
    })

    it('SkillsApiError has errorCode', () => {
      expect(src).toMatch(/errorCode\??\s*:\s*string/)
    })

    it('handles timeout errors with code TIMEOUT', () => {
      expect(src).toContain("'TIMEOUT'")
    })

    it('handles network errors with code NETWORK_ERROR', () => {
      expect(src).toContain("'NETWORK_ERROR'")
    })

    it('parses error response body', () => {
      expect(src).toMatch(/errBody[\s\S]*?error/)
    })
  })

  describe('skills-api-client.ts — Utility functions', () => {
    let src: string
    beforeAll(() => { src = readFile('src/skills/skills-api-client.ts') })

    it('exports validateSkillsApiUrl', () => {
      expect(src).toContain('export function validateSkillsApiUrl')
    })

    it('validates empty URL', () => {
      expect(src).toContain('URL is empty')
    })

    it('validates protocol (http/https)', () => {
      expect(src).toMatch(/http:|https:/)
    })

    it('exports createSkillsApiClient factory', () => {
      expect(src).toContain('export function createSkillsApiClient')
    })

    it('createSkillsApiClient returns null for empty URL', () => {
      expect(src).toMatch(/createSkillsApiClient[\s\S]*?return null/)
    })
  })

  // ─── 2. Types ──────────────────────────────────────────────────────────

  describe('types.ts — API types', () => {
    let src: string
    beforeAll(() => { src = readFile('src/skills/types.ts') })

    it('declares SkillsApiSettings interface', () => {
      expect(src).toContain('export interface SkillsApiSettings')
    })

    it('SkillsApiSettings has baseUrl', () => {
      expect(src).toMatch(/SkillsApiSettings[\s\S]*?baseUrl:\s*string/)
    })

    it('SkillsApiSettings has optional apiKey', () => {
      expect(src).toMatch(/SkillsApiSettings[\s\S]*?apiKey\?:\s*string/)
    })

    it('SkillsApiSettings has optional lastSyncAt', () => {
      expect(src).toMatch(/SkillsApiSettings[\s\S]*?lastSyncAt\?:\s*number/)
    })

    it('SkillsApiSettings has optional autoSync', () => {
      expect(src).toMatch(/SkillsApiSettings[\s\S]*?autoSync\?:\s*boolean/)
    })

    it('SkillsState includes optional apiSettings', () => {
      expect(src).toMatch(/apiSettings\?:\s*SkillsApiSettings/)
    })

    it('SkillSource includes api', () => {
      expect(src).toMatch(/SkillSource\s*=.*'api'/)
    })

    it('SKILLS_VERSION is bumped to 4', () => {
      expect(src).toMatch(/SKILLS_VERSION\s*=\s*4/)
    })

    it('KAN-292 referenced in header', () => {
      expect(src).toContain('KAN-292')
    })
  })

  describe('skills-api-client.ts — API payload types', () => {
    let src: string
    beforeAll(() => { src = readFile('src/skills/skills-api-client.ts') })

    it('exports SkillsApiConfig interface', () => {
      expect(src).toContain('export interface SkillsApiConfig')
    })

    it('exports ApiSkillPayload interface', () => {
      expect(src).toContain('export interface ApiSkillPayload')
    })

    it('exports ApiListResponse interface', () => {
      expect(src).toContain('export interface ApiListResponse')
    })

    it('exports ApiErrorResponse interface', () => {
      expect(src).toContain('export interface ApiErrorResponse')
    })

    it('ApiSkillPayload has name, description, prompt_template', () => {
      expect(src).toMatch(/ApiSkillPayload[\s\S]*?name:\s*string/)
      expect(src).toMatch(/ApiSkillPayload[\s\S]*?description:\s*string/)
      expect(src).toMatch(/ApiSkillPayload[\s\S]*?prompt_template:\s*string/)
    })

    it('ApiListResponse has data array and total count', () => {
      expect(src).toMatch(/ApiListResponse[\s\S]*?data:\s*T\[\]/)
      expect(src).toMatch(/ApiListResponse[\s\S]*?total:\s*number/)
    })

    it('DEFAULT_TIMEOUT_MS is defined', () => {
      expect(src).toMatch(/DEFAULT_TIMEOUT_MS\s*=/)
    })
  })

  // ─── 3. SkillsStorageManager ───────────────────────────────────────────

  describe('skills-manager.ts — API settings methods', () => {
    let src: string
    beforeAll(() => { src = readFile('src/skills/skills-manager.ts') })

    it('imports SkillsApiSettings type', () => {
      expect(src).toContain('SkillsApiSettings')
    })

    it('has getApiSettings method', () => {
      expect(src).toContain('getApiSettings()')
    })

    it('getApiSettings returns defaults when unconfigured', () => {
      const methodBlock = src.slice(src.indexOf('getApiSettings()'))
      const body = methodBlock.slice(0, 300)
      expect(body).toMatch(/baseUrl:\s*['"]/)
    })

    it('has setApiSettings method', () => {
      expect(src).toContain('setApiSettings(settings')
    })

    it('setApiSettings calls scheduleSave', () => {
      const methodBlock = src.slice(src.indexOf('setApiSettings'))
      const body = methodBlock.slice(0, 300)
      expect(body).toContain('scheduleSave()')
    })

    it('has updateLastSync method', () => {
      expect(src).toContain('updateLastSync()')
    })

    it('updateLastSync sets lastSyncAt to current time', () => {
      const methodBlock = src.slice(src.indexOf('updateLastSync()'))
      const body = methodBlock.slice(0, 300)
      expect(body).toContain('Date.now()')
    })

    it('has mergeRemoteSkills method', () => {
      expect(src).toContain('mergeRemoteSkills(remoteSkills')
    })

    it('mergeRemoteSkills returns added/updated counts', () => {
      const methodBlock = src.slice(src.indexOf('mergeRemoteSkills'))
      const body = methodBlock.slice(0, 1000)
      expect(body).toContain('added')
      expect(body).toContain('updated')
    })

    it('mergeRemoteSkills sets source to api', () => {
      const methodBlock = src.slice(src.indexOf('mergeRemoteSkills'))
      const body = methodBlock.slice(0, 1000)
      expect(body).toContain("source: 'api'")
    })

    it('mergeRemoteSkills preserves enabled state on update', () => {
      const methodBlock = src.slice(src.indexOf('mergeRemoteSkills'))
      const body = methodBlock.slice(0, 1000)
      expect(body).toContain('enabled: existing.enabled')
    })
  })

  // ─── 4. skill-catalog.ts API support ───────────────────────────────────

  describe('skill-catalog.ts — API-backed catalog', () => {
    let src: string
    beforeAll(() => { src = readFile('src/skills/skill-catalog.ts') })

    it('KAN-292 referenced in header', () => {
      expect(src).toContain('KAN-292')
    })

    it('imports createSkillsApiClient', () => {
      expect(src).toContain('createSkillsApiClient')
    })

    it('exports getCatalogFromApi async function', () => {
      expect(src).toContain('export async function getCatalogFromApi')
    })

    it('getCatalogFromApi returns source indicator', () => {
      expect(src).toMatch(/source:\s*['"]api['"]/)
      expect(src).toMatch(/source:\s*['"]static['"]/)
    })

    it('getCatalogFromApi falls back to static on failure', () => {
      expect(src).toMatch(/getCatalogFromApi[\s\S]*?SKILL_CATALOG[\s\S]*?source:\s*['"]static['"]/)
    })

    it('exports deduplicateCatalog function', () => {
      expect(src).toContain('export function deduplicateCatalog')
    })

    it('deduplicateCatalog uses catalog_id as key', () => {
      expect(src).toMatch(/deduplicateCatalog[\s\S]*?catalog_id/)
    })

    it('static getCatalog still works', () => {
      expect(src).toContain('export function getCatalog()')
    })

    it('static getCatalogSkill still works', () => {
      expect(src).toContain('export function getCatalogSkill')
    })
  })

  // ─── 5. IPC Handlers ──────────────────────────────────────────────────

  describe('electron/ipc/skills.ts — API IPC handlers', () => {
    let src: string
    beforeAll(() => { src = readFile('electron/ipc/skills.ts') })

    it('KAN-292 referenced in header', () => {
      expect(src).toContain('KAN-292')
    })

    it('imports createSkillsApiClient', () => {
      expect(src).toContain('createSkillsApiClient')
    })

    it('imports validateSkillsApiUrl', () => {
      expect(src).toContain('validateSkillsApiUrl')
    })

    it('imports SkillsApiError', () => {
      expect(src).toContain('SkillsApiError')
    })

    it('imports SkillsApiSettings type', () => {
      expect(src).toContain('SkillsApiSettings')
    })

    it('imports ApiSkillPayload type', () => {
      expect(src).toContain('ApiSkillPayload')
    })

    it('imports getCatalogFromApi', () => {
      expect(src).toContain('getCatalogFromApi')
    })

    const channels = [
      'skills:apiGetSettings', 'skills:apiSetSettings', 'skills:apiValidateUrl',
      'skills:apiList', 'skills:apiGet', 'skills:apiCreate', 'skills:apiUpdate', 'skills:apiDelete',
      'skills:apiSync', 'skills:apiGetCatalog',
    ]

    for (const channel of channels) {
      it(`registers ${channel} channel`, () => {
        expect(src).toContain(`'${channel}'`)
      })
    }

    it('ALL_CHANNELS includes all API channels', () => {
      const block = src.slice(src.indexOf('ALL_CHANNELS'), src.indexOf('] as const') + 12)
      for (const ch of channels) {
        expect(block).toContain(`'${ch}'`)
      }
    })

    it('apiList handler creates client from settings', () => {
      const handler = src.slice(src.indexOf("'skills:apiList'"))
      expect(handler).toContain('createSkillsApiClient')
      expect(handler).toContain('listSkills')
    })

    it('apiCreate handler calls client.createSkill', () => {
      const handler = src.slice(src.indexOf("'skills:apiCreate'"))
      expect(handler).toContain('createSkill')
    })

    it('apiUpdate handler calls client.updateSkill', () => {
      const handler = src.slice(src.indexOf("'skills:apiUpdate'"))
      expect(handler).toContain('updateSkill')
    })

    it('apiDelete handler calls client.deleteSkill', () => {
      const handler = src.slice(src.indexOf("'skills:apiDelete'"))
      expect(handler).toContain('deleteSkill')
    })

    it('apiSync handler merges remote skills', () => {
      const handler = src.slice(src.indexOf("'skills:apiSync'"))
      expect(handler).toContain('mergeRemoteSkills')
      expect(handler).toContain('updateLastSync')
    })

    it('apiGetCatalog handler calls getCatalogFromApi', () => {
      const handler = src.slice(src.indexOf("'skills:apiGetCatalog'"))
      expect(handler).toContain('getCatalogFromApi')
    })

    it('handlers return success/error shape', () => {
      expect(src).toMatch(/success:\s*true/)
      expect(src).toMatch(/success:\s*false/)
    })
  })

  // ─── 6. Preload ───────────────────────────────────────────────────────

  describe('electron/preload.ts — API preload exposure', () => {
    let src: string
    beforeAll(() => { src = readFile('electron/preload.ts') })

    const methods = [
      'apiGetSettings', 'apiSetSettings', 'apiValidateUrl',
      'apiList', 'apiGet', 'apiCreate', 'apiUpdate', 'apiDelete',
      'apiSync', 'apiGetCatalog',
    ]

    for (const method of methods) {
      it(`exposes ${method} method`, () => {
        expect(src).toContain(method)
      })
    }

    it('apiGetSettings invokes skills:apiGetSettings', () => {
      expect(src).toMatch(/apiGetSettings.*invoke.*skills:apiGetSettings/)
    })

    it('apiList invokes skills:apiList', () => {
      expect(src).toMatch(/apiList.*invoke.*skills:apiList/)
    })

    it('apiCreate accepts payload with required fields', () => {
      const line = src.split('\n').find(l => l.includes('apiCreate:'))
      expect(line).toContain('name:')
      expect(line).toContain('description:')
      expect(line).toContain('prompt_template:')
    })

    it('apiUpdate accepts id and partial payload', () => {
      const line = src.split('\n').find(l => l.includes('apiUpdate:'))
      expect(line).toContain('id: string')
    })
  })

  // ─── 7. SkillsPanel — API config UI ───────────────────────────────────

  describe('SkillsPanel.tsx — API config UI', () => {
    let src: string
    beforeAll(() => { src = readFile('renderer/src/components/SkillsPanel.tsx') })

    it('has apiSettings state', () => {
      expect(src).toContain('apiSettings')
      expect(src).toContain('setApiSettingsState')
    })

    it('has apiUrlInput state', () => {
      expect(src).toContain('apiUrlInput')
      expect(src).toContain('setApiUrlInput')
    })

    it('has apiKeyInput state', () => {
      expect(src).toContain('apiKeyInput')
    })

    it('has apiStatus state with connecting/connected/error', () => {
      expect(src).toMatch(/apiStatus.*'idle'.*'connecting'.*'connected'.*'error'/)
    })

    it('has showApiConfig toggle state', () => {
      expect(src).toContain('showApiConfig')
      expect(src).toContain('setShowApiConfig')
    })

    it('has syncing state', () => {
      expect(src).toContain('syncing')
      expect(src).toContain('setSyncing')
    })

    it('has syncResult state', () => {
      expect(src).toContain('syncResult')
    })

    it('loads API settings on mount', () => {
      expect(src).toContain('apiGetSettings')
    })

    it('renders API config toggle button', () => {
      expect(src).toMatch(/API.*local only|API.*connected/)
    })

    it('renders Sync button when connected', () => {
      expect(src).toContain('Sync')
    })

    it('calls apiSync on sync click', () => {
      expect(src).toContain('apiSync')
    })

    it('renders Skills API URL input', () => {
      expect(src).toContain('Skills API URL')
    })

    it('renders API Key input with password type', () => {
      expect(src).toContain('API Key')
      expect(src).toContain('type="password"')
    })

    it('renders Save & Connect button', () => {
      expect(src).toContain('Save & Connect')
    })

    it('renders Disconnect button when connected', () => {
      expect(src).toContain('Disconnect')
    })

    it('calls apiValidateUrl before saving', () => {
      expect(src).toContain('apiValidateUrl')
    })

    it('calls apiSetSettings to save config', () => {
      expect(src).toContain('apiSetSettings')
    })

    it('shows sync result (added/updated)', () => {
      expect(src).toMatch(/syncResult\.added/)
      expect(src).toMatch(/syncResult\.updated/)
    })

    it('shows last sync timestamp', () => {
      expect(src).toContain('Last sync')
    })

    it('shows error message on validation failure', () => {
      expect(src).toContain('apiError')
    })

    it('uses API catalog when baseUrl is configured', () => {
      expect(src).toContain('apiGetCatalog')
    })
  })

  // ─── 8. URL Constants ─────────────────────────────────────────────────

  describe('constants/urls.ts — Skills API URL', () => {
    let src: string
    beforeAll(() => { src = readFile('src/constants/urls.ts') })

    it('exports AIBUDDY_SKILLS_API_URL', () => {
      expect(src).toContain('export const AIBUDDY_SKILLS_API_URL')
    })

    it('reads from AIBUDDY_SKILLS_API_URL env var', () => {
      expect(src).toContain('AIBUDDY_SKILLS_API_URL')
    })

    it('supports VITE_ prefix for build-time env', () => {
      expect(src).toContain('VITE_AIBUDDY_SKILLS_API_URL')
    })
  })

  // ─── 9. Regression Guards ─────────────────────────────────────────────

  describe('Regression guards', () => {
    it('types.ts still exports Skill interface', () => {
      const src = readFile('src/skills/types.ts')
      expect(src).toContain('export interface Skill')
    })

    it('types.ts still exports CatalogSkill interface', () => {
      const src = readFile('src/skills/types.ts')
      expect(src).toContain('export interface CatalogSkill')
    })

    it('SkillsState still has skills array', () => {
      const src = readFile('src/skills/types.ts')
      expect(src).toMatch(/skills:\s*Skill\[\]/)
    })

    it('SkillsState still has executionHistory array', () => {
      const src = readFile('src/skills/types.ts')
      expect(src).toMatch(/executionHistory:\s*SkillExecutionRecord\[\]/)
    })

    it('SkillsState still has permissions array', () => {
      const src = readFile('src/skills/types.ts')
      expect(src).toMatch(/permissions:\s*PermissionEntry\[\]/)
    })

    it('SkillsState still has auditLog array', () => {
      const src = readFile('src/skills/types.ts')
      expect(src).toMatch(/auditLog:\s*ToolAuditLogEntry\[\]/)
    })

    it('static getCatalog still works', () => {
      const src = readFile('src/skills/skill-catalog.ts')
      expect(src).toContain('export function getCatalog()')
    })

    it('SKILL_CATALOG still has 8 skills', () => {
      const src = readFile('src/skills/skill-catalog.ts')
      const matches = src.match(/catalog_id:/g)
      expect(matches).toBeTruthy()
      expect(matches!.length).toBe(8)
    })

    it('IPC still registers core CRUD channels', () => {
      const src = readFile('electron/ipc/skills.ts')
      expect(src).toContain("'skills:getAll'")
      expect(src).toContain("'skills:create'")
      expect(src).toContain("'skills:update'")
      expect(src).toContain("'skills:delete'")
    })

    it('preload still exposes core skills methods', () => {
      const src = readFile('electron/preload.ts')
      expect(src).toContain('getAll')
      expect(src).toContain('create')
      expect(src).toContain('update')
    })

    it('SkillsPanel still has all tabs', () => {
      const src = readFile('renderer/src/components/SkillsPanel.tsx')
      expect(src).toContain("'skills'")
      expect(src).toContain("'marketplace'")
      expect(src).toContain("'activity'")
      expect(src).toContain("'audit'")
    })

    it('skills-manager still has addAuditLogEntry', () => {
      const src = readFile('src/skills/skills-manager.ts')
      expect(src).toContain('addAuditLogEntry')
    })

    it('skills-manager still has addExecutionRecord', () => {
      const src = readFile('src/skills/skills-manager.ts')
      expect(src).toContain('addExecutionRecord')
    })
  })
})
