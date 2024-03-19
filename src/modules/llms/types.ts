import { type ChatModel } from '../open-ai/types'

export enum LlmsModelsEnum {
  GPT_4_32K = 'gpt-4-32k',
  BISON = 'chat-bison',
  J2_ULTRA = 'j2-ultra',
  CLAUDE_OPUS = 'claude-3-opus-20240229',
  CLAUDE_SONNET = 'claude-3-sonnet-20240229',
  CLAUDE_HAIKU = 'claude-3-haiku-20240307',
  GEMINI = 'gemini-1.0-pro'
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
    inputPrice: 0.00025, // 3.00 (1M Tokens) =>  0.003 (1K tokens)
    outputPrice: 0.00125,
    maxContextTokens: 4096,
    chargeType: 'CHAR'
  },
  'gpt-4-32k': {
    name: 'gpt-4-32k',
    inputPrice: 0.06, // 6
    outputPrice: 0.12, // 12
    maxContextTokens: 32000,
    chargeType: 'TOKEN'
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
  'claude-3-sonnet-20240229': {
    name: 'claude-3-sonnet-20240229',
    inputPrice: 0.003, // 3.00 (1M Tokens) =>  0.003 (1K tokens)
    outputPrice: 0.015,
    maxContextTokens: 4096,
    chargeType: 'TOKEN'
  },
  'claude-3-haiku-20240307': {
    name: 'claude-3-haiku-20240307',
    inputPrice: 0.00025, // 3.00 (1M Tokens) =>  0.003 (1K tokens)
    outputPrice: 0.00125,
    maxContextTokens: 4096,
    chargeType: 'TOKEN'
  }
}
