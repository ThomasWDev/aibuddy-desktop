/**
 * Payload Size & 413 Error Handling Tests (TDD)
 *
 * Root cause: The ALB returns 413 when payload exceeds 1MB (default).
 * Images sent as inline base64 easily exceed this.
 * The app had no 413 handler and tried to JSON.parse the HTML error page.
 *
 * Fixes:
 * 1. Image compression (resize + JPEG 80%)
 * 2. Client-side payload size check before fetch
 * 3. HTTP 413 status handler
 * 4. Content-type guard before response.json()
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const appPath = resolve(__dirname, '../../renderer/src/App.tsx')
const appContent = readFileSync(appPath, 'utf-8')

describe('Image Compression', () => {
  it('should define compressImage utility function', () => {
    expect(appContent).toContain('function compressImage')
  })

  it('should define MAX_IMAGE_DIMENSION constant', () => {
    expect(appContent).toContain('MAX_IMAGE_DIMENSION')
  })

  it('should define JPEG_QUALITY constant', () => {
    expect(appContent).toContain('JPEG_QUALITY')
  })

  it('should use canvas for image resizing', () => {
    expect(appContent).toContain("document.createElement('canvas')")
  })

  it('should convert to JPEG for compression', () => {
    expect(appContent).toMatch(/toDataURL.*image\/jpeg/)
  })

  it('paste handler should use compressImage', () => {
    const pasteSection = appContent.slice(
      appContent.indexOf('handlePasteImage'),
      appContent.indexOf('handlePasteImage') + 1000
    )
    expect(pasteSection).toContain('compressImage')
  })

  it('file select handler should use compressImage', () => {
    const legacyHandler = appContent.slice(
      appContent.indexOf('handleImageSelect = async'),
      appContent.indexOf('handleImageSelect = async') + 1000
    )
    expect(legacyHandler).toContain('compressImage')
  })

  it('Electron file select handler should use compressBase64Image', () => {
    const electronHandler = appContent.slice(
      appContent.indexOf('handleImageSelectWithElectron'),
      appContent.indexOf('handleImageSelectWithElectron') + 6000
    )
    expect(electronHandler).toContain('compressBase64Image')
  })
})

describe('Client-Side Payload Size Check', () => {
  it('should define MAX_PAYLOAD_BYTES constant', () => {
    expect(appContent).toContain('MAX_PAYLOAD_BYTES')
  })

  it('should check payload size before fetch', () => {
    expect(appContent).toContain('payloadSize > MAX_PAYLOAD_BYTES')
  })

  it('should log payload size', () => {
    expect(appContent).toContain('Request payload size')
  })
})

describe('HTTP 413 Error Handling', () => {
  it('should explicitly handle status 413', () => {
    expect(appContent).toContain('response.status === 413')
  })

  it('should show user-friendly message for 413', () => {
    expect(appContent).toMatch(/413.*too large|too large.*413/)
  })
})

describe('Content-Type Guard Before JSON Parse', () => {
  it('should check content-type in handleSubmit flow', () => {
    const handleSubmitSection = appContent.slice(appContent.indexOf('const handleSubmit = async'))
    expect(handleSubmitSection).toContain("response.headers.get('content-type')")
  })

  it('should handle non-JSON responses gracefully', () => {
    expect(appContent).toContain('Non-JSON response')
  })
})
