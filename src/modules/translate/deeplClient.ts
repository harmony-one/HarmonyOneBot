import * as deepl from 'deepl-node'
import type { TargetLanguageCode } from 'deepl-node/dist/types'
import config from '../../config'

export const translator = new deepl.Translator(config.deepL.apikey)

const LANG_MAP: Record<string, TargetLanguageCode> = {
  en: 'en-US',
  pt: 'pt-BR'
}

export const SUPPORTED_TARGET_LANGUAGES: TargetLanguageCode[] = ['bg', 'cs', 'da', 'de', 'el', 'es', 'et', 'fi', 'fr', 'hu', 'id', 'it', 'ja', 'ko', 'lt', 'lv', 'nb', 'nl', 'pl', 'ro', 'ru', 'sk', 'sl', 'sv', 'tr', 'uk', 'zh']

export function mapToTargetLang (langCode: string): TargetLanguageCode | null {
  const targetLang = LANG_MAP[langCode]
  if (targetLang) {
    return targetLang
  }

  const result = SUPPORTED_TARGET_LANGUAGES.find((item) => item === langCode)

  if (result) {
    return result
  }

  return null
}
