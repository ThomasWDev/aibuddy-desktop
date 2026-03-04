import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

/**
 * KAN-95: Server Error When Sending Message With File Attachment
 *
 * Root cause: Multiple issues in the attachment → API request → backend pipeline
 * that cause 500 errors when images are included in messages.
 *
 * Tests verify:
 * 1. Image content block uses correct Anthropic format (type: 'image')
 * 2. Payload auto-truncation strips old images before sending
 * 3. Server error responses include diagnostic details
 * 4. Image compression always outputs JPEG with correct mimeType
 * 5. Backend properly converts Anthropic image format to OpenAI format
 * 6. media_type fallback prevents malformed data URLs
 */

const APP_SOURCE = fs.readFileSync(
  path.resolve(__dirname, '../../renderer/src/App.tsx'),
  'utf-8'
)

let V1_HANDLER_SOURCE = ''
try {
  V1_HANDLER_SOURCE = fs.readFileSync(
    path.resolve(__dirname, '../../../../aibuddyapi/src/handler.js'),
    'utf-8'
  )
} catch {
  // Backend repo may not be available in all environments (CI, etc.)
}

let V2_HANDLER_SOURCE = ''
try {
  V2_HANDLER_SOURCE = fs.readFileSync(
    path.resolve(__dirname, '../../../../aibuddyapi/src/v2/handler.js'),
    'utf-8'
  )
} catch {
  // v2 handler may not exist in all environments
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('KAN-95: Server Error When Sending Message With File Attachment', () => {

  describe('Image content block format (client → server)', () => {
    it('must send images in Anthropic format with type "image"', () => {
      // The desktop sends images as Anthropic content blocks, NOT OpenAI image_url
      const imageBlockPattern = /type:\s*['"]image['"][\s\S]*?source:\s*\{[\s\S]*?type:\s*['"]base64['"]/
      expect(APP_SOURCE).toMatch(imageBlockPattern)
    })

    it('must include media_type in image source blocks', () => {
      // Every image block must have media_type for proper data URL construction
      const mediaTypePattern = /media_type:\s*img\.mimeType/
      expect(APP_SOURCE).toMatch(mediaTypePattern)
    })

    it('must include base64 data in image source blocks', () => {
      const base64Pattern = /data:\s*img\.base64/
      expect(APP_SOURCE).toMatch(base64Pattern)
    })

    it('must set has_images flag in request body when images present', () => {
      const hasImagesPattern = /has_images:\s*hasImages/
      expect(APP_SOURCE).toMatch(hasImagesPattern)
    })

    it('must use userMessage.content (not trimmedInput) for image messages', () => {
      // KAN-95 FIX: When images are attached, the text content must come from
      // userMessage.content which includes code files, not the raw trimmedInput
      const fixPattern = /KAN-95 FIX.*userMessage\.content/
      expect(APP_SOURCE).toMatch(fixPattern)
    })
  })

  describe('Payload auto-truncation with images', () => {
    it('MAX_PAYLOAD_BYTES must be defined', () => {
      expect(APP_SOURCE).toContain('MAX_PAYLOAD_BYTES')
    })

    it('must strip old images from conversation history when payload exceeds limit', () => {
      // KAN-95 FIX: Use 'image' type (Anthropic format), not 'image_url'
      const stripPattern = /part\.type\s*!==\s*['"]image['"]/
      expect(APP_SOURCE).toMatch(stripPattern)
    })

    it('must preserve the latest user message images (only strip older ones)', () => {
      // The filter only applies to messages BEFORE the last one (idx < length - 1)
      expect(APP_SOURCE).toContain('idx < conversationMsgs.length - 1')
      // And strips image blocks from those older messages
      expect(APP_SOURCE).toContain("part.type !== 'image'")
    })

    it('must truncate long text content in history messages', () => {
      const truncatePattern = /content\.substring\(0,\s*2000\)/
      expect(APP_SOURCE).toMatch(truncatePattern)
    })

    it('must show user-friendly error when payload still too large after truncation', () => {
      expect(APP_SOURCE).toContain('Message too large')
      expect(APP_SOURCE).toContain('removing images')
    })
  })

  describe('Server error response handling', () => {
    it('must handle HTTP 500 with a user-friendly toast', () => {
      expect(APP_SOURCE).toContain('response.status === 500')
      expect(APP_SOURCE).toContain('Server error')
    })

    it('must handle HTTP 502 (Bad Gateway)', () => {
      expect(APP_SOURCE).toContain('response.status === 502')
    })

    it('must handle HTTP 503 (Service Unavailable)', () => {
      expect(APP_SOURCE).toContain('response.status === 503')
    })

    it('must handle HTTP 413 (Payload Too Large) separately from general server errors', () => {
      expect(APP_SOURCE).toContain('response.status === 413')
      expect(APP_SOURCE).toContain('Message too large for server')
    })

    it('must log server error status to Sentry breadcrumbs', () => {
      // Server errors should be tracked via addBreadcrumb for Sentry
      const breadcrumbPattern = /addBreadcrumb\(['"]Server error['"]/
      expect(APP_SOURCE).toMatch(breadcrumbPattern)
    })

    it('must include response status in error breadcrumb', () => {
      const statusInBreadcrumb = /addBreadcrumb\(['"]Server error['"].*status:\s*response\.status/
      expect(APP_SOURCE).toMatch(statusInBreadcrumb)
    })
  })

  describe('Image compression pipeline', () => {
    it('must compress images before sending (compressBase64Image function exists)', () => {
      expect(APP_SOURCE).toContain('compressBase64Image')
    })

    it('must limit image dimensions to MAX_IMAGE_DIMENSION', () => {
      expect(APP_SOURCE).toContain('MAX_IMAGE_DIMENSION')
      const dimensionPattern = /MAX_IMAGE_DIMENSION\s*=\s*1920/
      expect(APP_SOURCE).toMatch(dimensionPattern)
    })

    it('must convert all images to JPEG at defined quality', () => {
      expect(APP_SOURCE).toContain('JPEG_QUALITY')
      expect(APP_SOURCE).toContain("canvas.toDataURL('image/jpeg'")
    })

    it('compression must always resolve to image/jpeg mimeType', () => {
      const resolvePattern = /resolve\(\{\s*base64.*mimeType:\s*['"]image\/jpeg['"]/
      expect(APP_SOURCE).toMatch(resolvePattern)
    })
  })

  describe('Backend: v1 handler image conversion (Anthropic → OpenAI)', () => {
    it('callOpenAIAPI must exist in v1 handler', () => {
      if (!V1_HANDLER_SOURCE) return
      expect(V1_HANDLER_SOURCE).toContain('async function callOpenAIAPI')
    })

    it('must convert Anthropic image blocks to OpenAI image_url format', () => {
      if (!V1_HANDLER_SOURCE) return
      expect(V1_HANDLER_SOURCE).toContain("type: 'image_url'")
      expect(V1_HANDLER_SOURCE).toContain('image_url:')
    })

    it('must construct proper data URL from base64 source', () => {
      if (!V1_HANDLER_SOURCE) return
      const dataUrlPattern = /`data:\$\{block\.source\.media_type.*\};base64,\$\{block\.source\.data\}`/
      expect(V1_HANDLER_SOURCE).toMatch(dataUrlPattern)
    })

    it('must handle both image and image_url input types', () => {
      if (!V1_HANDLER_SOURCE) return
      const dualTypePattern = /block\.type\s*===\s*['"]image['"]\s*\|\|\s*block\.type\s*===\s*['"]image_url['"]/
      expect(V1_HANDLER_SOURCE).toMatch(dualTypePattern)
    })

    it('must provide media_type fallback for malformed image blocks', () => {
      if (!V1_HANDLER_SOURCE) return
      const fallbackPattern = /block\.source\.media_type\s*\|\|\s*['"]image\/jpeg['"]/
      expect(V1_HANDLER_SOURCE).toMatch(fallbackPattern)
    })
  })

  describe('Backend: v2 handler image conversion', () => {
    it('v2 callOpenAI must convert Anthropic image blocks to OpenAI format', () => {
      if (!V2_HANDLER_SOURCE) return // Skip if v2 not available

      // v2 handler must NOT just pass through image blocks as-is
      // It must convert { type: 'image', source: {...} } to { type: 'image_url', ... }
      const v2OpenAIFn = V2_HANDLER_SOURCE.slice(
        V2_HANDLER_SOURCE.indexOf('async function callOpenAI('),
        V2_HANDLER_SOURCE.indexOf('async function callDeepSeek(')
      )

      expect(v2OpenAIFn).toContain("type: 'image_url'")
      expect(v2OpenAIFn).toContain('image_url:')
    })

    it('v2 must construct data URL from base64 source', () => {
      if (!V2_HANDLER_SOURCE) return

      const v2OpenAIFn = V2_HANDLER_SOURCE.slice(
        V2_HANDLER_SOURCE.indexOf('async function callOpenAI('),
        V2_HANDLER_SOURCE.indexOf('async function callDeepSeek(')
      )

      // Must build data:${media_type};base64,${data} URL
      expect(v2OpenAIFn).toMatch(/data:.*media_type.*base64/)
    })

    it('v2 must include media_type fallback', () => {
      if (!V2_HANDLER_SOURCE) return

      const v2OpenAIFn = V2_HANDLER_SOURCE.slice(
        V2_HANDLER_SOURCE.indexOf('async function callOpenAI('),
        V2_HANDLER_SOURCE.indexOf('async function callDeepSeek(')
      )

      expect(v2OpenAIFn).toMatch(/media_type\s*\|\|\s*['"]image\/jpeg['"]/)
    })
  })

  describe('Backend: DeepSeek fallback gracefully drops images', () => {
    it('callDeepSeekAPI must filter out image blocks from content arrays', () => {
      if (!V1_HANDLER_SOURCE) return
      const deepseekFn = V1_HANDLER_SOURCE.slice(
        V1_HANDLER_SOURCE.indexOf('async function callDeepSeekAPI('),
        V1_HANDLER_SOURCE.indexOf('async function callDeepSeekAPI(') + 2000
      )

      expect(deepseekFn).toContain("block.type === 'text'")
      expect(deepseekFn).toContain('.filter(')
    })
  })

  describe('Integration: end-to-end image message flow', () => {
    it('compressed image must have correct mimeType for backend conversion', () => {
      // The ImageAttachment type allows specific mimeTypes
      const mimeTypeUnion = APP_SOURCE.match(/mimeType:\s*['"]image\/jpeg['"]\s*\|\s*['"]image\/png['"]/);
      expect(mimeTypeUnion).toBeTruthy()
    })

    it('image content blocks for current message must include text fallback', () => {
      // When user sends only images with no text, a default text should be provided
      expect(APP_SOURCE).toContain('Please analyze this image')
    })

    it('payload size check must happen BEFORE the main inference fetch call', () => {
      // The payload size check + truncation must happen before the actual fetch()
      // to prevent sending oversized payloads that the server would reject.
      // We look for the LAST fetch call (the main inference one) and verify
      // the size check comes before it.
      const lastFetchIndex = APP_SOURCE.lastIndexOf('response = await fetch(AIBUDDY_API_INFERENCE_URL')
      const sizeCheckIndex = APP_SOURCE.indexOf('payloadSize > MAX_PAYLOAD_BYTES')
      expect(sizeCheckIndex).toBeGreaterThan(0)
      expect(lastFetchIndex).toBeGreaterThan(0)
      expect(sizeCheckIndex).toBeLessThan(lastFetchIndex)
    })
  })
})
