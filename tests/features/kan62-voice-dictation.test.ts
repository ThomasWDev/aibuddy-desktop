import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

/**
 * KAN-62: Voice dictation button doesn't trigger anything on Mac
 *
 * Root cause: useVoiceInput's useEffect depended on onResult/onError callbacks
 * that were inline functions from the parent (App.tsx). Every render created new
 * callback references, which triggered the effect cleanup (abort) and re-creation
 * of the SpeechRecognition instance, killing active recognition immediately.
 *
 * Fix: Store callbacks in refs (onResultRef, onErrorRef) so the recognition
 * setup effect only depends on config values (language, continuous, interimResults).
 *
 * Secondary fixes:
 * - Added NSMicrophoneUsageDescription to package.json extendInfo and afterPack.js
 * - Added audio-input entitlement to entitlements.mas.inherit.plist for helpers
 */

const HOOK_PATH = resolve(__dirname, '../../renderer/src/hooks/useVoiceInput.ts')
const PACKAGE_JSON_PATH = resolve(__dirname, '../../package.json')
const MAS_ENTITLEMENTS_PATH = resolve(__dirname, '../../build/entitlements.mas.plist')
const INHERIT_ENTITLEMENTS_PATH = resolve(__dirname, '../../build/entitlements.mas.inherit.plist')
const AFTER_PACK_PATH = resolve(__dirname, '../../build/afterPack.js')

describe('KAN-62: Voice Dictation — Callback Ref Pattern', () => {
  let hookSource: string

  beforeEach(() => {
    hookSource = readFileSync(HOOK_PATH, 'utf-8')
  })

  it('should store onResult in a ref, not in the recognition effect deps', () => {
    expect(hookSource).toContain('onResultRef')
    expect(hookSource).toMatch(/const onResultRef\s*=\s*useRef\(onResult\)/)
  })

  it('should store onError in a ref, not in the recognition effect deps', () => {
    expect(hookSource).toContain('onErrorRef')
    expect(hookSource).toMatch(/const onErrorRef\s*=\s*useRef\(onError\)/)
  })

  it('should sync refs in a separate useEffect', () => {
    expect(hookSource).toMatch(/onResultRef\.current\s*=\s*onResult/)
    expect(hookSource).toMatch(/onErrorRef\.current\s*=\s*onError/)
  })

  it('recognition setup useEffect should NOT depend on onResult or onError', () => {
    const setupEffectMatch = hookSource.match(
      /\/\/ Initialize recognition instance.*?\n\s*useEffect\(\(\) => \{[\s\S]*?\}, \[([^\]]*)\]\)/
    )
    expect(setupEffectMatch).toBeTruthy()
    const deps = setupEffectMatch![1]
    expect(deps).not.toContain('onResult')
    expect(deps).not.toContain('onError')
    expect(deps).toContain('language')
    expect(deps).toContain('continuous')
    expect(deps).toContain('interimResults')
    expect(deps).toContain('isSupported')
  })

  it('recognition onresult handler should use onResultRef.current, not onResult directly', () => {
    const onresultBlock = hookSource.match(/recognition\.onresult\s*=[\s\S]*?(?=recognition\.onerror)/)
    expect(onresultBlock).toBeTruthy()
    expect(onresultBlock![0]).toContain('onResultRef.current')
    expect(onresultBlock![0]).not.toMatch(/[^R]onResult\?\./)
  })

  it('recognition onerror handler should use onErrorRef.current, not onError directly', () => {
    const onerrorBlock = hookSource.match(/recognition\.onerror\s*=[\s\S]*?recognitionRef\.current = recognition/)
    expect(onerrorBlock).toBeTruthy()
    expect(onerrorBlock![0]).toContain('onErrorRef.current')
    expect(onerrorBlock![0]).not.toMatch(/[^R]onError\?\./)
  })

  it('startListening should use onErrorRef.current, not onError directly', () => {
    const startBlock = hookSource.match(/const startListening[\s\S]*?(?=const stopListening)/)
    expect(startBlock).toBeTruthy()
    expect(startBlock![0]).not.toMatch(/[^R]onError\?\.\(/)
    if (startBlock![0].includes('onError')) {
      expect(startBlock![0]).toContain('onErrorRef.current')
    }
  })

  it('startListening useCallback should NOT depend on onError', () => {
    const startDepsMatch = hookSource.match(
      /const startListening\s*=\s*useCallback\(async[\s\S]*?\}, \[([^\]]*)\]\)/
    )
    expect(startDepsMatch).toBeTruthy()
    expect(startDepsMatch![1]).not.toContain('onError')
  })
})

