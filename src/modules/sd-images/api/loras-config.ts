export interface ILora {
  path: string
  name: string
  id: string
  hash: string
  shortName: string
  link: string
  baseModel: 'SD 1.5' | 'SDXL 1.0'
  aliases: string[]
}

export const LORAS_CONFIGS: ILora[] = [
  {
    path: 'add_detail.safetensors',
    name: 'Detail Tweaker LoRA',
    id: '58390',
    hash: '47AAAF0D29',
    shortName: 'detail',
    link: 'https://civitai.com/models/58390/detail-tweaker-lora-lora',
    baseModel: 'SD 1.5',
    aliases: ['add_detail', 'detail']
  },
  {
    path: 'add-detail-xl.safetensors',
    name: 'Detail Tweaker XL',
    id: '122359',
    hash: '0D9BD1B873',
    shortName: 'detail',
    link: 'https://civitai.com/models/122359/detail-tweaker-xl',
    baseModel: 'SDXL 1.0',
    aliases: ['add-detail-xl', 'add_detail', 'detail']
  },
  {
    path: 'logo_20230705215526.safetensors',
    name: 'logo 设计 Lora',
    id: '104072',
    hash: '0AAD77BD39',
    shortName: 'logo',
    link: 'https://civitai.com/models/104072/logo-lora',
    baseModel: 'SD 1.5',
    aliases: ['logo_20230705215526', 'logo']
  },
  {
    path: 'LogoRedmond_LogoRedAF.safetensors',
    name: 'Logo.Redmond - Logo Lora for SD XL 1.0',
    id: '124609',
    hash: '8D22FAB0F7',
    shortName: 'logo',
    link: 'https://civitai.com/models/124609/logoredmond-logo-lora-for-sd-xl-10',
    baseModel: 'SDXL 1.0',
    aliases: ['LogoRedmond_LogoRedAF', 'logo']
  },
  {
    path: 'pixelartV3.safetensors',
    name: 'Pixel art style',
    id: '43820',
    hash: '8A2E1EA746',
    shortName: 'pixel',
    link: 'https://civitai.com/models/43820/pixel-art-style',
    baseModel: 'SD 1.5',
    aliases: ['pixel-art-style', 'pixel']
  },
  {
    path: 'pixel-art-xl-v1.1.safetensors',
    name: 'Pixel Art XL',
    id: '120096',
    hash: 'BBF3D8DEFB',
    shortName: 'pixel',
    link: 'https://civitai.com/models/120096/pixel-art-xl',
    baseModel: 'SDXL 1.0',
    aliases: ['pixel-art-xl', 'pixel']
  },
  {
    path: 'KoreanDollLikeness.safetensors',
    name: 'KoreanDollLikeness',
    id: '26124',
    hash: '00483A2A78',
    shortName: 'korean_doll',
    link: 'https://civitai.com/models/26124/koreandolllikeness-v20',
    baseModel: 'SD 1.5',
    aliases: ['koreanDollLikeness_v20', 'korean_doll']
  },
  {
    path: 'murkysSuspendedOn_1.safetensors',
    name: 'murkysSuspendedOn_1',
    id: '18419',
    hash: 'D402E6A3AF',
    shortName: 'murkysSuspendedOn',
    link: 'https://civitai.com/models/18419/murkys-suspended-on-penis-lora?modelVersionId=21845',
    baseModel: 'SD 1.5', // Other
    aliases: ['murkysSuspendedOn_1']
  },
  {
    path: 'DDcowfeet_v1.safetensors',
    name: 'DDcowfeet_v1',
    id: '28281',
    hash: 'A62F284720',
    shortName: 'DDcowfeet',
    link: 'https://civitai.com/models/28281/dd-reverse-cowgirl-with-soles-feet-on-lap?modelVersionId=33915',
    baseModel: 'SD 1.5', // Other
    aliases: ['DDcowfeet_v1']
  },
  {
    path: 'TTF_v4.safetensors',
    name: 'TTF_v4',
    id: '20824',
    hash: '1B6C2C5CAD',
    shortName: 'TTF',
    link: 'https://civitai.com/models/20824/dd-tiptoes-standing-doggy?modelVersionId=74299',
    baseModel: 'SD 1.5',
    aliases: ['TTF_v4']
  }
]

export const getLoraByParam = (param: string, baseModel: string) => {
  const model = LORAS_CONFIGS.find(m =>
    (m.id === param ||
            m.hash === param ||
            m.shortName === param ||
            m.aliases.includes(param)) && m.baseModel === baseModel
  )

  return model
}

export const modelsAliases = []
