import { describe, it, expect, beforeAll } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

/**
 * KAN-179: Display Response Time with Full Date & Year Next to Cost Indicator
 *
 * Requirements:
 * - Message interface must include responseTime (ms) and timestamp (ISO string)
 * - assistantMessage must populate responseTime and timestamp
 * - Metadata row must display: cost • response time • full date
 * - Format: "$0.0244 • 2.4s • 03 Mar 2026, 9:49 PM"
 * - Clock icon for response time, Calendar icon for timestamp
 * - Consistent across chat mode (App.tsx) and interview mode (InterviewPanel.tsx)
 */

const PROJECT_ROOT = path.resolve(__dirname, '../..')

const APP_SOURCE = fs.readFileSync(
  path.join(PROJECT_ROOT, 'renderer/src/App.tsx'),
  'utf-8'
)

const INTERVIEW_SOURCE = fs.readFileSync(
  path.join(PROJECT_ROOT, 'renderer/src/components/InterviewPanel.tsx'),
  'utf-8'
)

describe('KAN-179: Response Time & Timestamp Display', () => {

  // ==========================================================================
  // 1. Message interface must include responseTime and timestamp
  // ==========================================================================
  describe('Message interface', () => {
    it('must include responseTime field', () => {
      const interfaceBlock = APP_SOURCE.slice(
        APP_SOURCE.indexOf('interface Message {'),
        APP_SOURCE.indexOf('}', APP_SOURCE.indexOf('interface Message {')) + 1
      )
      expect(interfaceBlock).toContain('responseTime')
    })

    it('must include timestamp field', () => {
      const interfaceBlock = APP_SOURCE.slice(
        APP_SOURCE.indexOf('interface Message {'),
        APP_SOURCE.indexOf('}', APP_SOURCE.indexOf('interface Message {')) + 1
      )
      expect(interfaceBlock).toContain('timestamp')
    })
  })

  // ==========================================================================
  // 2. assistantMessage creation must populate responseTime and timestamp
  // ==========================================================================
  describe('assistantMessage creation', () => {
    it('must set responseTime on the assistant message object', () => {
      const msgIdx = APP_SOURCE.indexOf('const assistantMessage: Message')
      expect(msgIdx).toBeGreaterThan(-1)

      const block = APP_SOURCE.slice(msgIdx, msgIdx + 600)
      expect(block).toContain('responseTime')
    })

    it('must set timestamp on the assistant message object', () => {
      const msgIdx = APP_SOURCE.indexOf('const assistantMessage: Message')
      expect(msgIdx).toBeGreaterThan(-1)

      const block = APP_SOURCE.slice(msgIdx, msgIdx + 600)
      expect(block).toContain('timestamp')
    })
  })

  // ==========================================================================
  // 3. Metadata row must render response time with Clock icon
  // ==========================================================================
  describe('Metadata row — response time display', () => {
    it('must import Clock icon from lucide-react', () => {
      expect(APP_SOURCE).toMatch(/import[\s\S]*Clock[\s\S]*from\s+['"]lucide-react['"]/)
    })

    it('must display responseTime in the metadata section', () => {
      const metadataIdx = APP_SOURCE.indexOf("message.role === 'assistant' && (message.cost")
      expect(metadataIdx).toBeGreaterThan(-1)

      const metadataBlock = APP_SOURCE.slice(metadataIdx, metadataIdx + 2000)
      expect(metadataBlock).toContain('responseTime')
    })

    it('must format responseTime as seconds (e.g. 2.4s)', () => {
      const metadataIdx = APP_SOURCE.indexOf("message.role === 'assistant' && (message.cost")
      expect(metadataIdx).toBeGreaterThan(-1)

      const metadataBlock = APP_SOURCE.slice(metadataIdx, metadataIdx + 2000)
      // Should divide ms to seconds: responseTime / 1000 or similar
      expect(metadataBlock).toMatch(/responseTime.*1000|toFixed/)
    })

    it('must use Clock icon next to response time', () => {
      const metadataIdx = APP_SOURCE.indexOf("message.role === 'assistant' && (message.cost")
      const metadataBlock = APP_SOURCE.slice(metadataIdx, metadataIdx + 2000)
      expect(metadataBlock).toContain('Clock')
    })
  })

  // ==========================================================================
  // 4. Metadata row must render timestamp with full date + year
  // ==========================================================================
  describe('Metadata row — timestamp display', () => {
    it('must import Calendar icon from lucide-react', () => {
      expect(APP_SOURCE).toMatch(/import[\s\S]*Calendar[\s\S]*from\s+['"]lucide-react['"]/)
    })

    it('must display timestamp in the metadata section', () => {
      const metadataIdx = APP_SOURCE.indexOf("message.role === 'assistant' && (message.cost")
      const metadataBlock = APP_SOURCE.slice(metadataIdx, metadataIdx + 2000)
      expect(metadataBlock).toContain('timestamp')
    })

    it('must format timestamp with day, month name, year, and time', () => {
      const metadataIdx = APP_SOURCE.indexOf("message.role === 'assistant' && (message.cost")
      const metadataBlock = APP_SOURCE.slice(metadataIdx, metadataIdx + 2500)
      // Must use toLocaleDateString or toLocaleString or Intl.DateTimeFormat
      // with day, month (short/long), year components
      expect(metadataBlock).toMatch(/toLocale|DateTimeFormat|month.*day.*year|day.*month.*year/)
    })

    it('must use Calendar icon next to timestamp', () => {
      const metadataIdx = APP_SOURCE.indexOf("message.role === 'assistant' && (message.cost")
      const metadataBlock = APP_SOURCE.slice(metadataIdx, metadataIdx + 2500)
      expect(metadataBlock).toContain('Calendar')
    })
  })

  // ==========================================================================
  // 5. Metadata condition must include responseTime and timestamp
  // ==========================================================================
  describe('Metadata visibility condition', () => {
    it('metadata row condition must check for responseTime or timestamp', () => {
      const metadataIdx = APP_SOURCE.indexOf("message.role === 'assistant' && (message.cost")
      const conditionLine = APP_SOURCE.slice(metadataIdx, metadataIdx + 200)
      expect(conditionLine).toMatch(/responseTime|timestamp/)
    })
  })

  // ==========================================================================
  // 6. History persistence must include responseTime and timestamp
  // ==========================================================================
  describe('History persistence', () => {
    it('must pass responseTime when saving assistant message to history', () => {
      const assistantSaveMarker = "role: 'assistant'"
      const firstIdx = APP_SOURCE.indexOf('history.addMessage(threadId')
      const secondIdx = APP_SOURCE.indexOf('history.addMessage(threadId', firstIdx + 1)
      expect(secondIdx).toBeGreaterThan(-1)
      const block = APP_SOURCE.slice(secondIdx, secondIdx + 400)
      expect(block).toContain(assistantSaveMarker)
      expect(block).toContain('responseTime')
    })

    it('must pass timestamp when saving assistant message to history', () => {
      const firstIdx = APP_SOURCE.indexOf('history.addMessage(threadId')
      const secondIdx = APP_SOURCE.indexOf('history.addMessage(threadId', firstIdx + 1)
      expect(secondIdx).toBeGreaterThan(-1)
      const block = APP_SOURCE.slice(secondIdx, secondIdx + 400)
      expect(block).toContain('timestamp')
    })
  })

  // ==========================================================================
  // 7. Interview mode already has responseTime — verify timestamp consistency
  // ==========================================================================
  describe('InterviewPanel consistency', () => {
    it('InterviewPanel AIResponse interface must have timestamp', () => {
      const interfaceBlock = INTERVIEW_SOURCE.slice(
        INTERVIEW_SOURCE.indexOf('interface AIResponse {'),
        INTERVIEW_SOURCE.indexOf('}', INTERVIEW_SOURCE.indexOf('interface AIResponse {')) + 1
      )
      expect(interfaceBlock).toContain('timestamp')
    })

    it('InterviewPanel AIResponse interface must have responseTime', () => {
      const interfaceBlock = INTERVIEW_SOURCE.slice(
        INTERVIEW_SOURCE.indexOf('interface AIResponse {'),
        INTERVIEW_SOURCE.indexOf('}', INTERVIEW_SOURCE.indexOf('interface AIResponse {')) + 1
      )
      expect(interfaceBlock).toContain('responseTime')
    })

    it('InterviewPanel must display timestamp in metadata row', () => {
      const metaIdx = INTERVIEW_SOURCE.indexOf('resp.cost || resp.tokensIn')
      expect(metaIdx).toBeGreaterThan(-1)
      const metaBlock = INTERVIEW_SOURCE.slice(metaIdx, metaIdx + 2000)
      expect(metaBlock).toContain('timestamp')
    })
  })

  // ==========================================================================
  // 8. Regression: existing cost + token display must remain
  // ==========================================================================
  describe('Regression — existing metadata', () => {
    it('must still display cost with Coins icon', () => {
      const metadataIdx = APP_SOURCE.indexOf("message.role === 'assistant' && (message.cost")
      const metadataBlock = APP_SOURCE.slice(metadataIdx, metadataIdx + 2500)
      expect(metadataBlock).toContain('Coins')
      expect(metadataBlock).toContain('toFixed(4)')
    })

    it('must still display token counts with arrows', () => {
      const metadataIdx = APP_SOURCE.indexOf("message.role === 'assistant' && (message.cost")
      const metadataBlock = APP_SOURCE.slice(metadataIdx, metadataIdx + 2500)
      expect(metadataBlock).toContain('tokensIn')
      expect(metadataBlock).toContain('tokensOut')
      expect(metadataBlock).toContain('toLocaleString()')
    })

    it('must still display model badge', () => {
      const metadataIdx = APP_SOURCE.indexOf("message.role === 'assistant' && (message.cost")
      const metadataBlock = APP_SOURCE.slice(metadataIdx, metadataIdx + 2500)
      expect(metadataBlock).toContain('message.model')
    })
  })
})
