import type { TextToSpeechParams } from '../../google-cloud/gcTextToSpeechClient'

interface CommandConfigItem {
  command: string
  gcParams: Omit<TextToSpeechParams, 'text'>
}

export const commandConfigList: CommandConfigItem[] = [
  {
    command: 'venm',
    gcParams: {
      languageCode: 'en-US',
      voiceName: 'en-US-Neural2-A'
    }
  },
  {
    command: 'venf',
    gcParams: {
      languageCode: 'en-US',
      voiceName: 'en-US-Neural2-C'
    }
  },
  {
    command: 'vhkm',
    gcParams: {
      languageCode: 'yue-Hant-HK',
      voiceName: 'yue-HK-Standard-B'
    }
  },
  {
    command: 'vhkf',
    gcParams: {
      languageCode: 'en-US',
      voiceName: 'yue-HK-Standard-A'
    }
  },
  {
    command: 'vdem',
    gcParams: {
      languageCode: 'de-DE',
      voiceName: 'de-DE-Neural2-B'
    }
  },
  {
    command: 'vdef',
    gcParams: {
      languageCode: 'de-DE',
      voiceName: 'de-DE-Neural2-C'
    }
  },
  {
    command: 'vesm',
    gcParams: {
      languageCode: 'es-ES',
      voiceName: 'es-ES-Neural2-B'
    }
  },
  {
    command: 'vesf',
    gcParams: {
      languageCode: 'es-ES',
      voiceName: 'es-ES-Neural2-A'
    }
  }
]

export function getCommandList (): string[] { return commandConfigList.map(item => item.command) }
export function getConfigByCommand (command: string): CommandConfigItem | undefined {
  return commandConfigList.find((item) => item.command === command)
}
