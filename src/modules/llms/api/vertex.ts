import axios, { type AxiosResponse } from 'axios'
import config from '../../../config'
import { type OnMessageContext, type ChatConversation, type OnCallBackQueryData } from '../../types'
import { type LlmCompletion } from './llmApi'
import { type Readable } from 'stream'
import { GrammyError } from 'grammy'
import { pino } from 'pino'
import { LlmsModelsEnum } from '../types'

const API_ENDPOINT = config.llms.apiEndpoint // config.llms.apiEndpoint // http://localhost:8080' // config.llms.apiEndpoint

const logger = pino({
  name: 'Gemini - llmsBot',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
})

export const vertexCompletion = async (
  conversation: ChatConversation[],
  model = config.llms.model
): Promise<LlmCompletion> => {
  const data = {
    model, // chat-bison@001 'chat-bison', //'gpt-3.5-turbo',
    stream: false,
    messages: conversation
  }
  const url = `${API_ENDPOINT}/vertex/completions`
  const response = await axios.post(url, data)
  if (response) {
    const totalInputTokens = 4 // response.data.usage.prompt_tokens;
    const totalOutputTokens = 5 // response.data.usage.completion_tokens;
    return {
      completion: {
        content: response.data._prediction_response[0][0].candidates[0].content,
        author: 'bot',
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

export const vertexStreamCompletion = async (
  conversation: ChatConversation[],
  model = LlmsModelsEnum.CLAUDE_OPUS,
  ctx: OnMessageContext | OnCallBackQueryData,
  msgId: number,
  limitTokens = true
): Promise<LlmCompletion> => {
  const data = {
    model,
    stream: true, // Set stream to true to receive the completion as a stream
    system: config.openAi.chatGpt.chatCompletionContext,
    max_tokens: limitTokens ? +config.openAi.chatGpt.maxTokens : undefined,
    messages: conversation.map(m => { return { parts: { text: m.content }, role: m.role !== 'user' ? 'model' : 'user' } })
  }
  const url = `${API_ENDPOINT}/vertex/completions/gemini`
  if (!ctx.chat?.id) {
    throw new Error('Context chat id should not be empty after openAI streaming')
  }
  const response: AxiosResponse = await axios.post(url, data, { responseType: 'stream' })
  // Create a Readable stream from the response
  const completionStream: Readable = response.data
  // Read and process the stream
  let completion = ''
  for await (const chunk of completionStream) {
    const msg = chunk.toString()
    if (msg) {
      completion += msg.split('Text: ')[1]
      completion = completion.replaceAll('...', '')
      completion += '...'
      if (ctx.chat?.id) {
        await ctx.api
          .editMessageText(ctx.chat?.id, msgId, completion)
          .catch(async (e: any) => {
            if (e instanceof GrammyError) {
              if (e.error_code !== 400) {
                throw e
              } else {
                logger.error(e)
              }
            } else {
              throw e
            }
          })
      }
    }
  }
  completion = completion.replaceAll('...', '')
  await ctx.api
    .editMessageText(ctx.chat?.id, msgId, completion)
    .catch((e: any) => {
      if (e instanceof GrammyError) {
        if (e.error_code !== 400) {
          throw e
        } else {
          logger.error(e)
        }
      } else {
        throw e
      }
    })
  const totalOutputTokens = '10' // response.headers['x-openai-output-tokens']
  const totalInputTokens = '10' // response.headers['x-openai-input-tokens']
  return {
    completion: {
      content: completion,
      role: 'assistant',
      model
    },
    usage: parseInt(totalOutputTokens, 10) + parseInt(totalInputTokens, 10),
    price: 0,
    inputTokens: parseInt(totalInputTokens, 10),
    outputTokens: parseInt(totalOutputTokens, 10)
  }
}
