import { describe, it, expect } from 'vitest'
import {
  safeParseResponse,
  safeParseBody,
  type ApiResponseResult,
  type ParsedApiResponse,
  type ParsedApiError,
} from '../../renderer/src/lib/response-parser'

// ---------------------------------------------------------------------------
// KAN-272: [Mac] UI Shows Error When Server Returns HTTP 200
//
// Root cause: App.tsx checked Content-Type header BEFORE trying JSON.parse.
// When ALB/proxy returned valid JSON with wrong/missing Content-Type, the
// client rejected it — showing "Unexpected Response (200)".
//
// Fix: safeParseResponse / safeParseBody try JSON.parse first; Content-Type
// is a logging hint, not a gate.
//
// ZOMBIES methodology:
//   Z = Zero/null inputs
//   O = One happy path
//   M = Many Content-Type variants
//   B = Boundary (empty body, huge body, non-object JSON)
//   I = Interface (types, discriminated union)
//   E = Exception/timeout
//   S = Scenario (production bug reproduction)
// ---------------------------------------------------------------------------

function mockResponse(body: string, status = 200, contentType: string | null = 'application/json'): Response {
  const headers = new Headers()
  if (contentType !== null) {
    headers.set('content-type', contentType)
  }
  return new Response(body, { status, headers })
}

// ============================================================
// Z — Zero / Null inputs
// ============================================================
describe('KAN-272: Zero / Null inputs', () => {
  it('handles empty body with application/json Content-Type', () => {
    const result = safeParseBody('', 200, 'application/json')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.status).toBe(200)
      expect(result.parseError).toBeDefined()
    }
  })

  it('handles null Content-Type with valid JSON body', () => {
    const result = safeParseBody('{"success":true}', 200, null)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toEqual({ success: true })
    }
  })

  it('handles null Content-Type with empty body', () => {
    const result = safeParseBody('', 200, null)
    expect(result.ok).toBe(false)
  })

  it('handles response with null body text (async)', async () => {
    const resp = mockResponse('', 200, null)
    const result = await safeParseResponse(resp)
    expect(result.ok).toBe(false)
  })
})

// ============================================================
// O — One happy path
// ============================================================
describe('KAN-272: One happy path', () => {
  it('parses valid JSON with correct Content-Type', () => {
    const result = safeParseBody(
      '{"success":true,"response":"Hello","usage":{"input_tokens":10}}',
      200,
      'application/json'
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.success).toBe(true)
      expect(result.data.response).toBe('Hello')
    }
  })

  it('returns ok:true with data as a Record', () => {
    const result = safeParseBody('{"key":"value"}', 200, 'application/json')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(typeof result.data).toBe('object')
      expect(result.data).not.toBeNull()
    }
  })

  it('async safeParseResponse resolves valid JSON', async () => {
    const resp = mockResponse('{"ok":1}', 200, 'application/json')
    const result = await safeParseResponse(resp)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.ok).toBe(1)
    }
  })
})

// ============================================================
// M — Many Content-Type variants (the actual KAN-272 bug)
// ============================================================
describe('KAN-272: Many Content-Type variants', () => {
  it('parses valid JSON with text/html Content-Type (ALB proxy)', () => {
    const result = safeParseBody('{"success":true}', 200, 'text/html')
    expect(result.ok).toBe(true)
  })

  it('parses valid JSON with text/plain Content-Type', () => {
    const result = safeParseBody('{"success":true}', 200, 'text/plain')
    expect(result.ok).toBe(true)
  })

  it('parses valid JSON with no Content-Type header', () => {
    const result = safeParseBody('{"success":true}', 200, null)
    expect(result.ok).toBe(true)
  })

  it('parses valid JSON with application/json;charset=utf-8', () => {
    const result = safeParseBody('{"success":true}', 200, 'application/json; charset=utf-8')
    expect(result.ok).toBe(true)
  })

  it('parses valid JSON with application/octet-stream Content-Type', () => {
    const result = safeParseBody('{"success":true}', 200, 'application/octet-stream')
    expect(result.ok).toBe(true)
  })

  it('parses valid JSON with multipart/form-data Content-Type (edge case)', () => {
    const result = safeParseBody('{"success":true}', 200, 'multipart/form-data')
    expect(result.ok).toBe(true)
  })

  it('async: parses valid JSON despite text/html Content-Type', async () => {
    const resp = mockResponse('{"success":true,"response":"data"}', 200, 'text/html')
    const result = await safeParseResponse(resp)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.success).toBe(true)
    }
  })

  it('async: parses valid JSON despite null Content-Type', async () => {
    const resp = mockResponse('{"success":true}', 200, null)
    const result = await safeParseResponse(resp)
    expect(result.ok).toBe(true)
  })
})

