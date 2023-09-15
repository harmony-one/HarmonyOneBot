import axios, { AxiosError } from 'axios'
import config from '../../../config'
import { type ChatConversation } from '../../types'

const API_ENDPOINT = config.llms.apiEndpoint
export interface LlmCompletion {
  completion: ChatConversation | undefined
  usage: number
  price: number
}

export const llmCompletion = async (
  conversation: ChatConversation[],
  model = config.llms.model
): Promise<LlmCompletion> => {
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
          content: completion[0].message?.content!,
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
    if (error instanceof AxiosError) {
      console.log(error.code)
      console.log(error.message)
      console.log(error.stack)
    }
    throw error
  }
}
