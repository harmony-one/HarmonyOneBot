import axios, { type AxiosInstance } from 'axios'

interface Voice {
  'voice_id': string
  'name': string
  'samples': null
  'category': 'premade'
  'fine_tuning': {
    'language': null
    'is_allowed_to_fine_tune': boolean
    'fine_tuning_requested': boolean
    'finetuning_state': 'not_started'
    'verification_attempts': null
    'verification_failures': []
    'verification_attempts_count': 0
    'slice_ids': null
    'manual_verification': null
    'manual_verification_requested': false
  }
  'labels': {
    'accent': 'american' | string
    'description': 'strong' | string
    'age': 'young' | string
    'gender': 'female' | string
    'use case': 'narration' | string
  }
  'description': null
  'preview_url': string
  'available_for_tiers': []
  'settings': null
  'sharing': null
  'high_quality_base_model_ids': []
}

export class ElevenlabsClient {
  private readonly _token: string
  private readonly _httpClient: AxiosInstance
  constructor (apiKey: string) {
    this._token = apiKey

    this._httpClient = axios.create({
      baseURL: 'https://api.elevenlabs.io',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
        'xi-api-key': apiKey
      }
    })
  }

  public async textToSpeech ({ text, voiceId }: { text: string, voiceId: string }): Promise<string | Uint8Array | null | undefined> {
    const response = await this._httpClient.post(`/v1/text-to-speech/${voiceId}`, {
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.5
      }
    }, { responseType: 'arraybuffer' })

    return Buffer.from(response.data, 'binary')
  }

  public async voiceList (): Promise<Voice[]> {
    const response = await this._httpClient.get<{ voices: Voice[] }>('/v1/voices')
    return response.data.voices
  }
}
