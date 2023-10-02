import axios, { type AxiosInstance } from 'axios'

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

  public async textToSpeech ({ text, voiceId }: { text: string, voiceId: string }): Promise<Buffer> {
    const response = await this._httpClient.post(`/v1/text-to-speech/${voiceId}`, {
      text,
      model_id: 'eleven_monolingual_v1',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.5
      }
    }, { responseType: 'arraybuffer' })

    return Buffer.from(response.data, 'binary')
  }
}
