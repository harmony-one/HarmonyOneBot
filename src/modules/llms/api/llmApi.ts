import axios from 'axios'
import config from '../../../config'
import { type ChatConversation } from '../../types'

const API_ENDPOINT = config.llms.apiEndpoint // 'http://localhost:8080' // http://127.0.0.1:5000' // config.llms.apiEndpoint // config.llms.apiEndpoint // 'http://127.0.0.1:5000'

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
  conversation?: ChatConversation[]
}

export const llmAddUrlDocument = async (args: LlmAddUrlDocument): Promise<string> => {
  const data = { ...args }
  const endpointUrl = `${API_ENDPOINT}/collections/document`
  const response = await axios.post(endpointUrl, data)
  if (response) {
    return response.data.collectionName
  }
  return ''
}

export const llmCheckCollectionStatus = async (name: string): Promise<number> => {
  const endpointUrl = `${API_ENDPOINT}/collections/document/${name}` // ?collectionName=${collectionName}`
  console.log(endpointUrl)
  const response = await axios.get(endpointUrl)
  if (response) {
    return response.data.price
  }
  return -1
}

interface QueryUrlDocumentOutput {
  completion: string
  price: number
}

export const queryUrlDocument = async (args: QueryUrlDocument): Promise<QueryUrlDocumentOutput> => {
  const data = { collectionName: args.collectioName, prompt: args.prompt, conversation: args.conversation }
  console.log(data.conversation)
  const endpointUrl = `${API_ENDPOINT}/collections/query`
  const response = await axios.post(endpointUrl, data)
  if (response) {
    return response.data
  }
  return {
    completion: '',
    price: 0
  }
}

export const llmCompletion = async (
  conversation: ChatConversation[],
  model = config.llms.model
): Promise<LlmCompletion> => {
  // eslint-disable-next-line no-useless-catch
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
}
