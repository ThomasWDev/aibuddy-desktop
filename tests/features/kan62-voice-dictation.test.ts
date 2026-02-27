import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

/**
 * KAN-62: Voice dictation button doesn't trigger anything on Mac
 *
 * Original root cause: useVoiceInput's useEffect depended on onResult/onError
 * callbacks that were inline functions, causing re-creation of recognition.
 *
 * KAN-17 UPDATE: SpeechRecognition was replaced with MediaRecorder + Whisper
 * because Web Speech API doesn't work in Electron. The callback ref pattern
 * is still used for onResult/onError stability.
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

describe('KAN-62/KAN-17: Voice Dictation — MediaRecorder + Whisper (replaces SpeechRecognition)', () => {
  let hookSource: string

  beforeEach(() => {
    hookSource = readFileSync(HOOK_PATH, 'utf-8')
  })

  it('should use MediaRecorder for audio capture', () => {
    expect(hookSource).toContain('MediaRecorder')
  })

  it('should use getUserMedia for microphone access', () => {
    expect(hookSource).toContain('getUserMedia')
  })

  it('should NOT use SpeechRecognition as primary API (broken in Electron)', () => {
    const hasSpeechRecogAsMain = hookSource.includes("new SpeechRecognition()")
      || hookSource.includes("new (window as any).SpeechRecognition()")
    expect(hasSpeechRecogAsMain).toBe(false)
  })

  it('should send audio to backend for Whisper transcription', () => {
    expect(hookSource).toContain('transcribe')
  })

  it('should encode audio as base64 for transmission', () => {
    expect(hookSource).toContain('base64')
  })

  it('should have a max recording duration limit', () => {
    expect(hookSource).toMatch(/MAX_RECORDING|maxDuration|60000|60_000/)
  })

  it('should guard startListening with isSupported check', () => {
    expect(hookSource).toMatch(/if\s*\(!isSupported/)
  })

  it('should handle microphone permission errors', () => {
    expect(hookSource).toContain('NotAllowedError')
    expect(hookSource).toContain('NotFoundError')
  })

  it('should clean up media stream on stop', () => {
    expect(hookSource).toContain('stop()')
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
