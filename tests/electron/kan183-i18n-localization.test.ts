/**
 * KAN-183 TDD: App Language Change Does Not Fully Apply
 *
 * Root cause: Most components have hardcoded English strings and don't use
 * useTranslation() / t(). Translation keys exist in all 34 locales but
 * are unused in WelcomeScreen, HistorySidebar, InterviewPanel.
 *
 * Fix: Wire up components with useTranslation() and t() calls.
 */

import { readFileSync, readdirSync } from 'fs'
import { resolve } from 'path'
import { describe, it, expect } from 'vitest'

const ROOT = resolve(__dirname, '../..')
const read = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf-8')
const localesDir = resolve(ROOT, 'renderer/src/i18n/locales')

describe('KAN-183 — WelcomeScreen must use translation keys', () => {
  const src = read('renderer/src/components/welcome/WelcomeScreen.tsx')

  it('must import useTranslation from react-i18next', () => {
    expect(src).toContain('useTranslation')
  })

  it('must call useTranslation() hook', () => {
    expect(src).toMatch(/const\s*\{.*t.*\}\s*=\s*useTranslation/)
  })

  it('must use t() for greeting text, not hardcoded "Hey there, Coder!"', () => {
    expect(src).not.toMatch(/>\s*Hey there, Coder/)
    expect(src).toContain("t('welcome.hero.greeting')")
  })

  it('must use t() for subtitle text', () => {
    expect(src).toContain("t('welcome.hero.subtitle')")
  })

  it('must use t() for "Open Project" button', () => {
    expect(src).toContain("t('welcome.hero.openProject')")
  })

  it('must use t() for "Start Chatting" button', () => {
    expect(src).toContain("t('welcome.hero.startChatting')")
  })

  it('must use t() for "Recent Projects" heading', () => {
    expect(src).toContain("t('welcome.hero.recentProjects')")
  })

  it('must use t() for API Key Set / No API Key chip', () => {
    expect(src).toContain("t('welcome.hero.apiKeySet')")
    expect(src).toContain("t('welcome.hero.noApiKey')")
  })

  it('must use t() for Settings button', () => {
    expect(src).toContain("t('header.settings')")
  })

  it('must use t() for Get Credits button', () => {
    expect(src).toMatch(/t\('header\.buyCredits'\)/)
  })
})

describe('KAN-183 — HistorySidebar must use translation keys', () => {
  const src = read('renderer/src/components/HistorySidebar.tsx')

  it('must import useTranslation from react-i18next', () => {
    expect(src).toContain('useTranslation')
  })

  it('must use t() for "Chat History" title', () => {
    expect(src).toContain("t('historySidebar.title')")
  })

  it('must use t() for "New Chat" button', () => {
    expect(src).toContain("t('historySidebar.newChat')")
  })

  it('must use t() for search placeholder', () => {
    expect(src).toContain("t('historySidebar.search')")
  })

  it('must use t() for time group labels', () => {
    expect(src).toContain("t('historySidebar.today')")
    expect(src).toContain("t('historySidebar.yesterday')")
    expect(src).toContain("t('historySidebar.older')")
  })

  it('must use t() for empty state', () => {
    expect(src).toContain("t('historySidebar.noHistory')")
  })
})

describe('KAN-183 — InterviewPanel must use translation keys', () => {
  const src = read('renderer/src/components/InterviewPanel.tsx')

  it('must import useTranslation from react-i18next', () => {
    expect(src).toContain('useTranslation')
  })

  it('must use t() for Interview Mode-specific strings', () => {
    expect(src).toContain("t('interview.askAI')")
    expect(src).toContain("t('interview.noTranscript')")
  })
})

describe('KAN-183 — Locale files must have WelcomeScreen hero keys', () => {
  const enContent = JSON.parse(readFileSync(resolve(localesDir, 'en.json'), 'utf-8'))

  it('en.json must have welcome.hero section', () => {
    expect(enContent.welcome.hero).toBeDefined()
    expect(enContent.welcome.hero.greeting).toBeTruthy()
    expect(enContent.welcome.hero.openProject).toBeTruthy()
    expect(enContent.welcome.hero.startChatting).toBeTruthy()
    expect(enContent.welcome.hero.recentProjects).toBeTruthy()
  })

  it('all locales must have welcome.hero keys', () => {
    const files = readdirSync(localesDir).filter(f => f.endsWith('.json'))
    for (const file of files) {
      const content = JSON.parse(readFileSync(resolve(localesDir, file), 'utf-8'))
      expect(content.welcome?.hero?.greeting, `${file} missing welcome.hero.greeting`).toBeTruthy()
      expect(content.welcome?.hero?.openProject, `${file} missing welcome.hero.openProject`).toBeTruthy()
    }
  })
})
