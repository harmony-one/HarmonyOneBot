import config from '../config'
import type { CredentialBody } from 'google-auth-library/build/src/auth/credentials'
import type { google } from '@google-cloud/text-to-speech/build/protos/protos'
import { v2 } from '@google-cloud/translate'
import { type LanguageResult } from '@google-cloud/translate/build/src/v2'

export interface TextToSpeechParams {
  text: string
  languageCode: string
  ssmlGender?: google.cloud.texttospeech.v1.SsmlVoiceGender | keyof typeof google.cloud.texttospeech.v1.SsmlVoiceGender | null
  voiceName?: string | null
}

class GcTextToSpeechClient {
  private readonly _client: v2.Translate
  constructor (credentials: CredentialBody) {
    this._client = new v2.Translate({ credentials })
  }

  async translate (text: string, targetLang: string): Promise<string> {
    const [strList] = await this._client.translate([text], targetLang)

    return strList[0]
  }

  async getLanguageList (): Promise<LanguageResult[]> {
    const [languages] = await this._client.getLanguages()
    return languages
  }
}

const credentials = JSON.parse(Buffer.from(config.gc.credentials, 'base64').toString('utf-8'))

export const gcTranslateClient = new GcTextToSpeechClient(credentials)
