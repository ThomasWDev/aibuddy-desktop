export interface LanguageInfo {
  code: string
  nativeName: string
  englishName: string
  flag: string
  dir: 'ltr' | 'rtl'
}

export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  { code: 'en', nativeName: 'English', englishName: 'English', flag: '🇺🇸', dir: 'ltr' },
  { code: 'es', nativeName: 'Español', englishName: 'Spanish', flag: '🇪🇸', dir: 'ltr' },
  { code: 'fr', nativeName: 'Français', englishName: 'French', flag: '🇫🇷', dir: 'ltr' },
  { code: 'de', nativeName: 'Deutsch', englishName: 'German', flag: '🇩🇪', dir: 'ltr' },
  { code: 'ja', nativeName: '日本語', englishName: 'Japanese', flag: '🇯🇵', dir: 'ltr' },
  { code: 'ko', nativeName: '한국어', englishName: 'Korean', flag: '🇰🇷', dir: 'ltr' },
  { code: 'zh-Hans', nativeName: '简体中文', englishName: 'Chinese (Simplified)', flag: '🇨🇳', dir: 'ltr' },
  { code: 'zh-Hant', nativeName: '繁體中文', englishName: 'Chinese (Traditional)', flag: '🇹🇼', dir: 'ltr' },
  { code: 'pt-BR', nativeName: 'Português (Brasil)', englishName: 'Portuguese (Brazil)', flag: '🇧🇷', dir: 'ltr' },
  { code: 'pt-PT', nativeName: 'Português (Portugal)', englishName: 'Portuguese (Portugal)', flag: '🇵🇹', dir: 'ltr' },
  { code: 'it', nativeName: 'Italiano', englishName: 'Italian', flag: '🇮🇹', dir: 'ltr' },
  { code: 'nl', nativeName: 'Nederlands', englishName: 'Dutch', flag: '🇳🇱', dir: 'ltr' },
  { code: 'ru', nativeName: 'Русский', englishName: 'Russian', flag: '🇷🇺', dir: 'ltr' },
  { code: 'ar', nativeName: 'العربية', englishName: 'Arabic', flag: '🇸🇦', dir: 'rtl' },
  { code: 'hi', nativeName: 'हिन्दी', englishName: 'Hindi', flag: '🇮🇳', dir: 'ltr' },
  { code: 'tr', nativeName: 'Türkçe', englishName: 'Turkish', flag: '🇹🇷', dir: 'ltr' },
  { code: 'pl', nativeName: 'Polski', englishName: 'Polish', flag: '🇵🇱', dir: 'ltr' },
  { code: 'sv', nativeName: 'Svenska', englishName: 'Swedish', flag: '🇸🇪', dir: 'ltr' },
  { code: 'th', nativeName: 'ไทย', englishName: 'Thai', flag: '🇹🇭', dir: 'ltr' },
  { code: 'da', nativeName: 'Dansk', englishName: 'Danish', flag: '🇩🇰', dir: 'ltr' },
  { code: 'fi', nativeName: 'Suomi', englishName: 'Finnish', flag: '🇫🇮', dir: 'ltr' },
  { code: 'no', nativeName: 'Norsk', englishName: 'Norwegian', flag: '🇳🇴', dir: 'ltr' },
  { code: 'cs', nativeName: 'Čeština', englishName: 'Czech', flag: '🇨🇿', dir: 'ltr' },
  { code: 'el', nativeName: 'Ελληνικά', englishName: 'Greek', flag: '🇬🇷', dir: 'ltr' },
  { code: 'he', nativeName: 'עברית', englishName: 'Hebrew', flag: '🇮🇱', dir: 'rtl' },
  { code: 'hu', nativeName: 'Magyar', englishName: 'Hungarian', flag: '🇭🇺', dir: 'ltr' },
  { code: 'id', nativeName: 'Bahasa Indonesia', englishName: 'Indonesian', flag: '🇮🇩', dir: 'ltr' },
  { code: 'ms', nativeName: 'Bahasa Melayu', englishName: 'Malay', flag: '🇲🇾', dir: 'ltr' },
  { code: 'ro', nativeName: 'Română', englishName: 'Romanian', flag: '🇷🇴', dir: 'ltr' },
  { code: 'sk', nativeName: 'Slovenčina', englishName: 'Slovak', flag: '🇸🇰', dir: 'ltr' },
  { code: 'uk', nativeName: 'Українська', englishName: 'Ukrainian', flag: '🇺🇦', dir: 'ltr' },
  { code: 'hr', nativeName: 'Hrvatski', englishName: 'Croatian', flag: '🇭🇷', dir: 'ltr' },
  { code: 'vi', nativeName: 'Tiếng Việt', englishName: 'Vietnamese', flag: '🇻🇳', dir: 'ltr' },
  { code: 'ca', nativeName: 'Català', englishName: 'Catalan', flag: '🏴', dir: 'ltr' },
]

export const LANGUAGE_CODE_TO_FULL_NAME: Record<string, string> = {}
for (const lang of SUPPORTED_LANGUAGES) {
  LANGUAGE_CODE_TO_FULL_NAME[lang.code] = lang.englishName
}
