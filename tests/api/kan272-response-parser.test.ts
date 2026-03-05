import { describe, it, expect } from 'vitest'
import {
  safeParseResponse,
  safeParseBody,
  type ApiResponseResult,
} from '../../renderer/src/lib/response-parser'

/**
 * KAN-272: [Mac] UI Shows Error When Server Returns HTTP 200
 *
 * Root cause: Content-Type header check rejects valid JSON body.
 * Fix: Try JSON.parse first; only error if parsing actually fails.
 *
 * TDD ZOMBIES coverage:
 *   Z - Zero/null cases
 *   O - One happy path
 *   M - Many content-type variants
 *   B - Boundary (empty body, huge body, arrays)
 *   I - Interface contract
 *   E - Exception (timeout, parse failure)
 *   S - Simple end-to-end
 */

// ---------------------------------------------------------------------------
// Helpers to build mock Response objects
// ---------------------------------------------------------------------------
function mockResponse(
  body: string,
  status = 200,
  contentType: string | null = 'application/json'
): Response {
  const headers = new Headers()
  if (contentType !== null) {
    headers.set('content-type', contentType)
  }
  return new Response(body, { status, headers })
}

// ===========================================================================
// ZERO — null / empty edge cases
// ===========================================================================
describe('KAN-272 safeParseResponse — ZERO', () => {
  it('should return error for empty body with 200 status', async () => {
    const res = mockResponse('', 200)
    const result = await safeParseResponse(res)
    expect(result.ok).toBe(false)
  })

  it('should return error for whitespace-only body', async () => {
    const res = mockResponse('   ', 200)
    const result = await safeParseResponse(res)
    expect(result.ok).toBe(false)
  })

  it('should return error when content-type header is completely missing', async () => {
    const validJson = JSON.stringify({ choices: [{ message: { content: 'hello' } }] })
    const res = mockResponse(validJson, 200, null)
    const result = await safeParseResponse(res)
    // THIS IS THE KEY FIX: valid JSON body, missing content-type => should succeed
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toHaveProperty('choices')
    }
  })
})

// ===========================================================================
// ONE — single happy path
// ===========================================================================
describe('KAN-272 safeParseResponse — ONE', () => {
  it('should parse valid JSON with application/json content-type', async () => {
    const body = JSON.stringify({ response: 'Hello world', model: 'claude-3', cached: false })
    const res = mockResponse(body, 200, 'application/json')
    const result = await safeParseResponse(res)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.response).toBe('Hello world')
      expect(result.data.model).toBe('claude-3')
    }
  })

  it('should parse valid JSON with application/json; charset=utf-8', async () => {
    const body = JSON.stringify({ response: 'Hej' })
    const res = mockResponse(body, 200, 'application/json; charset=utf-8')
    const result = await safeParseResponse(res)
    expect(result.ok).toBe(true)
  })
})

// ===========================================================================
// MANY — various content-type scenarios that previously broke
// ===========================================================================
describe('KAN-272 safeParseResponse — MANY content-type variants', () => {
  const validBody = JSON.stringify({
    response: 'ok',
    remaining_credits: 42.5,
    request_id: 'abc-123',
  })

  const contentTypes = [
    'application/json',
    'application/json; charset=utf-8',
    'text/html',
    'text/html; charset=utf-8',
    'text/plain',
    null,              // header completely absent
    '',                // empty string
    'application/octet-stream',
  ]

  contentTypes.forEach((ct) => {
    it(`should accept valid JSON body even when content-type is "${ct}"`, async () => {
      const res = mockResponse(validBody, 200, ct === '' ? null : ct)
      const result = await safeParseResponse(res)
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.remaining_credits).toBe(42.5)
      }
    })
  })

  it('should reject genuine HTML (not JSON) with text/html', async () => {
    const res = mockResponse('<html><body>Server Error</body></html>', 200, 'text/html')
    const result = await safeParseResponse(res)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.bodyPreview).toContain('<html>')
    }
  })

  it('should reject plain text that is not JSON', async () => {
    const res = mockResponse('OK', 200, 'text/plain')
    const result = await safeParseResponse(res)
    expect(result.ok).toBe(false)
  })
})

// ===========================================================================
// BOUNDARY — edge cases
// ===========================================================================
describe('KAN-272 safeParseResponse — BOUNDARY', () => {
  it('should reject JSON array (not an object)', async () => {
    const res = mockResponse('[1,2,3]', 200, 'application/json')
    const result = await safeParseResponse(res)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.parseError).toContain('not an object')
    }
  })

  it('should reject JSON primitive (string)', async () => {
    const res = mockResponse('"hello"', 200, 'application/json')
    const result = await safeParseResponse(res)
    expect(result.ok).toBe(false)
  })

  it('should reject JSON primitive (number)', async () => {
    const res = mockResponse('42', 200, 'application/json')
    const result = await safeParseResponse(res)
    expect(result.ok).toBe(false)
  })

  it('should reject JSON null', async () => {
    const res = mockResponse('null', 200, 'application/json')
    const result = await safeParseResponse(res)
    expect(result.ok).toBe(false)
  })

  it('should handle nested JSON objects correctly', async () => {
    const body = JSON.stringify({
      response: 'deep',
      metadata: { model: 'opus', usage: { input: 100, output: 50 } },
    })
    const res = mockResponse(body, 200, 'application/json')
    const result = await safeParseResponse(res)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect((result.data.metadata as any).model).toBe('opus')
    }
  })

  it('should preserve body preview to max 200 chars on error', async () => {
    const longHtml = '<html>' + 'x'.repeat(300) + '</html>'
    const res = mockResponse(longHtml, 200, 'text/html')
    const result = await safeParseResponse(res)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.bodyPreview.length).toBeLessThanOrEqual(200)
    }
  })

  it('should handle non-200 status with valid JSON', async () => {
    const body = JSON.stringify({ error: 'RATE_LIMITED', message: 'slow down' })
    const res = mockResponse(body, 429, 'application/json')
    const result = await safeParseResponse(res)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.error).toBe('RATE_LIMITED')
    }
  })
})

