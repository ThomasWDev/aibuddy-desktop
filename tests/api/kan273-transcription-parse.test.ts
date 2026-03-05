import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { safeParseResponse, safeParseBody } from '../../renderer/src/lib/response-parser'

/**
 * KAN-273: [Mac] Transcription Error After Stopping Live Audio
 * "Unexpected token '<', '<!DOCTYPE...' is not valid JSON"
 *
 * Root cause: useVoiceInput.ts and InterviewPanel.tsx call res.json()
 * without try-catch. When ALB/proxy returns HTML with 200 status,
 * JSON.parse throws "Unexpected token '<'".
 *
 * Fix: Use safeParseResponse from response-parser.ts (KAN-272 utility).
 *
 * TDD ZOMBIES:
 *   Z - Zero/null (empty transcription response)
 *   O - One happy path (valid Whisper response)
 *   M - Many (various error responses)
 *   B - Boundary (edge cases)
 *   I - Interface (contract)
 *   E - Exception (HTML responses, timeouts)
 *   S - Simple end-to-end (exact production bug)
 */

// ---------------------------------------------------------------------------
// Helpers
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
// ZERO — empty/null transcription
// ===========================================================================
describe('KAN-273 transcription parsing — ZERO', () => {
  it('should handle empty text in Whisper response', async () => {
    const res = mockResponse(JSON.stringify({ text: '' }), 200)
    const result = await safeParseResponse(res)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.text).toBe('')
    }
  })

  it('should handle null text in Whisper response', async () => {
    const res = mockResponse(JSON.stringify({ text: null }), 200)
    const result = await safeParseResponse(res)
    expect(result.ok).toBe(true)
  })
})

// ===========================================================================
// ONE — happy path
// ===========================================================================
describe('KAN-273 transcription parsing — ONE', () => {
  it('should parse valid Whisper transcription response', async () => {
    const whisperResponse = JSON.stringify({ text: 'Write a fibonacci function in Python' })
    const res = mockResponse(whisperResponse, 200, 'application/json')
    const result = await safeParseResponse(res)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.text).toBe('Write a fibonacci function in Python')
    }
  })
})

// ===========================================================================
// MANY — various error scenarios
// ===========================================================================
describe('KAN-273 transcription parsing — MANY', () => {
  it('should safely handle HTML error page with 200 status', async () => {
    const html = '<!DOCTYPE html><html><body><h1>502 Bad Gateway</h1></body></html>'
    const res = mockResponse(html, 200, 'text/html')
    const result = await safeParseResponse(res)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.bodyPreview).toContain('<!DOCTYPE')
    }
  })

  it('should safely handle ALB default page with 200 status', async () => {
    const albPage = '<html><head><title>AIBuddy API</title></head><body>OK</body></html>'
    const res = mockResponse(albPage, 200, 'text/html')
    const result = await safeParseResponse(res)
    expect(result.ok).toBe(false)
  })

  it('should parse valid JSON with wrong content-type (ALB bug)', async () => {
    const whisperResponse = JSON.stringify({ text: 'Hello world' })
    const res = mockResponse(whisperResponse, 200, 'text/html')
    const result = await safeParseResponse(res)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.text).toBe('Hello world')
    }
  })

  it('should parse valid JSON with missing content-type', async () => {
    const whisperResponse = JSON.stringify({ text: 'Test transcription' })
    const res = mockResponse(whisperResponse, 200, null)
    const result = await safeParseResponse(res)
    expect(result.ok).toBe(true)
  })

  it('should handle API error response (401)', async () => {
    const errorResponse = JSON.stringify({ error: 'INVALID_API_KEY', message: 'Bad key' })
    const res = mockResponse(errorResponse, 401, 'application/json')
    const result = await safeParseResponse(res)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.error).toBe('INVALID_API_KEY')
    }
  })

  it('should handle MISSING_AUDIO error', async () => {
    const errorResponse = JSON.stringify({ error: 'MISSING_AUDIO', message: 'audio_base64 is required' })
    const res = mockResponse(errorResponse, 400, 'application/json')
    const result = await safeParseResponse(res)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.error).toBe('MISSING_AUDIO')
    }
  })
})

