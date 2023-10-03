import type { TextToSpeechParams } from '../../google-cloud/gcTextToSpeechClient'

interface CommandConfigItem {
  command: string
  gcParams: Omit<TextToSpeechParams, 'text'>
}

export const commandConfigList: CommandConfigItem[] = [
  // English
  {
    command: 'venm',
    gcParams: {
      languageCode: 'en-US',
      voiceName: 'en-US-Neural2-I'
    }
  },
  {
    command: 'venf',
    gcParams: {
      languageCode: 'en-US',
      voiceName: 'en-US-Neural2-F'
    }
  },
  // Mandarin (Chinese)
  {
    command: 'vcnm',
    gcParams: {
      languageCode: 'cmn-CN',
      voiceName: 'cmn-CN-Wavenet-B'
    }
  },
  {
    command: 'vcnf',
    gcParams: {
      languageCode: 'cmn-CN',
      voiceName: 'cmn-CN-Wavenet-A'
    }
  },
  // Cantonese (Chinese)
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
  // German
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
  // Spanish
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
  },
  // Russian
  {
    command: 'vrum',
    gcParams: {
      languageCode: 'ru-RU',
      voiceName: 'ru-RU-Wavenet-B'
    }
  },
  {
    command: 'vruf',
    gcParams: {
      languageCode: 'ru-RU',
      voiceName: 'ru-RU-Wavenet-A'
    }
  },
  // Indonesian
  {
    command: 'vidm',
    gcParams: {
      languageCode: 'id-ID',
      voiceName: 'id-ID-Wavenet-B'
    }
  },
  {
    command: 'vidf',
    gcParams: {
      languageCode: 'id-ID',
      voiceName: 'id-ID-Wavenet-A'
    }
  },
  // Korean
  {
    command: 'vkom',
    gcParams: {
      languageCode: 'ko-KR',
      voiceName: 'ko-KR-Wavenet-C'
    }
  },
  {
    command: 'vkof',
    gcParams: {
      languageCode: 'ko-KR',
      voiceName: 'ko-KR-Wavenet-A'
    }
  },
  // Japanese
  {
    command: 'vjam',
    gcParams: {
      languageCode: 'ja-JP',
      voiceName: 'ja-JP-Wavenet-C'
    }
  },
  {
    command: 'vjaf',
    gcParams: {
      languageCode: 'ja-JP',
      voiceName: 'ja-JP-Wavenet-B'
    }
  },
  // Portuguese
  {
    command: 'vptm',
    gcParams: {
      languageCode: 'pt-PT',
      voiceName: 'pt-PT-Wavenet-C'
    }
  },
  {
    command: 'vptf',
    gcParams: {
      languageCode: 'pt-PT',
      voiceName: 'pt-PT-Wavenet-A'
    }
  }
]

export function getCommandList (): string[] { return commandConfigList.map(item => item.command) }
export function getConfigByCommand (command: string): CommandConfigItem | undefined {
  return commandConfigList.find((item) => item.command === command)
}
