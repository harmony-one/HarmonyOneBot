import { type LLMData } from './types'

export const llmData: LLMData = {
  chatModels: {
    // 'chat-bison': {
    //   provider: 'vertex',
    //   name: 'chat-bison',
    //   fullName: 'chat-bison',
    //   version: 'chat-bison',
    //   commands: ['bison', 'b'],
    //   apiSpec: 'https://example.com/chat-bison-api-spec',
    //   inputPrice: 0.03,
    //   outputPrice: 0.06,
    //   maxContextTokens: 8192,
    //   chargeType: 'CHAR'
    // },
    'gemini-10': {
      provider: 'vertex',
      name: 'gemini-10',
      botName: 'VertexBot',
      fullName: 'gemini-1.0-pro',
      version: 'gemini-1.0-pro',
      commands: ['gemini', 'g'],
      prefix: ['g. '],
      apiSpec: 'https://deepmind.google/technologies/gemini/pro/',
      inputPrice: 0.000125,
      outputPrice: 0.000375,
      maxContextTokens: 30720,
      chargeType: 'CHAR'
    },
    'gemini-15': {
      provider: 'vertex',
      name: 'gemini-15',
      fullName: 'gemini-1.5-pro-latest',
      botName: 'VertexBot',
      version: 'gemini-1.5-pro-latest',
      commands: ['gemini15', 'g15'],
      apiSpec: 'https://deepmind.google/technologies/gemini/pro/',
      inputPrice: 0.0025,
      outputPrice: 0.0075,
      maxContextTokens: 1048576,
      chargeType: 'CHAR'
    },
    // 'j2-ultra': {
    //   provider: 'jurassic',
    //   name: 'j2_Ultra',
    //   fullName: 'j2-ultra',
    //   version: 'j2-ultra',
    //   commands: ['j2ultra'],
    //   apiSpec: 'https://example.com/j2-ultra-api-spec',
    //   inputPrice: 0.06,
    //   outputPrice: 0.12,
    //   maxContextTokens: 32000,
    //   chargeType: 'TOKEN'
    // },
    'claude-3-opus': {
      provider: 'claude',
      name: 'claude-3-opus',
      fullName: 'Claude Opus',
      botName: 'ClaudeBot',
      version: 'claude-3-opus-20240229',
      commands: ['claude', 'opus', 'c', 'o', 'ctool'],
      prefix: ['c. '],
      apiSpec: 'https://www.anthropic.com/news/claude-3-family',
      inputPrice: 0.015,
      outputPrice: 0.075,
      maxContextTokens: 4096,
      chargeType: 'TOKEN'
    },
    'claude-35-sonnet': {
      provider: 'claude',
      name: 'claude-35-sonnet',
      fullName: 'Claude Sonnet 3.5',
      botName: 'ClaudeBot',
      version: 'claude-3-5-sonnet-20240620',
      commands: ['sonnet', 'claudes', 's', 'stool'],
      apiSpec: 'https://www.anthropic.com/news/claude-3-5-sonnet',
      inputPrice: 0.003,
      outputPrice: 0.015,
      maxContextTokens: 8192,
      chargeType: 'TOKEN'
    },
    'claude-3-haiku': {
      provider: 'claude',
      name: 'claude-3-haiku',
      fullName: 'Claude Haiku',
      botName: 'ClaudeBot',
      version: 'claude-3-haiku-20240307',
      commands: ['haiku', 'h'],
      apiSpec: 'https://www.anthropic.com/news/claude-3-family',
      inputPrice: 0.00025,
      outputPrice: 0.00125,
      maxContextTokens: 4096,
      chargeType: 'TOKEN'
    },
    'gpt-4': {
      provider: 'openai',
      name: 'gpt-4',
      fullName: 'GPT-4',
      botName: 'OpenAIBot',
      version: 'gpt-4',
      commands: ['gpt4'],
      apiSpec: 'https://openai.com/index/gpt-4/',
      inputPrice: 0.03,
      outputPrice: 0.06,
      maxContextTokens: 8192,
      chargeType: 'TOKEN'
    },
    // 'gpt-4-32k': {
    //   provider: 'openai',
    //   name: 'gpt-4-32k',
    //   fullName: 'GPT-4 32k',
    //   version: 'gpt-4-32k',
    //   commands: ['gpt4-32k', 'ask32'],
    //   apiSpec: 'https://example.com/gpt-4-32k-api-spec',
    //   inputPrice: 0.06,
    //   outputPrice: 0.12,
    //   maxContextTokens: 32000,
    //   chargeType: 'TOKEN'
    // },
    'gpt-35-turbo': {
      provider: 'openai',
      name: 'gpt-35-turbo',
      fullName: 'GPT-3.5 Turbo',
      botName: 'OpenAIBot',
      version: 'gpt-3.5-turbo',
      commands: ['ask35'],
      apiSpec: 'https://platform.openai.com/docs/models/gpt-3-5-turbo',
      inputPrice: 0.0015,
      outputPrice: 0.002,
      maxContextTokens: 4000,
      chargeType: 'TOKEN'
    },
    // 'gpt-35-turbo-16k': {
    //   provider: 'openai',
    //   name: 'GPT-3.5 Turbo 16k',
    //   version: 'gpt-3.5-turbo-16k',
    //   commands: ['gpt35-16k'],
    //   apiSpec: 'https://example.com/gpt-3.5-turbo-16k-api-spec',
    //   inputPrice: 0.003,
    //   outputPrice: 0.004,
    //   maxContextTokens: 16000,
    //   chargeType: 'TOKEN'
    // },
    'gpt-4-vision': {
      provider: 'openai',
      name: 'gpt-4-vision',
      fullName: 'GPT-4 Vision',
      botName: 'OpenAIBot',
      version: 'gpt-4-vision-preview',
      commands: ['vision'],
      apiSpec: 'https://platform.openai.com/docs/guides/vision',
      inputPrice: 0.03,
      outputPrice: 0.06,
      maxContextTokens: 16000,
      chargeType: 'TOKEN'
    },
    'gpt-4o': {
      provider: 'openai',
      name: 'gpt-4o',
      fullName: 'GPT-4o',
      botName: 'OpenAIBot',
      version: 'gpt-4o',
      commands: ['gpto', 'ask', 'chat', 'gpt'],
      prefix: ['a. ', '. '],
      apiSpec: 'https://platform.openai.com/docs/models/gpt-4o',
      inputPrice: 0.005,
      outputPrice: 0.0015,
      maxContextTokens: 128000,
      chargeType: 'TOKEN'
    },
    o1: {
      provider: 'openai',
      name: 'o1',
      fullName: 'O1 Preview',
      botName: 'OpenAIBot',
      version: 'o1-preview',
      commands: ['o1', 'ask1'],
      apiSpec: 'https://platform.openai.com/docs/models/o1',
      inputPrice: 0.015,
      outputPrice: 0.06,
      maxContextTokens: 128000,
      chargeType: 'TOKEN'
    },
    'o1-mini': {
      provider: 'openai',
      name: 'o1-mini',
      fullName: 'O1 Mini',
      botName: 'OpenAIBot',
      version: 'o1-mini-2024-09-12',
      commands: ['omini'],
      apiSpec: 'https://platform.openai.com/docs/models/o1',
      inputPrice: 0.003,
      outputPrice: 0.012,
      maxContextTokens: 128000,
      chargeType: 'TOKEN'
    }
  },
  imageModels: {
    'dalle-3': {
      provider: 'openai',
      name: 'dalle-3',
      fullName: 'DALL-E 3',
      botName: 'DalleBot',
      version: 'dall-e-3',
      commands: ['dalle', 'image', 'img', 'i'],
      prefix: ['i. ', ', ', 'd. '],
      apiSpec: 'https://openai.com/index/dall-e-3/',
      price: {
        '1024x1024': 0.8,
        '1024x1792': 0.12,
        '1792x1024': 0.12
      }
    }
  }
}
