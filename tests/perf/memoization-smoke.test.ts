/**
 * Memoization Smoke Tests — Regression Guard
 *
 * Validates that App.tsx uses useMemo/useCallback to prevent keystroke lag.
 * Root cause: every setInput() re-rendered all messages (ReactMarkdown +
 * SyntaxHighlighter) on every keystroke in a 4,400-line component with
 * zero memoization.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const appPath = resolve(__dirname, '../../renderer/src/App.tsx')
const appContent = readFileSync(appPath, 'utf-8')

describe('Typing Performance — Memoization Regression Guard', () => {
  it('App.tsx must import useMemo from React', () => {
    expect(appContent).toMatch(/import.*useMemo.*from\s+['"]react['"]/)
  })

  it('App.tsx must import useCallback from React', () => {
    expect(appContent).toMatch(/import.*useCallback.*from\s+['"]react['"]/)
  })

  it('App.tsx must memoize message list with useMemo (renderedMessages)', () => {
    expect(appContent).toContain('const renderedMessages = useMemo(')
  })

  it('App.tsx must memoize markdown components with useMemo', () => {
    expect(appContent).toContain('const markdownComponents = useMemo(')
  })

  it('App.tsx must memoize copyToClipboard with useCallback', () => {
    expect(appContent).toMatch(/const copyToClipboard = useCallback/)
  })

  it('App.tsx must memoize handlePasteImage with useCallback', () => {
    expect(appContent).toMatch(/const handlePasteImage = useCallback/)
  })

  it('App.tsx must memoize handleRegenerate with useCallback', () => {
    expect(appContent).toMatch(/const handleRegenerate = useCallback/)
  })

  it('App.tsx must memoize handleFeedback with useCallback', () => {
    expect(appContent).toMatch(/const handleFeedback = useCallback/)
  })

  it('App.tsx must use renderedMessages in JSX instead of inline messages.map', () => {
    expect(appContent).toContain('{renderedMessages}')
  })

  it('App.tsx must memoize collapsed terminal lines', () => {
    expect(appContent).toContain('const collapsedTerminalLines = useMemo(')
  })
})
