import OpenAI from 'openai'
import { encode } from 'gpt-tokenizer'
import { GrammyError } from 'grammy'
import config from '../../../config'
import { deleteFile, getImage } from '../utils/file'
import {
  type ChatConversation,
  type OnCallBackQueryData,
  type OnMessageContext
} from '../../types'
import { pino } from 'pino'
import {
  type DalleGPTModel,
  DalleGPTModels,
  LlmsModelsEnum,
  type ChatModel
} from '../utils/types'
import type fs from 'fs'
import { type ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import { type Stream } from 'openai/streaming'
import { getChatModel, getChatModelPrice, type LlmCompletion } from './llmApi'

const openai = new OpenAI({ apiKey: config.openAiKey })

const logger = pino({
  name: 'openAIBot',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
})

export async function postGenerateImg (
  prompt: string,
  numImgs?: number,
  imgSize?: string
): Promise<OpenAI.Images.Image[]> {
  const payload = {
    model: config.openAi.dalle.sessionDefault.model,
    quality: config.openAi.dalle.sessionDefault.quality,
    prompt,
    n: numImgs ?? config.openAi.dalle.sessionDefault.numImages,
    size: imgSize ?? config.openAi.dalle.sessionDefault.imgSize
  }
  const response = await openai.images.generate(
    payload as OpenAI.Images.ImageGenerateParams
  )
  return response.data
}

export async function alterGeneratedImg (
  prompt: string,
  filePath: string,
  ctx: OnMessageContext | OnCallBackQueryData,
  imgSize?: string
): Promise<OpenAI.Images.Image[] | null | undefined> {
  const imageData = await getImage(filePath)
  if (!imageData.error) {
    let response
    // const size = imgSize ?? config.openAi.dalle.sessionDefault.imgSize
    if (!isNaN(+prompt)) {
      // const size2 = imgSize ?? config.openAi.dalle.sessionDefault.imgSize
      const n = parseInt(prompt)
      const payLoad: OpenAI.Images.ImageCreateVariationParams = {
        image: imageData.file,
        n: n > 10 ? 1 : n
        // size
      }
      response = await openai.images.createVariation(payLoad)
    }
    deleteFile(imageData.fileName)
    return response?.data
  } else {
    await ctx.reply(imageData.error).catch((e) => {
      throw e
    })
    return null
  }
}

export async function chatCompletion (
  conversation: ChatConversation[],
  model = config.openAi.chatGpt.model,
  limitTokens = true
): Promise<LlmCompletion> {
  const response = await openai.chat.completions.create({
    model,
    max_tokens: limitTokens ? config.openAi.chatGpt.maxTokens : undefined,
    temperature: config.openAi.dalle.completions.temperature,
    messages: conversation as ChatCompletionMessageParam[]
  })
  const chatModel = getChatModel(model)
  if (response.usage?.prompt_tokens === undefined) {
    throw new Error('Unknown number of prompt tokens used')
  }
  const price = getChatModelPrice(
    chatModel,
    true,
    response.usage?.prompt_tokens,
    response.usage?.completion_tokens
  )
  return {
    completion: {
      content: response.choices[0].message?.content ?? 'Error - no completion available',
      role: 'assistant'
    },
    usage: response.usage?.total_tokens,
    price: price * config.openAi.chatGpt.priceAdjustment
  }
}

export const streamChatCompletion = async (
  conversation: ChatConversation[],
  ctx: OnMessageContext | OnCallBackQueryData,
  model = LlmsModelsEnum.GPT_4,
  msgId: number,
  limitTokens = true
): Promise<LlmCompletion> => {
  let completion = ''
  let wordCountMinimum = 2
  const messages = conversation.filter(c => c.model === model).map(m => { return { content: m.content, role: m.role } })
  const stream = await openai.chat.completions.create({
    model,
    messages: messages as ChatCompletionMessageParam[], // OpenAI.Chat.Completions.CreateChatCompletionRequestMessage[],
    stream: true,
    max_tokens: limitTokens ? config.openAi.chatGpt.maxTokens : undefined,
    temperature: config.openAi.dalle.completions.temperature || 0.8
  })
  let wordCount = 0
  if (!ctx.chat?.id) {
    throw new Error('Context chat id should not be empty after openAI streaming')
  }
  // let wordCountMinimumCounter = 1;
  for await (const part of stream) {
    wordCount++
    const chunck = part.choices[0]?.delta?.content
      ? part.choices[0]?.delta?.content
      : ''
    completion += chunck
    // if (wordCount > 20) {
    //   throw getGrammy429Error()
    // }
    if (wordCount > wordCountMinimum) { // if (chunck === '.' && wordCount > wordCountMinimum) {
      if (wordCountMinimum < 64) {
        wordCountMinimum *= 2
      }
      completion = completion.replaceAll('...', '')
      completion += '...'
      wordCount = 0
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
  completion = completion.replaceAll('...', '')
  const inputTokens = getTokenNumber(conversation[conversation.length - 1].content as string) + ctx.session.chatGpt.usage
  const outputTokens = getTokenNumber(completion)
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
  return {
    completion: {
      content: completion,
      role: 'assistant'
    },
    usage: outputTokens + inputTokens,
    price: 0,
    inputTokens,
    outputTokens
  }
}

export const streamChatVisionCompletion = async (
  ctx: OnMessageContext | OnCallBackQueryData,
  model = LlmsModelsEnum.GPT_4_VISION_PREVIEW,
  prompt: string,
  imgUrls: string[],
  msgId: number,
  limitTokens = true
): Promise<LlmCompletion> => {
  let completion = ''
  let wordCountMinimum = 2
  const payload: any = {
    model,
    messages: [
      {
        role: 'system',
        content: config.openAi.chatGpt.visionCompletionContext
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          ...imgUrls.map(img => ({
            type: 'image_url',
            image_url: { url: img }
          }))
        ]
      }
    ],
    stream: true,
    max_tokens: limitTokens ? config.openAi.chatGpt.maxTokens : undefined
  }
  const stream = await openai.chat.completions.create(payload) as unknown as Stream<OpenAI.Chat.Completions.ChatCompletionChunk>
  let wordCount = 0
  if (!ctx.chat?.id) {
    throw new Error('Context chat id should not be empty after openAI streaming')
  }
  for await (const part of stream) {
    wordCount++
    const chunck = part.choices[0]?.delta?.content
      ? part.choices[0]?.delta?.content
      : ''
    completion += chunck

    if (wordCount > wordCountMinimum) {
      if (wordCountMinimum < 64) {
        wordCountMinimum *= 2
      }
      completion = completion.replaceAll('...', '')
      completion += '...'
      wordCount = 0
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
  completion = completion.replaceAll('...', '')
  const inputTokens = getTokenNumber(prompt) + ctx.session.chatGpt.usage
  const outputTokens = getTokenNumber(completion)
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
  return {
    completion: {
      content: completion,
      role: 'assistant'
    },
    usage: outputTokens + inputTokens,
    price: 0,
    inputTokens,
    outputTokens
  }
}

export async function improvePrompt (promptText: string, model: string): Promise<string> {
  const prompt = `Improve this picture description using max 100 words and don't add additional text to the image: ${promptText} `
  const conversation = [{ role: 'user', content: prompt }]
  const response = await chatCompletion(conversation, model)
  return response.completion?.content as string ?? ''
}

export const getTokenNumber = (prompt: string): number => {
  return encode(prompt).length
}

export const getDalleModel = (modelName: string): DalleGPTModel => {
  logger.info(modelName)
  return DalleGPTModels[modelName]
}

export const getDalleModelPrice = (
  model: DalleGPTModel,
  inCents = true,
  numImages = 1,
  hasEnhacedPrompt = false,
  chatModel?: ChatModel
): number => {
  let price = model.price * numImages || 0
  if (hasEnhacedPrompt && chatModel) {
    const averageToken = 250 // for 100 words
    price += getChatModelPrice(chatModel, inCents, averageToken, averageToken)
  }
  return price
}

export function getGrammy429Error (): GrammyError {
  return new GrammyError(
    "GrammyError: Call to 'sendMessage' failed! (429: Too Many Requests: retry after 33)",
    {
      ok: false,
      error_code: 429,
      description: 'Too Many Requests: retry after 33'
    } as any,
    'editMessageText',
    { parameters: { retry_after: 33 } }
  )
}

export async function speechToText (readStream: fs.ReadStream): Promise<string> {
  const result = await openai.audio.transcriptions.create({
    file: readStream,
    model: 'whisper-1'
  })
  return result.text
}
