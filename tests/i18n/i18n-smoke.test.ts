/**
 * Smoke Tests: Internationalization (i18n) System
 *
 * Validates that:
 * 1. All 34 locale JSON files exist and are valid JSON
 * 2. Every locale has the same translation key structure as English
 * 3. No translation values are empty strings
 * 4. i18n config module exports correctly
 * 5. Language metadata covers all App Store languages
 * 6. RTL languages are flagged properly
 * 7. System prompt injects language instructions for non-English
 */

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'fs'
import { resolve } from 'path'

const localesDir = resolve(__dirname, '../../renderer/src/i18n/locales')
const i18nDir = resolve(__dirname, '../../renderer/src/i18n')

function getNestedKeys(obj: any, prefix = ''): string[] {
  const keys: string[] = []
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...getNestedKeys(value, fullKey))
    } else {
      keys.push(fullKey)
    }
  }
  return keys.sort()
}

describe('i18n — Locale Files Exist', () => {
  const expectedLocales = [
    'en', 'es', 'fr', 'de', 'ja', 'ko',
    'zh-Hans', 'zh-Hant', 'pt-BR', 'pt-PT',
    'it', 'nl', 'ru', 'ar', 'hi', 'tr',
    'pl', 'sv', 'th', 'da', 'fi', 'no',
    'cs', 'el', 'he', 'hu', 'id', 'ms',
    'ro', 'sk', 'uk', 'hr', 'vi', 'ca',
  ]

  for (const locale of expectedLocales) {
    it(`${locale}.json exists`, () => {
      const filePath = resolve(localesDir, `${locale}.json`)
      expect(existsSync(filePath)).toBe(true)
    })
  }

  it('locales directory has all expected files', () => {
    const files = readdirSync(localesDir).filter(f => f.endsWith('.json'))
    expect(files.length).toBeGreaterThanOrEqual(expectedLocales.length)
  })
})

describe('i18n — All Locale Files Are Valid JSON', () => {
  const files = readdirSync(localesDir).filter(f => f.endsWith('.json'))

  for (const file of files) {
    it(`${file} is valid JSON`, () => {
      const content = readFileSync(resolve(localesDir, file), 'utf-8')
      expect(() => JSON.parse(content)).not.toThrow()
    })
  }
})

describe('i18n — Key Structure Consistency', () => {
  const enContent = JSON.parse(readFileSync(resolve(localesDir, 'en.json'), 'utf-8'))
  const enKeys = getNestedKeys(enContent)

  const files = readdirSync(localesDir).filter(f => f.endsWith('.json') && f !== 'en.json')

  for (const file of files) {
    it(`${file} has all keys from en.json`, () => {
      const content = JSON.parse(readFileSync(resolve(localesDir, file), 'utf-8'))
      const fileKeys = getNestedKeys(content)

      const missingKeys = enKeys.filter(k => !fileKeys.includes(k))
      expect(missingKeys).toEqual([])
    })
  }
})

describe('i18n — No Empty Translations', () => {
  const files = readdirSync(localesDir).filter(f => f.endsWith('.json'))

  function findEmptyValues(obj: any, prefix = ''): string[] {
    const empties: string[] = []
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key
      if (typeof value === 'string' && value.trim() === '') {
        empties.push(fullKey)
      } else if (typeof value === 'object' && value !== null) {
        empties.push(...findEmptyValues(value, fullKey))
      }
    }
    return empties
  }

  for (const file of files) {
    it(`${file} has no empty translation values`, () => {
      const content = JSON.parse(readFileSync(resolve(localesDir, file), 'utf-8'))
      const empties = findEmptyValues(content)
      expect(empties).toEqual([])
    })
  }
})

describe('i18n — Brand Names Preserved', () => {
  const files = readdirSync(localesDir).filter(f => f.endsWith('.json'))

  for (const file of files) {
    it(`${file} keeps app.name as "AIBuddy"`, () => {
      const content = JSON.parse(readFileSync(resolve(localesDir, file), 'utf-8'))
      expect(content.app.name).toBe('AIBuddy')
    })
  }
})