// ===========================================================================
// BOUNDARY — edge cases
// ===========================================================================
describe('KAN-273 transcription parsing — BOUNDARY', () => {
  it('should handle very long transcription text', async () => {
    const longText = 'a'.repeat(10000)
    const res = mockResponse(JSON.stringify({ text: longText }), 200)
    const result = await safeParseResponse(res)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect((result.data.text as string).length).toBe(10000)
    }
  })

  it('should handle unicode transcription', async () => {
    const res = mockResponse(JSON.stringify({ text: '你好世界 こんにちは' }), 200)
    const result = await safeParseResponse(res)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.text).toContain('你好')
    }
  })
})

// ===========================================================================
// EXCEPTION — exact production bug reproduction
// ===========================================================================
describe('KAN-273 — production bug reproduction', () => {
  it('should NOT crash with "Unexpected token <" when ALB returns HTML on 200', async () => {
    const albHtml = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>AIBuddy</title></head>
<body><p>Service temporarily unavailable</p></body>
</html>`
    const res = mockResponse(albHtml, 200, 'text/html; charset=utf-8')
    const result = await safeParseResponse(res)

    // Must NOT throw — must return a safe error
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.bodyPreview).toContain('<!DOCTYPE')
      expect(result.status).toBe(200)
    }
  })

  it('should NOT crash when proxy returns empty HTML with 200', async () => {
    const res = mockResponse('<html></html>', 200, 'text/html')
    const result = await safeParseResponse(res)
    expect(result.ok).toBe(false)
  })
})

// ===========================================================================
// SOURCE CODE SMOKE — verify useVoiceInput.ts and InterviewPanel.tsx are patched
// ===========================================================================
describe('KAN-273 — source code regression guards', () => {
  const voiceInputSrc = readFileSync(
    resolve(__dirname, '../../renderer/src/hooks/useVoiceInput.ts'), 'utf-8'
  )
  const interviewSrc = readFileSync(
    resolve(__dirname, '../../renderer/src/components/InterviewPanel.tsx'), 'utf-8'
  )

  it('useVoiceInput must use safeParseResponse for Whisper response', () => {
    expect(voiceInputSrc).toContain('safeParseResponse')
  })

  it('useVoiceInput must NOT have unprotected res.json()', () => {
    // Strip comments before checking — the KAN-273 fix comment mentions res.json()
    const stripped = voiceInputSrc.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
    const sendToWhisperBlock = stripped.slice(
      stripped.indexOf('sendToWhisper'),
      stripped.indexOf('sendToWhisper') + 1500
    )
    expect(sendToWhisperBlock).not.toMatch(/\bres\.json\(\)/)
  })

  it('useVoiceInput must import from response-parser', () => {
    expect(voiceInputSrc).toContain('response-parser')
  })

  it('InterviewPanel transcribeSegment must use safe parsing', () => {
    const transcribeBlock = interviewSrc.slice(
      interviewSrc.indexOf('transcribeSegment'),
      interviewSrc.indexOf('transcribeSegment') + 1500
    )
    expect(transcribeBlock).toContain('safeParseResponse')
  })

  it('InterviewPanel transcribeSegment must NOT have unprotected res.json()', () => {
    const transcribeBlock = interviewSrc.slice(
      interviewSrc.indexOf('transcribeSegment'),
      interviewSrc.indexOf('transcribeSegment') + 1500
    )
    expect(transcribeBlock).not.toMatch(/\bres\.json\(\)/)
  })

  it('InterviewPanel sendToAI must NOT have content-type gate (KAN-272 pattern)', () => {
    const sendToAIBlock = interviewSrc.slice(
      interviewSrc.indexOf('const sendToAI'),
      interviewSrc.indexOf('const sendToAI') + 2000
    )
    expect(sendToAIBlock).not.toContain("!contentType?.includes('application/json')")
  })

  it('InterviewPanel sendToAI must use safe parsing', () => {
    const sendToAIBlock = interviewSrc.slice(
      interviewSrc.indexOf('const sendToAI'),
      interviewSrc.indexOf('const sendToAI') + 2000
    )
    expect(sendToAIBlock).toContain('safeParseResponse')
  })
})
