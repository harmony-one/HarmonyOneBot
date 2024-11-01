import axios from 'axios'
import config from '../../../config'
import { type ChatConversationWithoutTimestamp, type ChatConversation } from '../../types'
import pino from 'pino'
import { type ChatModel } from '../utils/types'
import { headers } from './helper'
import { llmModelManager, LlmModelsEnum } from '../utils/llmModelsManager'

// import { type ChatModel } from '../../open-ai/types'

const API_ENDPOINT = config.llms.apiEndpoint // config.llms.apiEndpoint // 'http://localhost:8080' // http://127.0.0.1:5000' // config.llms.apiEndpoint

const logger = pino({
  name: 'llmApi',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
})

export interface LlmCompletion {
  completion: ChatConversation | undefined
  usage: number
  price: number
  inputTokens?: number
  outputTokens?: number
}

interface LlmAddUrlDocument {
  chatId: number
  url?: string
  pdfUrl?: string
  fileName?: string
}

interface QueryUrlDocument {
  collectioName: string
  prompt: string
  conversation?: ChatConversationWithoutTimestamp[]
}

export const getChatModel = (modelName: string): ChatModel | undefined => {
  return llmModelManager.getModel(modelName) as ChatModel//  LlmsModels[modelName]
}

export const getChatModelPrice = (
  model: ChatModel,
  inCents = true,
  inputTokens: number,
  outputTokens?: number
): number => {
  let price = model.inputPrice * inputTokens
  price += outputTokens
    ? outputTokens * model.outputPrice
    : model.maxContextTokens * model.outputPrice
  price = inCents ? price * 100 : price
  return price / 1000
}

export const llmAddUrlDocument = async (args: LlmAddUrlDocument): Promise<string> => {
  const data = { ...args }
  const endpointUrl = `${API_ENDPOINT}/collections/document`
  const response = await axios.post(endpointUrl, data, headers)
  if (response) {
    return response.data.collectionName
  }
  return ''
}

interface LlmCheckCollectionStatusOutput {
  price: number
  status: 'PROCESSING' | 'DONE'
  error: 'INVALID_COLLECTION' | undefined
}
export const llmCheckCollectionStatus = async (name: string): Promise<LlmCheckCollectionStatusOutput> => {
  const endpointUrl = `${API_ENDPOINT}/collections/document/${name}` // ?collectionName=${collectionName}`
  const response = await axios.get(endpointUrl, headers)
  if (response) {
    return response.data
  }
  return {
    price: -1,
    status: 'PROCESSING',
    error: undefined
  }
}

interface QueryUrlDocumentOutput {
  completion: string
  price: number
}

export const queryUrlDocument = async (args: QueryUrlDocument): Promise<QueryUrlDocumentOutput> => {
  const data = { collectionName: args.collectioName, prompt: args.prompt, conversation: args.conversation }
  const endpointUrl = `${API_ENDPOINT}/collections/query`
  const response = await axios.post(endpointUrl, data, headers)
  if (response) {
    return response.data
  }
  return {
    completion: '',
    price: 0
  }
}

export const deleteCollection = async (collectionName: string): Promise<void> => {
  const endpointUrl = `${API_ENDPOINT}/collections/document/${collectionName}`
  await axios.delete(endpointUrl)
  logger.info(`Collection ${collectionName} deleted`)
}

export const llmCompletion = async (
  conversation: ChatConversation[],
  model = LlmModelsEnum.CHAT_BISON
): Promise<LlmCompletion> => {
  const data = {
    model, // chat-bison@001 'chat-bison', //'gpt-3.5-turbo',
    stream: false,
    messages: conversation.filter(c => c.model === model)
  }
  const url = `${API_ENDPOINT}/llms/completions`
  const response = await axios.post(url, data, headers)

  if (response) {
    const totalInputTokens = response.data.usage.prompt_tokens
    const totalOutputTokens = response.data.usage.completion_tokens
    const completion = response.data.choices

    return {
      completion: {
        content: completion[0].message?.content,
        role: 'system',
        model,
        timestamp: Date.now()
      },
      usage: totalOutputTokens + totalInputTokens,
      price: 0
    }
  }
  return {
    completion: undefined,
    usage: 0,
    price: 0
  }
}
