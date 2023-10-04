import { ElevenlabsClient } from './elevenlabsClient'
import config from '../config'

function labelsToString (labels: Record<string, string>): string {
  return Object.entries(labels).reduce((acc, item) => {
    return acc + item.join(': ') + '; '
  }, '')
}

async function main (): Promise<void> {
  const client = new ElevenlabsClient(config.elevenlabs.apiKey)
  const voiceList = await client.voiceList()

  for (const voice of voiceList) {
    console.log(voice.voice_id, voice.name, '\t', labelsToString(voice.labels))
  }
}

main().then(() => { console.log('### finish') }).catch(console.log)
