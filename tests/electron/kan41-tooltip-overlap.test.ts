import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const APP_TSX = fs.readFileSync(
  path.join(__dirname, '../../renderer/src/App.tsx'),
  'utf-8'
)

describe('KAN-41: Tooltip — No Overlap, Professional Styling', () => {
  it('tooltip should use compact padding (6px 12px), not oversized (12px 20px)', () => {
    expect(APP_TSX).toContain("padding: '6px 12px'")
    expect(APP_TSX).not.toContain("padding: '12px 20px'")
  })

  it('tooltip font should be 12px, not 16px', () => {
    expect(APP_TSX).toContain("fontSize: '12px'")
  })

  it('tooltip should use plain dark background, not gradient', () => {
    expect(APP_TSX).toContain("background: '#1e293b'")
    expect(APP_TSX).not.toContain("background: 'linear-gradient(135deg, #7c3aed, #ec4899)'")
  })

  it('tooltip should be non-interactive (pointer-events-none)', () => {
    expect(APP_TSX).toContain('pointer-events-none')
  })

  it('tooltip should use compact border radius (8px), not bubbly (16px)', () => {
    expect(APP_TSX).toContain("borderRadius: '8px'")
  })

  it('tooltip max-width should be 240px to prevent overlapping chat', () => {
    expect(APP_TSX).toContain("maxWidth: '240px'")
  })

  it('tooltip should NOT have fat 3px border', () => {
    expect(APP_TSX).not.toContain("border: '3px solid rgba(255,255,255,0.3)'")
  })

  it('tooltip should use whiteSpace nowrap for single-line display', () => {
    expect(APP_TSX).toContain("whiteSpace: 'nowrap'")
  })
})
