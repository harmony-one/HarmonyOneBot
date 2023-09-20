import GcTextToSpeech from '@google-cloud/text-to-speech'
import config from '../../config'

const credentials = JSON.parse(Buffer.from(config.gc.credentials, 'base64').toString('utf-8'))
const client = new GcTextToSpeech.TextToSpeechClient({ credentials })

export async function textToSpeech (text: string): Promise<string | Uint8Array | null | undefined> {
  const ssml = `<speak>${text}</speak>`

  const [response] = await client.synthesizeSpeech({
    input: { ssml },
    voice: { languageCode: 'en-US', ssmlGender: 'MALE' },
    audioConfig: { audioEncoding: 'MP3' }
  })

  return response.audioContent
}
