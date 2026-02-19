/**
 * API Error Handling Smoke Tests — Regression Guards
 * Prevents regressions in HTTP error handling, content-type guards,
 * payload size checks, and image compression.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const appPath = resolve(__dirname, '../../renderer/src/App.tsx')
const appContent = readFileSync(appPath, 'utf-8')

describe('HTTP Error Status Handling', () => {
  it('handles 413 Request Entity Too Large', () => {
    expect(appContent).toContain('response.status === 413')
  })

  it('handles 504 Gateway Timeout', () => {
    expect(appContent).toContain('response.status === 504')
  })

  it('handles 401 Unauthorized', () => {
    expect(appContent).toContain('response.status === 401')
  })

  it('handles 429 Rate Limited', () => {
    expect(appContent).toContain('response.status === 429')
  })

  it('handles 500/502/503 Server Errors', () => {
    expect(appContent).toContain('response.status === 500')
    expect(appContent).toContain('response.status === 502')
    expect(appContent).toContain('response.status === 503')
  })
})

describe('Content-Type Guard', () => {
  it('checks content-type header before JSON parsing', () => {
    expect(appContent).toContain("response.headers.get('content-type')")
  })

  it('logs non-JSON responses for debugging', () => {
    expect(appContent).toContain('Non-JSON response')
  })

  it('does not crash on HTML error pages', () => {
    expect(appContent).toContain("includes('application/json')")
  })
})

describe('Payload Size Protection', () => {
  it('defines MAX_PAYLOAD_BYTES constant', () => {
    expect(appContent).toContain('MAX_PAYLOAD_BYTES')
  })

  it('checks payload size before sending', () => {
    expect(appContent).toContain('payloadSize > MAX_PAYLOAD_BYTES')
  })

  it('logs payload size for debugging', () => {
    expect(appContent).toContain('Request payload size')
  })

  it('shows user-friendly message for oversized payloads', () => {
    expect(appContent).toMatch(/too large.*removing.*images|removing.*images.*too large/i)
  })
})

describe('Image Compression Pipeline', () => {
  it('defines compressImage function', () => {
    expect(appContent).toContain('function compressImage')
  })

  it('defines compressBase64Image function', () => {
    expect(appContent).toContain('function compressBase64Image')
  })

  it('defines compressImageFromSrc core function', () => {
    expect(appContent).toContain('function compressImageFromSrc')
  })

  it('resizes to MAX_IMAGE_DIMENSION', () => {
    expect(appContent).toContain('MAX_IMAGE_DIMENSION')
  })

  it('uses canvas for compression', () => {
    expect(appContent).toContain("document.createElement('canvas')")
  })

  it('converts to JPEG for smaller payload', () => {
    expect(appContent).toMatch(/toDataURL.*image\/jpeg/)
  })

  it('applies JPEG_QUALITY setting', () => {
    expect(appContent).toContain('JPEG_QUALITY')
  })

  it('all image input paths use compression', () => {
    const pasteHandler = appContent.slice(appContent.indexOf('handlePasteImage'), appContent.indexOf('handlePasteImage') + 500)
    expect(pasteHandler).toContain('compressImage')

    const electronHandler = appContent.slice(appContent.indexOf('handleImageSelectWithElectron'), appContent.indexOf('handleImageSelectWithElectron') + 6000)
    expect(electronHandler).toContain('compressBase64Image')
  })
})

describe('Version Accuracy', () => {
  it('User-Agent fallback must NOT hardcode a version (uses "unknown")', () => {
    expect(appContent).toContain("'unknown'")
    expect(appContent).not.toMatch(/\$\{appVersion\s*\|\|\s*'\d+\.\d+\.\d+'/)
  })
})
