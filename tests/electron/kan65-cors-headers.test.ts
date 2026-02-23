/**
 * KAN-65: App shows available credit but can't send requests to the server
 *
 * Root cause: The server's Access-Control-Allow-Headers only listed
 * "Content-Type, X-Api-Key, Authorization" but the desktop client sends
 * "X-AIBuddy-API-Key" and "X-Requested-With". In production builds
 * (webSecurity: true), the browser's CORS preflight check fails because
 * the requested headers aren't in the allowed list, blocking ALL requests.
 * Credits still show from cache, making the user think the app is connected.
 *
 * Fix: Updated server response() to include X-AIBuddy-API-Key, X-Requested-With.
 * Also added a stale-credit indicator and a failed-validation warning on the client.
 *
 * RULE: Import real functions from source files — NO code duplication.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const ROOT = resolve(__dirname, '../..')
const appTsx = readFileSync(resolve(ROOT, 'renderer/src/App.tsx'), 'utf-8')
const urlsTs = readFileSync(resolve(ROOT, 'src/constants/urls.ts'), 'utf-8')
const handlerJs = readFileSync(resolve(ROOT, '../aws-api/src/handler.js'), 'utf-8')

describe('KAN-65: Server CORS headers match client headers', () => {
  const allowHeadersLine = handlerJs
    .split('\n')
    .find(line => line.includes('Access-Control-Allow-Headers'))

  it('server response() includes X-AIBuddy-API-Key in Access-Control-Allow-Headers', () => {
    expect(allowHeadersLine).toBeDefined()
    expect(allowHeadersLine).toContain('X-AIBuddy-API-Key')
  })

  it('server response() includes X-Requested-With in Access-Control-Allow-Headers', () => {
    expect(allowHeadersLine).toBeDefined()
    expect(allowHeadersLine).toContain('X-Requested-With')
  })

  it('server response() includes Content-Type in Access-Control-Allow-Headers', () => {
    expect(allowHeadersLine).toBeDefined()
    expect(allowHeadersLine).toContain('Content-Type')
  })

  it('server includes CORS origin wildcard on all responses', () => {
    expect(handlerJs).toContain("'Access-Control-Allow-Origin': '*'")
  })
})

describe('KAN-65: Client sends headers that server must allow', () => {
  it('client sends X-AIBuddy-API-Key header in handleSubmit fetch', () => {
    expect(appTsx).toContain("'X-AIBuddy-API-Key'")
  })

  it('client sends X-Requested-With header in handleSubmit fetch', () => {
    expect(appTsx).toContain("'X-Requested-With'")
  })

  it('client sends Content-Type application/json', () => {
    expect(appTsx).toContain("'Content-Type': 'application/json'")
  })

  it('api_key is included in request body (not just header)', () => {
    expect(appTsx).toMatch(/api_key\s*[:=]/)
  })
})

describe('KAN-65: Credit caching and fallback behavior', () => {
  it('loads cached credits on startup (before network)', () => {
    expect(appTsx).toContain('cachedCredits')
    expect(appTsx).toContain("store.get('cachedCredits')")
  })

  it('caches credits after successful validation', () => {
    expect(appTsx).toContain("store.set('cachedCredits'")
  })

  it('has a cache age limit for stale credits', () => {
    expect(appTsx).toContain('creditsLastUpdated')
    expect(appTsx).toMatch(/ageMinutes\s*</)
  })

  it('falls back to cached credits when validation fails', () => {
    expect(appTsx).toContain('Using cached credits')
  })
})

describe('KAN-65: API URL is HTTP (requires CORS headers)', () => {
  it('ALB URL uses HTTP (not HTTPS)', () => {
    expect(urlsTs).toMatch(/AIBUDDY_ALB_URL\s*=\s*'http:\/\//)
  })

  it('inference URL derives from ALB URL', () => {
    expect(urlsTs).toContain('AIBUDDY_API_INFERENCE_URL')
    expect(urlsTs).toContain('AIBUDDY_ALB_URL')
  })

  it('webSecurity is true in production (CORS enforced)', () => {
    const mainTs = readFileSync(resolve(ROOT, 'electron/main.ts'), 'utf-8')
    expect(mainTs).toContain('webSecurity: !isDev')
  })
})