describe('KAN-62: Voice Dictation — SpeechRecognition API Resilience', () => {
  let hookSource: string

  beforeEach(() => {
    hookSource = readFileSync(HOOK_PATH, 'utf-8')
  })

  it('should check for SpeechRecognition with webkit prefix fallback', () => {
    expect(hookSource).toContain('SpeechRecognition')
    expect(hookSource).toContain('webkitSpeechRecognition')
  })

  it('should set isSupported based on SpeechRecognition constructor availability', () => {
    expect(hookSource).toMatch(/isSupported\s*=\s*!!SpeechRecognition/)
  })

  it('should guard startListening with isSupported check', () => {
    expect(hookSource).toMatch(/if\s*\(!isSupported/)
  })

  it('should wrap recognition.start() in try-catch', () => {
    const startSection = hookSource.match(/recognition(?:Ref\.current)?\.start\(\)/)
    expect(startSection).toBeTruthy()
    const tryBlock = hookSource.match(/try\s*\{\s*\n\s*recognitionRef\.current\.start\(\)/)
    expect(tryBlock).toBeTruthy()
  })

  it('should handle all standard SpeechRecognition error types', () => {
    expect(hookSource).toContain("'not-allowed'")
    expect(hookSource).toContain("'no-speech'")
    expect(hookSource).toContain("'network'")
    expect(hookSource).toContain("'audio-capture'")
    expect(hookSource).toContain("'aborted'")
  })

  it('should silently handle aborted errors (user cancelled)', () => {
    expect(hookSource).toMatch(/if\s*\(event\.error\s*!==\s*'aborted'\)/)
  })
})

describe('KAN-62: Voice Dictation — macOS Microphone Permission Flow', () => {
  let hookSource: string

  beforeEach(() => {
    hookSource = readFileSync(HOOK_PATH, 'utf-8')
  })

  it('should check electronAPI.microphone.getStatus before starting', () => {
    expect(hookSource).toContain('electronAPI?.microphone?.getStatus')
  })

  it('should request mic access when status is not granted', () => {
    expect(hookSource).toContain('electronAPI.microphone.requestAccess()')
  })

  it('should handle denied status with user-friendly error message', () => {
    expect(hookSource).toContain('System Settings > Privacy & Security > Microphone')
  })

  it('should gracefully fall back when not in Electron', () => {
    expect(hookSource).toMatch(/catch\s*\{[\s\S]*?Not in Electron/)
  })
})

describe('KAN-62: Voice Dictation — MAS Build Configuration', () => {
  it('package.json should include NSMicrophoneUsageDescription', () => {
    const pkg = JSON.parse(readFileSync(PACKAGE_JSON_PATH, 'utf-8'))
    const extendInfo = pkg?.build?.mas?.extendInfo
    expect(extendInfo).toBeDefined()
    expect(extendInfo.NSMicrophoneUsageDescription).toBeDefined()
    expect(extendInfo.NSMicrophoneUsageDescription.length).toBeGreaterThan(10)
    expect(extendInfo.NSMicrophoneUsageDescription.toLowerCase()).toContain('microphone')
  })

  it('entitlements.mas.plist should include audio-input entitlement', () => {
    const plist = readFileSync(MAS_ENTITLEMENTS_PATH, 'utf-8')
    expect(plist).toContain('com.apple.security.device.audio-input')
  })

  it('entitlements.mas.plist should NOT include iOS-only device.microphone key', () => {
    const plist = readFileSync(MAS_ENTITLEMENTS_PATH, 'utf-8')
    expect(plist).not.toContain('com.apple.security.device.microphone')
  })

  it('entitlements.mas.inherit.plist should include audio-input for helper processes', () => {
    const plist = readFileSync(INHERIT_ENTITLEMENTS_PATH, 'utf-8')
    expect(plist).toContain('com.apple.security.device.audio-input')
  })

  it('afterPack.js should patch NSMicrophoneUsageDescription into Info.plist', () => {
    const afterPack = readFileSync(AFTER_PACK_PATH, 'utf-8')
    expect(afterPack).toContain('NSMicrophoneUsageDescription')
  })
})

describe('KAN-62: Voice Dictation — Electron Main Process Permissions', () => {
  const MAIN_TS_PATH = resolve(__dirname, '../../electron/main.ts')
  let mainSource: string

  beforeEach(() => {
    mainSource = readFileSync(MAIN_TS_PATH, 'utf-8')
  })

  it('should request microphone access on macOS at startup', () => {
    expect(mainSource).toContain('askForMediaAccess')
    expect(mainSource).toContain("'microphone'")
  })

  it('should check microphone status at startup', () => {
    expect(mainSource).toContain('getMediaAccessStatus')
  })

  it('should register IPC handler for microphone:getStatus', () => {
    expect(mainSource).toContain("'microphone:getStatus'")
  })

  it('should register IPC handler for microphone:requestAccess', () => {
    expect(mainSource).toContain("'microphone:requestAccess'")
  })

  it('should grant media/microphone/audio-capture in permission request handler', () => {
    expect(mainSource).toContain("'media'")
    expect(mainSource).toContain("'microphone'")
    expect(mainSource).toContain("'audio-capture'")
  })

  it('should set permission check handler for media permissions', () => {
    expect(mainSource).toContain('setPermissionCheckHandler')
    expect(mainSource).toContain('setPermissionRequestHandler')
  })
})

describe('KAN-62: Voice Dictation — Preload Bridge', () => {
  const PRELOAD_PATH = resolve(__dirname, '../../electron/preload.ts')
  let preloadSource: string

  beforeEach(() => {
    preloadSource = readFileSync(PRELOAD_PATH, 'utf-8')
  })

  it('should expose microphone.getStatus via IPC', () => {
    expect(preloadSource).toContain('microphone')
    expect(preloadSource).toContain('getStatus')
    expect(preloadSource).toContain("'microphone:getStatus'")
  })

  it('should expose microphone.requestAccess via IPC', () => {
    expect(preloadSource).toContain('requestAccess')
    expect(preloadSource).toContain("'microphone:requestAccess'")
  })
})
