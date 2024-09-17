import config from './config'
import { LlmModelsEnum } from './modules/llms/utils/llmModelsManager'
import { type DalleImageSize } from './modules/llms/utils/types'
import { type BotSessionData } from './modules/types'

export function createInitialSessionData (): BotSessionData {
  return {
    oneCountry: { lastDomain: '' },
    translate: {
      languages: [],
      enable: false
    },
    collections: {
      activeCollections: [],
      collectionRequestQueue: [],
      isProcessingQueue: false,
      currentCollection: '',
      collectionConversation: []
    },
    subagents: { running: [], subagentsRequestQueue: [], isProcessingQueue: false },
    llms: {
      model: config.llms.model,
      isEnabled: config.llms.isEnabled,
      chatConversation: [],
      price: 0,
      usage: 0,
      isProcessingQueue: false,
      requestQueue: []
    },
    chatGpt: {
      model: config.llms.model,
      isEnabled: config.llms.isEnabled,
      isFreePromptChatGroups: config.openAi.chatGpt.isFreePromptChatGroups,
      chatConversation: [],
      price: 0,
      usage: 0,
      isProcessingQueue: false,
      requestQueue: []
    },
    dalle: {
      numImages: config.openAi.dalle.sessionDefault.numImages,
      imgSize: config.openAi.dalle.sessionDefault.imgSize as DalleImageSize,
      isEnabled: config.openAi.dalle.isEnabled,
      imgRequestQueue: [],
      isProcessingQueue: false,
      imageGenerated: [],
      isInscriptionLotteryEnabled: config.openAi.dalle.isInscriptionLotteryEnabled,
      imgInquiried: []
    },
    currentModel: LlmModelsEnum.GPT_4O
  }
}
