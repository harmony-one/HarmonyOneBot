import * as fs from 'fs'
import * as path from 'path'
import { gcTextToSpeedClient } from '../../google-cloud/gcTextToSpeechClient'
import type { google } from '@google-cloud/text-to-speech/build/protos/protos'
import type { CommandConfigItem } from './commandConfigList'

async function main (): Promise<void> {
  const voices = await gcTextToSpeedClient.listVoices()

  if (!voices) {
    console.log('### no voices')
    return
  }

  const getShortLangCode = (voice: google.cloud.texttospeech.v1.IVoice): string => {
    const code = voice.languageCodes?.[0]

    if (!code) {
      return ''
    }

    return code.split('-')[0]
  }

  const getFullLangCode = (voice: google.cloud.texttospeech.v1.IVoice): string => {
    const code = voice.languageCodes?.[0]

    if (!code) {
      return ''
    }

    return code
  }

  const configMap: Record<string, Record<string, CommandConfigItem[]>> = {}

  console.log('### voices.length', voices.length)

  for (const voice of voices) {
    // console.log('### voice', getFullLangCode(voice), getShortLangCode(voice), voice)

    const shortLangCode = getShortLangCode(voice)
    const fullLangCode = getFullLangCode(voice)
    const commandGender = voice.ssmlGender === 'MALE' ? 'm' : 'f'

    if (!configMap[shortLangCode]) {
      configMap[shortLangCode] = {}
    }

    const langGroupMap = configMap[shortLangCode]

    if (!langGroupMap) {
      continue
    }

    const command = `v${shortLangCode}${commandGender}`

    if (!voice.ssmlGender) {
      continue
    }

    if (!langGroupMap[fullLangCode]) {
      langGroupMap[fullLangCode] = []
    }

    const genderGroupSet = langGroupMap[fullLangCode]

    if (!genderGroupSet) {
      console.log('### error')
      return
    }

    genderGroupSet.push({
      command,
      gcParams: {
        languageCode: fullLangCode,
        ssmlGender: voice.ssmlGender,
        voiceName: voice.name
      }
    })
  }
  // const jsonContent = JSON.stringify(mapToObject(configMap), null, 4)
  const jsonContent = JSON.stringify(configMap, null, 4)

  const filepath = path.join(__dirname, 'voices.json')

  fs.writeFileSync(filepath, jsonContent)

  const result = []
  for (const key in configMap) {
    const langMap = configMap[key]
    if (Object.values(langMap).length === 1) {
      const male = Object.values(langMap)[0].find((item) => item.gcParams.ssmlGender === 'MALE')
      const female = Object.values(langMap)[0].find((item) => item.gcParams.ssmlGender === 'FEMALE')

      if (!male) {
        console.log('### does not have a male voice', key)
      }

      if (!female) {
        console.log('### does not have a female voice', key)
      }

      result.push(male, female)
      continue
    }

    console.log('### Please choose manually: ', key, Object.keys(langMap))
  }

  const simpleLangs = JSON.stringify(result.filter(Boolean), null, 4)

  const filepath2 = path.join(__dirname, 'voices-simple.json')

  fs.writeFileSync(filepath2, simpleLangs)
}

main().then(() => { console.log('### finish') }).catch(console.log)
