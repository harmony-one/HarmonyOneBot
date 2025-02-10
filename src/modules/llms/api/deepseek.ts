import axios, { type AxiosResponse } from 'axios'
import { type Readable } from 'stream'
import { GrammyError } from 'grammy'
import { pino } from 'pino'

import config from '../../../config'
import { type OnCallBackQueryData, type OnMessageContext, type ChatConversation } from '../../types'
import { type LlmCompletion } from './llmApi'
import { headersStream } from './helper'
import { LlmModelsEnum } from '../utils/llmModelsManager'
import { type ModelParameters } from '../utils/types'
import { prepareConversation } from './openai'

const logger = pino({
  name: 'deepSeek - llmsBot',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
})

const API_ENDPOINT = config.llms.apiEndpoint

export const deepSeekStreamCompletion = async (
  conversation: ChatConversation[],
  model = LlmModelsEnum.GPT_35_TURBO,
  ctx: OnMessageContext | OnCallBackQueryData,
  msgId: number,
  limitTokens = true,
  parameters?: ModelParameters
): Promise<LlmCompletion> => {
  logger.info(`Handling ${model} stream completion`)
  parameters = parameters ?? {
    system: ctx.session.currentPrompt,
    max_tokens: +config.openAi.chatGpt.maxTokens
  }
  const data = {
    model,
    stream: true,
    system: parameters.system,
    max_tokens: limitTokens ? parameters.max_tokens : undefined,
    messages: prepareConversation(conversation, model, ctx) // .map(m => { return { content: m.content, role: m.role } })
  }
  let wordCount = 0
  let wordCountMinimum = 2
  const url = `${API_ENDPOINT}/deepseek/completions`
  if (!ctx.chat?.id) {
    throw new Error('Context chat id should not be empty after openAI streaming')
  }

  const response: AxiosResponse = await axios.post(url, data, headersStream)

  const completionStream: Readable = response.data
  let completion = ''
  let outputTokens = ''
  let inputTokens = ''
  let message = ''
  for await (const chunk of completionStream) {
    const msg = chunk.toString()
    if (msg) {
      if (msg.includes('Input Tokens:')) {
        const tokenMsg = msg.split('Input Tokens: ')[1]
        inputTokens = tokenMsg.split('Output Tokens: ')[0]
        outputTokens = tokenMsg.split('Output Tokens: ')[1]
        completion += msg.split('Input Tokens: ')[0]
        completion = completion.split('Input Tokens: ')[0]
      } else if (msg.includes('Output Tokens: ')) {
        outputTokens = msg.split('Output Tokens: ')[1]
        completion = completion.split('Output Tokens: ')[0]
      } else {
        wordCount++
        completion += msg
        if (wordCount > wordCountMinimum) {
          if (wordCountMinimum < 64) {
            wordCountMinimum *= 2
          }
          completion = completion.replaceAll('...', '')
          completion += '...'
          wordCount = 0
          if (ctx.chat?.id && message !== completion) {
            message = completion
            await ctx.api
              .editMessageText(ctx.chat?.id, msgId, completion)
              .catch(async (e: any) => {
                if (e instanceof GrammyError) {
                  if (e.error_code !== 400) {
                    throw e
                  } else {
                    logger.error(e.message)
                  }
                } else {
                  throw e
                }
              })
          }
        }
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
  const totalOutputTokens = outputTokens // response.headers['x-openai-output-tokens']
  const totalInputTokens = inputTokens // response.headers['x-openai-input-tokens']
  return {
    completion: {
      content: completion,
      role: 'assistant',
      model,
      timestamp: Date.now()
    },
    usage: parseInt(totalOutputTokens, 10) + parseInt(totalInputTokens, 10),
    price: 0,
    inputTokens: parseInt(totalInputTokens, 10),
    outputTokens: parseInt(totalOutputTokens, 10)
  }
}
