import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

/**
 * KAN-33 v2: End-to-end streaming to eliminate perceived 2-minute wait
 *
 * Previous fix: Added elapsed timer, progress bar, reassurance messages.
 * Those are cosmetic — user still sees nothing for the entire AI generation time.
 *
 * Root cause: Frontend calls fetch() → response.json() and waits for the
 * FULL response. Backend calls AI providers without stream:true and
 * returns a single JSON blob. ALB buffers Lambda responses, so even
 * server-side streaming wouldn't help through the ALB path.
 *
 * Fix: Add a new streaming inference handler via Lambda Function URL
 * (bypasses ALB buffering). Backend streams SSE tokens from AI providers.
 * Frontend uses response.body.getReader() to display tokens incrementally.
 * Falls back to non-streaming ALB endpoint on failure.
 */

const PROJECT_ROOT = path.resolve(__dirname, '../..')

const APP_SOURCE = fs.readFileSync(
  path.join(PROJECT_ROOT, 'renderer/src/App.tsx'),
  'utf-8'
)

const URLS_SOURCE = fs.readFileSync(
  path.join(PROJECT_ROOT, 'src/constants/urls.ts'),
  'utf-8'
)

const HANDLER_SOURCE = fs.readFileSync(
  path.resolve(PROJECT_ROOT, '../aws-api/src/handler.js'),
  'utf-8'
)

const SERVERLESS_SOURCE = fs.readFileSync(
  path.resolve(PROJECT_ROOT, '../aws-api/serverless.yml'),
  'utf-8'
)

describe('KAN-33 v2: Streaming Response Implementation', () => {

  // ==========================================================================
  // 1. Backend: Streaming inference handler
  // ==========================================================================
  describe('Backend — streaming handler', () => {
    it('must export an inferenceStream handler', () => {
      expect(HANDLER_SOURCE).toMatch(/module\.exports\.inferenceStream|exports\.inferenceStream/)
    })

    it('must use awslambda.streamifyResponse for Lambda Response Streaming', () => {
      expect(HANDLER_SOURCE).toContain('streamifyResponse')
    })

    it('must call AI providers with stream: true', () => {
      const streamBlock = HANDLER_SOURCE.slice(
        HANDLER_SOURCE.indexOf('callSingleProviderStream'),
        HANDLER_SOURCE.indexOf('callSingleProviderStream') + 2000
      )
      expect(streamBlock).toContain('stream: true')
    })

    it('must write SSE-formatted events to the response stream', () => {
      expect(HANDLER_SOURCE).toMatch(/data:\s|text\/event-stream/)
    })

    it('must send a final message_stop event with usage/cost metadata', () => {
      expect(HANDLER_SOURCE).toMatch(/message_stop|stream_end|\[DONE\]/)
    })

    it('must handle Anthropic streaming (message_stream)', () => {
      const streamBlock = HANDLER_SOURCE.slice(
        HANDLER_SOURCE.indexOf('callSingleProviderStream'),
        HANDLER_SOURCE.indexOf('callSingleProviderStream') + 2000
      )
      expect(streamBlock).toMatch(/content_block_delta|\.on\(|for await/)
    })

    it('must handle OpenAI/DeepSeek streaming (chat.completions)', () => {
      const streamBlock = HANDLER_SOURCE.slice(
        HANDLER_SOURCE.indexOf('callSingleProviderStream'),
        HANDLER_SOURCE.indexOf('callSingleProviderStream') + 2000
      )
      expect(streamBlock).toMatch(/delta|choices/)
    })
  })

  // ==========================================================================
  // 2. Infrastructure: serverless.yml Function URL
  // ==========================================================================
  describe('Infrastructure — serverless.yml', () => {
    it('must define an inferenceStream function', () => {
      expect(SERVERLESS_SOURCE).toContain('inferenceStream')
    })

    it('must configure RESPONSE_STREAM invoke mode', () => {
      expect(SERVERLESS_SOURCE).toContain('RESPONSE_STREAM')
    })

    it('must have a url config for the streaming function', () => {
      const streamSection = SERVERLESS_SOURCE.slice(
        SERVERLESS_SOURCE.indexOf('inferenceStream'),
        SERVERLESS_SOURCE.indexOf('inferenceStream') + 500
      )
      expect(streamSection).toMatch(/url:|url:/)
    })
  })

  // ==========================================================================
  // 3. Frontend: Streaming URL configuration
  // ==========================================================================
  describe('Frontend — URL configuration', () => {
    it('must define AIBUDDY_API_STREAM_URL in urls.ts', () => {
      expect(URLS_SOURCE).toContain('AIBUDDY_API_STREAM_URL')
    })

    it('AIBUDDY_API_STREAM_URL must point to Lambda Function URL (not ALB)', () => {
      const match = URLS_SOURCE.match(/AIBUDDY_API_STREAM_URL\s*=\s*[`'"]([^`'"]+)/)
      expect(match).toBeTruthy()
      expect(match![1]).toContain('lambda-url')
    })
  })

  // ==========================================================================
  // 4. Frontend: Streaming response reader
  // ==========================================================================
  describe('Frontend — streaming response reader', () => {
    it('must use response.body.getReader() for streaming', () => {
      expect(APP_SOURCE).toContain('getReader()')
    })

    it('must use TextDecoder for chunked reading', () => {
      expect(APP_SOURCE).toContain('TextDecoder')
    })

    it('must parse SSE data: events from the stream', () => {
      expect(APP_SOURCE).toMatch(/data:\s|startsWith\('data:/)
    })

    it('must incrementally update the assistant message as tokens arrive', () => {
      // Should accumulate streaming text and update messages state
      expect(APP_SOURCE).toMatch(/streamingText|streamedContent|accumulatedText/)
    })

    it('must detect [DONE] or stream_end to finalize the message', () => {
      expect(APP_SOURCE).toMatch(/\[DONE\]|stream_end|message_stop/)
    })
  })

  // ==========================================================================
  // 5. Frontend: Fallback to non-streaming on failure
  // ==========================================================================
  describe('Frontend — streaming fallback', () => {
    it('must fall back to non-streaming fetch on streaming failure', () => {
      // If streaming endpoint fails (403, network), retry with ALB
      expect(APP_SOURCE).toMatch(/fallback|AIBUDDY_API_INFERENCE_URL/)
    })

    it('must still import AIBUDDY_API_INFERENCE_URL for fallback', () => {
      expect(APP_SOURCE).toContain('AIBUDDY_API_INFERENCE_URL')
    })

    it('must still support the original response.json() path', () => {
      expect(APP_SOURCE).toContain('response.json()')
    })
  })

  // ==========================================================================
  // 6. Regression: existing UX improvements must remain
  // ==========================================================================
  describe('Regression — existing KAN-33 UX', () => {
    it('elapsed seconds timer must still exist', () => {
      expect(APP_SOURCE).toContain('elapsedSeconds')
      expect(APP_SOURCE).toContain('setInterval')
    })

    it('reassurance messages must still exist', () => {
      expect(APP_SOURCE).toMatch(/elapsedSeconds\s*>=?\s*15/)
      expect(APP_SOURCE).toMatch(/elapsedSeconds\s*>=?\s*30/)
    })

    it('progress bar animation must still exist', () => {
      expect(APP_SOURCE).toContain('elapsedSeconds')
    })
  })
})
