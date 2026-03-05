import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

// ---------------------------------------------------------------------------
// KAN-177: [Mac] AI Claims to Read Directory but Does Not Return Folder
//          Structure or File List
//
// Root cause: After executing terminal commands, the chat message only shows
// a summary "X commands executed — Y passed" without including the actual
// stdout output. The full output is only in the Terminal panel, but users
// don't realize they need to check there. The AI appears to read the
// directory but shows nothing.
//
// Fix: Include a preview of each command's stdout in the chat execution
// summary (first N lines, truncated). This makes command output visible
// directly in the conversation without requiring the terminal panel.
// ---------------------------------------------------------------------------

const APP_SOURCE = fs.readFileSync(
  path.join(__dirname, '../../renderer/src/App.tsx'),
  'utf-8'
)

function getExecutionSummarySection(): string {
  const start = APP_SOURCE.indexOf('Build a concise execution summary')
  if (start === -1) return ''
  const end = APP_SOURCE.indexOf('const assistantMessage', start)
  return APP_SOURCE.slice(start, end)
}

describe('KAN-177: Command output must be visible in chat', () => {

  // ==========================================================================
  // 1. Execution summary must include stdout preview
  // ==========================================================================
  describe('stdout in execution summary', () => {
    it('must include result.stdout in the execution output', () => {
      const section = getExecutionSummarySection()
      expect(section).toMatch(/result\.stdout|r\.stdout|stdout/)
    })

    it('must truncate stdout to prevent massive chat messages', () => {
      const section = getExecutionSummarySection()
      expect(section).toMatch(/substring|slice|split.*\n.*slice|MAX_OUTPUT|maxOutput|truncat/i)
    })

    it('must show the command that was run alongside its output', () => {
      const section = getExecutionSummarySection()
      expect(section).toMatch(/result\.command|r\.command|command/)
    })
  })

  // ==========================================================================
  // 2. Successful command output must be shown (not just failures)
  // ==========================================================================
  describe('successful command output visibility', () => {
    it('must iterate over ALL results, not just failed ones', () => {
      const section = getExecutionSummarySection()
      const allResultsLoop = section.match(/for.*executionResults|executionResults\.forEach|executionResults\.map|for.*of.*executionResults/g) || []
      expect(allResultsLoop.length).toBeGreaterThanOrEqual(1)
    })
  })

  // ==========================================================================
  // 3. Regression guards
  // ==========================================================================
  describe('regression guards', () => {
    it('must still show pass/fail count', () => {
      const section = getExecutionSummarySection()
      expect(section).toContain('passed')
    })

    it('must still reference terminal panel for full output', () => {
      const section = getExecutionSummarySection()
      expect(section).toMatch(/[Tt]erminal/)
    })

    it('must still show failed command details', () => {
      const section = getExecutionSummarySection()
      expect(section).toMatch(/failed|exitCode/)
    })
  })
})
