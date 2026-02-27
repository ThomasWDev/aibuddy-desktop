import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const APP_TSX = fs.readFileSync(
  path.join(__dirname, '../../renderer/src/App.tsx'),
  'utf-8'
)

describe('KAN-99: Language Selector in Settings Modal', () => {
  it('settings modal should contain a Language label', () => {
    expect(APP_TSX).toContain('>Language</label>')
  })

  it('settings modal should have a <select> for language selection', () => {
    expect(APP_TSX).toContain('i18n.changeLanguage(lang)')
  })

  it('should persist language choice to localStorage', () => {
    expect(APP_TSX).toContain("localStorage.setItem('aibuddy_language'")
  })

  it('should persist language choice to electron store', () => {
    expect(APP_TSX).toContain("electronAPI.store.set('uiLanguage'")
  })

  it('should render SUPPORTED_LANGUAGES options in the dropdown', () => {
    expect(APP_TSX).toContain('SUPPORTED_LANGUAGES.map(lang')
  })

  it('should show native name and english name for each language', () => {
    expect(APP_TSX).toContain('lang.nativeName')
    expect(APP_TSX).toContain('lang.englishName')
  })

  it('should show flag emoji for each language option', () => {
    expect(APP_TSX).toContain('lang.flag')
  })

  it('should track language settings change via analytics', () => {
    expect(APP_TSX).toContain("trackSettingsChange('language'")
  })

  it('should import SUPPORTED_LANGUAGES from i18n/languages', () => {
    expect(APP_TSX).toContain("import { SUPPORTED_LANGUAGES } from './i18n/languages'")
  })

  it('language dropdown should use current i18n.language as value', () => {
    expect(APP_TSX).toContain('value={i18n.language}')
  })
})