// ===========================================================================
// INTERFACE — contract verification
// ===========================================================================
describe('KAN-272 safeParseResponse — INTERFACE', () => {
  it('result should always have ok boolean', async () => {
    const goodRes = mockResponse('{"a":1}', 200)
    const badRes = mockResponse('nope', 200)

    const good = await safeParseResponse(goodRes)
    const bad = await safeParseResponse(badRes)

    expect(typeof good.ok).toBe('boolean')
    expect(typeof bad.ok).toBe('boolean')
  })

  it('success result should have data property', async () => {
    const res = mockResponse('{"a":1}', 200)
    const result = await safeParseResponse(res)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toBeDefined()
      expect(typeof result.data).toBe('object')
    }
  })

  it('error result should have status, contentType, bodyPreview', async () => {
    const res = mockResponse('bad', 500, 'text/html')
    const result = await safeParseResponse(res)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(typeof result.status).toBe('number')
      expect(result.contentType).toBe('text/html')
      expect(typeof result.bodyPreview).toBe('string')
    }
  })
})

// ===========================================================================
// EXCEPTION — timeout and parse failures
// ===========================================================================
describe('KAN-272 safeParseResponse — EXCEPTION', () => {
  it('should return error when body read times out', async () => {
    const neverResolve = new Response(
      new ReadableStream({ start() { /* never push */ } }),
      { status: 200, headers: { 'content-type': 'application/json' } }
    )
    const result = await safeParseResponse(neverResolve, 50) // 50ms timeout
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.parseError).toContain('timed out')
    }
  })

  it('should return error for truncated JSON', async () => {
    const res = mockResponse('{"error":"INVALID', 200)
    const result = await safeParseResponse(res)
    expect(result.ok).toBe(false)
  })

  it('should return error for content-type says JSON but body is HTML', async () => {
    const res = mockResponse('<h1>502 Bad Gateway</h1>', 502, 'application/json')
    const result = await safeParseResponse(res)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.parseError).toContain('Content-Type says JSON but body is not valid JSON')
    }
  })
})

// ===========================================================================
// SIMPLE — end-to-end scenario matching the exact production bug
// ===========================================================================
describe('KAN-272 — production bug reproduction', () => {
  it('should NOT show error when ALB returns valid JSON with text/html content-type', async () => {
    const albResponse = JSON.stringify({
      response: 'Here is the answer to your question...',
      model: 'claude-sonnet-4-20250514',
      remaining_credits: 18.42,
      request_id: 'prod-uuid-1234',
      cached: false,
      duration_ms: 2345,
    })

    // ALB sometimes returns text/html content-type for valid JSON
    const res = mockResponse(albResponse, 200, 'text/html')
    const result = await safeParseResponse(res)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.response).toContain('answer')
      expect(result.data.model).toBe('claude-sonnet-4-20250514')
      expect(result.data.remaining_credits).toBe(18.42)
    }
  })

  it('should NOT show error when proxy strips content-type header entirely', async () => {
    const apiResponse = JSON.stringify({
      response: 'Success',
      model: 'gpt-4o',
      remaining_credits: 5.0,
      request_id: 'uuid-5678',
    })

    const res = mockResponse(apiResponse, 200, null)
    const result = await safeParseResponse(res)

    expect(result.ok).toBe(true)
  })

  it('should correctly error for genuine non-JSON from WAF/CDN', async () => {
    const wafBlock = `<!DOCTYPE html>
<html>
<head><title>403 Forbidden</title></head>
<body>
<h1>403 Forbidden</h1>
<p>Request blocked by Web Application Firewall</p>
</body>
</html>`

    const res = mockResponse(wafBlock, 200, 'text/html')
    const result = await safeParseResponse(res)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.bodyPreview).toContain('403 Forbidden')
    }
  })
})

// ===========================================================================
// safeParseBody (synchronous variant used in callAI helper)
// ===========================================================================
describe('KAN-272 safeParseBody — sync variant', () => {
  it('should parse valid JSON regardless of content-type', () => {
    const body = JSON.stringify({ response: 'ok', model: 'test' })
    const result = safeParseBody(body, 200, 'text/html')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.response).toBe('ok')
    }
  })

  it('should parse valid JSON when content-type is null', () => {
    const body = JSON.stringify({ response: 'ok' })
    const result = safeParseBody(body, 200, null)
    expect(result.ok).toBe(true)
  })

  it('should error for non-JSON body', () => {
    const result = safeParseBody('<html>error</html>', 200, 'text/html')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.bodyPreview).toContain('<html>')
    }
  })

  it('should error for array JSON', () => {
    const result = safeParseBody('[1,2]', 200, 'application/json')
    expect(result.ok).toBe(false)
  })

  it('should error for empty string', () => {
    const result = safeParseBody('', 200, 'application/json')
    expect(result.ok).toBe(false)
  })
})
