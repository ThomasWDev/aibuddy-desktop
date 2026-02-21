import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { SUPPORTED_LANGUAGES } from './languages'

import en from './locales/en.json'
import es from './locales/es.json'
import fr from './locales/fr.json'
import de from './locales/de.json'
import ja from './locales/ja.json'
import ko from './locales/ko.json'
import zhHans from './locales/zh-Hans.json'
import zhHant from './locales/zh-Hant.json'
import pt from './locales/pt-BR.json'
import ptPT from './locales/pt-PT.json'
import it from './locales/it.json'
import nl from './locales/nl.json'
import ru from './locales/ru.json'
import ar from './locales/ar.json'
import hi from './locales/hi.json'
import tr from './locales/tr.json'
import pl from './locales/pl.json'
import sv from './locales/sv.json'
import th from './locales/th.json'
import da from './locales/da.json'
import fi from './locales/fi.json'
import no from './locales/no.json'
import cs from './locales/cs.json'
import el from './locales/el.json'
import he from './locales/he.json'
import hu from './locales/hu.json'
import id from './locales/id.json'
import ms from './locales/ms.json'
import ro from './locales/ro.json'
import sk from './locales/sk.json'
import uk from './locales/uk.json'
import hr from './locales/hr.json'
import vi from './locales/vi.json'
import ca from './locales/ca.json'

const resources = {
  en: { translation: en },
  'en-GB': { translation: en },
  'en-AU': { translation: en },
  'en-CA': { translation: en },
  es: { translation: es },
  'es-MX': { translation: es },
  fr: { translation: fr },
  'fr-CA': { translation: fr },
  de: { translation: de },
  ja: { translation: ja },
  ko: { translation: ko },
  'zh-Hans': { translation: zhHans },
  'zh-CN': { translation: zhHans },
  'zh-Hant': { translation: zhHant },
  'zh-TW': { translation: zhHant },
  'pt-BR': { translation: pt },
  'pt-PT': { translation: ptPT },
  it: { translation: it },
  nl: { translation: nl },
  ru: { translation: ru },
  ar: { translation: ar },
  hi: { translation: hi },
  tr: { translation: tr },
  pl: { translation: pl },
  sv: { translation: sv },
  th: { translation: th },
  da: { translation: da },
  fi: { translation: fi },
  no: { translation: no },
  cs: { translation: cs },
  el: { translation: el },
  he: { translation: he },
  hu: { translation: hu },
  id: { translation: id },
  ms: { translation: ms },
  ro: { translation: ro },
  sk: { translation: sk },
  uk: { translation: uk },
  hr: { translation: hr },
  vi: { translation: vi },
  ca: { translation: ca },
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'aibuddy_language',
      caches: ['localStorage'],
    },
  })

export function getLanguageDisplayName(code: string): string {
  const lang = SUPPORTED_LANGUAGES.find(l => l.code === code)
  return lang?.nativeName ?? code
}

export function isRTL(code: string): boolean {
  return ['ar', 'he'].includes(code)
}

export default i18n
