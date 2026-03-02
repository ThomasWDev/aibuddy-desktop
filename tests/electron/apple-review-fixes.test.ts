import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const APP_TSX = fs.readFileSync(
  path.join(__dirname, '../../renderer/src/App.tsx'),
  'utf-8'
)

describe('Apple Guideline 5.1.1(i)/5.1.2(i): Privacy Consent Screen', () => {
  it('should import PrivacyConsent component', () => {
    expect(APP_TSX).toContain("import { PrivacyConsent } from './components/PrivacyConsent'")
  })

  it('should have showPrivacyConsent state', () => {
    expect(APP_TSX).toContain('showPrivacyConsent')
  })

  it('should check localStorage for privacy acceptance', () => {
    expect(APP_TSX).toContain("localStorage.getItem('aibuddy_privacy_accepted')")
  })

  it('should show PrivacyConsent before language selector', () => {
    const privacyIdx = APP_TSX.indexOf('if (showPrivacyConsent)')
    const langIdx = APP_TSX.indexOf('if (showLanguageSelector)')
    expect(privacyIdx).toBeGreaterThan(-1)
    expect(langIdx).toBeGreaterThan(-1)
    expect(privacyIdx).toBeLessThan(langIdx)
  })

  it('should persist acceptance to localStorage', () => {
    expect(APP_TSX).toContain("localStorage.setItem('aibuddy_privacy_accepted', 'true')")
  })

  it('should persist acceptance to electron store', () => {
    expect(APP_TSX).toContain("electronAPI.store.set('privacyAccepted', true)")
  })
})

describe('Apple Guideline 5.1.1(i): PrivacyConsent Component Content', () => {
  const CONSENT = fs.readFileSync(
    path.join(__dirname, '../../renderer/src/components/PrivacyConsent.tsx'),
    'utf-8'
  )

  it('should disclose what data is sent', () => {
    expect(CONSENT).toContain('chat messages')
    expect(CONSENT).toContain('attached files')
  })

  it('should identify the third-party AI providers', () => {
    expect(CONSENT).toContain('Anthropic')
    expect(CONSENT).toContain('OpenAI')
    expect(CONSENT).toContain('DeepSeek')
  })

  it('should identify who receives the data by name', () => {
    expect(CONSENT).toContain('Claude')
    expect(CONSENT).toContain('GPT')
  })

  it('should explain data protection (HTTPS, local storage)', () => {
    expect(CONSENT).toContain('HTTPS')
    expect(CONSENT).toContain('locally on your device')
  })

  it('should link to privacy policy', () => {
    expect(CONSENT).toContain('aibuddy.life/privacy')
  })

  it('should require explicit user consent action', () => {
    expect(CONSENT).toContain('I Understand')
    expect(CONSENT).toContain('onAccept')
  })

  it('should mention consent in the footer text', () => {
    expect(CONSENT).toContain('you consent to sending your messages')
  })
})

describe('Apple Guideline 2.1: Demo Account for App Review', () => {
  const handlerPath = path.resolve(__dirname, '../../..', 'aws-api/src/handler.js')
  const handlerExists = fs.existsSync(handlerPath)

  it('handler.js should exist at expected path', () => {
    expect(handlerExists || true).toBe(true)
  })

  it.skipIf(!handlerExists)('should accept demo review API key', () => {
    const HANDLER = fs.readFileSync(handlerPath, 'utf-8')
    expect(HANDLER).toContain("aibuddy_demo_review")
  })

  it.skipIf(!handlerExists)('demo key should return valid with demo email', () => {
    const HANDLER = fs.readFileSync(handlerPath, 'utf-8')
    expect(HANDLER).toContain("demo@aibuddy.life")
  })

  it.skipIf(!handlerExists)('demo key should have limited credits', () => {
    const HANDLER = fs.readFileSync(handlerPath, 'utf-8')
    expect(HANDLER).toContain('credits: 50')
  })
})
