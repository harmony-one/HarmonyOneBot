import axios, { AxiosError } from 'axios'
import config from '../../../config'
import { type ChatConversation } from '../../types'

const API_ENDPOINT = 'http://127.0.0.1:5000' // config.llms.apiEndpoint

export interface LlmCompletion {
  completion: ChatConversation | undefined
  usage: number
  price: number
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
  conversation?: ChatConversation
}

export const llmAddUrlDocument = async (args: LlmAddUrlDocument): Promise<string> => {
  try {
    const data = { ...args }
    const endpointUrl = `${API_ENDPOINT}/collections/document`
    const response = await axios.post(endpointUrl, data)
    if (response) {
      return response.data
    }
    return ''
  } catch (error: any) {
    if (error instanceof AxiosError) {
      console.log(error.code)
      console.log(error.message)
      console.log(error.stack)
    }
    throw error
  }
}

export const llmCheckCollectionStatus = async (collectionName: string): Promise<number> => {
  try {
    const data = { collectionName }
    const endpointUrl = `${API_ENDPOINT}/collections/document`
    const response = await axios.get(endpointUrl, { params: data })
    if (response) {
      return response.data.price
    }
    return -1
  } catch (error: any) {
    if (error instanceof AxiosError) {
      console.log(error.code)
      console.log(error.message)
      console.log(error.stack)
    }
    throw error
  }
}

interface QueryUrlDocumentOutput {
  completion: string
  price: number
}

export const queryUrlDocument = async (args: QueryUrlDocument): Promise<QueryUrlDocumentOutput> => {
  try {
    const data = { collectionName: args.collectioName, promtp: args.prompt }
    const endpointUrl = `${API_ENDPOINT}/collections/query`
    const response = await axios.post(endpointUrl, data)
    if (response) {
      return response.data
    }
    return {
      completion: '',
      price: 0
    }
  } catch (error: any) {
    if (error instanceof AxiosError) {
      console.log(error.code)
      console.log(error.message)
      console.log(error.stack)
    }
    throw error
  }
}

export const llmCompletion = async (
  conversation: ChatConversation[],
  model = config.llms.model
): Promise<LlmCompletion> => {
  // eslint-disable-next-line no-useless-catch
  try {
    const data = {
      model, // chat-bison@001 'chat-bison', //'gpt-3.5-turbo',
      stream: false,
      messages: conversation
    }
    const url = `${API_ENDPOINT}/llms/completions`
    const response = await axios.post(url, data)

    if (response) {
      const totalInputTokens = response.data.usage.prompt_tokens
      const totalOutputTokens = response.data.usage.completion_tokens
      const completion = response.data.choices

      return {
        completion: {
          content: completion[0].message?.content,
          role: 'system',
          model
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
  } catch (error: any) {
    throw error
  }
}

export const llmWebCrawler = async (
  prompt: string,
  model: string,
  chadId: number,
  msgId: number,
  url: string
): Promise<LlmCompletion> => {
  if (!url.startsWith('https://')) {
    url = `https://${url}`
  }
  const data = {
    prompt,
    chatId: '' + chadId,
    msgId: '' + msgId,
    token: '' + config.telegramBotAuthToken,
    url
  }
  const urlApi = `${API_ENDPOINT}/llama-index/text`
  const response = await axios.post(urlApi, data)
  if (response.data) {
    const totalInputTokens = 0 // response.data.usage.prompt_tokens
    const totalOutputTokens = 0 // response.data.usage.completion_tokens
    const completion = response.data
    return {
      completion: {
        content: completion ?? '',
        role: 'system',
        model
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
