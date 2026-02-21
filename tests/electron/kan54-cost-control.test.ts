/**
 * KAN-54 TDD Tests: Simple prompt cost seems high
 *
 * Root cause:
 *   1. No token-based conversation truncation — only 900KB payload trigger
 *   2. Agentic mode sends all messages with no limit
 *   3. Handoff doc (up to 45KB) sent with every single request
 *   4. No client-side cost estimation or token count display
 *
 * Fix:
 *   1. Add token-based history truncation with MAX_CONTEXT_TOKENS limit
 *   2. Add sliding window to agentic mode callAPI()
 *   3. Only send handoff doc on first message in a conversation
 *   4. Add estimateTokens helper and display in UI
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, it, expect } from 'vitest'

const ROOT = resolve(__dirname, '../..')
const read = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf-8')

// ─── 1. TOKEN-BASED HISTORY TRUNCATION ─────────────────────────────
describe('KAN-54 — Token-based conversation truncation', () => {
  const appTsx = read('renderer/src/App.tsx')

  it('must define a MAX_CONTEXT_TOKENS constant', () => {
    expect(appTsx).toMatch(/MAX_CONTEXT_TOKENS\s*=/)
  })

  it('must have an estimateTokens helper function', () => {
    expect(appTsx).toMatch(/estimateTokens|estimateTokenCount/)
  })

  it('must truncate conversation history based on token count before sending', () => {
    const sendSection = appTsx.slice(
      appTsx.indexOf('Sending API request'),
      appTsx.indexOf('Sending API request') + 8000
    )
    expect(sendSection).toMatch(/MAX_CONTEXT_TOKENS|estimateToken|token.*truncat|truncat.*token/i)
  })
})

// ─── 2. AGENTIC MODE TRUNCATION ────────────────────────────────────
describe('KAN-54 — Agentic mode message limits', () => {
  const agentAdapter = read('src/core/agent-adapter.ts')

  it('callAPI must limit messages sent to API', () => {
    const callApiMethod = agentAdapter.slice(
      agentAdapter.indexOf('private async callAPI'),
      agentAdapter.indexOf('private async callAPI') + 1500
    )
    expect(callApiMethod).toMatch(/slice|truncat|MAX_|limit|sliding/i)
  })
})

// ─── 3. HANDOFF DOC OPTIMIZATION ───────────────────────────────────
describe('KAN-54 — Handoff doc sent only when needed', () => {
  const appTsx = read('renderer/src/App.tsx')

  it('must track whether handoff doc has already been sent', () => {
    expect(appTsx).toMatch(/handoffSent|handoffIncluded|handoff.*first|firstMessage.*handoff/i)
  })
})

// ─── 4. REGRESSION GUARDS ──────────────────────────────────────────
describe('KAN-54 — Regression guards', () => {
  const appTsx = read('renderer/src/App.tsx')
  const agentAdapter = read('src/core/agent-adapter.ts')

  it('must still support images in messages', () => {
    expect(appTsx).toContain('has_images')
  })

  it('AWS API guardrails must still exist (KAN-55)', () => {
    const handler = read('../aws-api/src/handler.js')
    expect(handler).toContain('MAX_COST_PER_REQUEST')
    expect(handler).toContain('MAX_TOKENS_HARD_LIMIT')
  })

  it('agent must still limit iterations to 50', () => {
    expect(agentAdapter).toMatch(/maxIterations\s*=\s*50/)
  })

  it('payload size truncation must still exist as secondary guard', () => {
    expect(appTsx).toContain('MAX_PAYLOAD_BYTES')
  })
})
