import axios from 'axios'
import config from '../../../config'
import { type ChatConversation } from '../../types'
import { type LlmCompletion } from './llmApi'
import { LlmsModelsEnum } from '../types'

const API_ENDPOINT = config.llms.apiEndpoint

export const anthropicCompletion = async (
  conversation: ChatConversation[],
  model = LlmsModelsEnum.CLAUDE_OPUS
): Promise<LlmCompletion> => {
  const data = {
    model,
    stream: false,
    system: config.openAi.chatGpt.chatCompletionContext,
    max_tokens: +config.openAi.chatGpt.maxTokens,
    messages: conversation
  }
  const url = `${API_ENDPOINT}/anthropic/completions`
  const response = await axios.post(url, data)
  const respJson = JSON.parse(response.data)
  if (response) {
    const totalInputTokens = respJson.usage.input_tokens
    const totalOutputTokens = respJson.usage.output_tokens
    const completion = respJson.content

    return {
      completion: {
        content: completion[0].text,
        role: 'assistant',
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
