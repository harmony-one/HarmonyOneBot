export enum LlmsModelsEnum {
  GPT_4_32K = 'gpt-4-32k',
  BISON = 'chat-bison',
  J2_ULTRA = 'j2-ultra',
  CLAUDE_OPUS = 'claude-3-opus-20240229',
  CLAUDE_SONNET = 'claude-3-5-sonnet-20240620',
  CLAUDE_HAIKU = 'claude-3-haiku-20240307',
  GEMINI_15 = 'gemini-1.5-pro-latest',
  GEMINI = 'gemini-1.0-pro',
  GPT_4 = 'gpt-4',
  GPT_35_TURBO = 'gpt-3.5-turbo',
  GPT_35_TURBO_16K = 'gpt-3.5-turbo-16k',
  GPT_4_VISION_PREVIEW = 'gpt-4-vision-preview',
  GPT_4O = 'gpt-4o-2024-05-13'
}

export interface DalleGPTModel {
  size: string
  price: number
}

export interface ChatModel {
  name: string
  inputPrice: number
  outputPrice: number
  maxContextTokens: number
  chargeType: 'TOKEN' | 'CHAR'
}

export const LlmsModels: Record<string, ChatModel> = {
  'chat-bison': {
    name: 'chat-bison',
    inputPrice: 0.03,
    outputPrice: 0.06,
    maxContextTokens: 8192,
    chargeType: 'CHAR'
  },
  'gemini-1.0-pro': {
    name: 'gemini-1.0-pro',
    inputPrice: 0.000125, // 3.00 (1M Tokens) =>  0.003 (1K tokens)
    outputPrice: 0.000375,
    maxContextTokens: 30720,
    chargeType: 'CHAR'
  },
  'gemini-1.5-pro-latest': {
    name: 'gemini-1.5-pro-latest',
    inputPrice: 0.0025, // 3.00 (1M Tokens) =>  0.003 (1K tokens)
    outputPrice: 0.0075,
    maxContextTokens: 1048576,
    chargeType: 'CHAR'
  },
  'j2-ultra': {
    name: 'j2-ultra',
    inputPrice: 0.06,
    outputPrice: 0.12,
    maxContextTokens: 32000,
    chargeType: 'TOKEN'
  },
  'claude-3-opus-20240229': {
    name: 'claude-3-opus-20240229',
    inputPrice: 0.015, // 15.00 (1M Tokens) =>  0.015 (1K tokens)
    outputPrice: 0.075,
    maxContextTokens: 4096,
    chargeType: 'TOKEN'
  },
  'claude-3-5-sonnet-20240620': {
    name: 'claude-3-5-sonnet-20240620',
    inputPrice: 0.003, // 3.00 (1M Tokens) =>  0.003 (1K tokens)
    outputPrice: 0.015,
    maxContextTokens: 8192,
    chargeType: 'TOKEN'
  },
  'claude-3-haiku-20240307': {
    name: 'claude-3-haiku-20240307',
    inputPrice: 0.00025, // 3.00 (1M Tokens) =>  0.003 (1K tokens)
    outputPrice: 0.00125,
    maxContextTokens: 4096,
    chargeType: 'TOKEN'
  },
  'gpt-4': {
    name: 'gpt-4',
    inputPrice: 0.03, // 3
    outputPrice: 0.06, // 6
    maxContextTokens: 8192,
    chargeType: 'TOKEN'
  },
  'gpt-4-32k': {
    name: 'gpt-4-32k',
    inputPrice: 0.06, // 6
    outputPrice: 0.12, // 12
    maxContextTokens: 32000,
    chargeType: 'TOKEN'
  },
  'gpt-3.5-turbo': {
    name: 'gpt-3.5-turbo',
    inputPrice: 0.0015, // 0.15
    outputPrice: 0.002, // 0.2
    maxContextTokens: 4000,
    chargeType: 'TOKEN'
  },
  'gpt-3.5-turbo-16k': {
    name: 'gpt-3.5-turbo-16k',
    inputPrice: 0.003, // 0.3
    outputPrice: 0.004, // 0.4
    maxContextTokens: 16000,
    chargeType: 'TOKEN'
  },
  'gpt-4-vision-preview': {
    name: 'gpt-4-vision-preview',
    inputPrice: 0.03, // 3
    outputPrice: 0.06, // 6
    maxContextTokens: 16000,
    chargeType: 'TOKEN'
  },
  'gpt-4o-2024-05-13': {
    name: 'gpt-4o-2024-05-13',
    inputPrice: 0.005, // 3
    outputPrice: 0.0015, // 6
    maxContextTokens: 128000,
    chargeType: 'TOKEN'
  }
}

export const DalleGPTModels: Record<string, DalleGPTModel> = {
  '1024x1792': {
    size: '1024x1792',
    price: 12 // 0.12
  },
  '1792x1024': {
    size: '1792x1024',
    price: 12 // 0.12
  },
  '1024x1024': {
    size: '1024x1024',
    price: 8 // 0.08
  },
  '512x512': {
    size: '512x512',
    price: 8 // 0.10
  },
  '256x256': {
    size: '256x256',
    price: 8 // 0.10
  }
}
