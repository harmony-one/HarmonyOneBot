import axios, { type AxiosResponse } from 'axios'
import { type Readable } from 'stream'
import { GrammyError } from 'grammy'
import { pino } from 'pino'

import config from '../../../config'
import { type OnCallBackQueryData, type OnMessageContext, type ChatConversation } from '../../types'
import { type LlmCompletion } from './llmApi'
import { LlmsModelsEnum } from '../utils/types'
import { sleep } from '../../sd-images/utils'

const logger = pino({
  name: 'anthropic - llmsBot',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
})

const API_ENDPOINT = config.llms.apiEndpoint // 'http://127.0.0.1:5000' // config.llms.apiEndpoint

export const anthropicCompletion = async (
  conversation: ChatConversation[],
  model = LlmsModelsEnum.CLAUDE_OPUS
): Promise<LlmCompletion> => {
  logger.info(`Handling ${model} completion`)
  const data = {
    model,
    stream: false,
    system: config.openAi.chatGpt.chatCompletionContext,
    max_tokens: +config.openAi.chatGpt.maxTokens,
    messages: conversation.filter(c => c.model === model)
      .map(m => { return { content: m.content, role: m.role } })
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

export const anthropicStreamCompletion = async (
  conversation: ChatConversation[],
  model = LlmsModelsEnum.CLAUDE_OPUS,
  ctx: OnMessageContext | OnCallBackQueryData,
  msgId: number,
  limitTokens = true
): Promise<LlmCompletion> => {
  logger.info(`Handling ${model} stream completion`)
  const data = {
    model,
    stream: true, // Set stream to true to receive the completion as a stream
    system: config.openAi.chatGpt.chatCompletionContext,
    max_tokens: limitTokens ? +config.openAi.chatGpt.maxTokens : undefined,
    messages: conversation.filter(c => c.model === model).map(m => { return { content: m.content, role: m.role } })
  }
  let wordCount = 0
  let wordCountMinimum = 2
  const url = `${API_ENDPOINT}/anthropic/completions`
  if (!ctx.chat?.id) {
    throw new Error('Context chat id should not be empty after openAI streaming')
  }
  const response: AxiosResponse = await axios.post(url, data, { responseType: 'stream' })
  // Create a Readable stream from the response
  const completionStream: Readable = response.data
  // Read and process the stream
  let completion = ''
  let outputTokens = ''
  let inputTokens = ''
  for await (const chunk of completionStream) {
    const msg = chunk.toString()
    if (msg) {
      if (msg.startsWith('Input Token')) {
        const regex = /Input Token: (\d+)(.*)/
        // Execute the regular expression
        const match = regex.exec(msg)
        if (match) {
          inputTokens = match[1].trim() // Extract the integer part
          if (match.length >= 3) {
            completion += match[2]
          }
        }
      } else if (msg.startsWith('Output Tokens')) {
        outputTokens = msg.split('Output Tokens: ')[1].trim()
      } else {
        wordCount++
        completion += msg
        if (msg.includes('Output Tokens:')) {
          outputTokens = msg.split('Output Tokens: ')[1].trim()
          // outputTokens = tokenMsg.split('Output Tokens: ')[1].trim()
          completion = completion.split('Output Tokens: ')[0]
        }
        if (wordCount > wordCountMinimum) { // if (chunck === '.' && wordCount > wordCountMinimum) {
          if (wordCountMinimum < 64) {
            wordCountMinimum *= 2
          }
          completion = completion.replaceAll('...', '')
          completion += '...'
          wordCount = 0
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
      model
    },
    usage: parseInt(totalOutputTokens, 10) + parseInt(totalInputTokens, 10),
    price: 0,
    inputTokens: parseInt(totalInputTokens, 10),
    outputTokens: parseInt(totalOutputTokens, 10)
  }
}

export const toolsChatCompletion = async (
  conversation: ChatConversation[],
  model = LlmsModelsEnum.CLAUDE_OPUS
): Promise<LlmCompletion> => {
  logger.info(`Handling ${model} completion`)
  const input = {
    model,
    stream: false,
    system: config.openAi.chatGpt.chatCompletionContext,
    max_tokens: +config.openAi.chatGpt.maxTokens,
    messages: conversation.filter(c => c.model === model)
      .map(m => { return { content: m.content, role: m.role } })
  }
  const url = `${API_ENDPOINT}/anthropic/completions/tools`
  const response = await axios.post(url, input)
  const respJson = response.data
  if (respJson) {
    const toolId = respJson.id
    let data
    let counter = 1
    while (true) {
      const resp = await axios.get(`${API_ENDPOINT}/anthropic/completions/tools/${toolId}`)
      data = resp.data
      if (data.status === 'DONE' || counter > 20) {
        break
      }
      counter++
      await sleep(3000)
    }
    console.log('here', data.status, counter)
    if (data.status === 'DONE' && !data.error && counter < 20) {
      const totalInputTokens = data.data.usage.input_tokens
      const totalOutputTokens = data.data.usage.output_tokens
      const completion = data.data.content
      return {
        completion: {
          content: completion[0].text,
          role: 'assistant',
          model
        },
        usage: totalOutputTokens + totalInputTokens,
        price: 0,
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens
      }
    } else {
      return {
        completion: {
          content: 'Timeout error',
          role: 'assistant',
          model
        },
        usage: 0,
        price: 0
      }
    }
  }
  return {
    completion: undefined,
    usage: 0,
    price: 0
  }
}
