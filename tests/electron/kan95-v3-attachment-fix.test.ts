import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

/**
 * KAN-95 v3: Server Error When Sending Message With File Attachment
 *
 * Root causes (6 total, confirmed via Sentry + code review + Extension analysis):
 *
 * 1. CRITICAL: analyzeTaskComplexity crashes on array content — TypeError: lastMessage.toLowerCase()
 *    (Sentry: AIBUDDY-API-2, 3 events, last 2026-03-03). Blocks ALL image requests.
 * 2. transformImagesForProvider has no fallback for missing source/media_type/data
 * 3. Streaming handler has no provider rotation (single-provider failure = error)
 * 4. No per-image size cap after compression — single image can blow 900KB limit
 * 5. Extension strips images to "[Image content]" placeholder before sending (aibuddy.ts:222)
 * 6. Desktop Sentry sends 0 events (monitoring blind spot)
 */

const APP_SOURCE = fs.readFileSync(
  path.resolve(__dirname, '../../renderer/src/App.tsx'),
  'utf-8'
)

const HANDLER_SOURCE = fs.readFileSync(
  path.resolve(__dirname, '../../../aws-api/src/handler.js'),
  'utf-8'
)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('KAN-95 v3: Server Error When Sending Message With File Attachment', () => {

  // ── Fix 1: transformImagesForProvider defensive fallbacks ──

  describe('transformImagesForProvider defensive fallbacks', () => {
    function getTransformFn(): string {
      const start = HANDLER_SOURCE.indexOf('function transformImagesForProvider(')
      const end = HANDLER_SOURCE.indexOf('\n}', start + 100) + 2
      return HANDLER_SOURCE.slice(start, end)
    }

    it('must have media_type fallback to image/jpeg for OpenAI conversion', () => {
      const fn = getTransformFn()
      expect(fn).toMatch(/media_type\s*\|\|\s*['"]image\/jpeg['"]/)
    })

    it('must have data fallback — skip image block if source.data is missing', () => {
      const fn = getTransformFn()
      // Must filter out image blocks with no data, or use a safe fallback
      expect(fn).toMatch(/source\.data|\.data\b/)
      // Should use optional chaining or a guard to prevent undefined data
      expect(fn).toMatch(/source\?\.data|\.data\s*\|\|/)
    })

    it('must handle missing part.source gracefully for OpenAI', () => {
      const fn = getTransformFn()
      // If part.type === 'image' but part.source is missing,
      // must not pass Anthropic format block to OpenAI
      // Should either skip the block or provide a fallback
      expect(fn).toMatch(/part\.source\s*\?\.|!part\.source|source\s*&&/)
    })

    it('must not produce data:undefined URLs', () => {
      const fn = getTransformFn()
      // The data URL template must use fallbacks to prevent undefined values
      expect(fn).toMatch(/media_type\s*\|\|\s*['"]image\/jpeg['"]/)
      expect(fn).toMatch(/\.data\s*\|\|/)
    })

    it('must filter out invalid image blocks that have no usable data', () => {
      const fn = getTransformFn()
      // Must filter blocks with missing source/data before passing to provider
      expect(fn).toContain('.filter')
      expect(fn).toMatch(/part\.source\s*&&/)
    })
  })

  // ── Fix 2: Streaming handler provider rotation ──

  describe('Streaming handler provider rotation', () => {
    function getStreamCore(): string {
      const start = HANDLER_SOURCE.indexOf('async function _streamInferenceCore(')
      const end = HANDLER_SOURCE.indexOf('\nlet _inferenceStreamHandler')
      return HANDLER_SOURCE.slice(start, end)
    }

    it('streaming handler must attempt provider rotation on failure', () => {
      const fn = getStreamCore()
      expect(fn).toMatch(/PROVIDER_ROTATION_ORDER|providerOrder/)
    })

    it('streaming handler must try at least 2 providers for image requests', () => {
      const fn = getStreamCore()
      expect(fn).toMatch(/for\s*\(.*providerOrder|for\s*\(.*tryOrder/)
    })

    it('streaming handler must catch provider errors and try next', () => {
      const fn = getStreamCore()
      // Must have try-catch around callSingleProviderStream with rotation
      const tryCatchCount = (fn.match(/catch\s*\(/g) || []).length
      expect(tryCatchCount).toBeGreaterThanOrEqual(2)
      // Must reference isProviderCreditError for rotation decisions
      expect(fn).toContain('isProviderCreditError')
    })
  })

  // ── Fix 3: Per-image size cap after compression ──

  describe('Per-image size cap after compression', () => {
    it('must define a MAX_IMAGE_BASE64_SIZE constant', () => {
      expect(APP_SOURCE).toMatch(/MAX_IMAGE_BASE64_SIZE\s*=/)
    })

    it('MAX_IMAGE_BASE64_SIZE must be reasonable (300-600KB)', () => {
      const match = APP_SOURCE.match(/MAX_IMAGE_BASE64_SIZE\s*=\s*(\d+)\s*\*\s*(\d+)/)
      if (match) {
        const sizeBytes = parseInt(match[1]) * parseInt(match[2])
        expect(sizeBytes).toBeGreaterThanOrEqual(300 * 1024)
        expect(sizeBytes).toBeLessThanOrEqual(600 * 1024)
      } else {
        const directMatch = APP_SOURCE.match(/MAX_IMAGE_BASE64_SIZE\s*=\s*(\d+)/)
        expect(directMatch).toBeTruthy()
        if (directMatch) {
          const size = parseInt(directMatch[1])
          expect(size).toBeGreaterThanOrEqual(300 * 1024)
          expect(size).toBeLessThanOrEqual(600 * 1024)
        }
      }
    })

    it('must re-compress image at lower quality when base64 exceeds cap', () => {
      // After initial compression, if base64.length > MAX_IMAGE_BASE64_SIZE,
      // should re-compress at a lower quality or smaller dimensions
      expect(APP_SOURCE).toMatch(/MAX_IMAGE_BASE64_SIZE|recompress|secondPass|lowerQuality/)
      expect(APP_SOURCE).toMatch(/base64\.length\s*>\s*MAX_IMAGE_BASE64_SIZE/)
    })
  })

  // ── Fix 4: Production handler path (was pointing at removed dir) ──

  describe('Production handler is aws-api/src/handler.js', () => {
    it('handler.js must export transformImagesForProvider', () => {
      expect(HANDLER_SOURCE).toContain('module.exports.transformImagesForProvider')
    })

    it('handler.js must export callProviderWithRotation', () => {
      expect(HANDLER_SOURCE).toContain('module.exports.callProviderWithRotation')
    })

    it('handler.js must export inferenceStream', () => {
      expect(HANDLER_SOURCE).toContain('module.exports.inferenceStream')
    })

    it('handler.js must have callSingleProviderStream function', () => {
      expect(HANDLER_SOURCE).toContain('async function callSingleProviderStream(')
    })
  })

  // ── Fix 5: Frontend image format and payload ──

  describe('Frontend image handling robustness', () => {
    it('must send images in Anthropic format (type: image, source: base64)', () => {
      const pattern = /type:\s*['"]image['"][\s\S]*?source:\s*\{[\s\S]*?type:\s*['"]base64['"]/
      expect(APP_SOURCE).toMatch(pattern)
    })

    it('must use userMessage.content for image message text (not trimmedInput)', () => {
      expect(APP_SOURCE).toMatch(/KAN-95 FIX.*userMessage\.content/)
    })

    it('must set has_images flag in request body', () => {
      expect(APP_SOURCE).toMatch(/has_images:\s*hasImages/)
    })

    it('must strip old images from history when payload exceeds limit', () => {
      expect(APP_SOURCE).toContain("part.type !== 'image'")
    })

    it('must show toast when payload still too large after all truncation', () => {
      expect(APP_SOURCE).toContain('Message too large')
    })
  })

  // ── Backend: transformImagesForProvider correctness ──

  describe('Backend: transformImagesForProvider format correctness', () => {
    it('must convert Anthropic image blocks to OpenAI image_url format', () => {
      expect(HANDLER_SOURCE).toContain("type: 'image_url'")
      expect(HANDLER_SOURCE).toContain('image_url:')
    })

    it('must construct data URL from base64 source', () => {
      expect(HANDLER_SOURCE).toMatch(/data:.*media_type.*base64/)
    })

    it('DeepSeek must strip images and keep only text parts', () => {
      const fn = HANDLER_SOURCE.slice(
        HANDLER_SOURCE.indexOf('function transformImagesForProvider('),
        HANDLER_SOURCE.indexOf('\n}', HANDLER_SOURCE.indexOf('function transformImagesForProvider(') + 100) + 2
      )
      expect(fn).toContain("provider === 'deepseek'")
      expect(fn).toContain("part.type === 'text'")
    })

    it('Anthropic format must pass through unchanged', () => {
      const fn = HANDLER_SOURCE.slice(
        HANDLER_SOURCE.indexOf('function transformImagesForProvider('),
        HANDLER_SOURCE.indexOf('\n}', HANDLER_SOURCE.indexOf('function transformImagesForProvider(') + 100) + 2
      )
      // Default case returns msg unchanged (for Anthropic)
      expect(fn).toContain('return msg')
    })
  })

  // ── Backend: Streaming handler error handling ──

  describe('Backend: Streaming handler error resilience', () => {
    it('streaming handler must write error events on failure', () => {
      const streamSection = HANDLER_SOURCE.slice(
        HANDLER_SOURCE.indexOf('async function _streamInferenceCore('),
        HANDLER_SOURCE.indexOf('\nlet _inferenceStreamHandler')
      )
      expect(streamSection).toContain("type: 'error'")
      expect(streamSection).toContain('responseStream.write')
    })

    it('streaming handler must close stream on error', () => {
      const streamSection = HANDLER_SOURCE.slice(
        HANDLER_SOURCE.indexOf('async function _streamInferenceCore('),
        HANDLER_SOURCE.indexOf('\nlet _inferenceStreamHandler')
      )
      expect(streamSection).toContain('responseStream.end()')
    })

    it('must have try-catch around callSingleProviderStream', () => {
      const streamSection = HANDLER_SOURCE.slice(
        HANDLER_SOURCE.indexOf('async function _streamInferenceCore('),
        HANDLER_SOURCE.indexOf('\nlet _inferenceStreamHandler')
      )
      // callSingleProviderStream must be inside a try block with rotation
      const callIndex = streamSection.indexOf('callSingleProviderStream')
      expect(callIndex).toBeGreaterThan(-1)
      const before = streamSection.slice(Math.max(0, callIndex - 500), callIndex)
      expect(before).toContain('try')
    })
  })

  // ── Integration: full image pipeline ──

  describe('Integration: end-to-end image pipeline', () => {
    it('image compression always outputs image/jpeg', () => {
      expect(APP_SOURCE).toContain("mimeType: 'image/jpeg'")
      expect(APP_SOURCE).toContain("canvas.toDataURL('image/jpeg'")
    })

    it('payload size check happens before inference fetch', () => {
      const fetchIndex = APP_SOURCE.lastIndexOf('response = await fetch(AIBUDDY_API_INFERENCE_URL')
      const sizeCheck = APP_SOURCE.indexOf('payloadSize > MAX_PAYLOAD_BYTES')
      expect(sizeCheck).toBeGreaterThan(0)
      expect(fetchIndex).toBeGreaterThan(0)
      expect(sizeCheck).toBeLessThan(fetchIndex)
    })

    it('streaming fallback works when stream fails with image payload', () => {
      // After streaming fails, non-streaming fetch must use same serializedBody
      expect(APP_SOURCE).toContain('!streamingSucceeded')
      expect(APP_SOURCE).toContain('body: serializedBody')
    })

    it('default text provided when user sends only images', () => {
      expect(APP_SOURCE).toContain('Please analyze this image')
    })

    it('HTTP 500/502/503 responses display server error toast', () => {
      expect(APP_SOURCE).toContain('response.status === 500')
      expect(APP_SOURCE).toContain('response.status === 502')
      expect(APP_SOURCE).toContain('response.status === 503')
      expect(APP_SOURCE).toContain('Server error')
    })

    it('HTTP 413 handled separately from general server errors', () => {
      expect(APP_SOURCE).toContain('response.status === 413')
      expect(APP_SOURCE).toContain('Message too large for server')
    })
  })

  // ── Root cause #1: analyzeTaskComplexity TypeError on array content ──

  describe('Root cause #1: analyzeTaskComplexity array content safety', () => {
    function getAnalyzeFunction(): string {
      const start = HANDLER_SOURCE.indexOf('function analyzeTaskComplexity(')
      const end = HANDLER_SOURCE.indexOf('\n}', start + 200)
      return HANDLER_SOURCE.slice(start, end + 2)
    }

    it('must extract text from array content before calling toLowerCase()', () => {
      const fn = getAnalyzeFunction()
      // Must handle the case where content is an array (image messages)
      expect(fn).toMatch(/typeof.*content.*===.*'string'|Array\.isArray|\.filter|\.map/)
    })

    it('must not call toLowerCase() directly on non-string content', () => {
      const fn = getAnalyzeFunction()
      // The raw content should be safe-extracted before toLowerCase
      const lines = fn.split('\n')
      const toLowerLine = lines.find(l => l.includes('.toLowerCase()'))
      // The variable used in toLowerCase must come from a safe extraction
      expect(fn).toMatch(/typeof\s+\w+\s*===\s*['"]string['"]/)
    })

    it('must handle content arrays with text + image blocks', () => {
      const fn = getAnalyzeFunction()
      // Must extract text from [{type:'text', text:'...'}, {type:'image', ...}]
      expect(fn).toMatch(/\.text\b|type\s*===\s*['"]text['"]/)
    })
  })

  // ── Root cause #5: Extension strips images ──

  describe('Root cause #5: Extension must preserve image blocks', () => {
    let EXT_SOURCE = ''
    try {
      EXT_SOURCE = fs.readFileSync(
        path.resolve(__dirname, '../../../extension/src/api/providers/aibuddy.ts'),
        'utf-8'
      )
    } catch { /* Extension source may not exist in all environments */ }

    it('Extension aibuddy.ts must exist', () => {
      expect(EXT_SOURCE.length).toBeGreaterThan(0)
    })

    it('must preserve image content blocks in request body (not replace with placeholder)', () => {
      if (!EXT_SOURCE) return
      // The message mapping must keep image blocks as structured objects
      // when content is an array containing images, NOT flatten to "[Image content]"
      expect(EXT_SOURCE).toMatch(/type.*===.*['"]image['"][\s\S]*?source|preserveImageBlocks|imageBlocks/)
    })

    it('must send has_images flag based on actual image content', () => {
      if (!EXT_SOURCE) return
      expect(EXT_SOURCE).toContain('has_images')
    })

    it('must include image blocks in the messages array sent to backend', () => {
      if (!EXT_SOURCE) return
      // After processing, messages with images should retain array content format
      // not be flattened to strings
      expect(EXT_SOURCE).toMatch(/content:\s*\[|imageBlocks|preserveImages/)
    })
  })
})
