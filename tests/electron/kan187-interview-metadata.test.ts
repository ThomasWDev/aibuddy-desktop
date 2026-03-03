/**
 * KAN-187 TDD: Interview Mode must display cost, token usage, and response timestamp
 *
 * Root cause: AIResponse interface lacks cost/tokens/model/responseTime fields.
 * sendToAI does not extract usage data from API response. UI does not render metadata.
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, it, expect } from 'vitest'

const ROOT = resolve(__dirname, '../..')
const read = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf-8')

describe('KAN-187 — Interview Mode response metadata', () => {
  const panel = read('renderer/src/components/InterviewPanel.tsx')

  describe('AIResponse interface', () => {
    const interfaceBlock = panel.slice(
      panel.indexOf('interface AIResponse'),
      panel.indexOf('}', panel.indexOf('interface AIResponse')) + 1
    )

    it('must include cost field', () => {
      expect(interfaceBlock).toMatch(/cost\??\s*:\s*number/)
    })

    it('must include tokensIn field', () => {
      expect(interfaceBlock).toMatch(/tokensIn\??\s*:\s*number/)
    })

    it('must include tokensOut field', () => {
      expect(interfaceBlock).toMatch(/tokensOut\??\s*:\s*number/)
    })

    it('must include model field', () => {
      expect(interfaceBlock).toMatch(/model\??\s*:\s*string/)
    })

    it('must include responseTime field for duration tracking', () => {
      expect(interfaceBlock).toMatch(/responseTime\??\s*:\s*number/)
    })
  })

  describe('sendToAI must extract metadata from API response', () => {
    const sendToAIBlock = panel.slice(
      panel.indexOf('const sendToAI'),
      panel.indexOf('const sendToAI') + 2500
    )

    it('must extract api_cost from response data', () => {
      expect(sendToAIBlock).toMatch(/api_cost|data\.cost/)
    })

    it('must extract input_tokens from usage', () => {
      expect(sendToAIBlock).toMatch(/input_tokens/)
    })

    it('must extract output_tokens from usage', () => {
      expect(sendToAIBlock).toMatch(/output_tokens/)
    })

    it('must extract model from response data', () => {
      expect(sendToAIBlock).toMatch(/data\.model|data\?.model/)
    })

    it('must track response time via Date.now or performance.now', () => {
      expect(sendToAIBlock).toMatch(/Date\.now\(\)|performance\.now\(\)/)
    })

    it('must pass metadata when updating response state', () => {
      expect(sendToAIBlock).toMatch(/cost\s*:|tokensIn\s*:|tokensOut\s*:/)
    })
  })

  describe('UI must render response metadata', () => {
    it('must display cost with dollar sign', () => {
      expect(panel).toMatch(/\$.*toFixed|toFixed.*\$/)
    })

    it('must display token counts (in/out indicators)', () => {
      expect(panel).toMatch(/tokensIn|tokens.*in/i)
      expect(panel).toMatch(/tokensOut|tokens.*out/i)
    })

    it('must display response time', () => {
      expect(panel).toMatch(/responseTime|response.*time/i)
    })

    it('must display full timestamp with date', () => {
      expect(panel).toMatch(/toLocaleDateString|toLocaleString/)
    })
  })

  describe('consistency with regular chat mode', () => {
    const appTsx = read('renderer/src/App.tsx')

    it('regular chat displays cost per message', () => {
      expect(appTsx).toContain('message.cost')
      expect(appTsx).toContain('toFixed(4)')
    })

    it('regular chat displays tokensIn and tokensOut', () => {
      expect(appTsx).toContain('message.tokensIn')
      expect(appTsx).toContain('message.tokensOut')
    })

    it('Interview Mode must use same cost display format as regular chat', () => {
      expect(panel).toMatch(/toFixed\(4\)/)
    })
  })
})
