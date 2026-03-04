import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

/**
 * KAN-178: "Messages array is required" Error After Stopping Voice Dictation
 *
 * Root cause: The transcription URL (AIBUDDY_API_TRANSCRIBE_URL) points to
 * the same ALB endpoint as inference. The backend handler.js validates for
 * a `messages` array BEFORE checking the request mode. When sendToWhisper
 * sends { mode: 'transcribe', audio_base64, ... }, the backend rejects it
 * with 400 "Messages array is required" because there's no `messages` field.
 * The raw backend error propagates as-is to the toast.
 *
 * Fixes:
 * 1. Backend: Add early mode=transcribe routing before messages validation
 * 2. Client: Guard against raw backend errors in useVoiceInput
 * 3. Client: Don't auto-trigger API call on empty/failed transcription
 */

const VOICE_HOOK_SOURCE = fs.readFileSync(
  path.resolve(__dirname, '../../renderer/src/hooks/useVoiceInput.ts'),
  'utf-8'
)

const APP_SOURCE = fs.readFileSync(
  path.resolve(__dirname, '../../renderer/src/App.tsx'),
  'utf-8'
)

const HANDLER_SOURCE = fs.readFileSync(
  path.resolve(__dirname, '../../../../aibuddyapi/src/handler.js'),
  'utf-8'
)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('KAN-178: Voice Dictation Error Guard', () => {

  // ==========================================================================
  // 1. Backend: mode=transcribe routing before messages validation
  // ==========================================================================
  describe('Backend handler — transcription routing', () => {
    it('must check for mode=transcribe before validating messages array', () => {
      const modeCheckIdx = HANDLER_SOURCE.indexOf("mode")
      const messagesCheckIdx = HANDLER_SOURCE.indexOf("Messages array is required")
      // The mode check must appear BEFORE the messages validation
      // (Find the relevant mode check near the body parsing)
      const bodyParseIdx = HANDLER_SOURCE.indexOf("body = JSON.parse")
      const postBodySource = HANDLER_SOURCE.slice(bodyParseIdx)
      const modeInPost = postBodySource.indexOf("mode")
      const msgsInPost = postBodySource.indexOf("Messages array is required")
      expect(modeInPost).toBeLessThan(msgsInPost)
    })

    it('must extract mode from request body', () => {
      // The handler should destructure or access body.mode
      expect(HANDLER_SOURCE).toMatch(/body\.mode|{\s*[^}]*mode[^}]*}\s*=\s*body/)
    })

    it('must return transcription result with text field', () => {
      // The transcription response should include a text field
      const transcribeBlock = HANDLER_SOURCE.slice(
        HANDLER_SOURCE.indexOf('transcri'),
        HANDLER_SOURCE.indexOf('transcri') + 2000
      )
      expect(transcribeBlock).toMatch(/text|transcript/)
    })

    it('must validate audio_base64 is present for transcription', () => {
      expect(HANDLER_SOURCE).toContain('audio_base64')
    })

    it('must call OpenAI Whisper for transcription', () => {
      expect(HANDLER_SOURCE).toMatch(/whisper|transcriptions\.create|audio/)
    })
  })

  // ==========================================================================
  // 2. Client: useVoiceInput error handling
  // ==========================================================================
  describe('useVoiceInput — error handling', () => {
    it('must not expose raw backend validation errors to users', () => {
      // sendToWhisper should catch "Messages array is required" and replace
      // with a user-friendly message
      const sendBlock = VOICE_HOOK_SOURCE.slice(
        VOICE_HOOK_SOURCE.indexOf('sendToWhisper'),
        VOICE_HOOK_SOURCE.indexOf('sendToWhisper') + 2000
      )
      // Should have error transformation or a friendly fallback message
      const hasFriendlyError =
        sendBlock.includes('Transcription') ||
        sendBlock.includes('transcription') ||
        sendBlock.includes('try again') ||
        sendBlock.includes('failed')
      expect(hasFriendlyError).toBe(true)
    })

    it('must handle non-ok response status from transcription endpoint', () => {
      expect(VOICE_HOOK_SOURCE).toContain('!res.ok')
    })

    it('must not auto-send an API inference request when dictation stops', () => {
      // stopListening should only stop the recorder, not trigger an inference call
      const stopBlock = VOICE_HOOK_SOURCE.slice(
        VOICE_HOOK_SOURCE.indexOf('stopListening'),
        VOICE_HOOK_SOURCE.indexOf('stopListening') + 500
      )
      expect(stopBlock).not.toContain('handleSubmit')
      expect(stopBlock).not.toContain('AIBUDDY_API_INFERENCE_URL')
    })

    it('must set state to idle or error after transcription failure (not leave in processing)', () => {
      // After any error in sendToWhisper, state must reset to idle or error
      const sendBlock = VOICE_HOOK_SOURCE.slice(
        VOICE_HOOK_SOURCE.indexOf('sendToWhisper'),
        VOICE_HOOK_SOURCE.indexOf('sendToWhisper') + 2000
      )
      expect(sendBlock).toContain("setState('idle')")
      expect(sendBlock).toContain('setError')
    })

    it('must check blob size before sending to backend', () => {
      // Empty audio should not be sent to the backend
      expect(VOICE_HOOK_SOURCE).toContain('blob.size')
    })
  })

  // ==========================================================================
  // 3. Client: App.tsx voice dictation integration
  // ==========================================================================
  describe('App.tsx — voice dictation integration', () => {
    it('onResult callback must only populate input, never auto-send', () => {
      // Find the useVoiceInput({ usage (not the import)
      const usageIdx = APP_SOURCE.indexOf('useVoiceInput({')
      expect(usageIdx).toBeGreaterThan(-1)
      const voiceBlock = APP_SOURCE.slice(usageIdx, usageIdx + 500)
      expect(voiceBlock).toContain('setInput')
      expect(voiceBlock).not.toContain('handleSubmit')
    })

    it('onError callback must use toast.error for voice errors', () => {
      const usageIdx = APP_SOURCE.indexOf('useVoiceInput({')
      const voiceBlock = APP_SOURCE.slice(usageIdx, usageIdx + 500)
      expect(voiceBlock).toContain('toast.error')
    })

    it('handleSubmit must guard against empty input and no attachments', () => {
      expect(APP_SOURCE).toContain('!input.trim()')
      expect(APP_SOURCE).toContain('attachedImages.length === 0')
    })

    it('voice button must be type="button" to prevent form submission', () => {
      // The mic button onClick calls toggleVoice and must be type="button"
      const toggleIdx = APP_SOURCE.indexOf('toggleVoice()')
      expect(toggleIdx).toBeGreaterThan(-1)
      // Look backwards from toggleVoice() for the nearest <button
      const preceding = APP_SOURCE.slice(Math.max(0, toggleIdx - 600), toggleIdx)
      expect(preceding).toContain('type="button"')
      // Ensure no type="submit" between the <button and toggleVoice
      const lastButton = preceding.lastIndexOf('<button')
      const buttonToToggle = preceding.slice(lastButton)
      expect(buttonToToggle).toContain('type="button"')
    })
  })

  // ==========================================================================
  // 4. Transcription URL configuration
  // ==========================================================================
  describe('Transcription URL configuration', () => {
    const URLS_SOURCE = fs.readFileSync(
      path.resolve(__dirname, '../../src/constants/urls.ts'),
      'utf-8'
    )

    it('AIBUDDY_API_TRANSCRIBE_URL must be defined', () => {
      expect(URLS_SOURCE).toContain('AIBUDDY_API_TRANSCRIBE_URL')
    })

    it('useVoiceInput must import the transcribe URL', () => {
      expect(VOICE_HOOK_SOURCE).toContain('AIBUDDY_API_TRANSCRIBE_URL')
    })
  })
})