// ============================================================
// B — Boundary cases
// ============================================================
describe('KAN-272: Boundary cases', () => {
  it('rejects JSON array (not an object)', () => {
    const result = safeParseBody('[1,2,3]', 200, 'application/json')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.parseError).toContain('not an object')
    }
  })

  it('rejects JSON primitive string', () => {
    const result = safeParseBody('"hello"', 200, 'application/json')
    expect(result.ok).toBe(false)
  })

  it('rejects JSON primitive number', () => {
    const result = safeParseBody('42', 200, 'application/json')
    expect(result.ok).toBe(false)
  })

  it('rejects JSON null', () => {
    const result = safeParseBody('null', 200, 'application/json')
    expect(result.ok).toBe(false)
  })

  it('rejects JSON boolean', () => {
    const result = safeParseBody('true', 200, 'application/json')
    expect(result.ok).toBe(false)
  })

  it('handles very large JSON body', () => {
    const bigObj: Record<string, string> = {}
    for (let i = 0; i < 1000; i++) {
      bigObj[`key${i}`] = 'x'.repeat(100)
    }
    const result = safeParseBody(JSON.stringify(bigObj), 200, 'application/json')
    expect(result.ok).toBe(true)
  })

  it('bodyPreview is truncated to 200 chars on error', () => {
    const longHtml = '<html>' + 'x'.repeat(500) + '</html>'
    const result = safeParseBody(longHtml, 200, 'text/html')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.bodyPreview.length).toBeLessThanOrEqual(200)
    }
  })

  it('handles nested JSON objects', () => {
    const nested = JSON.stringify({ a: { b: { c: { d: 'deep' } } } })
    const result = safeParseBody(nested, 200, 'application/json')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect((result.data.a as any).b.c.d).toBe('deep')
    }
  })
})

// ============================================================
// I — Interface / type contracts
// ============================================================
describe('KAN-272: Interface contracts', () => {
  it('ParsedApiResponse has ok:true and data', () => {
    const result = safeParseBody('{"a":1}', 200, 'application/json')
    expect(result.ok).toBe(true)
    if (result.ok) {
      const typed: ParsedApiResponse = result
      expect(typed.data).toBeDefined()
      expect(typeof typed.data).toBe('object')
    }
  })

  it('ParsedApiError has ok:false, status, contentType, bodyPreview', () => {
    const result = safeParseBody('not json', 200, 'text/html')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      const typed: ParsedApiError = result
      expect(typed.status).toBe(200)
      expect(typed.contentType).toBe('text/html')
      expect(typed.bodyPreview).toBeDefined()
      expect(typed.parseError).toBeDefined()
    }
  })

  it('discriminated union: ok field distinguishes success from error', () => {
    const success = safeParseBody('{"x":1}', 200, 'application/json')
    const failure = safeParseBody('bad', 500, null)
    expect(success.ok).toBe(true)
    expect(failure.ok).toBe(false)
  })

  it('exports are functions', () => {
    expect(typeof safeParseResponse).toBe('function')
    expect(typeof safeParseBody).toBe('function')
  })
})

// ============================================================
// E — Exception / Timeout
// ============================================================
describe('KAN-272: Exception / Timeout handling', () => {
  it('returns error for non-JSON HTML error page', () => {
    const html = '<!DOCTYPE html><html><body>502 Bad Gateway</body></html>'
    const result = safeParseBody(html, 502, 'text/html')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.status).toBe(502)
    }
  })

  it('returns error for XML response', () => {
    const xml = '<?xml version="1.0"?><error>Internal Server Error</error>'
    const result = safeParseBody(xml, 500, 'application/xml')
    expect(result.ok).toBe(false)
  })

  it('async safeParseResponse handles timeout', async () => {
    const neverResolve = new Response(
      new ReadableStream({ start() { /* never push/close */ } }),
      { status: 200, headers: { 'content-type': 'application/json' } }
    )
    const result = await safeParseResponse(neverResolve, 100)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.parseError).toContain('timed out')
    }
  })

  it('handles status codes: 200 with bad body', () => {
    const result = safeParseBody('Server OK', 200, 'text/plain')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.status).toBe(200)
    }
  })

  it('handles status code 500 with valid JSON error body', () => {
    const result = safeParseBody('{"error":"Internal Server Error"}', 500, 'application/json')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.error).toBe('Internal Server Error')
    }
  })

  it('handles status code 403 with HTML body', () => {
    const result = safeParseBody('<html>Forbidden</html>', 403, 'text/html')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.status).toBe(403)
    }
  })
})

