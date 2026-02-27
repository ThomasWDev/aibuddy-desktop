/**
 * KAN-62 TDD Tests: Microphone error while recording voice on Mac
 *
 * Root cause:
 *   1. Missing systemPreferences.askForMediaAccess('microphone') — macOS
 *      blocks mic access because the system-level permission was never requested
 *   2. No IPC for checking/requesting mic permission from renderer
 *   3. No retry/recovery path when permission is denied
 *
 * Fix layers:
 *   1. main.ts — request macOS mic permission on app ready + IPC handler
 *   2. preload.ts — expose mic permission check/request via IPC
 *   3. useVoiceInput.ts — check permission before starting recognition,
 *      guide user to System Preferences if denied
 *   4. InterviewPanel.tsx — same permission check before startListening
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, it, expect } from 'vitest'

const ROOT = resolve(__dirname, '../..')
const read = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf-8')

// ─── 1. MAIN PROCESS — MACOS SYSTEM PERMISSION ─────────────────────
describe('KAN-62 — Main process macOS microphone permission', () => {
  const mainTs = read('electron/main.ts')

  it('must import systemPreferences from electron', () => {
    expect(mainTs).toContain('systemPreferences')
  })

  it('must call askForMediaAccess for microphone on macOS', () => {
    expect(mainTs).toMatch(/askForMediaAccess.*microphone/)
  })

  it('must register microphone permission IPC handler', () => {
    expect(mainTs).toMatch(/ipcMain\.handle.*microphone|ipcMain\.handle.*mic/)
  })

  it('must check getMediaAccessStatus before requesting', () => {
    expect(mainTs).toContain('getMediaAccessStatus')
  })
})

// ─── 2. PRELOAD — MIC PERMISSION IPC ────────────────────────────────
describe('KAN-62 — Preload microphone permission IPC', () => {
  const preload = read('electron/preload.ts')

  it('preload must expose microphone permission check', () => {
    expect(preload).toMatch(/microphone|mic.*permission|checkMicPermission|getMicPermission/)
  })

  it('preload must expose microphone permission request', () => {
    expect(preload).toMatch(/requestMic|askMic|microphone.*request/)
  })
})

// ─── 3. VOICE INPUT HOOK — PERMISSION CHECK BEFORE START ────────────
describe('KAN-62 — useVoiceInput permission check', () => {
  const hook = read('renderer/src/hooks/useVoiceInput.ts')

  it('startListening must check microphone permission', () => {
    const fnBody = hook.slice(
      hook.indexOf('const startListening'),
      hook.indexOf('const stopListening')
    )
    expect(fnBody).toMatch(/electronAPI|permission|microphone/)
  })

  it('must handle not-allowed error with recovery guidance', () => {
    expect(hook).toMatch(/System Preferences|System Settings|open.*settings/i)
  })
})

// ─── 4. INTERVIEW PANEL — PERMISSION CHECK ──────────────────────────
describe('KAN-62 — InterviewPanel permission check', () => {
  const panel = read('renderer/src/components/InterviewPanel.tsx')

  it('startListening must check microphone permission', () => {
    const fnBody = panel.slice(
      panel.indexOf('const startListening'),
      panel.indexOf('const stopListening')
    )
    expect(fnBody).toMatch(/electronAPI|permission|microphone/)
  })
})

// ─── 5. ENTITLEMENTS STILL PRESENT ──────────────────────────────────
describe('KAN-62 — macOS entitlements regression guard', () => {
  it('mac entitlements must include audio-input', () => {
    const plist = read('build/entitlements.mac.plist')
    expect(plist).toContain('com.apple.security.device.audio-input')
  })

  it('MAS entitlements must include audio-input', () => {
    const plist = read('build/entitlements.mas.plist')
    expect(plist).toContain('com.apple.security.device.audio-input')
  })
})

// ─── 6. REGRESSION GUARDS ───────────────────────────────────────────
describe('KAN-62 — Regression guards', () => {
  it('setPermissionRequestHandler must still allow microphone', () => {
    const mainTs = read('electron/main.ts')
    expect(mainTs).toContain("'microphone'")
    expect(mainTs).toContain('setPermissionRequestHandler')
  })

  it('setPermissionCheckHandler must still allow microphone', () => {
    const mainTs = read('electron/main.ts')
    expect(mainTs).toContain('setPermissionCheckHandler')
  })

  it('useVoiceInput hook must use MediaRecorder (KAN-17 replaced SpeechRecognition)', () => {
    const hook = read('renderer/src/hooks/useVoiceInput.ts')
    expect(hook).toContain('MediaRecorder')
    expect(hook).toContain('getUserMedia')
  })

  it('voice error messages must still exist', () => {
    const hook = read('renderer/src/hooks/useVoiceInput.ts')
    expect(hook).toContain('NotAllowedError')
    expect(hook).toContain('NotFoundError')
    expect(hook).toContain('Microphone')
  })
})
