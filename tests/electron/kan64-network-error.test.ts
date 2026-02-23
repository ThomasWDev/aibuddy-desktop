/**
 * KAN-64: Network error when sending a request to the server
 *
 * Root causes:
 * 1. CORS preflight: ALB passes OPTIONS through to Lambda, which returns 401
 *    (missing API key). Per Fetch spec, non-2xx preflight = network error,
 *    blocking ALL API requests in production desktop builds.
 * 2. CSP mismatch: electron/main.ts response header CSP didn't include HTTP
 *    ELB in connect-src, creating a stricter policy than the HTML meta tag.
 * 3. Old versions (< v1.5.58) used decommissioned ALB URL.
 *
 * Fix:
 * - Lambda handler returns 200 for OPTIONS (CORS preflight)
 * - CSP in main.ts matches HTML meta tag (includes HTTP ELB)
 *
 * RULE: Import real functions from source files — NO code duplication.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const ROOT = resolve(__dirname, '../..')
const mainTs = readFileSync(resolve(ROOT, 'electron/main.ts'), 'utf-8')
const indexHtml = readFileSync(resolve(ROOT, 'renderer/index.html'), 'utf-8')
const urlsTs = readFileSync(resolve(ROOT, 'src/constants/urls.ts'), 'utf-8')
const appTsx = readFileSync(resolve(ROOT, 'renderer/src/App.tsx'), 'utf-8')

describe('KAN-64: API URL Configuration', () => {
  it('uses the current ALB URL (not the decommissioned one)', () => {
    expect(urlsTs).toContain('aibuddy-api-alb-90164252')
    expect(urlsTs).not.toContain('aibuddy-api-all-981625629')
  })

  it('ALB URL is HTTP (not HTTPS) — required for no-timeout Lambda support', () => {
    expect(urlsTs).toMatch(/AIBUDDY_ALB_URL\s*=\s*'http:\/\//)
  })

  it('API inference URL is derived from ALB URL', () => {
    expect(urlsTs).toContain('AIBUDDY_API_INFERENCE_URL')
    expect(urlsTs).toMatch(/AIBUDDY_API_INFERENCE_URL.*AIBUDDY_ALB_URL/)
  })
})

describe('KAN-64: CSP allows HTTP ALB connections', () => {
  it('HTML meta tag CSP allows HTTP ELB domains', () => {
    expect(indexHtml).toContain('http://*.us-east-2.elb.amazonaws.com')
    expect(indexHtml).toContain('http://*.elb.amazonaws.com')
  })

  it('main.ts response header CSP allows HTTP ELB domains (must match HTML)', () => {
    expect(mainTs).toContain('http://*.us-east-2.elb.amazonaws.com')
    expect(mainTs).toContain('http://*.elb.amazonaws.com')
  })

  it('both CSPs have matching connect-src HTTP ELB allowances', () => {
    const htmlHasHttpElb = indexHtml.includes('http://*.elb.amazonaws.com')
    const mainHasHttpElb = mainTs.includes('http://*.elb.amazonaws.com')
    expect(htmlHasHttpElb).toBe(mainHasHttpElb)
  })
})

describe('KAN-64: Timeout and error handling', () => {
  it('API validation has a 30-second timeout', () => {
    expect(appTsx).toMatch(/setTimeout.*controller\.abort\(\).*30000/)
  })

  it('main request has a 5-minute timeout (300000ms)', () => {
    expect(appTsx).toContain('300_000')
  })

  it('validation failure does not block the UI', () => {
    expect(appTsx).toContain('API validation skipped')
    expect(appTsx).toContain('Using cached credits')
  })

  it('AbortController is used for request cancellation', () => {
    expect(appTsx).toContain('new AbortController')
    expect(appTsx).toContain('controller.signal')
  })
})

describe('KAN-64: CORS headers in fetch request', () => {
  it('fetch sends Content-Type: application/json', () => {
    expect(appTsx).toContain("'Content-Type': 'application/json'")
  })

  it('fetch includes X-AIBuddy-API-Key header', () => {
    expect(appTsx).toContain('X-AIBuddy-API-Key')
  })

  it('fetch includes User-Agent with desktop version', () => {
    expect(appTsx).toContain('AIBuddy-Desktop/')
  })
})

describe('KAN-64: Production web security', () => {
  it('webSecurity is enabled in production (not dev)', () => {
    expect(mainTs).toContain('webSecurity: !isDev')
  })

  it('CSP headers are set via onHeadersReceived', () => {
    expect(mainTs).toContain('onHeadersReceived')
    expect(mainTs).toContain('Content-Security-Policy')
  })
})
