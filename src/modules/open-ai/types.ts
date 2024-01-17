export interface ChatModel {
  name: string
  inputPrice: number
  outputPrice: number
  maxContextTokens: number
  chargeType: 'TOKEN' | 'CHAR'
}

export interface DalleGPTModel {
  size: string
  price: number
}

export enum ChatGPTModelsEnum {
  GPT_4 = 'gpt-4',
  GPT_4_32K = 'gpt-4-32k',
  GPT_35_TURBO = 'gpt-3.5-turbo',
  GPT_35_TURBO_16K = 'gpt-3.5-turbo-16k',
  GPT_4_VISION_PREVIEW = 'gpt-4-vision-preview'
}

export const ChatGPTModels: Record<string, ChatModel> = {
  'gpt-4': {
    name: 'gpt-4',
    inputPrice: 0.03,
    outputPrice: 0.06,
    maxContextTokens: 8192,
    chargeType: 'TOKEN'
  },
  'gpt-4-32k': {
    name: 'gpt-4-32k',
    inputPrice: 0.06,
    outputPrice: 0.12,
    maxContextTokens: 32000,
    chargeType: 'TOKEN'
  },
  'gpt-3.5-turbo': {
    name: 'gpt-3.5-turbo',
    inputPrice: 0.0015,
    outputPrice: 0.002,
    maxContextTokens: 4000,
    chargeType: 'TOKEN'
  },
  'gpt-3.5-turbo-16k': {
    name: 'gpt-3.5-turbo-16k',
    inputPrice: 0.003,
    outputPrice: 0.004,
    maxContextTokens: 16000,
    chargeType: 'TOKEN'
  },
  'gpt-4-vision-preview': {
    name: 'gpt-4-vision-preview',
    inputPrice: 0.03,
    outputPrice: 0.06,
    maxContextTokens: 16000,
    chargeType: 'TOKEN'
  }
}

export const DalleGPTModels: Record<string, DalleGPTModel> = {
  '1024x1792': {
    size: '1024x1792',
    price: 0.10
  },
  '1792x1024': {
    size: '1792x1024',
    price: 0.10
  },
  '1024x1024': {
    size: '1024x1024',
    price: 0.10
  },
  '512x512': {
    size: '512x512',
    price: 0.10
  },
  '256x256': {
    size: '256x256',
    price: 0.10
  }
}
