import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const APP_TSX = fs.readFileSync(
  path.join(__dirname, '../../renderer/src/App.tsx'),
  'utf-8'
)

describe('KAN-94: Header Color Palette — Professional and Subdued', () => {
  it('should NOT use over-saturated pink #ec4899 in header or buttons', () => {
    expect(APP_TSX).not.toContain("'#ec4899'")
    expect(APP_TSX).not.toContain('"#ec4899"')
  })

  it('should NOT use over-saturated orange #f97316 in header or buttons', () => {
    expect(APP_TSX).not.toContain("'#f97316'")
    expect(APP_TSX).not.toContain('"#f97316"')
  })

  it('should NOT use hot-pink box-shadow rgba(236, 72, 153)', () => {
    expect(APP_TSX).not.toContain('rgba(236, 72, 153')
  })

  it('should NOT use orange box-shadow rgba(249, 115, 22)', () => {
    expect(APP_TSX).not.toContain('rgba(249, 115, 22')
  })

  it('should use professional indigo #6366f1 for primary gradient', () => {
    expect(APP_TSX).toContain('#6366f1')
  })

  it('should use professional indigo #4f46e5 for gradient end', () => {
    expect(APP_TSX).toContain('#4f46e5')
  })

  it('should use subdued indigo shadow rgba(99, 102, 241', () => {
    expect(APP_TSX).toContain('rgba(99, 102, 241')
  })

  it('version badge should use muted slate colors, not bright purple', () => {
    expect(APP_TSX).toContain("background: 'linear-gradient(135deg, #475569, #334155)'")
  })
})
