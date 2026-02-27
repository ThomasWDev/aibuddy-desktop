import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'fs'
import { join } from 'path'

const ROOT = join(__dirname, '..', '..')
const REPO_ROOT = join(ROOT, '..')

describe('Post-v1.5.87 — Lockfile Consistency (no duplicate package managers per directory)', () => {
  const lockfileChecks = [
    { dir: REPO_ROOT, label: 'repo root' },
    { dir: join(REPO_ROOT, 'extension'), label: 'extension/' },
    { dir: join(REPO_ROOT, 'extension', 'webview-ui-vite'), label: 'extension/webview-ui-vite/' },
    { dir: ROOT, label: 'aibuddy-desktop/' },
    { dir: join(REPO_ROOT, 'aws-api'), label: 'aws-api/' },
    { dir: join(REPO_ROOT, 'packages', 'prompts'), label: 'packages/prompts/' },
  ]

  lockfileChecks.forEach(({ dir, label }) => {
    it(`${label} must have at most one lockfile`, () => {
      const hasNpm = existsSync(join(dir, 'package-lock.json'))
      const hasPnpm = existsSync(join(dir, 'pnpm-lock.yaml'))
      const hasYarn = existsSync(join(dir, 'yarn.lock'))
      const count = [hasNpm, hasPnpm, hasYarn].filter(Boolean).length
      expect(count).toBeLessThanOrEqual(1)
    })
  })
})

describe('Post-v1.5.87 — KAN-21 Notarization Config Regression Guard', () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'))

  it('package.json notarize must be an object with teamId (not boolean)', () => {
    const notarize = pkg.build?.mac?.notarize
    expect(notarize).toBeTruthy()
    expect(typeof notarize).toBe('object')
    expect(notarize.teamId).toBe('S2237D23CB')
  })

  it('hardenedRuntime must be enabled for notarization', () => {
    expect(pkg.build?.mac?.hardenedRuntime).toBe(true)
  })

  it('entitlements.mac.plist must exist', () => {
    expect(existsSync(join(ROOT, 'build/entitlements.mac.plist'))).toBe(true)
  })

  it('CI workflow must pass APPLE_API_KEY for notarization', () => {
    const workflow = readFileSync(join(REPO_ROOT, '.github/workflows/release-on-master.yml'), 'utf-8')
    expect(workflow).toContain('APPLE_API_KEY')
    expect(workflow).toContain('APPLE_API_KEY_ID')
    expect(workflow).toContain('APPLE_API_ISSUER')
  })

  it('CI workflow must have fallback app-specific password for notarization', () => {
    const workflow = readFileSync(join(REPO_ROOT, '.github/workflows/release-on-master.yml'), 'utf-8')
    expect(workflow).toContain('APPLE_APP_SPECIFIC_PASSWORD')
  })

  it('entitlements.mac.plist must allow JIT and network client', () => {
    const plist = readFileSync(join(ROOT, 'build/entitlements.mac.plist'), 'utf-8')
    expect(plist).toContain('com.apple.security.cs.allow-jit')
    expect(plist).toContain('com.apple.security.network.client')
  })
})

describe('Post-v1.5.87 — KAN-97 Clipboard Fallback Regression Guard', () => {
  const shareModal = readFileSync(join(ROOT, 'renderer/src/components/ShareModal.tsx'), 'utf-8')

  it('handleCopyText must use navigator.clipboard with electronAPI fallback', () => {
    expect(shareModal).toContain('navigator.clipboard.writeText')
    expect(shareModal).toContain('electronAPI?.clipboard?.writeText')
  })

  it('handleCopyMarkdown must use navigator.clipboard with electronAPI fallback', () => {
    const copyMarkdownSection = shareModal.split('handleCopyMarkdown')[1]
    expect(copyMarkdownSection).toContain('navigator.clipboard.writeText')
    expect(copyMarkdownSection).toContain('electronAPI?.clipboard?.writeText')
  })

  it('ShareModal must import formatAsText and formatAsMarkdown', () => {
    expect(shareModal).toContain('formatAsText')
    expect(shareModal).toContain('formatAsMarkdown')
  })

  it('Copy failure must set user-friendly error message', () => {
    expect(shareModal).toContain('Failed to copy conversation')
  })
})

