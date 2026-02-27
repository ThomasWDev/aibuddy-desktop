import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const APP_TSX = fs.readFileSync(
  path.join(__dirname, '../../renderer/src/App.tsx'),
  'utf-8'
)

describe('KAN-100: AI Agent — Suggested Next Actions System', () => {
  it('should define suggestedActions as a memoized computation', () => {
    expect(APP_TSX).toContain('const suggestedActions = useMemo')
  })

  it('should not show actions while loading', () => {
    expect(APP_TSX).toContain('if (isLoading || messages.length === 0) return []')
  })

  it('should only show actions after assistant messages', () => {
    expect(APP_TSX).toContain("lastMsg?.role !== 'assistant'")
  })

  it('should suggest code-related actions when response contains code', () => {
    expect(APP_TSX).toContain("'Explain this code'")
    expect(APP_TSX).toContain("'Add tests for this'")
    expect(APP_TSX).toContain("'Optimize this'")
  })

  it('should suggest error-related actions when response mentions errors', () => {
    expect(APP_TSX).toContain("'Show me the root cause'")
    expect(APP_TSX).toContain("'How do I prevent this?'")
  })

  it('should suggest review actions when response mentions file creation', () => {
    expect(APP_TSX).toContain("'Review for issues'")
    expect(APP_TSX).toContain("'Add documentation'")
  })

  it('should provide generic fallback actions when no context matches', () => {
    expect(APP_TSX).toContain("'Tell me more'")
    expect(APP_TSX).toContain("'Give an example'")
    expect(APP_TSX).toContain("'Summarize this'")
  })

  it('should limit to 4 suggested actions maximum', () => {
    expect(APP_TSX).toContain('actions.slice(0, 4)')
  })

  it('should render action buttons with indigo styling', () => {
    expect(APP_TSX).toContain('text-indigo-300')
    expect(APP_TSX).toContain('rgba(99, 102, 241, 0.1)')
  })

  it('should set input value when an action is clicked', () => {
    expect(APP_TSX).toContain('setInput(action)')
  })

  it('should not render actions while isLoading is true', () => {
    expect(APP_TSX).toContain('suggestedActions.length > 0 && !isLoading')
  })
})
