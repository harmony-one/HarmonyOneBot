import GcTextToSpeech, { type TextToSpeechClient } from '@google-cloud/text-to-speech'
import config from '../config'
import type { CredentialBody } from 'google-auth-library/build/src/auth/credentials'

export interface TextToSpeechParams {
  text: string
  languageCode: 'en-US' | 'yue-Hant-HK' | 'ru-RU' | 'cmn-CN' | 'de-DE' | 'es-ES'
  ssmlGender?: 'MALE' | 'FEMALE'
  voiceName?: string
}

class GcTextToSpeechClient {
  private readonly _client: TextToSpeechClient
  constructor (credentials: CredentialBody) {
    this._client = new GcTextToSpeech.TextToSpeechClient({ credentials })
  }

  async ssmlTextToSpeech ({ text, languageCode, ssmlGender, voiceName }: TextToSpeechParams): Promise<string | Uint8Array | null | undefined> {
    const ssml = `<speak>${text}</speak>`
    const [response] = await this._client.synthesizeSpeech({
      input: { ssml },
      voice: { languageCode, ssmlGender, name: voiceName },
      audioConfig: { audioEncoding: 'OGG_OPUS' }
    })

    return response.audioContent
  }

  async textToSpeech ({ text, languageCode, voiceName }: TextToSpeechParams): Promise<string | Uint8Array | null | undefined> {
    const [response] = await this._client.synthesizeSpeech({
      input: { text },
      voice: { languageCode, name: voiceName },
      audioConfig: { audioEncoding: 'OGG_OPUS' }
    })

    return response.audioContent
  }
}

const credentials = JSON.parse(Buffer.from(config.gc.credentials, 'base64').toString('utf-8'))

export const gcTextToSpeedClient = new GcTextToSpeechClient(credentials)