describe('i18n — Interpolation Placeholders Preserved', () => {
  const files = readdirSync(localesDir).filter(f => f.endsWith('.json'))
  const enContent = JSON.parse(readFileSync(resolve(localesDir, 'en.json'), 'utf-8'))

  function findPlaceholders(str: string): string[] {
    const matches = str.match(/\{\{(\w+)\}\}/g)
    return matches ? matches.sort() : []
  }

  function checkPlaceholders(enObj: any, locObj: any, prefix = ''): string[] {
    const errors: string[] = []
    for (const [key, enVal] of Object.entries(enObj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key
      const locVal = locObj?.[key]
      if (typeof enVal === 'string' && typeof locVal === 'string') {
        const enPh = findPlaceholders(enVal)
        const locPh = findPlaceholders(locVal)
        if (enPh.length > 0 && JSON.stringify(enPh) !== JSON.stringify(locPh)) {
          errors.push(`${fullKey}: expected ${enPh.join(',')} but got ${locPh.join(',')}`)
        }
      } else if (typeof enVal === 'object' && enVal !== null) {
        errors.push(...checkPlaceholders(enVal, locVal || {}, fullKey))
      }
    }
    return errors
  }

  for (const file of files) {
    it(`${file} preserves {{interpolation}} placeholders`, () => {
      const content = JSON.parse(readFileSync(resolve(localesDir, file), 'utf-8'))
      const errors = checkPlaceholders(enContent, content)
      expect(errors).toEqual([])
    })
  }
})

describe('i18n — Infrastructure Files Exist', () => {
  it('i18n/index.ts exists', () => {
    expect(existsSync(resolve(i18nDir, 'index.ts'))).toBe(true)
  })

  it('i18n/languages.ts exists', () => {
    expect(existsSync(resolve(i18nDir, 'languages.ts'))).toBe(true)
  })

  it('LanguageSelector component exists', () => {
    expect(existsSync(resolve(__dirname, '../../renderer/src/components/LanguageSelector.tsx'))).toBe(true)
  })
})

describe('i18n — Language Metadata', () => {
  it('languages.ts has all 34 languages', () => {
    const langFile = readFileSync(resolve(i18nDir, 'languages.ts'), 'utf-8')
    const matches = langFile.match(/code:\s*'[^']+'/g) || []
    expect(matches.length).toBeGreaterThanOrEqual(34)
  })

  it('RTL languages are flagged', () => {
    const langFile = readFileSync(resolve(i18nDir, 'languages.ts'), 'utf-8')
    expect(langFile).toContain("code: 'ar'")
    expect(langFile).toContain("dir: 'rtl'")
    expect(langFile).toContain("code: 'he'")
  })

  it('each language has a native name in non-ASCII for non-Latin scripts', () => {
    const langFile = readFileSync(resolve(i18nDir, 'languages.ts'), 'utf-8')
    expect(langFile).toContain('日本語')
    expect(langFile).toContain('한국어')
    expect(langFile).toContain('简体中文')
    expect(langFile).toContain('繁體中文')
    expect(langFile).toContain('Русский')
    expect(langFile).toContain('العربية')
    expect(langFile).toContain('हिन्दी')
    expect(langFile).toContain('ไทย')
    expect(langFile).toContain('Ελληνικά')
    expect(langFile).toContain('עברית')
    expect(langFile).toContain('Українська')
    expect(langFile).toContain('Tiếng Việt')
  })
})

describe('i18n — System Prompt Language Injection', () => {
  it('system-prompt.ts has uiLanguage in SystemPromptContext', () => {
    const promptFile = readFileSync(
      resolve(__dirname, '../../packages/prompts/src/system-prompt.ts'),
      'utf-8'
    )
    expect(promptFile).toContain('uiLanguage')
  })

  it('system-prompt.ts injects LANGUAGE INSTRUCTION for non-English', () => {
    const promptFile = readFileSync(
      resolve(__dirname, '../../packages/prompts/src/system-prompt.ts'),
      'utf-8'
    )
    expect(promptFile).toContain('LANGUAGE INSTRUCTION')
    expect(promptFile).toContain('You MUST reply in')
  })

  it('system-prompt.ts skips language injection for English', () => {
    const promptFile = readFileSync(
      resolve(__dirname, '../../packages/prompts/src/system-prompt.ts'),
      'utf-8'
    )
    expect(promptFile).toContain("context.uiLanguage !== 'en'")
  })
})

describe('i18n — App Integration', () => {
  it('main.tsx imports i18n', () => {
    const mainFile = readFileSync(
      resolve(__dirname, '../../renderer/src/main.tsx'),
      'utf-8'
    )
    expect(mainFile).toContain("import './i18n'")
  })

  it('App.tsx imports useTranslation', () => {
    const appFile = readFileSync(
      resolve(__dirname, '../../renderer/src/App.tsx'),
      'utf-8'
    )
    expect(appFile).toContain("useTranslation")
    expect(appFile).toContain("LanguageSelector")
  })

  it('App.tsx passes uiLanguage to generateSystemPrompt', () => {
    const appFile = readFileSync(
      resolve(__dirname, '../../renderer/src/App.tsx'),
      'utf-8'
    )
    expect(appFile).toContain('uiLanguage: i18n.language')
  })

  it('App.tsx sets dir attribute for RTL languages', () => {
    const appFile = readFileSync(
      resolve(__dirname, '../../renderer/src/App.tsx'),
      'utf-8'
    )
    expect(appFile).toContain("dir={")
    expect(appFile).toContain("'rtl'")
  })
})
