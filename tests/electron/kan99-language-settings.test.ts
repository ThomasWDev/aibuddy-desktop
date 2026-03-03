import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { SUPPORTED_LANGUAGES, LANGUAGE_CODE_TO_FULL_NAME, type LanguageInfo } from '../../renderer/src/i18n/languages'

/**
 * KAN-99: "No option to change app language"
 *
 * Fix: Added language selector in both desktop Settings modal and
 * extension preferences tab. Users can choose from 33 supported languages.
 * Selection persists via localStorage and electron store / extension state.
 */

const APP_TSX = fs.readFileSync(
  path.join(__dirname, '../../renderer/src/App.tsx'),
  'utf-8'
)

const I18N_CONFIG = fs.readFileSync(
  path.join(__dirname, '../../renderer/src/i18n/index.ts'),
  'utf-8'
)

describe('KAN-99: Language Settings', () => {
  describe('SUPPORTED_LANGUAGES data integrity', () => {
    it('should export at least 30 languages', () => {
      expect(SUPPORTED_LANGUAGES.length).toBeGreaterThanOrEqual(30)
    })

    it('should include English as the first language', () => {
      expect(SUPPORTED_LANGUAGES[0].code).toBe('en')
      expect(SUPPORTED_LANGUAGES[0].englishName).toBe('English')
    })

    it('should have required fields for every language', () => {
      for (const lang of SUPPORTED_LANGUAGES) {
        expect(lang.code).toBeTruthy()
        expect(lang.nativeName).toBeTruthy()
        expect(lang.englishName).toBeTruthy()
        expect(lang.flag).toBeTruthy()
        expect(['ltr', 'rtl']).toContain(lang.dir)
      }
    })

    it('should include RTL languages (Arabic and Hebrew)', () => {
      const rtlLangs = SUPPORTED_LANGUAGES.filter(l => l.dir === 'rtl')
      expect(rtlLangs.length).toBeGreaterThanOrEqual(2)
      const rtlCodes = rtlLangs.map(l => l.code)
      expect(rtlCodes).toContain('ar')
      expect(rtlCodes).toContain('he')
    })

    it('should have unique codes', () => {
      const codes = SUPPORTED_LANGUAGES.map(l => l.code)
      expect(new Set(codes).size).toBe(codes.length)
    })

    it('should have LANGUAGE_CODE_TO_FULL_NAME for every supported language', () => {
      for (const lang of SUPPORTED_LANGUAGES) {
        expect(LANGUAGE_CODE_TO_FULL_NAME[lang.code]).toBe(lang.englishName)
      }
    })
  })

  describe('Desktop Settings UI', () => {
    it('should have a Language label in settings', () => {
      expect(APP_TSX).toContain('Language')
    })

    it('should render a select element using SUPPORTED_LANGUAGES', () => {
      expect(APP_TSX).toContain('SUPPORTED_LANGUAGES.map')
    })

    it('should call i18n.changeLanguage on selection', () => {
      const langSection = APP_TSX.indexOf('KAN-99 FIX')
      expect(langSection).toBeGreaterThan(-1)
      const nextChunk = APP_TSX.substring(langSection, langSection + 800)
      expect(nextChunk).toContain('i18n.changeLanguage')
    })

    it('should persist language to localStorage', () => {
      const langSection = APP_TSX.indexOf('KAN-99 FIX')
      const nextChunk = APP_TSX.substring(langSection, langSection + 800)
      expect(nextChunk).toContain("localStorage.setItem('aibuddy_language'")
    })

    it('should persist language to electron store', () => {
      const langSection = APP_TSX.indexOf('KAN-99 FIX')
      const nextChunk = APP_TSX.substring(langSection, langSection + 800)
      expect(nextChunk).toContain("electronAPI.store.set('uiLanguage'")
    })

    it('should display flag, nativeName, and englishName for each option', () => {
      const langSection = APP_TSX.indexOf('KAN-99 FIX')
      const nextChunk = APP_TSX.substring(langSection, langSection + 1200)
      expect(nextChunk).toContain('lang.flag')
      expect(nextChunk).toContain('lang.nativeName')
      expect(nextChunk).toContain('lang.englishName')
    })
  })

  describe('i18n configuration', () => {
    it('should use localStorage for language detection', () => {
      expect(I18N_CONFIG).toContain("lookupLocalStorage: 'aibuddy_language'")
    })

    it('should fallback to English', () => {
      expect(I18N_CONFIG).toContain("fallbackLng: 'en'")
    })

    it('should have locale resources for all supported languages', () => {
      for (const lang of SUPPORTED_LANGUAGES) {
        const bareKey = `${lang.code}: {`
        const quotedKey = `'${lang.code}': {`
        const hasResource = I18N_CONFIG.includes(bareKey) || I18N_CONFIG.includes(quotedKey)
        if (!hasResource) {
          const aliasedCodes: Record<string, string[]> = {
            'en': ['en-GB', 'en-AU', 'en-CA'],
            'es': ['es-MX'],
            'fr': ['fr-CA'],
            'zh-Hans': ['zh-CN'],
            'zh-Hant': ['zh-TW'],
          }
          const aliases = Object.entries(aliasedCodes).find(([, v]) => v.includes(lang.code))
          const parentHasResource = aliases ? (I18N_CONFIG.includes(`${aliases[0]}: {`) || I18N_CONFIG.includes(`'${aliases[0]}': {`)) : false
          expect(hasResource || parentHasResource).toBe(true)
        }
      }
    })

    it('should detect language from localStorage before navigator', () => {
      expect(I18N_CONFIG).toContain("order: ['localStorage', 'navigator']")
    })
  })

  describe('Regression guards', () => {
    it('should import SUPPORTED_LANGUAGES in App.tsx', () => {
      expect(APP_TSX).toContain("import { SUPPORTED_LANGUAGES } from './i18n/languages'")
    })

    it('should use i18n.language as select value for controlled component', () => {
      const langSection = APP_TSX.indexOf('KAN-99 FIX')
      const nextChunk = APP_TSX.substring(langSection, langSection + 400)
      expect(nextChunk).toContain('i18n.language')
    })
  })
})
