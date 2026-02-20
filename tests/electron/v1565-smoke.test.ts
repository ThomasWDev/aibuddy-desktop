import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const ROOT = join(__dirname, '..', '..')
const appContent = readFileSync(join(ROOT, 'renderer/src/App.tsx'), 'utf-8')
const mainContent = readFileSync(join(ROOT, 'electron/main.ts'), 'utf-8')

describe('v1.5.65 — Interview Mode', () => {
  const interviewPanelPath = join(ROOT, 'renderer/src/components/InterviewPanel.tsx')

  it('InterviewPanel component file exists', () => {
    expect(existsSync(interviewPanelPath)).toBe(true)
  })

  it('InterviewPanel is imported in App.tsx', () => {
    expect(appContent).toContain("import { InterviewPanel }")
  })

  it('showInterviewMode state variable exists', () => {
    expect(appContent).toContain('showInterviewMode')
    expect(appContent).toContain('setShowInterviewMode')
  })

  it('GraduationCap icon is imported for Interview Mode button', () => {
    expect(appContent).toContain('GraduationCap')
  })

  it('InterviewPanel is rendered with required props', () => {
    expect(appContent).toContain('<InterviewPanel')
    expect(appContent).toContain('isOpen={showInterviewMode}')
    expect(appContent).toContain("apiKey={apiKey || ''}")
    expect(appContent).toContain('apiUrl={AIBUDDY_API_INFERENCE_URL}')
  })

  it('InterviewPanel has Interview Coach system prompt', () => {
    const panelContent = readFileSync(interviewPanelPath, 'utf-8')
    expect(panelContent).toContain('Interview Coach')
    expect(panelContent).toContain('Simple Explanation')
    expect(panelContent).toContain('Expert Answer')
  })

  it('InterviewPanel supports Live Audio and Manual modes', () => {
    const panelContent = readFileSync(interviewPanelPath, 'utf-8')
    expect(panelContent).toContain('Live Audio')
    expect(panelContent).toContain('Type Question')
    expect(panelContent).toContain("mode === 'realtime'")
    expect(panelContent).toContain("mode === 'manual'")
  })

  it('InterviewPanel uses SpeechRecognition API', () => {
    const panelContent = readFileSync(interviewPanelPath, 'utf-8')
    expect(panelContent).toContain('SpeechRecognition')
    expect(panelContent).toContain('webkitSpeechRecognition')
    expect(panelContent).toContain('continuous')
    expect(panelContent).toContain('interimResults')
  })

  it('InterviewPanel has silence detection (3 seconds)', () => {
    const panelContent = readFileSync(interviewPanelPath, 'utf-8')
    expect(panelContent).toContain('silenceTimer')
    expect(panelContent).toMatch(/elapsed\s*>=\s*3/)
  })

  it('InterviewPanel has transcript and responses UI', () => {
    const panelContent = readFileSync(interviewPanelPath, 'utf-8')
    expect(panelContent).toContain('Live Transcript')
    expect(panelContent).toContain('AI Interview Coach')
    expect(panelContent).toContain('Regenerate')
  })
})

describe('v1.5.65 — Blank Screen Fix (null-safe JSX)', () => {
  it('img.name is null-safe in render (image label)', () => {
    expect(appContent).toContain("(img.name || 'image').substring(0, 20)")
  })

  it('img.name is null-safe in alt attribute', () => {
    expect(appContent).toContain("alt={img.name || 'image'}")
  })

  it('img.name is null-safe in popup title', () => {
    expect(appContent).toContain("win.document.title = img.name || 'image'")
  })

  it('cmd.substring is null-safe', () => {
    expect(appContent).toContain("(cmd || '').substring(0, 40)")
  })

  it('messages[0].content.slice is guarded', () => {
    expect(appContent).toContain('messages[0].content ?')
  })
})

describe('v1.5.65 — Renderer Crash Logging', () => {
  it('main process forwards renderer console messages', () => {
    expect(mainContent).toContain("'console-message'")
    expect(mainContent).toContain('Renderer:')
  })

  it('main process detects renderer process crash', () => {
    expect(mainContent).toContain("'render-process-gone'")
    expect(mainContent).toContain('[CRITICAL] Renderer process gone')
  })

  it('main process detects page load failures', () => {
    expect(mainContent).toContain("'did-fail-load'")
    expect(mainContent).toContain('[CRITICAL] Failed to load')
  })
})

describe('v1.5.65 — Payload Size / 413 Auto-Truncation', () => {
  it('MAX_PAYLOAD_BYTES is set to 900KB (matches ALB→Lambda limit)', () => {
    expect(appContent).toContain('MAX_PAYLOAD_BYTES = 900 * 1024')
  })

  it('auto-truncation strips images from old messages', () => {
    expect(appContent).toContain("part.type !== 'image_url'")
    expect(appContent).toContain('auto-truncating')
  })

  it('auto-truncation limits message content to 2000 chars', () => {
    expect(appContent).toContain('.substring(0, 2000)')
    expect(appContent).toContain('truncated for context length')
  })

  it('auto-truncation progressively removes oldest messages', () => {
    expect(appContent).toContain('conversationMsgs.shift()')
    expect(appContent).toContain('conversationMsgs.length > 2')
  })

  it('user sees toast about trimmed conversation', () => {
    expect(appContent).toContain('Trimmed conversation history to fit server limits')
  })

  it('413 response handler suggests starting new chat', () => {
    expect(appContent).toContain('starting a new chat')
    expect(appContent).toContain('Cmd+N')
  })
})

describe('v1.5.65 — macOS Audio Permissions', () => {
  const macEntitlements = readFileSync(join(ROOT, 'build/entitlements.mac.plist'), 'utf-8')
  const masEntitlements = readFileSync(join(ROOT, 'build/entitlements.mas.plist'), 'utf-8')

  it('mac entitlements include audio-input', () => {
    expect(macEntitlements).toContain('com.apple.security.device.audio-input')
  })

  it('mac entitlements include microphone', () => {
    expect(macEntitlements).toContain('com.apple.security.device.microphone')
  })

  it('MAS entitlements include audio-input', () => {
    expect(masEntitlements).toContain('com.apple.security.device.audio-input')
  })

  it('MAS entitlements include microphone', () => {
    expect(masEntitlements).toContain('com.apple.security.device.microphone')
  })

  it('Electron grants microphone permission requests', () => {
    expect(mainContent).toContain('setPermissionRequestHandler')
    expect(mainContent).toContain("'microphone'")
    expect(mainContent).toContain("'audio-capture'")
  })

  it('Electron checks microphone permission', () => {
    expect(mainContent).toContain('setPermissionCheckHandler')
  })
})

describe('v1.5.65+ — Version Consistency', () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'))
  const extPkg = JSON.parse(readFileSync(join(ROOT, '..', 'extension', 'package.json'), 'utf-8'))

  it('desktop version is at least 1.5.65', () => {
    const [maj, min, patch] = pkg.version.split('.').map(Number)
    expect(maj).toBeGreaterThanOrEqual(1)
    expect(min).toBeGreaterThanOrEqual(5)
    expect(patch).toBeGreaterThanOrEqual(65)
  })

  it('extension version matches desktop version', () => {
    expect(extPkg.version).toBe(pkg.version)
  })

  it('User-Agent fallback must NOT contain a hardcoded version (uses "unknown")', () => {
    expect(appContent).toContain("'unknown'")
    expect(appContent).not.toMatch(/\$\{appVersion\s*\|\|\s*'\d+\.\d+\.\d+'/)
  })
})