// ============================================================
// S — Scenario: Production bug reproduction
// ============================================================
describe('KAN-272: Production bug reproduction', () => {
  it('EXACT BUG: ALB returns valid JSON with text/html — must NOT show error', () => {
    const apiResponse = JSON.stringify({
      success: true,
      response: 'Here is the code you requested...',
      usage: { input_tokens: 500, output_tokens: 1200 },
      remaining_credits: 42.5,
      api_cost: 0.03,
    })
    const result = safeParseBody(apiResponse, 200, 'text/html')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.success).toBe(true)
      expect(result.data.response).toBeDefined()
      expect(result.data.remaining_credits).toBe(42.5)
    }
  })

  it('EXACT BUG: ALB returns valid JSON with null Content-Type — must NOT show error', () => {
    const apiResponse = JSON.stringify({
      success: true,
      response: 'Hello',
      thinking: 'Internal reasoning...',
    })
    const result = safeParseBody(apiResponse, 200, null)
    expect(result.ok).toBe(true)
  })

  it('EXACT BUG: async version — text/html Content-Type but valid JSON body', async () => {
    const body = JSON.stringify({ success: true, response: 'Test response' })
    const resp = mockResponse(body, 200, 'text/html')
    const result = await safeParseResponse(resp)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.success).toBe(true)
    }
  })

  it('non-JSON 200 response SHOULD fail gracefully', () => {
    const result = safeParseBody('OK', 200, 'text/plain')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.status).toBe(200)
      expect(result.bodyPreview).toBe('OK')
    }
  })

  it('error response with JSON body should still parse', () => {
    const errorBody = JSON.stringify({
      error: 'SERVICE_TEMPORARILY_UNAVAILABLE',
      message: 'Lambda timeout',
    })
    const result = safeParseBody(errorBody, 503, 'application/json')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.error).toBe('SERVICE_TEMPORARILY_UNAVAILABLE')
    }
  })

  it('402 out-of-credits response should parse', () => {
    const body = JSON.stringify({ error: 'Insufficient credits', credits: 0 })
    const result = safeParseBody(body, 402, 'application/json')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.error).toBe('Insufficient credits')
    }
  })
})

// ============================================================
// Regression guards: App.tsx integration
// ============================================================
describe('KAN-272: App.tsx integration guards', () => {
  it('response-parser.ts exports safeParseResponse', async () => {
    const mod = await import('../../renderer/src/lib/response-parser')
    expect(mod.safeParseResponse).toBeDefined()
    expect(typeof mod.safeParseResponse).toBe('function')
  })

  it('response-parser.ts exports safeParseBody', async () => {
    const mod = await import('../../renderer/src/lib/response-parser')
    expect(mod.safeParseBody).toBeDefined()
    expect(typeof mod.safeParseBody).toBe('function')
  })

  it('App.tsx imports safeParseResponse and safeParseBody', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const appPath = path.join(__dirname, '../../renderer/src/App.tsx')
    const source = fs.readFileSync(appPath, 'utf-8')
    expect(source).toContain("import { safeParseResponse, safeParseBody } from './lib/response-parser'")
  })

  it('App.tsx callAI uses safeParseBody (not Content-Type gating)', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const appPath = path.join(__dirname, '../../renderer/src/App.tsx')
    const source = fs.readFileSync(appPath, 'utf-8')
    expect(source).toContain('safeParseBody(bodyText')
    expect(source).toContain('KAN-272 FIX')
  })

  it('App.tsx handleSend uses safeParseResponse (not Content-Type gating)', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const appPath = path.join(__dirname, '../../renderer/src/App.tsx')
    const source = fs.readFileSync(appPath, 'utf-8')
    const callCount = (source.match(/safeParseResponse\(/g) || []).length
    expect(callCount).toBeGreaterThanOrEqual(1)
  })
})
