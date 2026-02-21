import React, { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Globe, Check, Search } from 'lucide-react'
import { SUPPORTED_LANGUAGES, type LanguageInfo } from '../i18n/languages'

interface LanguageSelectorProps {
  onLanguageSelected: (code: string) => void
}

export function LanguageSelector({ onLanguageSelected }: LanguageSelectorProps) {
  const { i18n } = useTranslation()
  const [selectedLang, setSelectedLang] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [hoveredLang, setHoveredLang] = useState<string | null>(null)

  const filteredLanguages = useMemo(() => {
    if (!search.trim()) return SUPPORTED_LANGUAGES
    const q = search.toLowerCase()
    return SUPPORTED_LANGUAGES.filter(
      l =>
        l.nativeName.toLowerCase().includes(q) ||
        l.englishName.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q)
    )
  }, [search])

  const handleSelect = (lang: LanguageInfo) => {
    setSelectedLang(lang.code)
    i18n.changeLanguage(lang.code)
  }

  const handleContinue = () => {
    if (selectedLang) {
      localStorage.setItem('aibuddy_language', selectedLang)
      localStorage.setItem('aibuddy_language_selected', 'true')
      onLanguageSelected(selectedLang)
    }
  }

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center z-50"
      style={{
        background: 'linear-gradient(135deg, #0f0a1e 0%, #1a1035 40%, #0d1b2a 100%)',
      }}
    >
      <div className="w-full max-w-3xl px-6 flex flex-col items-center">
        {/* Logo & Title */}
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center mb-6"
          style={{
            background: 'linear-gradient(135deg, #ec4899, #f97316)',
            boxShadow: '0 12px 48px rgba(236, 72, 153, 0.4)',
          }}
        >
          <Globe className="w-12 h-12 text-white" />
        </div>

        <h1 className="text-4xl font-black text-white mb-2 text-center">
          Choose Your Language
        </h1>
        <p className="text-lg text-slate-400 mb-8 text-center">
          Select your preferred language to get started
        </p>

        {/* Search */}
        <div className="w-full max-w-md mb-6 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search languages..."
            className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder-slate-500 outline-none transition-all focus:ring-2"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
            autoFocus
          />
        </div>

        {/* Language Grid */}
        <div
          className="w-full max-h-[50vh] overflow-y-auto rounded-2xl p-4"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {filteredLanguages.map(lang => {
              const isSelected = selectedLang === lang.code
              const isHovered = hoveredLang === lang.code
              return (
                <button
                  key={lang.code}
                  onClick={() => handleSelect(lang)}
                  onMouseEnter={() => setHoveredLang(lang.code)}
                  onMouseLeave={() => setHoveredLang(null)}
                  className="relative flex flex-col items-center gap-1.5 px-3 py-4 rounded-xl text-center transition-all"
                  style={{
                    background: isSelected
                      ? 'linear-gradient(135deg, rgba(236,72,153,0.2), rgba(249,115,22,0.2))'
                      : isHovered
                        ? 'rgba(255,255,255,0.06)'
                        : 'transparent',
                    border: isSelected
                      ? '2px solid #ec4899'
                      : '2px solid transparent',
                    transform: isHovered ? 'scale(1.03)' : 'scale(1)',
                  }}
                  dir={lang.dir}
                >
                  {isSelected && (
                    <div
                      className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: '#ec4899' }}
                    >
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                  <span className="text-2xl">{lang.flag}</span>
                  <span className="text-sm font-bold text-white leading-tight">
                    {lang.nativeName}
                  </span>
                  <span className="text-[10px] text-slate-500 leading-tight">
                    {lang.englishName}
                  </span>
                </button>
              )
            })}
          </div>

          {filteredLanguages.length === 0 && (
            <p className="text-center text-slate-500 py-8">
              No languages match your search
            </p>
          )}
        </div>

        {/* Continue Button */}
        <button
          onClick={handleContinue}
          disabled={!selectedLang}
          className="mt-8 px-12 py-4 rounded-2xl text-lg font-bold text-white transition-all hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
          style={{
            background: selectedLang
              ? 'linear-gradient(135deg, #ec4899, #f97316)'
              : 'rgba(255,255,255,0.1)',
            boxShadow: selectedLang
              ? '0 8px 32px rgba(236, 72, 153, 0.4)'
              : 'none',
          }}
        >
          {selectedLang ? (
            <>
              {SUPPORTED_LANGUAGES.find(l => l.code === selectedLang)?.flag}{' '}
              {getContinueText(selectedLang)}
            </>
          ) : (
            'Select a language to continue'
          )}
        </button>
      </div>
    </div>
  )
}

function getContinueText(code: string): string {
  const map: Record<string, string> = {
    en: 'Continue',
    es: 'Continuar',
    fr: 'Continuer',
    de: 'Weiter',
    ja: '続ける',
    ko: '계속',
    'zh-Hans': '继续',
    'zh-Hant': '繼續',
    'pt-BR': 'Continuar',
    'pt-PT': 'Continuar',
    it: 'Continua',
    nl: 'Doorgaan',
    ru: 'Продолжить',
    ar: 'متابعة',
    hi: 'जारी रखें',
    tr: 'Devam',
    pl: 'Kontynuuj',
    sv: 'Fortsätt',
    th: 'ดำเนินการต่อ',
    da: 'Fortsæt',
    fi: 'Jatka',
    no: 'Fortsett',
    cs: 'Pokračovat',
    el: 'Συνέχεια',
    he: 'המשך',
    hu: 'Tovább',
    id: 'Lanjutkan',
    ms: 'Teruskan',
    ro: 'Continuă',
    sk: 'Pokračovať',
    uk: 'Продовжити',
    hr: 'Nastavi',
    vi: 'Tiếp tục',
    ca: 'Continua',
  }
  return map[code] ?? 'Continue'
}
