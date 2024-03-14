import { type ChatModel } from '../open-ai/types'

export enum LlmsModelsEnum {
  GPT_4_32K = 'gpt-4-32k',
  BISON = 'chat-bison',
  J2_ULTRA = 'j2-ultra',
  CLAUDE_OPUS = 'claude-3-opus-20240229',
  CLAUDE_SONNET = 'claude-3-sonnet-20240229'
}

export const LlmsModels: Record<string, ChatModel> = {
  'chat-bison': {
    name: 'chat-bison',
    inputPrice: 0.03,
    outputPrice: 0.06,
    maxContextTokens: 8192,
    chargeType: 'CHAR'
  },
  'gpt-4-32k': {
    name: 'gpt-4-32k',
    inputPrice: 0.06,
    outputPrice: 0.12,
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
    inputPrice: 0.03,
    outputPrice: 0.06,
    maxContextTokens: 8192,
    chargeType: 'TOKEN'
  },
  'claude-3-sonnet-20240229': {
    name: 'claude-3-sonnet-20240229',
    inputPrice: 0.03,
    outputPrice: 0.06,
    maxContextTokens: 8192,
    chargeType: 'TOKEN'
  }
}
