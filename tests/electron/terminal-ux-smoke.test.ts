/**
 * Smoke Tests: Terminal UX — Cursor-style Resizable Panel
 *
 * Prevents regression of:
 * - Fixed 300px terminal that couldn't be resized
 * - Unable to copy terminal output text
 * - Verbose raw shell output cluttering chat messages
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const appPath = resolve(__dirname, '../../renderer/src/App.tsx')
const appContent = readFileSync(appPath, 'utf-8')
const cssPath = resolve(__dirname, '../../renderer/src/index.css')
const cssContent = readFileSync(cssPath, 'utf-8')

describe('Terminal Panel — Drag-to-Resize Regression Guard', () => {
  it('App.tsx must have terminalHeight state for dynamic sizing', () => {
    expect(appContent).toContain('terminalHeight')
    expect(appContent).toMatch(/useState\(300\)/)
  })

  it('App.tsx must have terminalDragRef for mouse tracking', () => {
    expect(appContent).toContain('terminalDragRef')
  })

  it('App.tsx must have handleTerminalDragStart callback', () => {
    expect(appContent).toContain('handleTerminalDragStart')
    expect(appContent).toMatch(/const handleTerminalDragStart = useCallback/)
  })

  it('terminal height must be clamped between 120px and 75% viewport', () => {
    expect(appContent).toMatch(/Math\.max\(120/)
    expect(appContent).toMatch(/Math\.min\(window\.innerHeight \* 0\.75/)
  })

  it('must use dynamic terminalHeight in terminal panel style', () => {
    expect(appContent).toMatch(/height:.*terminalHeight/)
  })

  it('must NOT use hardcoded 300px for expanded terminal height', () => {
    const hardcoded300 = /height: terminalCollapsed \? 'auto' : '300px'/
    expect(appContent).not.toMatch(hardcoded300)
  })

  it('must have resize-handle-horizontal class on drag bar', () => {
    expect(appContent).toContain('resize-handle-horizontal')
  })

  it('drag handle must call handleTerminalDragStart on mousedown', () => {
    expect(appContent).toMatch(/onMouseDown=\{handleTerminalDragStart\}/)
  })

  it('footer padding must use dynamic terminalHeight', () => {
    expect(appContent).toMatch(/terminalHeight \+ 16/)
  })
})

describe('Terminal Panel — Text Selection & Copy', () => {
  it('terminal output must enable user-select: text', () => {
    expect(appContent).toMatch(/userSelect:\s*['"]text['"]/)
  })

  it('CSS must have terminal text selection override', () => {
    expect(cssContent).toContain('#terminal-output')
    expect(cssContent).toMatch(/user-select:\s*text\s*!important/)
  })

  it('must have a Copy button in terminal header', () => {
    expect(appContent).toMatch(/Copy all terminal output|navigator\.clipboard\.writeText/)
  })

  it('Copy button must copy all terminal output text', () => {
    expect(appContent).toMatch(/terminalOutput\.map\(l => l\.text\)\.join/)
  })
})

describe('Chat Output — Clean Summary (No Raw Shell Dump)', () => {
  it('must NOT dump full stdout into chat messages', () => {
    const verbosePattern = /executionOutput \+= `\*\*Output:\*\*\\n`/
    expect(appContent).not.toMatch(verbosePattern)
  })

  it('must show concise command count summary in chat', () => {
    expect(appContent).toMatch(/command\(s\) executed/)
  })

  it('must reference terminal panel for full output', () => {
    expect(appContent).toContain('See Terminal panel for full output')
  })

  it('must only show first line of stderr for failed commands', () => {
    expect(appContent).toMatch(/stderr\.split\('\\n'\)\[0\]\.substring\(0/)
  })
})

describe('Terminal CSS — Resize Handle Styling', () => {
  it('resize-handle-horizontal must have row-resize cursor', () => {
    expect(cssContent).toMatch(/\.resize-handle-horizontal\s*\{[^}]*cursor:\s*row-resize/)
  })

  it('resize-handle-horizontal must have hover state', () => {
    expect(cssContent).toContain('.resize-handle-horizontal:hover')
  })

  it('resize-handle-horizontal must have active state', () => {
    expect(cssContent).toContain('.resize-handle-horizontal:active')
  })
})
