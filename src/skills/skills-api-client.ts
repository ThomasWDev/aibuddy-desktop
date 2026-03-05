/**
 * Skills API Client — KAN-292
 *
 * REST client for remote skills management (CRUD + catalog).
 * When a Skills API URL is configured, enables sync between
 * local storage and a remote backend.
 *
 * Endpoints:
 *   GET    /skills          — List all skills
 *   GET    /skills/:id      — Get a single skill
 *   POST   /skills          — Create a skill
 *   PATCH  /skills/:id      — Update a skill
 *   DELETE /skills/:id      — Delete a skill
 *   GET    /skills/catalog   — List marketplace catalog
 */

import type { Skill, CatalogSkill } from './types'

export interface SkillsApiConfig {
  baseUrl: string
  apiKey?: string
  timeoutMs?: number
}

export interface ApiSkillPayload {
  name: string
  description: string
  prompt_template: string
  enabled?: boolean
  scope?: string
  execution_mode?: string
  tags?: string[]
  allowed_tools?: string[]
  visibility?: string
}

export interface ApiListResponse<T> {
  data: T[]
  total: number
}

export interface ApiErrorResponse {
  error: {
    code: string
    message: string
    details?: string
  }
}

export class SkillsApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly errorCode?: string,
  ) {
    super(message)
    this.name = 'SkillsApiError'
  }
}

const DEFAULT_TIMEOUT_MS = 15000

export class SkillsApiClient {
  private baseUrl: string
  private apiKey: string | undefined
  private timeoutMs: number

  constructor(config: SkillsApiConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, '')
    this.apiKey = config.apiKey
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    }
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`
    }
    return headers
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs)

    try {
      const response = await fetch(url, {
        method,
        headers: this.buildHeaders(),
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      })

      if (!response.ok) {
        let errorCode = 'UNKNOWN'
        let errorMessage = `HTTP ${response.status}`
        try {
          const errBody = await response.json() as ApiErrorResponse
          if (errBody.error) {
            errorCode = errBody.error.code || errorCode
            errorMessage = errBody.error.message || errorMessage
          }
        } catch {
          // response body wasn't JSON
        }
        throw new SkillsApiError(errorMessage, response.status, errorCode)
      }

      if (response.status === 204) {
        return undefined as T
      }

      return await response.json() as T
    } catch (error) {
      if (error instanceof SkillsApiError) throw error
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new SkillsApiError('Request timed out', 408, 'TIMEOUT')
      }
      throw new SkillsApiError(
        error instanceof Error ? error.message : 'Network error',
        0,
        'NETWORK_ERROR',
      )
    } finally {
      clearTimeout(timeout)
    }
  }

  /** GET /skills — List all remote skills */
  async listSkills(): Promise<ApiListResponse<Skill>> {
    return this.request<ApiListResponse<Skill>>('GET', '/skills')
  }

  /** GET /skills/:id — Get a single skill by ID */
  async getSkill(id: string): Promise<Skill> {
    return this.request<Skill>('GET', `/skills/${encodeURIComponent(id)}`)
  }

  /** POST /skills — Create a new skill */
  async createSkill(payload: ApiSkillPayload): Promise<Skill> {
    return this.request<Skill>('POST', '/skills', payload)
  }

  /** PATCH /skills/:id — Update an existing skill */
  async updateSkill(id: string, payload: Partial<ApiSkillPayload>): Promise<Skill> {
    return this.request<Skill>('PATCH', `/skills/${encodeURIComponent(id)}`, payload)
  }

  /** DELETE /skills/:id — Delete a skill */
  async deleteSkill(id: string): Promise<void> {
    return this.request<void>('DELETE', `/skills/${encodeURIComponent(id)}`)
  }

  /** GET /skills/catalog — List marketplace catalog from the API */
  async listCatalog(): Promise<ApiListResponse<CatalogSkill>> {
    return this.request<ApiListResponse<CatalogSkill>>('GET', '/skills/catalog')
  }

  /** Health check — verifies the API is reachable */
  async healthCheck(): Promise<boolean> {
    try {
      await this.request<unknown>('GET', '/skills')
      return true
    } catch {
      return false
    }
  }

  getBaseUrl(): string {
    return this.baseUrl
  }
}

/** Validate a URL string for use as skills API base URL */
export function validateSkillsApiUrl(url: string): { valid: boolean; reason?: string } {
  if (!url || url.trim().length === 0) {
    return { valid: false, reason: 'URL is empty' }
  }
  try {
    const parsed = new URL(url.trim())
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, reason: 'URL must use http or https protocol' }
    }
    return { valid: true }
  } catch {
    return { valid: false, reason: 'Invalid URL format' }
  }
}

/** Create a SkillsApiClient from a URL string, or null if unconfigured */
export function createSkillsApiClient(
  baseUrl: string | undefined,
  apiKey?: string,
): SkillsApiClient | null {
  if (!baseUrl || baseUrl.trim().length === 0) return null
  const validation = validateSkillsApiUrl(baseUrl)
  if (!validation.valid) return null
  return new SkillsApiClient({ baseUrl: baseUrl.trim(), apiKey })
}
