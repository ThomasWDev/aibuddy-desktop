import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

// ---------------------------------------------------------------------------
// KAN-271: [Mac] Excessive Token Cost Charged for Simple Fibonacci Request
//
// Root cause: System prompt encourages thoroughness without a proportionality
// guardrail. The AI interprets "write fibonacci in C" as requiring a full
// multi-file project with advanced implementations. Additionally, max_tokens
// is set to 4096 for ALL requests regardless of complexity.
//
// Fix: (1) Add a "Response Proportionality" instruction to the communication
// protocol that tells the AI to match response complexity to prompt complexity.
// (2) Add a cost awareness instruction. These are prompt-level fixes — the
// most impactful lever for controlling token costs.
// ---------------------------------------------------------------------------

const COMM_SOURCE = fs.readFileSync(
  path.join(__dirname, '../../packages/prompts/src/core/communication.ts'),
  'utf-8'
)

const APP_SOURCE = fs.readFileSync(
  path.join(__dirname, '../../renderer/src/App.tsx'),
  'utf-8'
)

describe('KAN-271: Response proportionality to prevent excessive token cost', () => {

  // ==========================================================================
  // 1. Communication protocol must include proportionality instruction
  // ==========================================================================
  describe('communication protocol proportionality', () => {
    it('must include a response proportionality section', () => {
      expect(COMM_SOURCE).toMatch(/[Pp]roportional|[Cc]oncise|[Bb]revity|[Ss]imple.*[Ss]imple/)
    })

    it('must instruct to match response length to prompt complexity', () => {
      expect(COMM_SOURCE).toMatch(/simple.*short|complexity.*response|match.*length|proportional/i)
    })

    it('must explicitly mention avoiding multi-file when not asked', () => {
      expect(COMM_SOURCE).toMatch(/multi.?file|multiple files|single file/i)
    })

    it('must mention cost awareness', () => {
      expect(COMM_SOURCE).toMatch(/cost|token|expensive/i)
    })
  })

  // ==========================================================================
  // 2. App.tsx API requests must have reasonable max_tokens
  // ==========================================================================
  describe('max_tokens configuration', () => {
    it('must set max_tokens in API request', () => {
      expect(APP_SOURCE).toMatch(/max_tokens/)
    })

    it('max_tokens must not exceed 4096 for standard requests', () => {
      const matches = APP_SOURCE.match(/max_tokens:\s*(\d+)/g) || []
      for (const m of matches) {
        const val = parseInt(m.replace(/max_tokens:\s*/, ''))
        expect(val).toBeLessThanOrEqual(4096)
      }
    })
  })

  // ==========================================================================
  // 3. Regression guards
  // ==========================================================================
  describe('regression guards', () => {
    it('communication protocol must still include Response Structure', () => {
      expect(COMM_SOURCE).toContain('Response Structure')
    })

    it('communication protocol must still include Be Proactive', () => {
      expect(COMM_SOURCE).toContain('Be Proactive')
    })

    it('communication protocol must still include Formatting rules', () => {
      expect(COMM_SOURCE).toContain('Formatting')
    })

    it("communication protocol must still include Don'ts", () => {
      expect(COMM_SOURCE).toContain("Don'ts")
    })
  })
})