describe('Post-v1.5.87 — KAN-17 MediaRecorder + Whisper Regression Guard', () => {
  const voiceHook = readFileSync(join(ROOT, 'renderer/src/hooks/useVoiceInput.ts'), 'utf-8')

  it('useVoiceInput must use MediaRecorder (not SpeechRecognition API)', () => {
    expect(voiceHook).toContain('MediaRecorder')
    expect(voiceHook).not.toContain('new SpeechRecognition')
    expect(voiceHook).not.toContain('webkitSpeechRecognition')
  })

  it('useVoiceInput must use getUserMedia for microphone access', () => {
    expect(voiceHook).toContain('getUserMedia')
  })

  it('useVoiceInput must send audio to AIBUDDY_API_TRANSCRIBE_URL', () => {
    expect(voiceHook).toContain('AIBUDDY_API_TRANSCRIBE_URL')
  })

  it('useVoiceInput must send base64 audio to backend', () => {
    expect(voiceHook).toContain('audio_base64')
  })

  it('AIBUDDY_API_TRANSCRIBE_URL constant must exist in urls.ts', () => {
    const urls = readFileSync(join(ROOT, 'src/constants/urls.ts'), 'utf-8')
    expect(urls).toContain('AIBUDDY_API_TRANSCRIBE_URL')
  })

  it('useVoiceInput must have MAX_RECORDING_MS safety limit', () => {
    expect(voiceHook).toContain('MAX_RECORDING_MS')
  })
})

describe('Post-v1.5.87 — KAN-95 Image Format Transform Regression Guard', () => {
  const appContent = readFileSync(join(ROOT, 'renderer/src/App.tsx'), 'utf-8')
  const handler = readFileSync(join(REPO_ROOT, 'aws-api/src/handler.js'), 'utf-8')

  it('App.tsx truncation must check for image type (not image_url)', () => {
    expect(appContent).toContain("part.type !== 'image'")
  })

  it('backend must export transformImagesForProvider', () => {
    expect(handler).toContain('transformImagesForProvider')
    expect(handler).toContain('module.exports')
  })

  it('backend must handle OpenAI image_url format conversion', () => {
    expect(handler).toContain('image_url')
    expect(handler).toContain('data:')
  })

  it('backend must strip images for DeepSeek (no vision support)', () => {
    expect(handler).toContain('deepseek')
  })
})

describe('Post-v1.5.87 — All KAN Fix Test Files Exist', () => {
  const requiredTestFiles = [
    'tests/electron/kan95-attachment-server-error.test.ts',
    'tests/electron/kan17-voice-dictation-fix.test.ts',
    'tests/electron/kan97-share-copy-fix.test.ts',
    'tests/electron/kan21-notarization-config.test.ts',
    'tests/electron/kan96-unified-attachment.test.ts',
  ]

  requiredTestFiles.forEach((file) => {
    it(`${file} must exist`, () => {
      expect(existsSync(join(ROOT, file))).toBe(true)
    })
  })
})

describe('Post-v1.5.87 — Backend Transcription Endpoint Guard', () => {
  const handler = readFileSync(join(REPO_ROOT, 'aws-api/src/handler.js'), 'utf-8')

  it('handler must export handleTranscription', () => {
    expect(handler).toContain('handleTranscription')
  })

  it('handler must route transcribe mode', () => {
    expect(handler).toContain("mode === 'transcribe'")
  })

  it('handler must use whisper-1 model', () => {
    expect(handler).toContain('whisper-1')
  })
})

describe('Post-v1.5.87 — Documentation Existence Guard', () => {
  const requiredDocs = [
    { path: join(REPO_ROOT, 'KNOWN_ISSUES.md'), label: 'KNOWN_ISSUES.md' },
    { path: join(REPO_ROOT, 'extension/CHANGELOG.md'), label: 'CHANGELOG.md' },
    { path: join(REPO_ROOT, 'docs/E2E_TESTING_KIT.md'), label: 'E2E_TESTING_KIT.md' },
    { path: join(REPO_ROOT, 'docs/CI_CD_SECRETS_REFERENCE.md'), label: 'CI_CD_SECRETS_REFERENCE.md' },
    { path: join(ROOT, 'DESKTOP_APP_GUIDE.md'), label: 'DESKTOP_APP_GUIDE.md' },
    { path: join(ROOT, 'SHARED_CODE_ARCHITECTURE.md'), label: 'SHARED_CODE_ARCHITECTURE.md' },
  ]

  requiredDocs.forEach(({ path, label }) => {
    it(`${label} must exist`, () => {
      expect(existsSync(path)).toBe(true)
    })
  })

  it('KNOWN_ISSUES.md must reference KAN-21 notarization fix', () => {
    const ki = readFileSync(join(REPO_ROOT, 'KNOWN_ISSUES.md'), 'utf-8')
    expect(ki).toContain('KAN-21')
    expect(ki).toContain('notarize')
  })

  it('KNOWN_ISSUES.md must reference KAN-97 clipboard fix', () => {
    const ki = readFileSync(join(REPO_ROOT, 'KNOWN_ISSUES.md'), 'utf-8')
    expect(ki).toContain('KAN-97')
  })
})
