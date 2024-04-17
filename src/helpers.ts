import config from './config'
import { type BotSessionData } from './modules/types'

export function createInitialSessionData (): BotSessionData {
  return {
    // openAi: {
    //   imageGen: {
    //     numImages: config.openAi.dalle.sessionDefault.numImages,
    //     imgSize: config.openAi.dalle.sessionDefault.imgSize,
    //     isEnabled: config.openAi.dalle.isEnabled,
    //     imgRequestQueue: [],
    //     isProcessingQueue: false,
    //     imageGenerated: [],
    //     isInscriptionLotteryEnabled: config.openAi.dalle.isInscriptionLotteryEnabled,
    //     imgInquiried: []
    //   },
    //   chatGpt: {
    //     model: config.openAi.chatGpt.model,
    //     isEnabled: config.openAi.chatGpt.isEnabled,
    //     isFreePromptChatGroups: config.openAi.chatGpt.isFreePromptChatGroups,
    //     chatConversation: [],
    //     price: 0,
    //     usage: 0,
    //     isProcessingQueue: false,
    //     requestQueue: []
    //   }
    // },
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
      imgSize: config.openAi.dalle.sessionDefault.imgSize,
      isEnabled: config.openAi.dalle.isEnabled,
      imgRequestQueue: [],
      isProcessingQueue: false,
      imageGenerated: [],
      isInscriptionLotteryEnabled: config.openAi.dalle.isInscriptionLotteryEnabled,
      imgInquiried: []
    }
  }
}
